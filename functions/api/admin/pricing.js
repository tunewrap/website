import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {json,handleError,readJson} from '../../_shared/http.js';
import {readPricingConfig,writePricingConfig} from '../../_shared/pricing.js';

export async function onRequestGet(context){
  try{
    await requireAdmin(context);
    const result=await readPricingConfig(context.env.TUNEWRAP_DB);
    return json({ok:true,...result});
  }catch(error){
    return handleError(error);
  }
}

export async function onRequestPut(context){
  try{
    requireSameOrigin(context.request);
    const identity=await requireAdmin(context);
    const payload=await readJson(context.request);
    const result=await writePricingConfig(context.env.TUNEWRAP_DB,payload?.config,identity);
    return json({ok:true,...result});
  }catch(error){
    return handleError(error);
  }
}
