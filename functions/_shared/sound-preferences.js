import {HttpError} from './http.js';

export const SOUND_LOCALES=Object.freeze(['ru','uk','ka','en','de']);
export const SOUND_ICON_KEYS=Object.freeze([
  'music-note','waveform','pulse','disco','guitar','bass','drums','piano',
  'cello','violin','strings','sax','trumpet','brass','synth','keys',
  'orchestra','ethnic','sparkles','metal'
]);

function cleanText(value,max=1200){
  return String(value??'').replace(/\u0000/g,'').replace(/\r\n?/g,'\n').trim().slice(0,max);
}

function cleanId(value,prefix,index){
  let id=cleanText(value,90).toLowerCase()
    .replace(/[^a-z0-9-]+/g,'-')
    .replace(/^-+|-+$/g,'');
  if(!id)id=`${prefix}-${index+1}`;
  return id.slice(0,90);
}

function cleanLocaleLabels(value){
  const locales={};
  for(const locale of SOUND_LOCALES){
    const label=cleanText(value?.[locale]?.label,120);
    if(label)locales[locale]={label};
  }
  return locales;
}

function cleanItems(value,prefix,maxItems=80){
  if(!Array.isArray(value))return [];
  const used=new Set();
  return value.slice(0,maxItems).map((raw,index)=>{
    const source=raw&&typeof raw==='object'?raw:{};
    const base=cleanId(source.id,prefix,index);
    let id=base,suffix=2;
    while(used.has(id))id=`${base}-${suffix++}`;
    used.add(id);
    const icon=SOUND_ICON_KEYS.includes(source.icon)?source.icon:'music-note';
    return {
      id,
      enabled:source.enabled!==false,
      order:Number.isFinite(Number(source.order))
        ?Math.max(1,Math.min(999,Math.round(Number(source.order))))
        :index+1,
      icon,
      prompt:cleanText(source.prompt,320),
      exclusive:source.exclusive===true,
      locales:cleanLocaleLabels(source.locales)
    };
  });
}

export function normalizeSoundPreferencesConfig(value){
  if(!value||typeof value!=='object')throw new HttpError(400,'Некорректная конфигурация Sound CMS');
  return {
    schemaVersion:1,
    settings:{
      maxStyles:5,
      maxInstruments:null
    },
    styles:cleanItems(value.styles,'style'),
    instruments:cleanItems(value.instruments,'instrument')
  };
}

export async function readSoundPreferencesConfig(db){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const row=await db.prepare(
    'SELECT config_json,schema_version,updated_at,last_edited_by FROM sound_preferences_config WHERE id=?'
  ).bind('main').first();
  if(!row)throw new HttpError(503,'Sound Preferences CMS ещё не инициализирован');

  let parsed;
  try{parsed=JSON.parse(row.config_json);}
  catch(error){throw new HttpError(500,'Sound Preferences CMS содержит повреждённый JSON');}

  return {
    config:normalizeSoundPreferencesConfig(parsed),
    schemaVersion:Number(row.schema_version)||1,
    updatedAt:String(row.updated_at||''),
    lastEditedBy:String(row.last_edited_by||'')
  };
}

export async function writeSoundPreferencesConfig(db,value,identity='admin'){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const config=normalizeSoundPreferencesConfig(value);
  const serialized=JSON.stringify(config);
  if(serialized.length>260000)throw new HttpError(413,'Конфигурация Sound CMS слишком большая');
  const updatedAt=new Date().toISOString();

  await db.prepare(`
    INSERT INTO sound_preferences_config(id,config_json,schema_version,updated_at,last_edited_by)
    VALUES('main',?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET
      config_json=excluded.config_json,
      schema_version=excluded.schema_version,
      updated_at=excluded.updated_at,
      last_edited_by=excluded.last_edited_by
  `).bind(serialized,updatedAt,String(identity||'admin').slice(0,240)).run();

  return {config,updatedAt,lastEditedBy:String(identity||'admin')};
}
