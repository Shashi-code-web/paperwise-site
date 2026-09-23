import {supabaseAdmin,requireUser,json} from './_lib/supabase.js';
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{const user=await requireUser(req);const {productId}=req.body||{};const db=supabaseAdmin();
  const {data:items,error}=await db.from('order_items').select('product_id,orders!inner(user_id,status)').eq('product_id',productId).eq('orders.user_id',user.id).eq('orders.status','paid').limit(1);
  if(error||!items?.length)return json(res,403,{error:'Purchase not verified'});
  const {data:product}=await db.from('products').select('pdf_asset_key').eq('id',productId).single(); if(!product?.pdf_asset_key)return json(res,404,{error:'PDF not configured'});
  const {data,error:se}=await db.storage.from('private-pdfs').createSignedUrl(product.pdf_asset_key,300,{download:true}); if(se||!data?.signedUrl)return json(res,500,{error:'Could not issue download link'});
  return json(res,200,{url:data.signedUrl,expiresIn:300});
 }catch(e){return json(res,e.message==='Unauthorized'?401:500,{error:e.message})}
}