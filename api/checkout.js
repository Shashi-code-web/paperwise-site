import crypto from 'node:crypto';
import {requireUser,supabaseAdmin,json,cors} from './_lib/supabase.js';
export default async function handler(req,res){
 cors(req,res);
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req);
  const {productIds,transactionId}=req.body||{};
  if(!Array.isArray(productIds)||!productIds.length||productIds.length>10||productIds.some(x=>typeof x!=='string')||new Set(productIds).size!==productIds.length)return json(res,400,{error:'Choose 1–10 distinct products'});
  const reference=String(transactionId||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{10,35}$/.test(reference))return json(res,400,{error:'Enter a valid 10–35 character UPI transaction ID'});
  const db=supabaseAdmin();
  const {data:products,error}=await db.from('products').select('id,title,price_paise').in('id',productIds).eq('active',true);
  if(error||products?.length!==productIds.length)return json(res,400,{error:'Some products are unavailable'});
  const amount=products.reduce((sum,p)=>sum+p.price_paise,0);
  const {data:order,error:oe}=await db.from('orders').insert({user_id:user.id,amount_paise:amount,currency:'INR',status:'pending',provider_order_id:'manual_'+crypto.randomUUID(),manual_payment_reference:reference,manual_submitted_at:new Date().toISOString()}).select('id').single();
  if(oe){if(oe.code==='23505')return json(res,409,{error:'This transaction ID has already been submitted'});throw oe;}
  const {error:ie}=await db.from('order_items').insert(products.map(p=>({order_id:order.id,product_id:p.id,unit_price_paise:p.price_paise})));
  if(ie){await db.from('orders').delete().eq('id',order.id);throw ie;}
  return json(res,201,{orderId:order.id,status:'pending',message:'Payment submitted for administrator review. Your PDF will unlock only after approval.'});
 }catch(e){console.error('Manual payment submission failed:',e.message);return json(res,e.status||500,{error:e.status?e.message:'Unable to submit payment. Please try again.'});}
}
