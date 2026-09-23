import { requireUser, supabaseAdmin, json } from './_lib/supabase.js';

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  try{
    const user=await requireUser(req);
    const {data,error}=await supabaseAdmin().from('orders').select('id,status,paid_at,order_items(id,unit_price_paise,products(id,title,description,cover_asset_key))').eq('user_id',user.id).eq('status','paid').order('paid_at',{ascending:false});
    if(error) return json(res,500,{error:'Unable to load library'});
    return json(res,200,{orders:data||[]});
  }catch(e){return json(res,e.message==='Unauthorized'?401:500,{error:e.message||'Server error'});}
}
