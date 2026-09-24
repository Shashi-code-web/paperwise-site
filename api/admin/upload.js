import crypto from 'node:crypto';
import {requireAdmin,supabaseAdmin,json} from '../_lib/supabase.js';
const cors=(res)=>{res.setHeader('Access-Control-Allow-Origin','https://shashi-code-web.github.io');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');};
export default async function handler(req,res){
 cors(res);
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireAdmin(req);
  const {name,size,type}=req.body||{};
  if(type!=='application/pdf'||!Number.isInteger(size)||size<1||size>52428800)return json(res,400,{error:'PDF required (maximum 50 MB)'});
  const path=user.id+'/'+crypto.randomUUID()+'.pdf';
  const {data,error}=await supabaseAdmin().storage.from('private-pdfs').createSignedUploadUrl(path);
  if(error)throw error;
  return json(res,200,{path,token:data.token});
 }catch(e){console.error('PDF upload setup:',e.message);return json(res,e.status||500,{error:e.status?e.message:'Unable to prepare upload'});}
}
