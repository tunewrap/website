import {requireAdmin,requireSameOrigin} from '../../../_shared/auth.js';
import {json,readJson,HttpError,handleError} from '../../../_shared/http.js';
import {getOrder,listOrders,updateOrderAdmin} from '../../../_shared/orders.js';

function idFromContext(context,{required=true}={}){
  const value=context.params?.id;
  const id=Array.isArray(value)?value.join('/'):String(value||'');
  if(required&&!id)throw new HttpError(400,'Не указан ID заявки');
  return id;
}

export async function onRequestGet(context){
  try{
    await requireAdmin(context);
    const id=idFromContext(context,{required:false});

    // Cloudflare Pages optional catch-all [[id]] can also match /api/admin/orders.
    // In that case return the collection instead of treating it as a detail request.
    if(!id){
      const orders=await listOrders(context.env.TUNEWRAP_DB);
      const summary=orders.reduce((result,order)=>{
        result.total+=1;
        if(result[order.status]!==undefined)result[order.status]+=1;
        return result;
      },{total:0,new:0,in_progress:0,waiting_client:0,done:0,archived:0});
      return json({ok:true,summary,orders});
    }

    const order=await getOrder(context.env.TUNEWRAP_DB,id);
    if(!order)throw new HttpError(404,'Заявка не найдена');
    return json({ok:true,order});
  }catch(error){
    return handleError(error);
  }
}

export async function onRequestPatch(context){
  try{
    requireSameOrigin(context.request);
    const editor=await requireAdmin(context);
    const id=idFromContext(context);
    const input=await readJson(context.request);
    const order=await updateOrderAdmin(context.env.TUNEWRAP_DB,id,input,editor);
    return json({ok:true,order});
  }catch(error){
    return handleError(error);
  }
}
