const MAX_REQUEST_BYTES = 10 * 1024;
const MAX_MESSAGE_CHARS = 1800;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_CHARS = 900;

function badRequest(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function validateAiPayload(rawBody, contentLength) {
  const declared = Number(contentLength);
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    throw badRequest('Message is too large.', 413);
  }

  let body = rawBody;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_REQUEST_BYTES) throw badRequest('Message is too large.', 413);
    try { body = JSON.parse(body); } catch { throw badRequest('Invalid JSON body.'); }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Invalid request body.');
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_REQUEST_BYTES) throw badRequest('Message is too large.', 413);
  if (Object.keys(body).some((key) => !['message', 'history'].includes(key))) throw badRequest('Unexpected request field.');
  if (typeof body.message !== 'string') throw badRequest('A message is required.');
  const message = body.message.trim();
  if (!message || message.length > MAX_MESSAGE_CHARS) throw badRequest('Message must contain 1–1,800 characters.');

  const history = [];
  if (body.history !== undefined && !Array.isArray(body.history)) throw badRequest('Invalid chat history.');
  for (const item of (body.history || []).slice(-MAX_HISTORY_ITEMS)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (!['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    const content = item.content.trim();
    if (content && content.length <= MAX_HISTORY_CHARS) {
      history.push({ role: item.role, content: sanitizeForModel(content) });
    }
  }

  return { message: sanitizeForModel(message), history };
}

export function sanitizeForModel(value) {
  if (typeof value !== 'string') return '';
  let text = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  text = text.replace(/\bBearer\s+[A-Za-z0-9._~+/-]{8,}={0,2}\b/gi, '[redacted credential]');
  text = text.replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|sb_secret_[A-Za-z0-9_-]{12,}|sbp_[A-Za-z0-9_-]{12,})\b/gi, '[redacted key]');
  text = text.replace(/\b(password|passcode|one[- ]time code|verification code|otp|upi pin|transaction id|transaction reference|utr|api key|secret key|access token|refresh token)\s*(?:is|=|:|#|-)?\s*[^\s,;]{4,120}/gi, '$1 [redacted]');
  text = text.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[redacted email]');
  text = text.replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g, '[redacted phone]');
  text = text.replace(/\b\d{6}\b/g, '[redacted code]');
  text = text.replace(/\b[A-Za-z0-9]{12,35}\b/g, (token) =>
    /[A-Za-z]/.test(token) && /\d/.test(token) ? '[redacted reference]' : token
  );
  text = text.replace(/\b[\w.-]{2,64}@[A-Za-z]{2,32}\b/g, '[redacted payment handle]');
  return text.slice(0, MAX_MESSAGE_CHARS);
}

export function cleanUntrustedText(value, maxLength = 280) {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return sanitizeForModel(cleaned).slice(0, maxLength);
}

export function validateToolArguments(name, value) {
  let args = value;
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { throw badRequest('Invalid tool arguments.'); }
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw badRequest('Invalid tool arguments.');
  const keys = Object.keys(args);

  if (name === 'search_catalogue') {
    if (keys.some((key) => key !== 'query') || typeof args.query !== 'string' || !args.query.trim() || args.query.length > 100) {
      throw badRequest('Invalid catalogue query.');
    }
    return { query: args.query.trim().slice(0, 100) };
  }
  if (name === 'get_sales_summary') {
    if (keys.length !== 1 || !['7d', '30d', '90d', 'all'].includes(args.timeframe)) throw badRequest('Invalid report timeframe.');
    return { timeframe: args.timeframe };
  }
  if (['get_storefront_status', 'get_my_order_status', 'get_pending_payments', 'get_catalogue_summary', 'get_download_operations_summary'].includes(name)) {
    if (keys.length !== 0) throw badRequest('This tool does not accept arguments.');
    return {};
  }
  throw badRequest('Tool is not allowlisted.', 403);
}

export const AI_LIMITS = Object.freeze({
  requestBytes: MAX_REQUEST_BYTES,
  messageChars: MAX_MESSAGE_CHARS,
  historyItems: MAX_HISTORY_ITEMS,
  outputCustomer: 360,
  outputAdmin: 600,
  toolRounds: 2,
  toolCallsPerRound: 4
});
