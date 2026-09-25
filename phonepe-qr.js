// QR data regenerated from the verified UPI destination in the owner's PhonePe image.
// No external QR service or payment processor is contacted.
const PAPERWISE_UPI='upi://pay?pa=7075496807@axl&pn=NASAM%20%20SHASHANK&mc=0000&mode=02&purpose=00';
const PAPERWISE_QR_ROWS='000000000000000,000000000000000,000000000000000,000000000000000,01fd34b2e8717f0,01047a0c5c5f410,0175e2addba35d0,0174c4dfbd3a5d0,0175a82fcfa05d0,0104b99468e4410,01fd555555557f0,00019ee44bd0000,000ce3b7de29550,009a3bd7d7cdf70,004664163de3cb0,01911d224d2ac10,00be4fcae2bc930,007806fb5b1ae20,001ec196ecd53b0,0101fa003746ec0,00b452b04431cf0,0198bbd00a006a0,010ccdd03f5f170,01c9e625f9203a0,008faf849493070,01106dd6a3ff760,00dfcaafdef5fb0,017194dc6c17130,00d53b15545d500,011188fc4da3120,01bfc8e7e37ffb0,0028ed43ae640c0,00b793203e9add0,01404eba5a38620,00848a8ea5acc30,0059d8e63a3d890,010f1bd31057990,0112ca4d977d160,014e8ab93c53c90,01c2b5beffaa400,01440d5ca1b6f30,0172f51c88b0ac0,008c3c0c986cc50,00e34b965e8b4d0,01c44c2fd4d7f60,000159644eef120,01fc690d4ced5f0,010532545b031b0,0174ad5fe419fe0,0174597d777ead0,0174b8b9e66ec70,01044a14b162d10,01fce45b39fc810,000000000000000,000000000000000,000000000000000,000000000000000'.split(',');
function renderPaymentQR(target){
 const img=document.createElement('img');
 img.src='assets/phonepe-qr.webp';
 img.alt='PhonePe merchant QR for NASAM SHASHANK';
 img.loading='eager';
 img.style.cssText='display:block;width:100%;max-width:270px;height:auto;margin:auto';
 img.onerror=()=>{target.textContent='QR image unavailable. Use the Open UPI app button or the displayed UPI ID instead.';};
 target.replaceChildren(img);
}
