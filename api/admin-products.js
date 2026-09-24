import { requireUser, supabaseAdmin, json } from './_lib/supabase.js';

async function admin(req){
  const user=await requireUser(req);
  const token=req.headers.authorization.replace(/^Bearer\s+/i,''); const aal=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')).aal||'aal1';
  if(aal!=='aal2') throw Object.assign(new Error('MFA required'),{status:403});
  const {data:p,error}=await supabaseAdmin().from('profiles').select('role').eq('id',user.id).single();
  if(error||p?.role!=='admin') throw Object.assign(new Error('Admin access required'),{status:403});
  return user;
}
export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Origin','https://shashi-code-web.github.io');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');return res.status(204).end();}
    await admin(req);
    const db=supabaseAdmin();
    if(req.method==='GET'){
      const {data,error}=await db.from('products').select('*').order('updated_at',{ascending:false});
      if(error) throw error;
      return json(res,200,{products:data||[]});
    }
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
      const row={title:String(body.title||'').trim(),description:String(body.description||'').trim(),price_paise:Number(body.price_paise),cover_asset_key:body.cover_asset_key||null,pdf_asset_key:String(body.pdf_asset_key||'').trim(),active:body.active!==false};
      if(!row.title||!row.description||!Number.isInteger(row.price_paise)||row.price_paise<=0||!row.pdf_asset_key) return json(res,400,{error:'title, description, positive price_paise and pdf_asset_key are required'});
      const {data,error}=await db.from('products').insert(row).select('*').single();
      if(error) throw error;
      return json(res,201,{product:data});
    }
    if(req.method==='PATCH'){
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
      if(!body.id) return json(res,400,{error:'id is required'});
      const patch={};
      for(const k of ['title','description','cover_asset_key','pdf_asset_key','active']) if(body[k]!==undefined) patch[k]=body[k];
      if(body.price_paise!==undefined) patch.price_paise=Number(body.price_paise);
      patch.updated_at=new Date().toISOString();
      const {data,error}=await db.from('products').update(patch).eq('id',body.id).select('*').single();
      if(error) throw error;
      return json(res,200,{product:data});
    }
    return json(res,405,{error:'Method not allowed'});
  }catch(e){return json(res,e.status||500,{error:e.message||'Server error'});}
}
