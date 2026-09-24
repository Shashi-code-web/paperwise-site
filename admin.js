const sb=window.supabase&&window.PAPERWISE_SUPABASE_URL&&window.PAPERWISE_SUPABASE_ANON_KEY?window.supabase.createClient(window.PAPERWISE_SUPABASE_URL,window.PAPERWISE_SUPABASE_ANON_KEY):null;
const apiBase=(window.PAPERWISE_API_BASE||'').replace(/\/$/,'');
const mfaBox=document.querySelector('.mfa'),catalog=document.getElementById('adminEmpty');
function message(s){if(mfaBox)mfaBox.textContent=s;}
function showMfaForm(title,description,qr,action){
 mfaBox.replaceChildren();
 const wrap=document.createElement('div');
 const heading=document.createElement('strong');heading.textContent=title;
 const info=document.createElement('p');info.textContent=description;
 wrap.append(heading,info);
 if(qr){const img=document.createElement('img');img.src='data:image/svg+xml;base64,'+btoa(qr);img.alt='Scan this QR code in your authenticator app';img.style.cssText='display:block;max-width:200px;margin:12px auto';wrap.append(img);}
 const code=document.createElement('input');code.type='text';code.inputMode='numeric';code.autocomplete='one-time-code';code.placeholder='6-digit authenticator code';code.maxLength=6;code.style.cssText='display:block;width:100%;padding:12px;box-sizing:border-box;margin:12px 0';
 const button=document.createElement('button');button.textContent='Verify code';button.className='button dark';
 const feedback=document.createElement('p');feedback.setAttribute('role','status');
 button.onclick=async()=>{if(!/^\d{6}$/.test(code.value.trim())){feedback.textContent='Enter the six-digit code.';return;}button.disabled=true;feedback.textContent='Verifying…';try{await action(code.value.trim());location.reload();}catch(e){feedback.textContent=e.message||'Verification failed';button.disabled=false;}};
 wrap.append(code,button,feedback);mfaBox.append(wrap);
}
async function setupMfa(){
 const {data:level,error:levelError}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
 if(levelError)throw levelError;
 if(level.currentLevel==='aal2')return true;
 const {data:factors,error:factorsError}=await sb.auth.mfa.listFactors();
 if(factorsError)throw factorsError;
 const existing=factors.totp?.find(f=>f.status==='verified');
 if(existing){
  showMfaForm('Two-factor verification','Enter the code from your authenticator app.',null,async code=>{
   const {data:challenge,error:ce}=await sb.auth.mfa.challenge({factorId:existing.id});if(ce)throw ce;
   const {error:ve}=await sb.auth.mfa.verify({factorId:existing.id,challengeId:challenge.id,code});if(ve)throw ve;
  });
  return false;
 }
 const {data:enrolled,error:ee}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'PaperWise Admin'});
 if(ee)throw ee;
 showMfaForm('Set up two-factor authentication','Scan this QR code with Google Authenticator, Microsoft Authenticator, or another TOTP app, then enter its six-digit code.',enrolled.totp.qr_code,async code=>{
  const {data:challenge,error:ce}=await sb.auth.mfa.challenge({factorId:enrolled.id});if(ce)throw ce;
  const {error:ve}=await sb.auth.mfa.verify({factorId:enrolled.id,challengeId:challenge.id,code});if(ve)throw ve;
 });
 return false;
}
async function loadAdmin(){
 if(!sb||!apiBase){message('Missing browser configuration.');return;}
 const {data:{session},error}=await sb.auth.getSession();
 if(error||!session){location.replace('index.html?adminLogin=1');return;}
 const verified=await setupMfa();
 if(!verified){if(catalog)catalog.textContent='Complete two-factor verification to view products.';return;}
 const response=await fetch(apiBase+'/api/admin-products',{headers:{Authorization:'Bearer '+(await sb.auth.getSession()).data.session.access_token}});
 const result=await response.json();
 if(!response.ok){message(result.error||'Administrator access denied');if(catalog)catalog.textContent='Unable to load products.';return;}
 message('Two-factor authentication verified. Administrator access granted.');
 document.querySelectorAll('.metrics b').forEach(el=>el.textContent='—');
 document.querySelectorAll('.metrics span').forEach(el=>el.textContent='Not connected');
 if(!catalog)return;
 catalog.replaceChildren();
 if(!result.products?.length){catalog.textContent='No products yet.';return;}
 for(const p of result.products){
  const row=document.createElement('div');row.className='admin-row';
  const title=document.createElement('b');title.textContent=p.title;
  const price=document.createElement('b');price.textContent='₹'+(p.price_paise/100).toFixed(2);
  const state=document.createElement('span');state.className='status';state.textContent=p.active?'Active':'Draft';
  row.append(title,price,state);catalog.append(row);
 }
}
document.querySelector('.cart-btn')?.addEventListener('click',async()=>{if(sb)await sb.auth.signOut();location.replace('index.html');});
document.querySelector('.admin-panel .button')?.addEventListener('click',()=>alert('Private PDF upload is being configured. Do not share PDF files publicly.'));
loadAdmin().catch(e=>{console.error(e);message(e.message||'Unable to initialize administrator verification.');});
