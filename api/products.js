import { supabasePublic, json } from './_lib/supabase.js';

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  const {data,error}=await supabasePublic().from('products').select('id,title,description,price_paise,cover_asset_key,active').eq('active',true).order('updated_at',{ascending:false});
  if(error) return json(res,500,{error:'Unable to load products'});
  return json(res,200,{products:data});
}
