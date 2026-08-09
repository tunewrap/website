import {requireAdmin} from '../../_shared/auth.js';
import {json,handleError} from '../../_shared/http.js';
import {listTracks} from '../../_shared/tracks.js';

export async function onRequestGet(context){
  try{
    const editor = await requireAdmin(context);
    const tracks = await listTracks(context.env.TUNEWRAP_DB,{admin:true,includeArchived:true});
    return json({
      schemaVersion:2,
      exportedAt:new Date().toISOString(),
      exportedBy:editor,
      trackCount:tracks.length,
      tracks
    },200,{'content-disposition':`attachment; filename="tunewrap-catalog-backup-${new Date().toISOString().slice(0,10)}.json"`});
  }catch(error){return handleError(error);}
}
