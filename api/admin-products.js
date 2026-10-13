import { requireAdmin, supabaseAdmin, json,cors } from './_lib/supabase.js';

export default async function handler(req,res){
  cors(req,res);
  try{
    if(req.method==='OPTIONS')return res.status(204).end();
    await requireAdmin(req);
    const db=supabaseAdmin();
    if(req.method==='GET'){
      // Compatibility handler for the legacy /api/admin/stats rewrite. Keeps the same
      // response shape without requiring a separate Vercel serverless function.
      if(req.query?.legacyStats==='1'){
        const {data:orders,error:statsError}=await db.from('orders').select('amount_paise,status');
        if(statsError)throw statsError;
        const paid=(orders||[]).filter(o=>o.status==='paid');
        return json(res,200,{netSalesPaise:paid.reduce((sum,o)=>sum+o.amount_paise,0),paidOrders:paid.length});
      }
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
      if(!row.title||row.title.length>160||!row.description||row.description.length>5000||!Number.isInteger(row.price_paise)||row.price_paise<100||row.price_paise>1000000||!row.pdf_asset_key) return json(res,400,{error:'Valid title, description, price (₹1–₹10,000), and PDF are required'});
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
      if(body.title!==undefined){if(typeof body.title!=='string'||!body.title.trim()||body.title.trim().length>160)return json(res,400,{error:'Title must be 1–160 characters'});patch.title=body.title.trim();}
      if(body.description!==undefined){if(typeof body.description!=='string'||!body.description.trim()||body.description.trim().length>5000)return json(res,400,{error:'Description must be 1–5000 characters'});patch.description=body.description.trim();}
      if(body.cover_asset_key!==undefined)patch.cover_asset_key=body.cover_asset_key;
      if(body.pdf_asset_key!==undefined){if(typeof body.pdf_asset_key!=='string'||!body.pdf_asset_key.trim())return json(res,400,{error:'Invalid PDF asset key'});patch.pdf_asset_key=body.pdf_asset_key.trim();}
      if(body.active!==undefined){if(typeof body.active!=='boolean')return json(res,400,{error:'Active must be a boolean'});patch.active=body.active;}
      if(body.price_paise!==undefined){const price=Number(body.price_paise);if(!Number.isInteger(price)||price<100||price>1000000)return json(res,400,{error:'Price must be between ₹1 and ₹10,000'});patch.price_paise=price;}
      if(!Object.keys(patch).length)return json(res,400,{error:'No valid product fields supplied'});
      patch.updated_at=new Date().toISOString();
      const {data,error}=await db.from('products').update(patch).eq('id',body.id).select('*').single();
      if(error) throw error;
      return json(res,200,{product:data});
    }
    return json(res,405,{error:'Method not allowed'});
  }catch(e){return json(res,e.status||500,{error:e.message||'Server error'});}
}
