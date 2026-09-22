import { createClient } from '@supabase/supabase-js';

export const adminDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function requireUser(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  const { data, error } = await adminDb.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error('Invalid session'), { status: 401 });
  return data.user;
}

export async function requireAdmin(request) {
  const user = await requireUser(request);
  const { data, error } = await adminDb.from('profiles').select('role').eq('id', user.id).single();
  if (error || data?.role !== 'admin') throw Object.assign(new Error('Administrator access required'), { status: 403 });
  return user;
}

export function json(response, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(response) };
}
