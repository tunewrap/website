import {requireAdmin,requireSameOrigin} from '../../../_shared/auth.js';
import {json,readJson,HttpError,handleError} from '../../../_shared/http.js';
import {getTrack,mergeTrack,validateTrack,updateStatement,mediaKeyFromUrl} from '../../../_shared/tracks.js';

export async function onRequestGet(context){
  try{
    await requireAdmin(context);
    const track = await getTrack(context.env.TUNEWRAP_DB,context.params.id);
    if(!track) throw new HttpError(404,'Трек не найден');
    return json({ok:true,track});
  }catch(error){return handleError(error);}
}

export async function onRequestPatch(context){
  try{
    requireSameOrigin(context.request);
    const editor = await requireAdmin(context);
    const current = await getTrack(context.env.TUNEWRAP_DB,context.params.id);
    if(!current) throw new HttpError(404,'Трек не найден');
    const next = mergeTrack(current,await readJson(context.request));
    const errors = validateTrack(next,{publishing:next.published});
    if(errors.length) throw new HttpError(422,'Проверьте поля трека',errors);
    const statements = [];
    if(next.featured) statements.push(context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET featured=0 WHERE section=? AND id<>?').bind(next.section,next.id));
    statements.push(updateStatement(context.env.TUNEWRAP_DB,next.id,next,editor));
    await context.env.TUNEWRAP_DB.batch(statements);
    return json({ok:true,track:await getTrack(context.env.TUNEWRAP_DB,next.id)});
  }catch(error){return handleError(error);}
}

export async function onRequestDelete(context){
  try{
    requireSameOrigin(context.request);
    await requireAdmin(context);
    const url = new URL(context.request.url);
    const id = context.params.id;
    if(url.searchParams.get('hard') !== '1' || url.searchParams.get('confirm') !== id){
      throw new HttpError(400,'Для безвозвратного удаления подтвердите точный ID трека');
    }
    const current = await getTrack(context.env.TUNEWRAP_DB,id);
    if(!current) throw new HttpError(404,'Трек не найден');
    await context.env.TUNEWRAP_DB.prepare('DELETE FROM tracks WHERE id=?').bind(id).run();
    const listed = await context.env.TUNEWRAP_MEDIA.list({prefix:`tracks/${id}/`});
    const keys = listed.objects.map(object => object.key);
    for(let cursor = listed; cursor.truncated; ){
      cursor = await context.env.TUNEWRAP_MEDIA.list({prefix:`tracks/${id}/`,cursor:cursor.cursor});
      keys.push(...cursor.objects.map(object => object.key));
    }
    // Keep compatibility with imported/externally addressed R2 records that
    // do not use the canonical track prefix.
    keys.push(...[mediaKeyFromUrl(current.audio),mediaKeyFromUrl(current.cover)].filter(key => key && !keys.includes(key)));
    if(keys.length) await context.env.TUNEWRAP_MEDIA.delete(keys);
    return json({ok:true,deleted:id,assetsDeleted:keys.length});
  }catch(error){return handleError(error);}
}
