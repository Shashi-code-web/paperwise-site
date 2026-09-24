const SUPABASE_URL=window.PAPERWISE_SUPABASE_URL;
const SUPABASE_ANON_KEY=window.PAPERWISE_SUPABASE_ANON_KEY;
const sb=(SUPABASE_URL&&SUPABASE_ANON_KEY&&window.supabase)?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
async function authFetch(url,options={}){if(!sb)throw new Error('Supabase browser configuration is missing.');const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Please sign in first.');return fetch((window.PAPERWISE_API_BASE||'')+url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{}),Authorization:'Bearer '+session.access_token}})}
async function loadAdmin(){
  if(!sb){document.querySelector('.mfa').textContent='Missing Supabase configuration';return;}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){location.href='index.html?adminLogin=1';return}
  const r=await authFetch('/api/admin-products'); const d=await r.json();
  if(!r.ok){document.body.innerHTML='<main style="padding:40px"><h1>Admin access denied</h1><p>'+String(d.error||'MFA and admin role are required.')+'</p></main>';return}
  document.querySelector('.mfa').textContent='Administrator access verified';
  document.querySelectorAll('.metrics b').forEach(x=>x.textContent='—');
  document.querySelectorAll('.metrics span').forEach(x=>x.textContent='Not connected');
  const rows=document.querySelectorAll('.admin-row:not(.header)');
  rows.forEach(row=>row.style.display='none');
  (d.products||[]).slice(0,rows.length).forEach((p,i)=>{rows[i].style.display='';rows[i].querySelector('b').textContent=p.title;rows[i].querySelectorAll('b')[1].textContent='₹'+(p.price_paise/100);rows[i].querySelector('.status').textContent=p.active?'Active':'Draft';});
}
document.querySelector('.cart-btn')?.addEventListener('click',async()=>{if(sb)await sb.auth.signOut();location.href='index.html'});
document.querySelector('.admin-panel .button')?.addEventListener('click',()=>alert('Product creation is protected by Supabase MFA. Upload the PDF to private Supabase Storage first, then create the product record through the authenticated admin API.'));
loadAdmin().catch(e=>{console.error(e);document.querySelector('.mfa').textContent='Backend unavailable or configuration error';});
