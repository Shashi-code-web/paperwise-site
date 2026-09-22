import Razorpay from 'razorpay';
import crypto from 'crypto';
import {supabaseAdmin,requireUser,json} from './_lib/supabase.js';
const razor=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{const user=await requireUser(req);const {productId}=req.body||{};const db=supabaseAdmin();const {data:product,error}=await db.from('products').select('id,title,price,storage_path').eq('id',productId).eq('published',true).single();if(error||!product)return json(res,404,{error:'Product not found'});const amount=Math.round(Number(product.price)*100);const order=await razor.orders.create({amount,currency:'INR',receipt:crypto.randomUUID(),notes:{product_id:product.id,user_id:user.id}});await db.from('orders').insert({user_id:user.id,product_id:product.id,razorpay_order_id:order.id,amount:product.price,status:'created'});return json(res,200,{orderId:order.id,amount,currency:'INR',keyId:process.env.RAZORPAY_KEY_ID});}catch(e){return json(res,e.message==='Unauthorized'?401:500,{error:e.message})}}