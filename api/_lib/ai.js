import OpenAI from 'openai';
import crypto from 'node:crypto';
import { supabaseAdmin } from './supabase.js';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_ITEMS = 8;

export function safeText(value, max = 2000) {
  if (typeof value !== 'string') throw Object.assign(new Error('Invalid request'), { status: 400 });
  const text = value.trim();
  if (!text || text.length > max) throw Object.assign(new Error('Invalid request'), { status: 400 });
  return text;
}

export function readAiRequest(req) {
  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 12000) throw Object.assign(new Error('Request too large'), { status: 413 });
    try { body = JSON.parse(body); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Invalid request'), { status: 400 });
  const message = safeText(body.message, MAX_MESSAGE_LENGTH);
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_ITEMS).map(item => {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') throw Object.assign(new Error('Invalid chat history'), { status: 400 });
    return { role: item.role, content: item.content.slice(0, 1200) };
  }) : [];
  return { message, history };
}

export async function enforceAiRateLimit(req, identity, limit = 10) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80);
  const key = crypto.createHash('sha256').update(identity + ':' + ip).digest('hex');
  const { data, error } = await supabaseAdmin().rpc('consume_paperwise_ai_rate_limit', {
    p_bucket: key, p_limit: limit, p_window_seconds: 60
  });
  if (error) {
    console.error('AI rate limiter unavailable:', error.code || 'database_error');
    throw Object.assign(new Error('AI support is temporarily unavailable. Please try again shortly.'), { status: 503 });
  }
  if (data !== true) throw Object.assign(new Error('Too many requests. Please wait a minute and try again.'), { status: 429 });
}

export function openAiClient() {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    throw Object.assign(new Error('AI assistant is not configured yet. Please use the regular PaperWise support options.'), { status: 503 });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 12000, maxRetries: 1 });
}

export function safeError(error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error('PaperWise AI request failed:', error?.name || 'Error', error?.status || 'unknown_status');
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ error: status === 503 ? (error.message || 'AI assistant is temporarily unavailable.') : status === 429 ? error.message : status === 400 || status === 413 ? error.message : 'AI assistant is temporarily unavailable. PaperWise checkout and downloads still work normally.' })
  };
}

export async function runResponses({ instructions, message, history = [], tools = [], executeTool, maxCalls = 3 }) {
  const client = openAiClient();
  let input = [...history, { role: 'user', content: message }];
  for (let round = 0; round <= maxCalls; round++) {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL,
      instructions,
      input,
      tools,
      max_output_tokens: 450,
      store: false
    });
    const calls = (response.output || []).filter(item => item.type === 'function_call');
    if (!calls.length) {
      const answer = String(response.output_text || '').trim();
      return answer.slice(0, 5000) || 'I could not prepare an answer just now. Please try again.';
    }
    if (round === maxCalls) return 'I could not complete that request safely. Please try a simpler question.';
    input = [...input, ...response.output];
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.arguments || '{}'); } catch { args = {}; }
      let result;
      try { result = await executeTool(call.name, args); }
      catch { result = { error: 'This information is temporarily unavailable.' }; }
      input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
    }
  }
  return 'Please try again.';
}

export const functionTool = (name, description, properties = {}, required = []) => ({
  type: 'function',
  name,
  description,
  strict: true,
  parameters: { type: 'object', properties, required, additionalProperties: false }
});
