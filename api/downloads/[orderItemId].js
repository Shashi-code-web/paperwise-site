import { adminDb, json, requireUser } from '../_lib/supabase.js';
import { errorResponse } from '../_lib/http.js';

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const user = await requireUser(request);
    const orderItemId = request.query.orderItemId;
    const { data: item, error } = await adminDb.from('order_items').select('id, products(pdf_asset_key), orders!inner(user_id,status)').eq('id', orderItemId).eq('orders.user_id', user.id).eq('orders.status', 'paid').single();
    if (error || !item?.products?.pdf_asset_key) throw Object.assign(new Error('Download not available'), { status: 404 });
    const { data: signed, error: signError } = await adminDb.storage.from('private-pdfs').createSignedUrl(item.products.pdf_asset_key, 60, { download: true });
    if (signError) throw signError;
    await adminDb.from('download_tokens').insert({ order_item_id: item.id, expires_at: new Date(Date.now() + 60_000).toISOString() });
    return json({ url: signed.signedUrl, expiresInSeconds: 60 });
  } catch (error) { return errorResponse(error); }
}
