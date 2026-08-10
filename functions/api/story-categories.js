import {json,handleError} from '../_shared/http.js';
import {readStoryCategoriesConfig} from '../_shared/story-categories.js';
export async function onRequestGet(context){
  try{const result=await readStoryCategoriesConfig(context.env.TUNEWRAP_DB);return json({ok:true,config:result.config,schemaVersion:result.schemaVersion,updatedAt:result.updatedAt});}
  catch(error){return handleError(error);}
}
