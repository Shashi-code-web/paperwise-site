import {requireUser,supabaseAdmin,json} from './_lib/supabase.js';
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req),{productId}=req.body||{};
  if(typeof productId!=='string')return json(res,400,{error:'Product required'});
  const db=supabaseAdmin();
  const {data:items,error}=await db.from('order_items').select('id,orders!inner(user_id,status)').eq('product_id',productId).eq('orders.user_id',user.id).eq('orders.status','paid').limit(1);
  if(error||!items?.length)return json(res,403,{error:'Purchase not verified'});
  const {data:product,error:pe}=await db.from('products').select('pdf_asset_key').eq('id',productId).single();
  if(pe||!product?.pdf_asset_key)return json(res,404,{error:'PDF unavailable'});
  const {data,error:se}=await db.storage.from('private-pdfs').createSignedUrl(product.pdf_asset_key,600,{download:true});
  if(se||!data?.signedUrl)return json(res,500,{error:'Unable to issue download link'});
  const {error:te}=await db.from('download_tokens').insert({order_item_id:items[0].id,expires_at:new Date(Date.now()+600000).toISOString()});\n  if(te) throw te;
  return json(res,200,{url:data.signedUrl,expiresIn:600});
 }catch(e){return json(res,e.status||500,{error:e.status?e.message:'Unable to prepare download'});}
}