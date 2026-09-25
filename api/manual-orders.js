import {requireUser,supabaseAdmin,json,cors} from './_lib/supabase.js';
export default async function handler(req,res){
 cors(req,res);
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 try{
  const user=await requireUser(req);
  const {data,error}=await supabaseAdmin().from('orders').select('id,amount_paise,status,manual_submitted_at,order_items(products(title))').eq('user_id',user.id).not('manual_payment_reference','is',null).order('manual_submitted_at',{ascending:false}).limit(30);
  if(error)throw error;
  return json(res,200,{orders:data||[]});
 }catch(e){return json(res,e.status||500,{error:e.status?e.message:'Unable to load orders'});}
}
