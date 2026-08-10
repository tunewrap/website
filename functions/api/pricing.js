import {json,handleError} from '../_shared/http.js';
import {readPricingConfig} from '../_shared/pricing.js';

export async function onRequestGet(context){
  try{
    const result=await readPricingConfig(context.env.TUNEWRAP_DB);
    return json({
      ok:true,
      config:result.config,
      updatedAt:result.updatedAt,
      schemaVersion:result.schemaVersion
    });
  }catch(error){
    return handleError(error);
  }
}
