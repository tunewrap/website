import {HttpError} from './http.js';

export const STORY_CATEGORY_LOCALES=Object.freeze(['ru','uk','ka','en','de']);

function cleanText(value,max=180){
  return String(value??'').replace(/\u0000/g,'').replace(/\r\n?/g,'\n').trim().slice(0,max);
}
function cleanId(value,index){
  let id=cleanText(value,90).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
  if(!id)id=`category-${index+1}`;
  return id.slice(0,90);
}
function cleanLabels(value){
  const labels={};
  for(const locale of STORY_CATEGORY_LOCALES){
    const label=cleanText(value?.[locale],100);
    if(label)labels[locale]=label;
  }
  return labels;
}
function cleanCategories(value){
  if(!Array.isArray(value))return [];
  const used=new Set();
  return value.slice(0,40).map((raw,index)=>{
    const source=raw&&typeof raw==='object'?raw:{};
    const base=cleanId(source.id,index);
    let id=base,suffix=2;
    while(used.has(id))id=`${base}-${suffix++}`;
    used.add(id);
    return {
      id,
      enabled:source.enabled!==false,
      order:Number.isFinite(Number(source.order))?Math.max(1,Math.min(999,Math.round(Number(source.order)))):index+1,
      labels:cleanLabels(source.labels)
    };
  }).filter(item=>Object.keys(item.labels).length>0);
}
export function normalizeStoryCategoriesConfig(value){
  if(!value||typeof value!=='object')throw new HttpError(400,'Некорректная конфигурация категорий историй');
  return {schemaVersion:1,categories:cleanCategories(value.categories)};
}
export async function readStoryCategoriesConfig(db){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const row=await db.prepare('SELECT config_json,schema_version,updated_at,last_edited_by FROM story_categories_config WHERE id=?').bind('main').first();
  if(!row)throw new HttpError(503,'Story Categories CMS ещё не инициализирован');
  let parsed;
  try{parsed=JSON.parse(row.config_json);}catch(error){throw new HttpError(500,'Story Categories CMS содержит повреждённый JSON');}
  return {config:normalizeStoryCategoriesConfig(parsed),schemaVersion:Number(row.schema_version)||1,updatedAt:String(row.updated_at||''),lastEditedBy:String(row.last_edited_by||'')};
}
async function cleanRemovedAssignments(db,removedIds){
  if(!removedIds.length)return;
  const result=await db.prepare("SELECT id,story_category_ids_json FROM tracks WHERE story_category_ids_json <> '[]'").all();
  const statements=[];
  for(const row of result.results||[]){
    let ids=[];try{ids=JSON.parse(row.story_category_ids_json||'[]');}catch(error){ids=[];}
    if(!Array.isArray(ids))ids=[];
    const next=ids.filter(id=>!removedIds.includes(String(id)));
    if(next.length===ids.length)continue;
    statements.push(db.prepare('UPDATE tracks SET story_category_ids_json=?,updated_at=? WHERE id=?').bind(JSON.stringify(next),new Date().toISOString(),row.id));
  }
  for(let offset=0;offset<statements.length;offset+=50)await db.batch(statements.slice(offset,offset+50));
}
export async function writeStoryCategoriesConfig(db,value,identity='admin'){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const config=normalizeStoryCategoriesConfig(value);
  const serialized=JSON.stringify(config);
  if(serialized.length>120000)throw new HttpError(413,'Конфигурация категорий слишком большая');
  let previousIds=[];
  try{const previous=await readStoryCategoriesConfig(db);previousIds=(previous.config.categories||[]).map(item=>item.id);}catch(error){}
  const nextIds=config.categories.map(item=>item.id);
  await cleanRemovedAssignments(db,previousIds.filter(id=>!nextIds.includes(id)));
  const updatedAt=new Date().toISOString();
  const editor=String(identity||'admin').slice(0,240);
  await db.prepare(`
    INSERT INTO story_categories_config(id,config_json,schema_version,updated_at,last_edited_by)
    VALUES('main',?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET config_json=excluded.config_json,schema_version=excluded.schema_version,updated_at=excluded.updated_at,last_edited_by=excluded.last_edited_by
  `).bind(serialized,updatedAt,editor).run();
  return {config,updatedAt,lastEditedBy:editor};
}
