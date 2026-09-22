import { adminDb, json, requireAdmin } from '../_lib/supabase.js';
import { readJson, errorResponse } from '../_lib/http.js';

export default async function handler(request) {
  try {
    await requireAdmin(request);
    if (request.method === 'GET') {
      const { data, error } = await adminDb.from('products').select('id,title,description,price_paise,active,updated_at').order('updated_at', { ascending: false });
      if (error) throw error;
      return json({ products: data });
    }
    if (request.method === 'PATCH') {
      const { id, title, description, pricePaise, active } = await readJson(request);
      if (!id || !Number.isInteger(pricePaise) || pricePaise < 100 || pricePaise > 1000000) throw Object.assign(new Error('Invalid product update'), { status: 400 });
      const { data, error } = await adminDb.from('products').update({ title, description, price_paise: pricePaise, active, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return json({ product: data });
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (error) { return errorResponse(error); }
}
