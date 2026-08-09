import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {HttpError,handleError,json,readJson} from '../../_shared/http.js';

const MODEL = '@cf/meta/m2m100-1.2b';
const LANGUAGE_TO_LOCALE = Object.freeze({RU:'ru',UA:'uk',GE:'ka',EN:'en',DE:'de'});
const ALLOWED_LOCALES = Object.freeze(['ru','uk','ka','en','de']);

const SECTION_LABELS = Object.freeze({
  verse:      {ru:'Куплет', uk:'Куплет', ka:'კუპლეტი', en:'Verse', de:'Strophe'},
  chorus:     {ru:'Припев', uk:'Приспів', ka:'მისამღერი', en:'Chorus', de:'Refrain'},
  prechorus:  {ru:'Предприпев', uk:'Передприспів', ka:'პრექორუსი', en:'Pre-Chorus', de:'Pre-Refrain'},
  bridge:     {ru:'Бридж', uk:'Бридж', ka:'ბრიჯი', en:'Bridge', de:'Bridge'},
  intro:      {ru:'Вступление', uk:'Вступ', ka:'ინტრო', en:'Intro', de:'Intro'},
  outro:      {ru:'Финал', uk:'Фінал', ka:'აუტრო', en:'Outro', de:'Outro'}
});

const SECTION_ALIASES = Object.freeze([
  ['prechorus',/(предприпев|передприспів|pre[ -]?chorus|pre[ -]?refrain|პრექორუს)/i],
  ['chorus',/(припев|приспів|chorus|refrain|მისამღერ)/i],
  ['verse',/(куплет|verse|strophe|კუპლეტ)/i],
  ['bridge',/(бридж|bridge|ბრიჯ)/i],
  ['intro',/(вступ|вступление|intro|ინტრო)/i],
  ['outro',/(финал|фінал|outro|აუტრო)/i]
]);

function cleanText(value,max){
  const text=String(value||'').replace(/\r\n/g,'\n').trim();
  if(text.length>max) throw new HttpError(413,`Текст слишком длинный для автоперевода (${max} символов максимум)`);
  return text;
}

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

function aiErrorMessage(error){
  const raw=String(error?.message||error||'Unknown Workers AI error');
  if(raw.includes('3036')) return 'Закончился дневной бесплатный лимит Workers AI (код 3036).';
  if(raw.includes('3040')) return 'Workers AI временно перегружен (код 3040).';
  if(raw.includes('3007')) return 'Workers AI не успел выполнить перевод вовремя (код 3007).';
  if(raw.includes('3006')) return 'Запрос к Workers AI слишком большой (код 3006).';
  return `Workers AI: ${raw}`;
}

async function translateText(ai,text,source,target){
  const value=String(text||'').trim();
  if(!value) return '';

  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const result=await ai.run(MODEL,{text:value,source_lang:source,target_lang:target});
      const translated=typeof result?.translated_text==='string' ? result.translated_text.trim() : '';
      if(!translated) throw new Error(`Translation model returned no text for ${target}`);
      return translated;
    }catch(error){
      lastError=error;
      const message=String(error?.message||error||'');
      // Daily allocation and malformed requests will not recover with retries.
      if(message.includes('3036')||message.includes('3006')||message.includes('5004')||message.includes('5007')) break;
      if(attempt<3) await sleep(attempt===1?450:1100);
    }
  }
  throw new HttpError(502,aiErrorMessage(lastError));
}

function localizedSectionLabel(line,target){
  const trimmed=String(line||'').trim();
  const match=trimmed.match(/^\[([^\]]+)\]$/);
  if(!match)return null;
  const sourceLabel=match[1].trim();
  const number=(sourceLabel.match(/\d+/)||[])[0]||'';
  for(const [key,pattern] of SECTION_ALIASES){
    if(pattern.test(sourceLabel)){
      const label=SECTION_LABELS[key]?.[target];
      if(label)return `[${label}${number?` ${number}`:''}]`;
    }
  }
  return null;
}

async function mapWithConcurrency(items,limit,worker){
  const output=new Array(items.length);
  let cursor=0;
  async function runner(){
    while(true){
      const index=cursor++;
      if(index>=items.length)return;
      output[index]=await worker(items[index],index);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length||1)},runner));
  return output;
}

async function translatePreservingLines(ai,text,source,target,{songStructure=false}={}){
  if(!text)return '';
  const lines=String(text).replace(/\r\n/g,'\n').split('\n');

  // Keep only two simultaneous model calls. Stage 11.0.5 used six; reducing
  // concurrency makes long song translations much less likely to hit transient
  // Workers AI capacity/timeout failures while preserving exact line topology.
  const translated=await mapWithConcurrency(lines,2,async line=>{
    if(!line.trim())return '';
    if(songStructure){
      const section=localizedSectionLabel(line,target);
      if(section)return section;
    }
    return translateText(ai,line,source,target);
  });

  return translated.join('\n');
}

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    await requireAdmin(context);
    if(!context.env.AI) throw new HttpError(503,'Workers AI binding is not configured');

    const body=await readJson(context.request);
    const sourceLanguage=String(body.sourceLanguage||'').toUpperCase();
    const source=LANGUAGE_TO_LOCALE[sourceLanguage];
    if(!source) throw new HttpError(400,'Неподдерживаемый исходный язык');

    const requested=Array.isArray(body.targets) ? body.targets : ALLOWED_LOCALES;
    const targets=[...new Set(requested.map(value=>String(value||'').toLowerCase()))]
      .filter(locale=>ALLOWED_LOCALES.includes(locale)&&locale!==source);

    if(!targets.length) return json({ok:true,model:MODEL,source,structureVersion:3,translations:{}});

    const payload={
      title:cleanText(body.title,400),
      description:cleanText(body.description,12000),
      lyrics:cleanText(body.lyrics,24000)
    };
    if(!payload.title&&!payload.description&&!payload.lyrics) throw new HttpError(400,'Нет текста для перевода');

    const translations={};
    for(const target of targets){
      try{
        const title=await translateText(context.env.AI,payload.title,source,target);
        const description=await translatePreservingLines(context.env.AI,payload.description,source,target);
        const lyrics=await translatePreservingLines(context.env.AI,payload.lyrics,source,target,{songStructure:true});
        translations[target]={title,description,lyrics};
      }catch(error){
        if(error instanceof HttpError){
          throw new HttpError(error.status,`${target.toUpperCase()}: ${error.message}`);
        }
        throw error;
      }
    }

    return json({ok:true,model:MODEL,source,structureVersion:3,translations});
  }catch(error){
    return handleError(error);
  }
}
