import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {HttpError,handleError,json,readJson} from '../../_shared/http.js';

const MODEL='@cf/meta/m2m100-1.2b';
const FALLBACK_MODEL='@cf/zai-org/glm-4.7-flash';
const SECOND_FALLBACK_MODEL='@cf/qwen/qwen3-30b-a3b-fp8';
const LANGUAGE_TO_LOCALE=Object.freeze({RU:'ru',UA:'uk',GE:'ka',EN:'en',DE:'de'});
const ALLOWED_LOCALES=Object.freeze(['ru','uk','ka','en','de']);
const MAX_ITEMS=8;

const SECTION_LABELS=Object.freeze({
  verse:{ru:'Куплет',uk:'Куплет',ka:'კუპლეტი',en:'Verse',de:'Strophe'},
  chorus:{ru:'Припев',uk:'Приспів',ka:'მისამღერი',en:'Chorus',de:'Refrain'},
  prechorus:{ru:'Предприпев',uk:'Передприспів',ka:'პრექორუსი',en:'Pre-Chorus',de:'Pre-Refrain'},
  bridge:{ru:'Бридж',uk:'Бридж',ka:'ბრიჯი',en:'Bridge',de:'Bridge'},
  intro:{ru:'Вступление',uk:'Вступ',ka:'ინტრო',en:'Intro',de:'Intro'},
  outro:{ru:'Финал',uk:'Фінал',ka:'აუტრო',en:'Outro',de:'Outro'}
});

const SECTION_ALIASES=Object.freeze([
  ['prechorus',/(предприпев|передприспів|pre[ -]?chorus|pre[ -]?refrain|პრექორუს)/i],
  ['chorus',/(припев|приспів|chorus|refrain|მისამღერ)/i],
  ['verse',/(куплет|verse|strophe|კუპლეტ)/i],
  ['bridge',/(бридж|bridge|ბრიჯ)/i],
  ['intro',/(вступ|вступление|intro|ინტრო)/i],
  ['outro',/(финал|фінал|outro|აუტრო)/i]
]);

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

function aiErrorMessage(error){
  const raw=String(error?.message||error||'Unknown Workers AI error');
  if(raw.includes('Too many subrequests'))return 'Cloudflare превысил лимит subrequests. TuneWrap разбивает перевод на меньшие пакеты, но этот пакет всё равно не прошёл.';
  if(raw.includes('3036'))return 'Закончился дневной бесплатный лимит Workers AI (код 3036).';
  if(raw.includes('3040'))return 'Workers AI временно перегружен (код 3040).';
  if(raw.includes('3007'))return 'Workers AI не успел выполнить перевод вовремя (код 3007).';
  if(raw.includes('3006'))return 'Запрос к Workers AI слишком большой (код 3006).';
  return `Workers AI: ${raw}`;
}

function localizedSectionLabel(line,target){
  const match=String(line||'').trim().match(/^\[([^\]]+)\]$/);
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

const LANGUAGE_NAMES=Object.freeze({
  ru:'Russian',
  uk:'Ukrainian',
  ka:'Georgian',
  en:'English',
  de:'German'
});

function extractGeneratedText(result){
  const seen=new Set();

  function walk(value,depth=0){
    if(value==null||depth>7)return '';
    if(typeof value==='string'){
      const text=value.trim();
      return text;
    }
    if(typeof value!=='object'||seen.has(value))return '';
    seen.add(value);

    // Prefer known completion fields first.
    const preferred=['response','output_text','translated_text','content','text','answer','result'];
    for(const key of preferred){
      const candidate=value?.[key];
      if(typeof candidate==='string'&&candidate.trim())return candidate.trim();
      if(Array.isArray(candidate)){
        for(const item of candidate){
          const nested=walk(item,depth+1);
          if(nested)return nested;
        }
      }
    }

    const choice=value?.choices?.[0];
    if(choice){
      const nested=walk(choice,depth+1);
      if(nested)return nested;
    }

    const message=value?.message;
    if(message){
      const nested=walk(message,depth+1);
      if(nested)return nested;
    }

    // Last resort: inspect remaining nested objects, but ignore metadata/reasoning.
    for(const [key,candidate] of Object.entries(value)){
      if(['id','object','model','created','usage','system_fingerprint','service_tier',
          'reasoning','reasoning_content','finish_reason'].includes(key))continue;
      if(candidate&&typeof candidate==='object'){
        const nested=walk(candidate,depth+1);
        if(nested)return nested;
      }
    }
    return '';
  }

  return walk(result);
}

async function runPrimaryOnce(ai,value,source,target){
  const result=await ai.run(MODEL,{
    text:value,
    source_lang:source,
    target_lang:target
  });
  return typeof result?.translated_text==='string' ? result.translated_text.trim() : '';
}

async function pivotTranslateText(ai,value,source,target){
  // A direct source→Georgian inference can occasionally return an empty string.
  // Route only that failed line through a stable intermediate language.
  const pivot=source==='en' ? 'ru' : 'en';
  const first=await runPrimaryOnce(ai,value,source,pivot);
  if(!first)return '';
  return runPrimaryOnce(ai,first,pivot,target);
}

async function fallbackTranslateText(ai,value,source,target){
  const sourceName=LANGUAGE_NAMES[source]||source;
  const targetName=LANGUAGE_NAMES[target]||target;
  const prompt=[
    `Translate this single line from ${sourceName} to ${targetName}.`,
    'Return ONLY the translated line.',
    'Do not explain, do not add quotation marks, labels, notes, or markdown.',
    'Preserve the emotional meaning and natural wording.',
    '',
    value
  ].join('\n');

  const result=await ai.run(FALLBACK_MODEL,{
    messages:[
      {role:'system',content:'You are a precise professional translator. Return only the translation.'},
      {role:'user',content:prompt}
    ],
    temperature:0,
    reasoning_effort:'low',
    max_completion_tokens:1024,
    stream:false
  });

  return extractGeneratedText(result);
}

async function secondFallbackTranslateText(ai,value,source,target){
  const sourceName=LANGUAGE_NAMES[source]||source;
  const targetName=LANGUAGE_NAMES[target]||target;
  const prompt=[
    `Translate the following single line from ${sourceName} to ${targetName}.`,
    'Output only the translated line. No explanation, no markdown, no quotes.',
    '',
    value
  ].join('\n');

  const result=await ai.run(SECOND_FALLBACK_MODEL,{
    prompt,
    temperature:0.1,
    max_tokens:512,
    stream:false
  });

  return extractGeneratedText(result);
}

async function translateText(ai,text,source,target){
  const value=String(text||'').trim();
  if(!value)return '';

  let lastError=null;
  let gotEmpty=false;

  // 1) Direct M2M100 translation, with one retry.
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const translated=await runPrimaryOnce(ai,value,source,target);
      if(translated)return translated;
      gotEmpty=true;
      lastError=new Error(`Translation model returned no text for ${target}`);
    }catch(error){
      lastError=error;
      const message=String(error?.message||error||'');
      if(message.includes('3036')||message.includes('3006')||message.includes('Too many subrequests'))break;
    }
    if(attempt<2)await sleep(300);
  }

  const hardMessage=String(lastError?.message||lastError||'');
  const hardFailure=
    hardMessage.includes('3036')||
    hardMessage.includes('3006')||
    hardMessage.includes('Too many subrequests');

  if(!hardFailure){
    // 2) For failed Georgian lines, try M2M100 again through EN/RU pivot.
    if(target==='ka'){
      try{
        const pivot=await pivotTranslateText(ai,value,source,target);
        if(pivot)return pivot;
      }catch(error){
        lastError=error;
      }
    }

    // 3) Reserve multilingual LLM.
    try{
      const fallback=await fallbackTranslateText(ai,value,source,target);
      if(fallback)return fallback;
      lastError=new Error(`Fallback translation model returned no text for ${target}`);
    }catch(error){
      lastError=error;
    }

    // 4) Second reserve multilingual LLM using a different response family.
    try{
      const second=await secondFallbackTranslateText(ai,value,source,target);
      if(second)return second;
      lastError=new Error(`Second fallback translation model returned no text for ${target}`);
    }catch(error){
      lastError=error;
    }
  }

  throw new HttpError(
    502,
    target==='ka'
      ? `Не удалось автоматически перевести одну строку на грузинский после 4 способов перевода: ${aiErrorMessage(lastError)}`
      : aiErrorMessage(lastError)
  );
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

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    await requireAdmin(context);
    if(!context.env.AI)throw new HttpError(503,'Workers AI binding is not configured');

    const body=await readJson(context.request);
    const sourceLanguage=String(body.sourceLanguage||'').toUpperCase();
    const source=LANGUAGE_TO_LOCALE[sourceLanguage];
    const target=String(body.target||'').toLowerCase();

    if(!source)throw new HttpError(400,'Неподдерживаемый исходный язык');
    if(!ALLOWED_LOCALES.includes(target)||target===source)throw new HttpError(400,'Неподдерживаемый язык перевода');

    const items=Array.isArray(body.items)?body.items:[];
    if(!items.length)throw new HttpError(400,'Нет строк для перевода');
    if(items.length>MAX_ITEMS)throw new HttpError(413,`Слишком большой пакет перевода: максимум ${MAX_ITEMS} строк`);

    const safeItems=items.map((item,index)=>{
      const id=String(item?.id||'').trim();
      const kind=String(item?.kind||'text').trim();
      const text=String(item?.text||'').trim();
      if(!id||!text)throw new HttpError(400,`Некорректная строка перевода #${index+1}`);
      if(text.length>2400)throw new HttpError(413,`Строка #${index+1} слишком длинная`);
      return {id,kind,text};
    });

    const pairs=await mapWithConcurrency(safeItems,2,async item=>{
      if(item.kind==='lyrics'){
        const section=localizedSectionLabel(item.text,target);
        if(section)return [item.id,section];
      }
      const translated=await translateText(context.env.AI,item.text,source,target);
      return [item.id,translated];
    });

    return json({
      ok:true,
      model:MODEL,
      fallbackModel:FALLBACK_MODEL,
      secondFallbackModel:SECOND_FALLBACK_MODEL,
      source,
      target,
      chunked:true,
      maxItems:MAX_ITEMS,
      translations:Object.fromEntries(pairs)
    });
  }catch(error){
    return handleError(error);
  }
}
