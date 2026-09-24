import { createClient } from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
export const adminDb=url&&key?createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}}):null;
export function supabaseAdmin(){if(!adminDb)throw Object.assign(new Error('Supabase server configuration missing'),{status:503});return adminDb;}
export const supabasePublic=supabaseAdmin;
export async function requireUser(req){
 const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');
 if(!token)throw Object.assign(new Error('Authentication required'),{status:401});
 const {data,error}=await supabaseAdmin().auth.getUser(token);
 if(error||!data.user)throw Object.assign(new Error('Invalid session'),{status:401});
 return data.user;
}
export async function requireAdmin(req){
 const user=await requireUser(req);
 const {data,error}=await supabaseAdmin().from('profiles').select('role').eq('id',user.id).single();
 if(error||data?.role!=='admin')throw Object.assign(new Error('Administrator access required'),{status:403});
 const token=req.headers.authorization.replace(/^Bearer\s+/i,'');
 let claims;
 try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}
 catch{throw Object.assign(new Error('Invalid token'),{status:401});}
 if(claims.aal!=='aal2')throw Object.assign(new Error('Authenticator verification required'),{status:403});
 return user;
}
const origin='https://shashi-code-web.github.io';
export function json(resOrData,status=200,data){
 if(resOrData&&typeof resOrData.status==='function'){
  resOrData.setHeader('Cache-Control','no-store');
  resOrData.setHeader('Access-Control-Allow-Origin',origin);
  resOrData.setHeader('Vary','Origin');
  return resOrData.status(status).json(data);
 }
 return {statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin'},body:JSON.stringify(resOrData)};
}
