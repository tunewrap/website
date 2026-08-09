import {requireAdmin,requireSameOrigin} from '../../../_shared/auth.js';
import {json,readJson,HttpError,handleError} from '../../../_shared/http.js';
import {getOrder,updateOrderAdmin} from '../../../_shared/orders.js';

function idFromContext(context){
  const value=context.params?.id;
  const id=Array.isArray(value)?value.join('/'):String(value||'');
  if(!id)throw new HttpError(400,'Не указан ID заявки');
  return id;
}

export async function onRequestGet(context){
  try{
    await requireAdmin(context);
    const order=await getOrder(context.env.TUNEWRAP_DB,idFromContext(context));
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
    const input=await readJson(context.request);
    const order=await updateOrderAdmin(context.env.TUNEWRAP_DB,idFromContext(context),input,editor);
    return json({ok:true,order});
  }catch(error){
    return handleError(error);
  }
}
