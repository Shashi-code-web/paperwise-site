import { adminDb, json, requireUser } from './_lib/supabase.js';
import { readJson, errorResponse } from './_lib/http.js';

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const user = await requireUser(request);
    const { productIds } = await readJson(request);
    if (!Array.isArray(productIds) || !productIds.length || productIds.length > 10) throw Object.assign(new Error('Invalid cart'), { status: 400 });
    const { data: products, error } = await adminDb.from('products').select('id,title,price_paise').in('id', productIds).eq('active', true);
    if (error || products.length !== new Set(productIds).size) throw Object.assign(new Error('One or more editions are unavailable'), { status: 400 });
    const amount = products.reduce((sum, product) => sum + product.price_paise, 0);
    const basic = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const paymentResponse = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'INR', receipt: `pw_${crypto.randomUUID()}`, notes: { user_id: user.id } }) });
    if (!paymentResponse.ok) throw new Error('Unable to start payment');
    const providerOrder = await paymentResponse.json();
    const { data: order, error: orderError } = await adminDb.from('orders').insert({ user_id: user.id, amount_paise: amount, currency: 'INR', status: 'pending', provider_order_id: providerOrder.id }).select('id').single();
    if (orderError) throw orderError;
    const { error: itemsError } = await adminDb.from('order_items').insert(products.map(product => ({ order_id: order.id, product_id: product.id, unit_price_paise: product.price_paise })));
    if (itemsError) throw itemsError;
    return json({ orderId: order.id, razorpayOrderId: providerOrder.id, amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) { return errorResponse(error); }
}
