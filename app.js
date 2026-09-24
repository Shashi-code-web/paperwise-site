const sb=window.supabase?.createClient(window.PAPERWISE_SUPABASE_URL,window.PAPERWISE_SUPABASE_ANON_KEY);
const api=window.PAPERWISE_API_BASE;
const $=s=>document.querySelector(s);
let products=[],cart=JSON.parse(localStorage.getItem('paperwise-cart')||'[]');
const toast=$('#toast');
function notify(s){toast.textContent=s;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4500);}
function safe(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function money(p){return '₹'+(p/100).toFixed(2);}
function save(){localStorage.setItem('paperwise-cart',JSON.stringify(cart));renderCart();}
function renderProducts(){
 $('#productGrid').innerHTML=products.length?products.map(p=>`<article class="product"><div class="cover sage"><small>PAPERWISE / DIGITAL EDITION</small><div class="cover-title">${safe(p.title)}</div><div class="cover-foot">INSTANT DIGITAL DELIVERY</div></div><div class="product-info"><h3>${safe(p.title)}</h3><span class="price">${money(p.price_paise)}</span><p>${safe(p.description)}</p><div class="product-actions"><button class="tiny-btn preview" data-preview="${p.id}">Preview details</button><button class="tiny-btn" data-add="${p.id}">Add to bag +</button></div></div></article>`).join(''):'<p class="empty">Our first editions are coming soon. Check back shortly.</p>';
}
function renderCart(){
 const items=cart.map(id=>products.find(p=>p.id===id)).filter(Boolean);
 $('#cartCount').textContent=items.length;$('#cartTotal').textContent=money(items.reduce((n,p)=>n+p.price_paise,0));
 $('#cartItems').innerHTML=items.length?items.map((p,i)=>`<div class="cart-item"><div class="mini-cover sage">${safe(p.title)}</div><div><h4>${safe(p.title)}</h4><p>Digital PDF · ${money(p.price_paise)}</p></div><button class="remove" data-remove="${i}">Remove</button></div>`).join(''):'<div class="empty">Your bag is waiting for a good read.</div>';
 $('#checkoutBtn').disabled=!items.length;$('#checkoutBtn').style.opacity=items.length?'1':'.45';
}
async function loadProducts(){
 try{const r=await fetch(api+'/api/products');if(!r.ok)throw Error('Catalogue unavailable');const d=await r.json();products=d.products||[];cart=cart.filter(id=>products.some(p=>p.id===id));renderProducts();save();}
 catch(e){$('#productGrid').textContent='Catalogue temporarily unavailable. Please try again later.';}
}
function drawer(id,on=true){$('#'+id).classList.toggle('open',on);$('#overlay').classList.toggle('open',on);$('#'+id).setAttribute('aria-hidden',String(!on));}
async function session(){return (await sb.auth.getSession()).data.session;}
async function request(path,options={}){
 const s=await session();if(!s)throw Error('Please sign in first');
 const r=await fetch(api+path,{...options,headers:{Authorization:'Bearer '+s.access_token,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d;
}
async function library(){
 const target=$('#accountContent');target.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Your purchased library';target.append(heading);
 try{
  const data=await request('/api/library');
  if(!data.orders.length){target.append(document.createTextNode('No completed purchases yet.'));return;}
  for(const order of data.orders)for(const item of order.order_items||[]){
   const p=item.products;if(!p)continue;
   const row=document.createElement('div');row.className='account-area';
   const title=document.createElement('h4');title.textContent=p.title;
   const button=document.createElement('button');button.className='tiny-btn';button.textContent='Download PDF';
   button.onclick=async()=>{button.disabled=true;try{const d=await request('/api/download',{method:'POST',body:JSON.stringify({productId:p.id})});window.open(d.url,'_blank','noopener,noreferrer');}catch(e){notify(e.message);}finally{button.disabled=false;}};
   row.append(title,button);target.append(row);
  }
 }catch(e){target.append(document.createTextNode(e.message));}
}
async function account(){
 drawer('accountDrawer');
 const target=$('#accountContent'),s=await session();
 if(s){target.innerHTML='<p>Signed in as '+safe(s.user.email)+'</p><button class="button dark full" id="myLibrary">My purchases</button><button class="tiny-btn" id="signOut">Sign out</button>';$('#myLibrary').onclick=library;$('#signOut').onclick=async()=>{await sb.auth.signOut();account();};return;}
 target.innerHTML='<h3>Sign in or create an account</h3><form id="customerAuth"><input id="customerEmail" type="email" placeholder="Email" required autocomplete="email" style="width:100%;padding:12px;margin:8px 0"><input id="customerPassword" type="password" placeholder="Password (6+ characters)" minlength="6" required autocomplete="current-password" style="width:100%;padding:12px;margin:8px 0"><button class="button dark full" type="submit">Sign in</button><button class="tiny-btn" type="button" id="signUp">Create account</button><p id="authStatus" role="status"></p></form>';
 const email=$('#customerEmail'),password=$('#customerPassword'),status=$('#authStatus');
 $('#customerAuth').onsubmit=async e=>{e.preventDefault();status.textContent='Signing in…';const {error}=await sb.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error)status.textContent=error.message;else account();};
 $('#signUp').onclick=async()=>{status.textContent='Creating account…';const {error}=await sb.auth.signUp({email:email.value.trim(),password:password.value});status.textContent=error?error.message:'Account created. Check your email for a confirmation link if required, then sign in.';};
}
async function loadRazorpay(){
 if(window.Razorpay)return;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(Error('Payment window unavailable'));document.head.append(s);});
}
async function checkout(){
 if(!cart.length)return;
 if(!(await session())){notify('Sign in to continue to checkout.');await account();return;}
 const button=$('#checkoutBtn');button.disabled=true;
 try{
  const d=await request('/api/checkout',{method:'POST',body:JSON.stringify({productIds:[...new Set(cart)]})});
  await loadRazorpay();
  const rz=new window.Razorpay({key:d.keyId,amount:d.amount,currency:d.currency,order_id:d.razorpayOrderId,name:'PaperWise',description:'Digital PDF editions',handler:async()=>{cart=[];save();drawer('cartDrawer',false);notify('Payment submitted. Your download appears after payment verification.');await account();await library();},modal:{ondismiss:()=>{button.disabled=false;}}});
  rz.on('payment.failed',()=>{notify('Payment was not completed. Please retry.');button.disabled=false;});rz.open();
 }catch(e){notify(e.message);button.disabled=false;}
}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-add]');if(add){if(!cart.includes(add.dataset.add))cart.push(add.dataset.add);save();notify('Added to your bag.');return;}
 const preview=e.target.closest('[data-preview]');if(preview){const p=products.find(x=>x.id===preview.dataset.preview);if(p){$('#previewTitle').textContent=p.title;$('#previewQuote').textContent=p.description;$('#previewDialog').showModal();}return;}
 const remove=e.target.closest('[data-remove]');if(remove){cart.splice(Number(remove.dataset.remove),1);save();return;}
 const close=e.target.closest('[data-close]');if(close)drawer(close.dataset.close,false);
});
$('#cartBtn').onclick=()=>drawer('cartDrawer');$('#accountBtn').onclick=account;$('#checkoutBtn').onclick=checkout;
$('#overlay').onclick=()=>{drawer('cartDrawer',false);drawer('accountDrawer',false);};
$('#closePreview').onclick=()=>$('#previewDialog').close();
$('#viewAll').onclick=()=>$('#library').scrollIntoView({behavior:'smooth'});
$('#newsletterForm').onsubmit=e=>{e.preventDefault();notify('Newsletter registration is not available yet.');};
loadProducts();
