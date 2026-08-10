import {HttpError} from './http.js';

export const SITE_LOCALES=Object.freeze(['ru','uk','ka','en','de']);
export const CONTACT_CHANNELS=Object.freeze(['whatsapp','telegram','instagram','tiktok','youtube','email']);

function cleanText(value,max=12000){
  return String(value??'').replace(/\r\n?/g,'\n').trim().slice(0,max);
}

function cleanKey(value){
  const key=String(value??'').trim();
  if(!/^[a-z0-9_]{1,90}$/i.test(key))throw new HttpError(400,'Некорректный ключ Site CMS');
  return key;
}

function cleanUrl(value){
  const raw=cleanText(value,1800);
  if(!raw)return '';
  if(!/^(https?:\/\/|mailto:|tel:)/i.test(raw))throw new HttpError(400,'Ссылка должна начинаться с https://, http://, mailto: или tel:');
  return raw;
}

function cleanLocaleMap(value,maxKeys=180,maxLength=12000){
  const output={};
  for(const locale of SITE_LOCALES){
    const source=value?.[locale];
    if(!source||typeof source!=='object')continue;
    const target={};
    for(const [rawKey,rawValue] of Object.entries(source).slice(0,maxKeys)){
      const key=cleanKey(rawKey);
      target[key]=cleanText(rawValue,maxLength);
    }
    output[locale]=target;
  }
  return output;
}

function cleanChannel(kind,value){
  const source=value&&typeof value==='object'?value:{};
  return {
    enabled:source.enabled===true,
    label:cleanText(source.label||kind,80),
    value:cleanText(source.value,300),
    url:cleanUrl(source.url)
  };
}

function cleanContacts(value){
  const source=value&&typeof value==='object'?value:{};
  const channels={};
  for(const kind of CONTACT_CHANNELS){
    channels[kind]=cleanChannel(kind,source.channels?.[kind]);
  }
  const requested=cleanText(source.primary||'telegram',30);
  const primary=CONTACT_CHANNELS.includes(requested)?requested:'telegram';
  return {primary,channels};
}

function cleanPaymentLocale(source){
  return {
    title:cleanText(source?.title,120),
    subtitle:cleanText(source?.subtitle,500),
    note:cleanText(source?.note,1200)
  };
}

function cleanPayments(value){
  if(!Array.isArray(value))return [];
  const used=new Set();
  return value.slice(0,24).map((item,index)=>{
    const source=item&&typeof item==='object'?item:{};
    let id=cleanText(source.id,80).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    if(!id)id=`payment-${index+1}`;
    let unique=id,suffix=2;
    while(used.has(unique))unique=`${id}-${suffix++}`;
    used.add(unique);

    const locales={};
    for(const locale of SITE_LOCALES){
      if(source.locales?.[locale])locales[locale]=cleanPaymentLocale(source.locales[locale]);
    }
    return {
      id:unique,
      enabled:source.enabled!==false,
      order:Number.isFinite(Number(source.order))?Math.max(1,Math.min(99,Math.round(Number(source.order)))):index+1,
      url:cleanUrl(source.url),
      locales
    };
  });
}

export function normalizeSiteContentConfig(value){
  if(!value||typeof value!=='object')throw new HttpError(400,'Некорректная конфигурация Site CMS');
  return {
    schemaVersion:1,
    texts:{locales:cleanLocaleMap(value.texts?.locales,220,12000)},
    placeholders:{locales:cleanLocaleMap(value.placeholders?.locales,80,1200)},
    contacts:cleanContacts(value.contacts),
    payments:cleanPayments(value.payments)
  };
}

export async function readSiteContentConfig(db){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const row=await db.prepare(
    'SELECT config_json, schema_version, updated_at, last_edited_by FROM site_content_config WHERE id = ?'
  ).bind('main').first();

  if(!row)throw new HttpError(503,'Site CMS ещё не инициализирован');

  let parsed;
  try{parsed=JSON.parse(row.config_json);}
  catch(error){throw new HttpError(500,'Site CMS содержит повреждённый JSON');}

  return {
    config:normalizeSiteContentConfig(parsed),
    schemaVersion:Number(row.schema_version)||1,
    updatedAt:String(row.updated_at||''),
    lastEditedBy:String(row.last_edited_by||'')
  };
}

export async function writeSiteContentConfig(db,value,identity='admin'){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const config=normalizeSiteContentConfig(value);
  const serialized=JSON.stringify(config);
  if(serialized.length>420000)throw new HttpError(413,'Конфигурация Site CMS слишком большая');

  const updatedAt=new Date().toISOString();
  await db.prepare(`
    INSERT INTO site_content_config(id,config_json,schema_version,updated_at,last_edited_by)
    VALUES('main',?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET
      config_json=excluded.config_json,
      schema_version=excluded.schema_version,
      updated_at=excluded.updated_at,
      last_edited_by=excluded.last_edited_by
  `).bind(serialized,updatedAt,String(identity||'admin').slice(0,240)).run();

  return {config,updatedAt,lastEditedBy:String(identity||'admin')};
}
