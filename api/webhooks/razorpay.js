import crypto from 'node:crypto';
import { adminDb, json } from '../_lib/supabase.js';
import { errorResponse } from '../_lib/http.js';

function validSignature(rawBody, signature) {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (!signature || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export const config = { api: { bodyParser: false } };
export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {});
    if (!validSignature(rawBody, request.headers['x-razorpay-signature'])) return json({ error: 'Invalid webhook signature' }, 401);
    const event = JSON.parse(rawBody);
    const eventId = event.payload?.payment?.entity?.id || event.created_at + ':' + event.event;
    const { error: eventError } = await adminDb.from('webhook_events').insert({ provider_event_id: eventId, payload_hash: crypto.createHash('sha256').update(rawBody).digest('hex') });
    if (eventError?.code === '23505') return json({ received: true }); // already processed
    if (eventError) throw eventError;
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const { error } = await adminDb.from('orders').update({ status: 'paid', provider_payment_id: payment.id, paid_at: new Date().toISOString() }).eq('provider_order_id', payment.order_id).eq('amount_paise', payment.amount);
      if (error) throw error;
    }
    return json({ received: true });
  } catch (error) { return errorResponse(error); }
}
