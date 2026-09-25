import { requireAdmin, supabaseAdmin, json,cors } from './_lib/supabase.js';

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){cors(req,res);return res.status(204).end();}
    await requireAdmin(req);
    const db=supabaseAdmin();
    if(req.method==='GET'){
      const [{data:products,error},{data:orders,error:oe},{count:downloadCount,error:de}]=await Promise.all([
        db.from('products').select('*').order('updated_at',{ascending:false}),
        db.from('orders').select('amount_paise,status'),
        db.from('download_tokens').select('id',{count:'exact',head:true})
      ]);
      if(error) throw error;
      if(oe) throw oe;
      if(de) throw de;
      const paidOrders=(orders||[]).filter(o=>o.status==='paid');
      const netSalesPaise=paidOrders.reduce((sum,o)=>sum+o.amount_paise,0);
      return json(res,200,{products:products||[],metrics:{netSalesPaise,paidOrders:paidOrders.length,downloadLinksIssued:downloadCount||0}});
    }
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
      const row={title:String(body.title||'').trim(),description:String(body.description||'').trim(),price_paise:Number(body.price_paise),cover_asset_key:body.cover_asset_key||null,pdf_asset_key:String(body.pdf_asset_key||'').trim(),active:body.active!==false};
      if(!row.title||!row.description||!Number.isInteger(row.price_paise)||row.price_paise<=0||!row.pdf_asset_key) return json(res,400,{error:'title, description, positive price_paise and pdf_asset_key are required'});
      const {data,error}=await db.from('products').insert(row).select('*').single();
      if(error) throw error;
      return json(res,201,{product:data});
    }
    if(req.method==='DELETE'){
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
      if(!body.id) return json(res,400,{error:'id is required'});
      const {data,error}=await db.from('products').update({active:false,updated_at:new Date().toISOString()}).eq('id',body.id).select('*').single();
      if(error) throw error;
      return json(res,200,{product:data});
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
