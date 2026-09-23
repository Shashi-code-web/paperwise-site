import crypto from 'crypto';import getRawBody from 'raw-body';import {supabaseAdmin,json} from './_lib/supabase.js';
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const raw=(await getRawBody(req)).toString('utf8'); const signature=req.headers['x-razorpay-signature']; if(!signature)return json(res,400,{error:'Missing signature'});
  const expected=crypto.createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'); const a=Buffer.from(expected,'utf8'),b=Buffer.from(String(signature),'utf8');
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return json(res,401,{error:'Invalid signature'});
  const event=JSON.parse(raw); const p=event.payload?.payment?.entity; if(event.event==='payment.captured'&&p?.order_id){
    const {error}=await supabaseAdmin().from('orders').update({status:'paid',provider_payment_id:p.id,paid_at:new Date().toISOString()}).eq('provider_order_id',p.order_id); if(error)throw error;
  }
  return json(res,200,{received:true});
 }catch(e){return json(res,500,{error:'Webhook processing failed'})}
}