import crypto from 'node:crypto';
import {supabaseAdmin,json} from '../_lib/supabase.js';
export const config={api:{bodyParser:false}};
async function raw(req){const chunks=[];for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));return Buffer.concat(chunks);}
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  if(!process.env.RAZORPAY_WEBHOOK_SECRET)return json(res,503,{error:'Webhook not configured'});
  const body=await raw(req),sig=req.headers['x-razorpay-signature']||'';
  const expected=crypto.createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
  if(typeof sig!=='string'||sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return json(res,401,{error:'Invalid signature'});
  const event=JSON.parse(body.toString('utf8'));
  const db=supabaseAdmin();
  const eventId=String(event.id||crypto.createHash('sha256').update(body).digest('hex'));
  const {data:seen,error:see}=await db.from('webhook_events').select('provider_event_id').eq('provider_event_id',eventId).maybeSingle();
  if(see)throw see;
  if(seen)return json(res,200,{received:true,duplicate:true});
  if(event.event!=='payment.captured'){
    await db.from('webhook_events').insert({provider_event_id:eventId,payload_hash:crypto.createHash('sha256').update(body).digest('hex')});
    return json(res,200,{received:true});
  }
  const payment=event.payload?.payment?.entity;
  if(!payment?.id||!payment?.order_id||!Number.isInteger(payment.amount)||payment.currency!=='INR')return json(res,400,{error:'Invalid payment payload'});
  const {data:order,error:oe}=await db.from('orders').select('id,status').eq('provider_order_id',payment.order_id).eq('amount_paise',payment.amount).eq('currency','INR').maybeSingle();
  if(oe)throw oe;
  if(!order)return json(res,200,{received:true});
  const {error:ue}=await db.from('orders').update({status:'paid',provider_payment_id:payment.id,paid_at:new Date().toISOString()}).eq('id',order.id).eq('status','pending');
  if(ue)throw ue;
  await db.from('webhook_events').insert({provider_event_id:eventId,payload_hash:crypto.createHash('sha256').update(body).digest('hex')});
  return json(res,200,{received:true});
 }catch(e){console.error('Webhook processing failed:',e.message);return json(res,500,{error:'Webhook processing failed'});}
}