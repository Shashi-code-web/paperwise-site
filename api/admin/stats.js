import {requireAdmin,supabaseAdmin,json,cors} from '../_lib/supabase.js';
export default async function handler(req,res){
 cors(req,res);
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 try{
  await requireAdmin(req);
  const {data:orders,error}=await supabaseAdmin().from('orders').select('amount_paise,status');
  if(error)throw error;
  const paid=(orders||[]).filter(o=>o.status==='paid');
  return json(res,200,{netSalesPaise:paid.reduce((sum,o)=>sum+o.amount_paise,0),paidOrders:paid.length});
 }catch(e){
  console.error('Admin stats failed:',e.message);
  return json(res,e.status||500,{error:e.status?e.message:'Unable to load statistics'});
 }
}
