import {requireAdmin,requireSameOrigin} from '../../../_shared/auth.js';
import {json,readJson,HttpError,handleError} from '../../../_shared/http.js';
import {listTracks,validateTrack,slugify,insertStatement,getTrack} from '../../../_shared/tracks.js';

export async function onRequestGet(context){
  try{
    await requireAdmin(context);
    const url = new URL(context.request.url);
    const tracks = await listTracks(context.env.TUNEWRAP_DB,{admin:true,includeArchived:url.searchParams.get('archived') === '1'});
    const summary = tracks.reduce((result,track) => {
      result.total += 1;
      result.published += track.published ? 1 : 0;
      result.drafts += track.published ? 0 : 1;
      result[track.section] += 1;
      return result;
    },{total:0,published:0,drafts:0,stories:0,author:0});
    return json({ok:true,summary,tracks});
  }catch(error){return handleError(error);}
}

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    const editor = await requireAdmin(context);
    const input = await readJson(context.request);
    const section = input.section;
    const language = String(input.language || '').toUpperCase();
    const max = await context.env.TUNEWRAP_DB.prepare('SELECT COALESCE(MAX(sort_order),0) AS max_order FROM tracks WHERE section=? AND archived=0').bind(section).first();
    const baseId = slugify(input.title,language);
    let id = input.id ? String(input.id) : baseId;
    for(let suffix = 2; await getTrack(context.env.TUNEWRAP_DB,id); suffix += 1) id = `${baseId}-${suffix}`;
    const track = {...input,id,section,language,order:Number(input.order) || Number(max?.max_order || 0) + 1,published:false,archived:false};
    const errors = validateTrack(track);
    if(errors.length) throw new HttpError(422,'Проверьте поля трека',errors);
    await context.env.TUNEWRAP_DB.batch([
      ...(track.featured ? [context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET featured=0 WHERE section=?').bind(section)] : []),
      insertStatement(context.env.TUNEWRAP_DB,track,editor)
    ]);
    return json({ok:true,track:await getTrack(context.env.TUNEWRAP_DB,id)},201);
  }catch(error){return handleError(error);}
}
