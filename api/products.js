import { supabasePublic, json } from './_lib/supabase.js';

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  const db=supabasePublic();
  const [{data:products,error:productsError},{data:settings,error:settingsError}]=await Promise.all([
    db.from('products').select('id,title,description,price_paise,cover_asset_key,active').eq('active',true).order('updated_at',{ascending:false}),
    db.from('manual_payment_settings').select('enabled').eq('id',1).maybeSingle()
  ]);
  if(productsError){console.error('Products database query failed:',productsError.code,productsError.message);return json(res,500,{error:'Unable to load products'});}
  if(settingsError){console.error('Checkout availability query failed:',settingsError.code,settingsError.message);return json(res,500,{error:'Unable to load checkout availability'});}
  return json(res,200,{products:products||[],manualCheckoutEnabled:settings?.enabled===true});
}
