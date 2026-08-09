import {requireAdmin,requireSameOrigin} from '../../../../_shared/auth.js';
import {json,HttpError,handleError} from '../../../../_shared/http.js';
import {getTrack} from '../../../../_shared/tracks.js';

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    const editor = await requireAdmin(context);
    const id = context.params.id;
    if(!await getTrack(context.env.TUNEWRAP_DB,id)) throw new HttpError(404,'Трек не найден');
    const now = new Date().toISOString();
    await context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET published=0, featured=0, archived=1, updated_at=?, last_edited_by=? WHERE id=?').bind(now,editor,id).run();
    return json({ok:true,archived:id});
  }catch(error){return handleError(error);}
}
