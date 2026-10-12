import {supabaseAdmin,json,requireAdmin,cors} from '../_lib/supabase.js';

export default async function handler(req,res){
 cors(req,res);
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET'&&req.method!=='PATCH')return json(res,405,{error:'Method not allowed'});
 try{
  await requireAdmin(req);
  const db=supabaseAdmin();
  if(req.method==='GET'){
   const {data,error}=await db.from('products').select('id,title,description,price_paise,active,updated_at').order('updated_at',{ascending:false});
   if(error)throw error;
   return json(res,200,{products:data||[]});
  }
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return json(res,400,{error:'Invalid JSON'});}}
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.id!=='string'||!body.id)return json(res,400,{error:'Product ID is required'});
  const patch={};
  if(body.title!==undefined){if(typeof body.title!=='string'||!body.title.trim()||body.title.trim().length>160)return json(res,400,{error:'Title must be 1–160 characters'});patch.title=body.title.trim();}
  if(body.description!==undefined){if(typeof body.description!=='string'||!body.description.trim()||body.description.trim().length>5000)return json(res,400,{error:'Description must be 1–5000 characters'});patch.description=body.description.trim();}
  const rawPrice=body.price_paise!==undefined?body.price_paise:body.pricePaise;
  if(rawPrice!==undefined){const price=Number(rawPrice);if(!Number.isInteger(price)||price<100||price>1000000)return json(res,400,{error:'Price must be between ₹1 and ₹10,000'});patch.price_paise=price;}
  if(body.active!==undefined){if(typeof body.active!=='boolean')return json(res,400,{error:'Active must be a boolean'});patch.active=body.active;}
  if(!Object.keys(patch).length)return json(res,400,{error:'No valid product fields supplied'});
  patch.updated_at=new Date().toISOString();
  const {data,error}=await db.from('products').update(patch).eq('id',body.id).select('id,title,description,price_paise,active,updated_at').maybeSingle();
  if(error)throw error;
  if(!data)return json(res,404,{error:'Product not found'});
  return json(res,200,{product:data});
 }catch(e){
  console.error('Legacy admin products route failed:',e.message);
  return json(res,e.status||500,{error:e.status?e.message:'Unable to manage products'});
 }
}
