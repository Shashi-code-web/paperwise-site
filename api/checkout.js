import {json} from './_lib/supabase.js';
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).end();
  return json(res,503,{error:'Checkout is temporarily unavailable while a new payment method is configured.'});
}
