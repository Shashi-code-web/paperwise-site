import {requireAdmin,supabaseAdmin,json} from '../_lib/supabase.js';
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 try{
  await requireAdmin(req);
  const db=supabaseAdmin();
  const {data:orders,error}=await db.from('orders').select('amount_paise,status');
  if(error)throw error;
  const paid=(orders||[]).filter(o=>o.status==='paid');
  return json(res,200,{netSalesPaise:paid.reduce((sum,o)=>sum+o.amount_paise,0),paidOrders:paid.length});
 }catch(e){return json(res,e.status||500,{error:e.status?e.message:'Unable to load statistics'});}
}