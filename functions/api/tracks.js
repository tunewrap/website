import {json,handleError} from '../_shared/http.js';
import {listTracks} from '../_shared/tracks.js';

export async function onRequestGet(context){
  try{
    const tracks = await listTracks(context.env.TUNEWRAP_DB);
    return json({
      schemaVersion:2,
      generatedAt:new Date().toISOString(),
      trackCount:tracks.length,
      publishedCount:tracks.length,
      tracks
    },200,{'cache-control':'no-store'});
  }catch(error){return handleError(error);}
}
