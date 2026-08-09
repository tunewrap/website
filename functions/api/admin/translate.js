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

async function translateText(ai,text,source,target){
  const value=String(text||'').trim();
  if(!value) return '';
  const result=await ai.run(MODEL,{text:value,source_lang:source,target_lang:target});
  const translated=typeof result?.translated_text==='string' ? result.translated_text.trim() : '';
  if(!translated) throw new Error(`Translation model returned no text for ${target}`);
  return translated;
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
  const translated=await mapWithConcurrency(lines,6,async line=>{
    if(!line.trim())return '';
    if(songStructure){
      const section=localizedSectionLabel(line,target);
      if(section)return section;
    }
    return translateText(ai,line,source,target);
  });
  // Exact source line-break topology is retained: one output line per input line,
  // including blank stanza separators.
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

    if(!targets.length) return json({ok:true,model:MODEL,source,structureVersion:2,translations:{}});

    const payload={
      title:cleanText(body.title,400),
      description:cleanText(body.description,12000),
      lyrics:cleanText(body.lyrics,24000)
    };
    if(!payload.title&&!payload.description&&!payload.lyrics) throw new HttpError(400,'Нет текста для перевода');

    // Process target languages one-by-one so a normal song stays within a small,
    // predictable number of simultaneous Workers AI calls.
    const translations={};
    for(const target of targets){
      const title=await translateText(context.env.AI,payload.title,source,target);
      const description=await translatePreservingLines(context.env.AI,payload.description,source,target);
      const lyrics=await translatePreservingLines(context.env.AI,payload.lyrics,source,target,{songStructure:true});
      translations[target]={title,description,lyrics};
    }

    return json({ok:true,model:MODEL,source,structureVersion:2,translations});
  }catch(error){
    return handleError(error);
  }
}
