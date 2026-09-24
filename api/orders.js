import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import {supabaseAdmin,requireUser,json} from './_lib/supabase.js';
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req);
  const {productId}=req.body||{};
  if(typeof productId!=='string')return json(res,400,{error:'Product required'});
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return json(res,503,{error:'Payments are not configured yet'});
  const db=supabaseAdmin();
  const {data:product,error}=await db.from('products').select('id,title,price_paise').eq('id',productId).eq('active',true).single();
  if(error||!product)return json(res,404,{error:'Product unavailable'});
  const razor=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
  const provider=await razor.orders.create({amount:product.price_paise,currency:'INR',receipt:crypto.randomUUID(),notes:{product_id:product.id,user_id:user.id}});
  const {data:order,error:oe}=await db.from('orders').insert({user_id:user.id,amount_paise:product.price_paise,currency:'INR',status:'pending',provider_order_id:provider.id}).select('id').single();
  if(oe)throw oe;
  const {error:ie}=await db.from('order_items').insert({order_id:order.id,product_id:product.id,unit_price_paise:product.price_paise});
  if(ie)throw ie;
  return json(res,200,{orderId:provider.id,amount:product.price_paise,currency:'INR',keyId:process.env.RAZORPAY_KEY_ID});
 }catch(e){console.error('Order creation failed:',e.message);return json(res,e.status||500,{error:e.status?e.message:'Unable to start payment'});}
}