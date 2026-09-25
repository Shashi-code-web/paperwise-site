const API=(window.PAPERWISE_API_BASE||'').replace(/\/$/,'');
const sb=window.supabase&&window.PAPERWISE_SUPABASE_URL&&window.PAPERWISE_SUPABASE_ANON_KEY
  ?window.supabase.createClient(window.PAPERWISE_SUPABASE_URL,window.PAPERWISE_SUPABASE_ANON_KEY):null;
let products=[];
let cart=[];
try{const stored=JSON.parse(localStorage.getItem('paperwise-cart')||'[]');cart=Array.isArray(stored)?stored.filter(id=>typeof id==='string'):[];}catch{localStorage.removeItem('paperwise-cart');}
const $=s=>document.querySelector(s),grid=$('#productGrid'),toast=$('#toast');

function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800);}
function save(){localStorage.setItem('paperwise-cart',JSON.stringify(cart));renderCart();}
function colorFor(index){return ['sage','peach','lavender'][index%3];}
function productById(id){return products.find(p=>p.id===id);}
function renderProducts(){
  grid.replaceChildren();
  if(!products.length){
    const empty=document.createElement('div');empty.className='empty';empty.style.gridColumn='1/-1';empty.textContent='New editions are being prepared.';grid.append(empty);return;
  }
  products.forEach((p,index)=>{
    const article=document.createElement('article');article.className='product';
    const cover=document.createElement('div');cover.className='cover '+colorFor(index);
    const label=document.createElement('small');label.textContent='PAPERWISE / EDITION';
    const title=document.createElement('div');title.className='cover-title';title.textContent=p.title;
    const foot=document.createElement('div');foot.className='cover-foot';foot.textContent='DIGITAL EDITION';
    cover.append(label,title,foot);
    const info=document.createElement('div');info.className='product-info';
    const h=document.createElement('h3');h.textContent=p.title;
    const price=document.createElement('span');price.className='price';price.textContent='₹'+(p.price_paise/100).toFixed(0);
    const desc=document.createElement('p');desc.textContent=p.description;
    const actions=document.createElement('div');actions.className='product-actions';
    const preview=document.createElement('button');preview.className='tiny-btn preview';preview.textContent='Preview';preview.dataset.preview=p.id;
    const add=document.createElement('button');add.className='tiny-btn';add.textContent='Add to bag +';add.dataset.add=p.id;
    actions.append(preview,add);info.append(h,price,desc,actions);article.append(cover,info);grid.append(article);
  });
}
function renderCart(){
  // Ignore saved cart IDs until products have loaded; discard stale IDs afterwards.
  const visibleCart=products.length ? cart.filter(id=>productById(id)) : [];
  if(products.length && visibleCart.length!==cart.length){cart=visibleCart;localStorage.setItem('paperwise-cart',JSON.stringify(cart));}
  $('#cartCount').textContent=visibleCart.length;
  const items=visibleCart.map(productById);
  $('#cartTotal').textContent='₹'+(items.reduce((n,p)=>n+p.price_paise,0)/100).toFixed(0);
  $('#cartItems').innerHTML='';
  if(!items.length){$('#cartItems').innerHTML='<div class="empty">Your bag is waiting for a good read.</div>';}
  else items.forEach((p,i)=>{
    const row=document.createElement('div');row.className='cart-item';
    const mini=document.createElement('div');mini.className='mini-cover '+colorFor(products.indexOf(p));mini.textContent=p.title;
    const meta=document.createElement('div');const h=document.createElement('h4');h.textContent=p.title;const d=document.createElement('p');d.textContent='Digital PDF · ₹'+(p.price_paise/100).toFixed(0);meta.append(h,d);
    const remove=document.createElement('button');remove.className='remove';remove.textContent='Remove';remove.dataset.remove=String(i);
    row.append(mini,meta,remove);$('#cartItems').append(row);
  });
  $('#checkoutBtn').disabled=!items.length;$('#checkoutBtn').textContent=items.length?'Pay via UPI →':'Add an edition to continue';$('#checkoutBtn').style.opacity=items.length?'1':'.45';
}
function drawer(id,on=true){$('#'+id).classList.toggle('open',on);$('#overlay').classList.toggle('open',on);$('#'+id).setAttribute('aria-hidden',!on);}
async function session(){if(!sb)return null;return (await sb.auth.getSession()).data.session||null;}
async function apiFetch(path,options={}){
  const s=await session();if(!s)throw new Error('Please sign in first.');
  const res=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',...(options.headers||{})}});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Request failed');return data;
}
function renderAccountLogin(){
  $('#accountContent').replaceChildren();
  const note=document.createElement('p');note.className='login-note';note.textContent='Create an account or sign in to access purchases and downloads.';
  if(!sb){note.textContent='Account sign-in is temporarily unavailable.';$('#accountContent').append(note);return;}
  const email=document.createElement('input');email.type='email';email.placeholder='Email address';email.autocomplete='email';
  const pass=document.createElement('input');pass.type='password';pass.placeholder='Password';pass.autocomplete='current-password';
  const signIn=document.createElement('button');signIn.className='button dark full';signIn.textContent='Sign in';
  const signUp=document.createElement('button');signUp.className='button cream full';signUp.style.marginTop='10px';signUp.textContent='Create account';
  const status=document.createElement('p');status.className='login-note';
  signIn.onclick=async()=>{status.textContent='Signing in…';try{const {error}=await sb.auth.signInWithPassword({email:email.value.trim(),password:pass.value});if(error)throw error;await renderAccount();}catch(e){status.textContent=e.message||'Sign in failed';}};
  signUp.onclick=async()=>{status.textContent='Creating account…';try{const {data,error}=await sb.auth.signUp({email:email.value.trim(),password:pass.value});if(error)throw error;status.textContent=data.session?'Account created.':'Account created. Check your email if confirmation is required.';if(data.session)await renderAccount();}catch(e){status.textContent=e.message||'Sign up failed';}};
  $('#accountContent').append(note,email,pass,signIn,signUp,status);
}
async function renderAccount(){
  const s=await session();$('#accountContent').replaceChildren();
  if(!s){renderAccountLogin();return;}
  const head=document.createElement('div');const who=document.createElement('p');who.className='login-note';who.textContent='Signed in as '+(s.user.email||'customer');
  const signOut=document.createElement('button');signOut.className='button cream full';signOut.textContent='Sign out';signOut.onclick=async()=>{await sb.auth.signOut();renderAccount();};
  const area=document.createElement('div');area.className='account-area';const h=document.createElement('h3');h.textContent='Your library';area.append(h);
  $('#accountContent').append(who,signOut,area);
  try{
    const data=await apiFetch('/api/library');
    try{
      const manual=await apiFetch('/api/manual-orders');
      for(const order of manual.orders||[]){
        if(order.status==='paid')continue;
        const line=document.createElement('p');line.className='login-note';
        line.textContent=(order.order_items||[]).map(i=>i.products?.title||'Edition').join(', ')+' — '+(order.status==='pending'?'Awaiting admin verification':order.status==='failed'?'Payment not approved':order.status);
        area.append(line);
      }
    }catch(err){console.warn('Manual order status unavailable',err);}
    if(!data.orders?.length){const empty=document.createElement('p');empty.className='login-note';empty.textContent='Approved editions will appear here for download.';area.append(empty);return;}
    for(const order of data.orders){
      const day=document.createElement('small');day.textContent=order.paid_at?new Date(order.paid_at).toLocaleDateString():'Paid';
      for(const item of order.order_items||[]){
        const row=document.createElement('div');row.className='order';
        const title=document.createElement('span');title.textContent=item.products?.title||'Edition';
        const dl=document.createElement('button');dl.className='tiny-btn';dl.textContent='Download';dl.onclick=async()=>{dl.disabled=true;try{const result=await apiFetch('/api/download',{method:'POST',body:JSON.stringify({productId:item.products.id})});window.location.href=result.url;setTimeout(()=>{dl.disabled=false;},1200);}catch(e){showToast(e.message);dl.disabled=false;}};
        row.append(title,day,dl);area.append(row);
      }
    }
  }catch(e){const err=document.createElement('p');err.className='login-note';err.textContent=e.message;area.append(err);}
}
async function startCheckout(){
 if(!cart.length)return showToast('Add an edition to your bag first.');
 const s=await session();if(!s){drawer('cartDrawer',false);drawer('accountDrawer');await renderAccount();showToast('Sign in before paying.');return;}
 const total=cart.map(productById).filter(Boolean).reduce((sum,p)=>sum+p.price_paise,0);
 if(!total)return showToast('Your bag is empty.');
 $('#paymentAmount').textContent='₹'+(total/100).toFixed(2);
 $('#openUpiApp').href=PAPERWISE_UPI+'&am='+(total/100).toFixed(2)+'&cu=INR';
 renderPaymentQR($('#paymentQr'));
 $('#paymentStatus').textContent='';
 $('#transactionId').value='';
 $('#submitManualPayment').disabled=false;
 $('#submitManualPayment').textContent='Submit for admin verification';
 drawer('cartDrawer',false);
 $('#paymentDialog').showModal();
}
$('#closePayment').onclick=()=>$('#paymentDialog').close();
$('#manualPaymentForm').onsubmit=async e=>{
 e.preventDefault();
 const btn=$('#submitManualPayment'),status=$('#paymentStatus'),reference=$('#transactionId').value.trim().toUpperCase();
 if(!/^[A-Z0-9]{10,35}$/.test(reference)){status.textContent='Enter a valid transaction ID.';return;}
 btn.disabled=true;status.textContent='Submitting for administrator review…';
 try{
  const result=await apiFetch('/api/checkout',{method:'POST',body:JSON.stringify({productIds:cart,transactionId:reference})});
  status.textContent=result.message||'Submitted for manual review.';
  cart=[];save();btn.textContent='Submitted — awaiting admin approval';
  showToast('Payment submitted. Await administrator approval.');
 }catch(err){status.textContent=err.message||'Unable to submit payment';btn.disabled=false;}
};

async function loadProducts(){
  try{const res=await fetch(API+'/api/products');const data=await res.json();if(!res.ok)throw new Error(data.error||'Unable to load editions');products=(data.products||[]);renderProducts();renderCart();}
  catch(e){grid.innerHTML='<div class="empty" style="grid-column:1/-1">The catalogue is temporarily unavailable. Please try again shortly.</div>';showToast(e.message);}
}
renderProducts();renderCart();loadProducts();
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-add],[data-preview],[data-remove],[data-close]');if(!target)return;
  const id=target.dataset.add;
  if(id){if(!cart.includes(id)){cart.push(id);save();showToast('Added to your bag.');}else showToast('Already in your bag.');return;}
  const pre=target.dataset.preview;
  if(pre){const p=productById(pre);if(!p)return;$('#previewTitle').textContent=p.title;$('#previewQuote').textContent=p.description;$('#previewDialog').showModal();return;}
  if(target.dataset.remove!==undefined){cart.splice(Number(target.dataset.remove),1);save();}
  if(target.dataset.close)drawer(target.dataset.close,false);
});
$('#cartBtn').onclick=()=>drawer('cartDrawer');
$('#accountBtn').onclick=async()=>{drawer('accountDrawer');await renderAccount();};
$('#overlay').onclick=()=>{drawer('cartDrawer',false);drawer('accountDrawer',false);};
$('#closePreview').onclick=()=>$('#previewDialog').close();
$('#viewAll').onclick=()=>document.querySelector('#library').scrollIntoView({behavior:'smooth'});
$('#checkoutBtn').onclick=startCheckout;
$('#newsletterForm').onsubmit=e=>{e.preventDefault();showToast('Newsletter sign-up is coming soon.');};

(function(){
  const params=new URLSearchParams(window.location.search);
  if(params.get('adminLogin')!=='1'||!sb)return;
  const box=document.createElement('div');
  box.innerHTML='<div style="position:fixed;inset:0;background:rgba(13,23,36,.96);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px"><div style="background:#fff;width:100%;max-width:420px;padding:32px;border-radius:16px;box-sizing:border-box"><h2 style="margin-top:0">Paperwise Admin</h2><p>Sign in to continue to the admin console.</p><input id="adminEmail" type="email" placeholder="Admin email" autocomplete="username" style="width:100%;padding:14px;margin:8px 0;box-sizing:border-box"><input id="adminPassword" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;padding:14px;margin:8px 0;box-sizing:border-box"><button id="adminLoginButton" style="width:100%;padding:14px;margin-top:10px;cursor:pointer">Sign in</button><p id="adminLoginMessage" style="margin-top:14px"></p><button id="adminBackButton" style="border:0;background:none;cursor:pointer">← Back to Paperwise</button></div></div>';
  document.body.appendChild(box);
  const email=$('#adminEmail'),password=$('#adminPassword'),button=$('#adminLoginButton'),message=$('#adminLoginMessage'),back=$('#adminBackButton');
  button.onclick=async()=>{message.textContent='Signing in…';button.disabled=true;const {error}=await sb.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error){message.textContent=error.message;button.disabled=false;return;}location.href='admin.html?v=7';};
  back.onclick=()=>location.href='index.html';
})();
