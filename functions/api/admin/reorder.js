import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {json,readJson,HttpError,handleError} from '../../_shared/http.js';
import {SECTIONS} from '../../_shared/tracks.js';

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    const editor = await requireAdmin(context);
    const input = await readJson(context.request);
    if(!SECTIONS.includes(input.section) || !Array.isArray(input.ids) || !input.ids.length) throw new HttpError(422,'Некорректный порядок');
    if(new Set(input.ids).size !== input.ids.length) throw new HttpError(422,'В порядке есть повторяющиеся ID');
    const existing = await context.env.TUNEWRAP_DB.prepare('SELECT id FROM tracks WHERE section=? AND archived=0 ORDER BY sort_order,id').bind(input.section).all();
    const actual = (existing.results || []).map(row => row.id);
    if(actual.length !== input.ids.length || actual.some(id => !input.ids.includes(id))) throw new HttpError(409,'Список порядка устарел; обновите Admin Studio');
    const now = new Date().toISOString();
    // Move through temporary high values so the unique section/order index
    // cannot reject legitimate swaps (1↔2) halfway through the atomic batch.
    await context.env.TUNEWRAP_DB.batch([
      ...input.ids.map((id,index) => context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET sort_order=? WHERE id=? AND section=?')
        .bind(1000000 + index,id,input.section)),
      ...input.ids.map((id,index) => context.env.TUNEWRAP_DB.prepare('UPDATE tracks SET sort_order=?, updated_at=?, last_edited_by=? WHERE id=? AND section=?')
        .bind(index + 1,now,editor,id,input.section))
    ]);
    return json({ok:true,section:input.section,ids:input.ids});
  }catch(error){return handleError(error);}
}
