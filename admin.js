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
 if(qr){const img=document.createElement('img');img.src=qr.startsWith('data:image/')?qr:qr.trimStart().startsWith('<svg')?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr):'data:image/svg+xml;base64,'+qr;img.alt='Scan this QR code in your authenticator app';img.style.cssText='display:block;max-width:200px;margin:12px auto';wrap.append(img);}
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
 // Supabase may retain an unverified enrollment after the user closes the QR screen.
 // Remove that abandoned enrollment before creating a fresh QR code.
 const pending=(factors.all||[]).filter(f=>f.factor_type==='totp'&&f.status==='unverified');
 for(const factor of pending){
  const {error:removeError}=await sb.auth.mfa.unenroll({factorId:factor.id});
  if(removeError)throw new Error('An unfinished authenticator setup exists. '+removeError.message);
 }
 const {data:enrolled,error:ee}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'PaperWise Admin'});
 if(ee)throw ee;
 showMfaForm('Set up two-factor authentication','Scan this QR code with Google Authenticator, Microsoft Authenticator, or another TOTP app, then enter its six-digit code.',enrolled.totp.qr_code,async code=>{
  const {data:challenge,error:ce}=await sb.auth.mfa.challenge({factorId:enrolled.id});if(ce)throw ce;
  const {error:ve}=await sb.auth.mfa.verify({factorId:enrolled.id,challengeId:challenge.id,code});if(ve)throw ve;
 });
 return false;
}
async function loadManualOrders(){
 const area=document.getElementById('manualOrdersList');if(!area)return;
 area.textContent='Loading manual payment submissions…';
 try{
  const data=await adminApi('/api/admin-manual-orders');
  area.replaceChildren();
  if(!data.orders?.length){area.textContent='No manual payments submitted yet.';return;}
  for(const order of data.orders){
   const card=document.createElement('article');card.style.cssText='border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0;background:#fff;display:grid;gap:8px';
   const title=document.createElement('strong');title.textContent=(order.order_items||[]).map(i=>i.products?.title||'PDF').join(', ')||'PDF order';
   const info=document.createElement('p');info.style.cssText='overflow-wrap:anywhere;margin:0';
   info.textContent='₹'+(order.amount_paise/100).toFixed(2)+' · '+order.status.toUpperCase()+' · Transaction ID: '+order.manual_payment_reference;
   const customer=document.createElement('small');customer.textContent='Customer ID: '+order.user_id+' · Submitted: '+(order.manual_submitted_at?new Date(order.manual_submitted_at).toLocaleString():'—');
   card.append(title,info,customer);
   if(order.status==='pending'){
    const verifyLabel=document.createElement('label');verifyLabel.style.cssText='display:flex;align-items:center;gap:8px';
    const check=document.createElement('input');check.type='checkbox';
    verifyLabel.append(check,document.createTextNode('I independently verified the matching transaction and amount in my PhonePe account.'));
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    for(const [action,label] of [['approve','Approve payment & unlock PDF'],['reject','Reject payment']]){
     const btn=document.createElement('button');btn.className='tiny-btn';btn.textContent=label;
     btn.onclick=async()=>{
      if(action==='approve'&&!check.checked){alert('Verify the payment in your PhonePe account and tick the confirmation box first.');return;}
      if(!window.confirm(action==='approve'?'Approve this verified payment and unlock the PDF?':'Reject this payment submission?'))return;
      actions.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await adminApi('/api/admin-manual-orders',{method:'POST',body:JSON.stringify({orderId:order.id,action})});await loadAdmin();}
      catch(e){alert(e.message);actions.querySelectorAll('button').forEach(b=>b.disabled=false);}
     };
     actions.append(btn);
    }
    card.append(verifyLabel,actions);
   }
   area.append(card);
  }
 }catch(e){area.textContent=e.message||'Unable to load manual payments.';}
}
document.getElementById('refreshManualOrders')?.addEventListener('click',loadManualOrders);
async function loadAdmin(){
 if(!sb||!apiBase){message('Missing browser configuration.');return;}
 const {data:{session},error}=await sb.auth.getSession();
 if(error||!session){location.replace('index.html?adminLogin=1');return;}
 const verified=await setupMfa();
 if(!verified){if(catalog)catalog.textContent='Complete two-factor verification to view products.';return;}
 let result;
 try{result=await adminApi('/api/admin-products');}
 catch(e){message(e.message||'Administrator access denied');if(catalog)catalog.textContent='Unable to load products.';return;}
 message('Two-factor authentication verified. Administrator access granted.');
 const metrics=result.metrics||{};
 const metric=document.querySelectorAll('.metrics b');
 if(metric[0])metric[0].textContent='₹'+((metrics.netSalesPaise||0)/100).toFixed(2);
 if(metric[1])metric[1].textContent=String(metrics.paidOrders||0);
 if(metric[2])metric[2].textContent=String(metrics.downloadLinksIssued||0);
 const metricLabels=document.querySelectorAll('.metrics span');
 if(metricLabels[0])metricLabels[0].textContent=(metrics.paidOrders||0)+' paid orders';
 if(metricLabels[1])metricLabels[1].textContent='Approved by admin';
 if(metricLabels[2])metricLabels[2].textContent='Expiring download links issued';
 await loadManualOrders();
 if(!catalog)return;
 catalog.replaceChildren();
 if(!result.products?.length){catalog.textContent='No products yet.';return;}
 for(const p of result.products){
  const row=document.createElement('div');row.className='admin-row';
  const title=document.createElement('b');title.textContent=p.title;
  const price=document.createElement('b');price.textContent='₹'+(p.price_paise/100).toFixed(2);
  const state=document.createElement('span');state.className='status';state.textContent=p.active?'Active':'Draft';
  const edit=document.createElement('button');edit.className='tiny-btn';edit.textContent='Edit';
  edit.onclick=async()=>{
   const newTitle=prompt('Product title',p.title);if(newTitle===null)return;
   const newDescription=prompt('Description',p.description);if(newDescription===null)return;
   const newPrice=prompt('Price in ₹',(p.price_paise/100).toFixed(2));if(newPrice===null)return;
   const amount=Math.round(Number(newPrice)*100);
   if(!newTitle.trim()||!newDescription.trim()||!Number.isInteger(amount)||amount<100||amount>1000000){alert('Enter a title, description, and price between ₹1 and ₹10,000.');return;}
   try{await adminApi('/api/admin-products',{method:'PATCH',body:JSON.stringify({id:p.id,title:newTitle.trim(),description:newDescription.trim(),price_paise:amount})});await loadAdmin();}
   catch(e){alert(e.message);}
  };
  const toggle=document.createElement('button');toggle.className='tiny-btn';toggle.textContent=p.active?'Unpublish':'Publish';
  toggle.onclick=async()=>{try{await adminApi('/api/admin-products',{method:'PATCH',body:JSON.stringify({id:p.id,active:!p.active})});await loadAdmin();}catch(e){alert(e.message);}};
  row.append(title,price,state,edit,toggle);catalog.append(row);
 }
}
document.querySelector('.cart-btn')?.addEventListener('click',async()=>{if(sb)await sb.auth.signOut();location.replace('index.html');});
async function adminApi(path,options={}){
 const {data:{session}}=await sb.auth.getSession();
 if(!session)throw new Error('Sign in again');
 const response=await fetch(apiBase+path,{...options,headers:{Authorization:'Bearer '+session.access_token,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'Request failed');
 return data;
}
function openProductForm(){
 if(document.getElementById('productForm'))return;
 const section=document.getElementById('catalogPanel');
 if(!section){message('Catalogue panel is unavailable. Please refresh the page.');return;}
 const form=document.createElement('form');form.id='productForm';
 form.style.cssText='padding:24px;margin:20px 0;border:1px solid #ddd;display:grid;gap:14px;background:#fff';
 const heading=document.createElement('h3');heading.textContent='Add a new PDF edition';
 const fields=[
  ['productTitle','Title','text',true],
  ['productDescription','Description','text',true],
  ['productPrice','Price (₹)','number',true],
  ['productFile','Private PDF (up to 50 MB)','file',true]
 ];
 const inputs={};
 for(const [id,label,type,required] of fields){
  const wrap=document.createElement('label');wrap.textContent=label;wrap.style.cssText='display:grid;gap:6px';
  const input=document.createElement('input');input.id=id;input.type=type;input.required=required;input.style.cssText='padding:12px;width:100%;box-sizing:border-box';
  if(type==='number'){input.min='1';input.max='10000';input.step='0.01';input.value='59';}
  if(type==='file')input.accept='application/pdf,.pdf';
  wrap.append(input);form.append(wrap);inputs[id]=input;
 }
 const activeWrap=document.createElement('label');const active=document.createElement('input');active.type='checkbox';active.checked=true;activeWrap.append(active,document.createTextNode(' Publish immediately'));form.append(activeWrap);
 const button=document.createElement('button');button.className='button dark';button.type='submit';button.textContent='Upload and save product';
 const status=document.createElement('p');status.setAttribute('role','status');
 form.prepend(heading);form.append(button,status);section.insertBefore(form,document.getElementById('adminEmpty'));
 form.onsubmit=async e=>{
  e.preventDefault();button.disabled=true;status.textContent='Preparing secure upload…';
  try{
   const file=inputs.productFile.files[0];
   if(!file||(!file.name.toLowerCase().endsWith('.pdf')&&file.type!=='application/pdf')||file.size>52428800||file.size<1)throw new Error('Select a PDF smaller than 50 MB.');
   const price=Math.round(Number(inputs.productPrice.value)*100);
   if(!Number.isInteger(price)||price<100||price>1000000)throw new Error('Price must be between ₹1 and ₹10,000.');
   const upload=await adminApi('/api/admin/upload',{method:'POST',body:JSON.stringify({name:file.name,size:file.size,type:'application/pdf'})});
   status.textContent='Uploading PDF securely…';
   const {error:storageError}=await sb.storage.from('private-pdfs').uploadToSignedUrl(upload.path,upload.token,file,{contentType:'application/pdf',upsert:false});
   if(storageError)throw storageError;
   status.textContent='Saving product…';
   await adminApi('/api/admin-products',{method:'POST',body:JSON.stringify({title:inputs.productTitle.value,description:inputs.productDescription.value,price_paise:price,pdf_asset_key:upload.path,active:active.checked})});
   status.textContent='Product saved successfully.';form.remove();await loadAdmin();
  }catch(err){status.textContent='Upload failed: '+(err.message||'Please try again.');}finally{button.disabled=false;}
 };
}
document.getElementById('uploadPdfButton')?.addEventListener('click',openProductForm);
loadAdmin().catch(e=>{console.error(e);message(e.message||'Unable to initialize administrator verification.');});
