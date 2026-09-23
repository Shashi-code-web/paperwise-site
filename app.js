const products=[
 {id:'space',title:'Make Space For It',sub:'A gentle guide to clearing your mind',price:59,color:'sage',cover:'Make\nSpace\nFor It.',pages:42,quote:'“A little space is often all a good idea needs.”'},
 {id:'ordinary',title:'The Ordinary Days',sub:'Finding the magic in what is already here',price:59,color:'peach',cover:'The\nOrdinary\nDays.',pages:36,quote:'“The life you want may be hiding in plain sight.”'},
 {id:'begin',title:'Begin Again',sub:'Notes on starting before you feel ready',price:59,color:'lavender',cover:'Begin\nAgain.',pages:30,quote:'“You do not need a perfect beginning.”'}
];
let cart=JSON.parse(localStorage.getItem('paperwise-cart')||'[]');
const $=s=>document.querySelector(s), grid=$('#productGrid'), toast=$('#toast');
function renderProducts(){grid.innerHTML=products.map(p=>`<article class="product"><div class="cover ${p.color}"><small>PAPERWISE / ${p.id.toUpperCase()}</small><div class="cover-title">${p.cover.replaceAll('\n','<br>')}</div><div class="cover-foot">DIGITAL EDITION · ${p.pages} PAGES</div></div><div class="product-info"><h3>${p.title}</h3><span class="price">₹${p.price}</span><p>${p.sub}</p><div class="product-actions"><button class="tiny-btn preview" data-preview="${p.id}">Preview</button><button class="tiny-btn" data-add="${p.id}">Add to bag +</button></div></div></article>`).join('')}
function showToast(t){toast.textContent=t;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}
function save(){localStorage.setItem('paperwise-cart',JSON.stringify(cart));renderCart()}
function renderCart(){const items=cart.map(id=>products.find(p=>p.id===id));$('#cartCount').textContent=items.length;$('#cartTotal').textContent='₹'+items.reduce((n,p)=>n+p.price,0);$('#cartItems').innerHTML=items.length?items.map((p,i)=>`<div class="cart-item"><div class="mini-cover ${p.color}">${p.title}</div><div><h4>${p.title}</h4><p>Digital PDF · ₹${p.price}</p></div><button class="remove" data-remove="${i}">Remove</button></div>`).join(''):'<div class="empty">Your bag is waiting for a good read.</div>';$('#checkoutBtn').disabled=!items.length;$('#checkoutBtn').style.opacity=items.length?'1':'.45'}
function drawer(id,on=true){$('#'+id).classList.toggle('open',on);$('#overlay').classList.toggle('open',on);$('#'+id).setAttribute('aria-hidden',!on)}
renderProducts();renderCart();
document.addEventListener('click',e=>{let id=e.target.dataset.add;if(id){cart.push(id);save();showToast('Added to your bag.');return}let pre=e.target.dataset.preview;if(pre){let p=products.find(x=>x.id===pre);$('#previewTitle').textContent=p.title;$('#previewQuote').textContent=p.quote;$('#previewDialog').showModal();return}if(e.target.dataset.remove!==undefined){cart.splice(+e.target.dataset.remove,1);save()}if(e.target.dataset.close)drawer(e.target.dataset.close,false)});
$('#cartBtn').onclick=()=>drawer('cartDrawer');$('#accountBtn').onclick=()=>{drawer('accountDrawer');$('#accountContent').innerHTML=`<p class="login-note">Sign in to see your past purchases and access your private library.</p><input placeholder="Email address" type="email"><button class="button dark full" id="loginDemo">Continue with email →</button><div class="account-area"><h3>Your library</h3><p class="login-note">After a verified purchase, each edition is available here with a fresh, time-limited download link.</p></div>`;document.querySelector('#loginDemo').onclick=()=>showToast('Account sign-in connects to your secure server.');};$('#overlay').onclick=()=>{drawer('cartDrawer',false);drawer('accountDrawer',false)};$('#closePreview').onclick=()=>$('#previewDialog').close();$('#viewAll').onclick=()=>showToast('Three carefully made editions, with more on the way.');$('#checkoutBtn').onclick=()=>showToast('Secure checkout starts on your server via Razorpay.');$('#newsletterForm').onsubmit=e=>{e.preventDefault();e.target.reset();showToast('You’re on the list — welcome.');};
// PaperWise admin login
(function () {
  const params = new URLSearchParams(window.location.search);

  if (params.get('adminLogin') !== '1') return;

  const supabaseClient = window.supabase.createClient(
    window.PAPERWISE_SUPABASE_URL,
    window.PAPERWISE_SUPABASE_ANON_KEY
  );

  const box = document.createElement('div');

  box.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      background:rgba(13,23,36,.96);
      z-index:99999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
    ">
      <div style="
        background:#fff;
        width:100%;
        max-width:420px;
        padding:32px;
        border-radius:16px;
        box-sizing:border-box;
      ">
        <h2 style="margin-top:0">Paperwise Admin</h2>
        <p>Sign in to continue to the admin console.</p>

        <input
          id="adminEmail"
          type="email"
          placeholder="Admin email"
          autocomplete="username"
          style="width:100%;padding:14px;margin:8px 0;box-sizing:border-box"
        >

        <input
          id="adminPassword"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          style="width:100%;padding:14px;margin:8px 0;box-sizing:border-box"
        >

        <button
          id="adminLoginButton"
          style="width:100%;padding:14px;margin-top:10px;cursor:pointer"
        >
          Sign in
        </button>

        <p id="adminLoginMessage" style="margin-top:14px"></p>

        <button
          id="adminBackButton"
          style="border:0;background:none;cursor:pointer"
        >
          ← Back to Paperwise
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(box);

  const email = document.getElementById('adminEmail');
  const password = document.getElementById('adminPassword');
  const loginButton = document.getElementById('adminLoginButton');
  const message = document.getElementById('adminLoginMessage');
  const backButton = document.getElementById('adminBackButton');

  loginButton.addEventListener('click', async () => {
    message.textContent = 'Signing in...';
    loginButton.disabled = true;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    });

    if (error) {
      message.textContent = error.message;
      loginButton.disabled = false;
      return;
    }

    window.location.href = 'admin.html';
  });

  backButton.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
})();
