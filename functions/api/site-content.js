import {json,handleError} from '../_shared/http.js';
import {readSiteContentConfig} from '../_shared/site-content.js';

export async function onRequestGet(context){
  try{
    const result=await readSiteContentConfig(context.env.TUNEWRAP_DB);
    return json({
      ok:true,
      config:result.config,
      schemaVersion:result.schemaVersion,
      updatedAt:result.updatedAt
    });
  }catch(error){
    return handleError(error);
  }
}
