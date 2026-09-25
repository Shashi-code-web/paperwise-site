import {requireAdmin,supabaseAdmin,json,cors} from './_lib/supabase.js';
export default async function handler(req,res){
 cors(req,res);
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 try{
  const db=supabaseAdmin();
  if(req.method==='GET'){
   const {data,error}=await db.from('manual_payment_settings').select('enabled').eq('id',1).single();
   if(error)throw error;
   return json(res,200,{enabled:data.enabled});
  }
  if(req.method==='POST'){
   const admin=await requireAdmin(req);
   if(typeof req.body?.enabled!=='boolean')return json(res,400,{error:'Invalid setting'});
   const {data,error}=await db.from('manual_payment_settings').update({enabled:req.body.enabled,updated_at:new Date().toISOString(),updated_by:admin.id}).eq('id',1).select('enabled').single();
   if(error)throw error;
   return json(res,200,{enabled:data.enabled});
  }
  return json(res,405,{error:'Method not allowed'});
 }catch(e){return json(res,e.status||500,{error:e.status?e.message:'Unable to load payment settings'});}
}
