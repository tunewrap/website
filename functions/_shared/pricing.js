import {HttpError} from './http.js';

export const PRICING_LOCALES=Object.freeze(['ru','uk','ka','en','de']);
export const PRICING_TIER_IDS=Object.freeze(['simple','advanced','hit']);
export const PRICING_WEDDING_IDS=Object.freeze(['first-dance','love-story','wedding-collection']);

const SETTINGS_FIELDS=Object.freeze([
  'pricingEyebrow','pricingTitle','pricingIntro','promoTitle','promoUntil',
  'weddingTitle','weddingSubtitle','detailsLabel','weddingPanelLabel',
  'whatIncluded','idealFor','tierSelect','urgentLabel'
]);

function cleanText(value,max=4000){
  return String(value??'').replace(/\r\n?/g,'\n').trim().slice(0,max);
}

function cleanPrice(value){
  const number=Number(value);
  if(!Number.isFinite(number)||number<0||number>99999)throw new HttpError(400,'Некорректная стоимость');
  return Math.round(number);
}

function cleanOrder(value,fallback){
  const number=Number(value);
  if(!Number.isFinite(number))return fallback;
  return Math.max(1,Math.min(99,Math.round(number)));
}

function cleanStringList(value,maxItems=24,maxLength=500){
  if(!Array.isArray(value))return [];
  return value.slice(0,maxItems).map(item=>cleanText(item,maxLength)).filter(Boolean);
}

function cleanSettingsLocales(value){
  const output={};
  for(const locale of PRICING_LOCALES){
    const source=value?.[locale];
    if(!source||typeof source!=='object')continue;
    const target={};
    for(const field of SETTINGS_FIELDS)target[field]=cleanText(source[field],1200);
    output[locale]=target;
  }
  return output;
}

function cleanOfferLocales(value,type){
  const output={};
  for(const locale of PRICING_LOCALES){
    const source=value?.[locale];
    if(!source||typeof source!=='object')continue;
    if(type==='tier'){
      output[locale]={
        name:cleanText(source.name,120),
        badge:cleanText(source.badge,80),
        features:cleanStringList(source.features,20,500)
      };
    }else{
      output[locale]={
        name:cleanText(source.name,120),
        short:cleanText(source.short,300),
        description:cleanText(source.description,1800),
        includes:cleanStringList(source.includes,24,500),
        ideal:cleanText(source.ideal,800),
        button:cleanText(source.button,180)
      };
    }
  }
  return output;
}

function normalizeOffers(value,ids,type){
  const source=Array.isArray(value)?value:[];
  return ids.map((id,index)=>{
    const item=source.find(candidate=>candidate?.id===id)||{};
    return {
      id,
      enabled:item.enabled!==false,
      order:cleanOrder(item.order,index+1),
      oldPrice:cleanPrice(item.oldPrice??0),
      price:cleanPrice(item.price??0),
      locales:cleanOfferLocales(item.locales,type)
    };
  });
}

export function normalizePricingConfig(value){
  if(!value||typeof value!=='object')throw new HttpError(400,'Некорректная конфигурация стоимости');
  const currency=cleanText(value.currency||'USD',3).toUpperCase();
  if(!/^[A-Z]{3}$/.test(currency))throw new HttpError(400,'Некорректная валюта');
  return {
    schemaVersion:1,
    currency,
    urgentFee:cleanPrice(value.urgentFee??25),
    settings:{locales:cleanSettingsLocales(value.settings?.locales)},
    tiers:normalizeOffers(value.tiers,PRICING_TIER_IDS,'tier'),
    weddings:normalizeOffers(value.weddings,PRICING_WEDDING_IDS,'wedding')
  };
}

export async function readPricingConfig(db){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const row=await db.prepare(
    'SELECT config_json, schema_version, updated_at, last_edited_by FROM pricing_config WHERE id = ?'
  ).bind('main').first();
  if(!row)throw new HttpError(503,'Pricing CMS ещё не инициализирован');
  let parsed;
  try{parsed=JSON.parse(row.config_json);}
  catch(error){throw new HttpError(500,'Pricing CMS содержит повреждённый JSON');}
  return {
    config:normalizePricingConfig(parsed),
    schemaVersion:Number(row.schema_version)||1,
    updatedAt:String(row.updated_at||''),
    lastEditedBy:String(row.last_edited_by||'')
  };
}

export async function writePricingConfig(db,value,identity='admin'){
  if(!db)throw new HttpError(503,'D1 binding TUNEWRAP_DB недоступен');
  const config=normalizePricingConfig(value);
  const serialized=JSON.stringify(config);
  if(serialized.length>180000)throw new HttpError(413,'Конфигурация стоимости слишком большая');
  const updatedAt=new Date().toISOString();
  await db.prepare(`
    INSERT INTO pricing_config(id,config_json,schema_version,updated_at,last_edited_by)
    VALUES('main',?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET
      config_json=excluded.config_json,
      schema_version=excluded.schema_version,
      updated_at=excluded.updated_at,
      last_edited_by=excluded.last_edited_by
  `).bind(serialized,updatedAt,String(identity||'admin').slice(0,240)).run();
  return {config,updatedAt,lastEditedBy:String(identity||'admin')};
}
