import {supabaseAdmin,requireUser,json,cors} from '../_lib/supabase.js';

export default async function handler(req,res){
 cors(req,res);
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req);
  const orderItemId=req.query?.orderItemId;
  if(typeof orderItemId!=='string'||!orderItemId)return json(res,400,{error:'Order item required'});
  const db=supabaseAdmin();
  const {data:item,error}=await db.from('order_items').select('id,products(pdf_asset_key),orders!inner(user_id,status)').eq('id',orderItemId).eq('orders.user_id',user.id).eq('orders.status','paid').maybeSingle();
  if(error||!item?.products?.pdf_asset_key)return json(res,404,{error:'Download not available'});
  const {data:signed,error:signError}=await db.storage.from('private-pdfs').createSignedUrl(item.products.pdf_asset_key,600,{download:true});
  if(signError||!signed?.signedUrl)return json(res,500,{error:'Unable to issue download link'});
  const {error:tokenError}=await db.from('download_tokens').insert({order_item_id:item.id,expires_at:new Date(Date.now()+600000).toISOString()});
  if(tokenError)throw tokenError;
  return json(res,200,{url:signed.signedUrl,expiresInSeconds:600});
 }catch(e){
  console.error('Download request failed:',e.message);
  return json(res,e.status||500,{error:e.status?e.message:'Unable to prepare download'});
 }
}
