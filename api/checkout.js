import crypto from 'node:crypto';
import {requireUser,supabaseAdmin,json} from './_lib/supabase.js';
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req),{productIds}=req.body||{};
  if(!Array.isArray(productIds)||!productIds.length||productIds.length>10||productIds.some(x=>typeof x!=='string')||new Set(productIds).size!==productIds.length)return json(res,400,{error:'Choose 1–10 distinct products'});
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return json(res,503,{error:'Payments are not configured yet'});
  const db=supabaseAdmin(),{data:products,error}=await db.from('products').select('id,title,price_paise').in('id',productIds).eq('active',true);
  if(error||products.length!==productIds.length)return json(res,400,{error:'Some products are unavailable'});
  const amount=products.reduce((sum,p)=>sum+p.price_paise,0);
  const basic=Buffer.from(process.env.RAZORPAY_KEY_ID+':'+process.env.RAZORPAY_KEY_SECRET).toString('base64');
  const paymentResponse=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+basic,'Content-Type':'application/json'},body:JSON.stringify({amount,currency:'INR',receipt:'pw_'+crypto.randomUUID(),notes:{user_id:user.id}})});
  if(!paymentResponse.ok)throw new Error('Payment provider rejected order');
  const provider=await paymentResponse.json();
  const {data:order,error:oe}=await db.from('orders').insert({user_id:user.id,amount_paise:amount,currency:'INR',status:'pending',provider_order_id:provider.id}).select('id').single();
  if(oe)throw oe;
  const {error:ie}=await db.from('order_items').insert(products.map(p=>({order_id:order.id,product_id:p.id,unit_price_paise:p.price_paise})));
  if(ie)throw ie;
  return json(res,200,{orderId:order.id,razorpayOrderId:provider.id,amount,currency:'INR',keyId:process.env.RAZORPAY_KEY_ID});
 }catch(e){console.error('Checkout failed:',e.message);return json(res,e.status||500,{error:e.status?e.message:'Unable to start checkout'});}
}