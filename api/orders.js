import Razorpay from 'razorpay';
import crypto from 'crypto';
import {supabaseAdmin,requireUser,json} from './_lib/supabase.js';
const razor=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req); const {productId}=req.body||{}; if(!productId)return json(res,400,{error:'productId is required'});
  const db=supabaseAdmin(); const {data:product,error}=await db.from('products').select('id,title,price_paise').eq('id',productId).eq('active',true).single();
  if(error||!product)return json(res,404,{error:'Product not found'});
  const amount=Number(product.price_paise); const rp=await razor.orders.create({amount,currency:'INR',receipt:crypto.randomUUID(),notes:{product_id:product.id,user_id:user.id}});
  const {data:order,error:oe}=await db.from('orders').insert({user_id:user.id,amount_paise:amount,currency:'INR',status:'pending',provider_order_id:rp.id}).select('id').single();
  if(oe)throw oe; const {error:ie}=await db.from('order_items').insert({order_id:order.id,product_id:product.id,unit_price_paise:amount}); if(ie)throw ie;
  return json(res,200,{orderId:rp.id,amount,currency:'INR',keyId:process.env.RAZORPAY_KEY_ID});
 }catch(e){return json(res,e.message==='Unauthorized'?401:500,{error:e.message||'Server error'})}
}