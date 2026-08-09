import {requireAdmin,requireSameOrigin} from '../../../../_shared/auth.js';
import {json,HttpError,handleError} from '../../../../_shared/http.js';
import {getTrack,validateTrack} from '../../../../_shared/tracks.js';

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    const editor = await requireAdmin(context);
    const id = context.params.id;
    const track = await getTrack(context.env.TUNEWRAP_DB,id);
    if(!track) throw new HttpError(404,'Трек не найден');
    const errors = validateTrack(track,{publishing:true});
    if(errors.length) throw new HttpError(422,'Трек не готов к публикации',errors);
    const now = new Date().toISOString();
    const statements = [];
    if(track.featured) statements.push(context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET featured=0 WHERE section=? AND id<>?').bind(track.section,id));
    statements.push(context.env.TUNEWRAP_DB.prepare(`UPDATE tracks SET published=1, archived=0,
      published_at=COALESCE(published_at,?), updated_at=?, last_edited_by=? WHERE id=?`).bind(now,now,editor,id));
    await context.env.TUNEWRAP_DB.batch(statements);
    return json({ok:true,track:await getTrack(context.env.TUNEWRAP_DB,id)});
  }catch(error){return handleError(error);}
}
