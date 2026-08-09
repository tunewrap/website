import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {json,readJson,HttpError,handleError} from '../../_shared/http.js';
import {listTracks,validateTrack,insertStatement,updateStatement,getTrack} from '../../_shared/tracks.js';

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    const editor = await requireAdmin(context);
    const input = await readJson(context.request);
    const backup = input.backup;
    if(!backup || backup.schemaVersion !== 2 || !Array.isArray(backup.tracks)) throw new HttpError(422,'Неподдерживаемый формат backup');
    const ids = new Set();
    const errors = [];
    backup.tracks.forEach((track,index) => {
      if(!track?.id || ids.has(track.id)) errors.push(`Строка ${index + 1}: отсутствующий или повторяющийся ID`);
      ids.add(track?.id);
      validateTrack(track,{publishing:Boolean(track?.published)}).forEach(message => errors.push(`${track?.id || index + 1}: ${message}`));
    });
    const activeOrders = new Set();
    backup.tracks.filter(track => !track.archived).forEach(track => {
      const key = `${track.section}:${track.order}`;
      if(activeOrders.has(key)) errors.push(`${track.id}: порядок ${track.order} уже используется в ${track.section}`);
      activeOrders.add(key);
    });
    if(errors.length) throw new HttpError(422,'Backup не прошёл проверку',errors);
    const current = await listTracks(context.env.TUNEWRAP_DB,{admin:true,includeArchived:true});
    const incoming = new Map(backup.tracks.map(track => [track.id,track]));
    const finalRecords = [...current.map(track => incoming.get(track.id) || track),...backup.tracks.filter(track => !current.some(existing => existing.id === track.id))];
    const finalOrders = new Set();
    for(const track of finalRecords.filter(track => !track.archived)){
      const key = `${track.section}:${track.order}`;
      if(finalOrders.has(key)) errors.push(`${track.id}: итоговый порядок ${track.order} уже используется в ${track.section}`);
      finalOrders.add(key);
    }
    if(errors.length) throw new HttpError(422,'Backup конфликтует с текущим каталогом',errors);
    const currentIds = new Set(current.map(track => track.id));
    const preview = {
      incoming:backup.tracks.length,
      create:backup.tracks.filter(track => !currentIds.has(track.id)).length,
      update:backup.tracks.filter(track => currentIds.has(track.id)).length,
      unchangedOutsideBackup:current.filter(track => !ids.has(track.id)).length
    };
    if(input.mode !== 'apply') return json({ok:true,dryRun:true,preview});
    const statements = current.map((track,index) => context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET sort_order=? WHERE id=?').bind(1000000 + index,track.id));
    for(const track of backup.tracks){
      const normalized = {...track,order:Number(track.order),schemaVersion:2};
      statements.push(currentIds.has(track.id)
        ? updateStatement(context.env.TUNEWRAP_DB,track.id,normalized,editor)
        : insertStatement(context.env.TUNEWRAP_DB,normalized,editor));
    }
    for(const track of current.filter(track => !ids.has(track.id))){
      statements.push(context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET sort_order=? WHERE id=?').bind(track.order,track.id));
    }
    if(statements.length) await context.env.TUNEWRAP_DB.batch(statements);
    return json({ok:true,dryRun:false,preview});
  }catch(error){return handleError(error);}
}
