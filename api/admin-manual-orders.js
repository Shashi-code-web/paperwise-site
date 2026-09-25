import {requireAdmin,supabaseAdmin,json} from './_lib/supabase.js';
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 try{
  const admin=await requireAdmin(req),db=supabaseAdmin();
  if(req.method==='GET'){
   const {data,error}=await db.from('orders').select('id,user_id,amount_paise,currency,status,manual_payment_reference,manual_submitted_at,order_items(product_id,products(title))').not('manual_payment_reference','is',null).order('manual_submitted_at',{ascending:false}).limit(100);
   if(error)throw error;
   return json(res,200,{orders:data||[]});
  }
  if(req.method==='POST'){
   const {orderId,action}=req.body||{};
   if(typeof orderId!=='string'||!['approve','reject'].includes(action))return json(res,400,{error:'Invalid order or action'});
   const {data:order,error:oe}=await db.from('orders').select('id,status,manual_payment_reference').eq('id',orderId).not('manual_payment_reference','is',null).single();
   if(oe||!order)return json(res,404,{error:'Manual payment not found'});
   if(order.status!=='pending')return json(res,409,{error:'This order has already been reviewed'});
   const patch={status:action==='approve'?'paid':'failed',reviewed_by:admin.id,reviewed_at:new Date().toISOString()};
   if(action==='approve')patch.paid_at=new Date().toISOString();
   const {data:updated,error:ue}=await db.from('orders').update(patch).eq('id',orderId).eq('status','pending').select('id,status').maybeSingle();
   if(ue)throw ue;
   if(!updated)return json(res,409,{error:'Order was already reviewed'});
   return json(res,200,{order:updated});
  }
  return json(res,405,{error:'Method not allowed'});
 }catch(e){console.error('Manual order administration failed:',e.message);return json(res,e.status||500,{error:e.status?e.message:'Unable to manage manual payments'});}
}
