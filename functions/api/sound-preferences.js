import {json,handleError} from '../_shared/http.js';
import {readSoundPreferencesConfig} from '../_shared/sound-preferences.js';

export async function onRequestGet(context){
  try{
    const result=await readSoundPreferencesConfig(context.env.TUNEWRAP_DB);
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
