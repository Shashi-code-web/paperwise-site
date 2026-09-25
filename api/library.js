import {requireUser,supabaseAdmin,json,cors} from './_lib/supabase.js';
export default async function handler(req,res){
 cors(req,res);
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req),db=supabaseAdmin();
  const {data,error}=await db.from('orders').select('id,paid_at,order_items(id,unit_price_paise,products(id,title,description))').eq('user_id',user.id).eq('status','paid').order('paid_at',{ascending:false});
  if(error)throw error;
  return json(res,200,{orders:data||[]});
 }catch(e){return json(res,e.status||500,{error:e.status?e.message:'Unable to load library'});}
}