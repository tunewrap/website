import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {HttpError,handleError,json,readJson} from '../../_shared/http.js';

const MODEL='@cf/meta/m2m100-1.2b';
const FALLBACK_MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
const SECOND_FALLBACK_MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
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

// Stage 12.14.4: translation integrity guard. A reasoning model once returned
// its English chain-of-thought as the "translation". Only a schema-shaped
// answer which also passes strict single-line checks may leave this endpoint.
const TRANSLATION_SCHEMA=Object.freeze({
  type:'object',
  properties:{translation:{type:'string'}},
  required:['translation'],
  additionalProperties:false
});

const AI_REASONING_PATTERNS=Object.freeze([
  /\b(?:okay|alright),?\s+let(?:'|’)?s\s+(?:tackle|translate|work through|break\s+(?:this|it)\s+down)/i,
  /\bthe user(?:'s)?\s+(?:asks|wants|provided|sentence|text)/i,
  /\b(?:source|original|target)\s+(?:sentence|text|phrase|language)\b/i,
  /\b(?:translate|translating|translated)\s+(?:this|the|it)\s+(?:sentence|line|phrase|text)\b/i,
  /\bputting it all together\b/i,
  /\bi need to\s+(?:translate|make sure|check)\b/i,
  /\b(?:here(?:'|’)?s|the)\s+(?:final\s+)?translation\b/i,
  /<\/?think>|```|^\s*(?:analysis|reasoning)\s*:/im
]);

function targetScriptShare(value,target){
  let relevant=0;
  let matching=0;
  for(const char of String(value||'')){
    const latin=/[A-Za-zÄÖÜäöüß]/.test(char);
    const cyrillic=/[\u0400-\u04ff]/.test(char);
    const georgian=/[\u10a0-\u10ff]/.test(char);
    if(!latin&&!cyrillic&&!georgian)continue;
    relevant+=1;
    if((target==='ka'&&georgian)||((target==='ru'||target==='uk')&&cyrillic)||((target==='en'||target==='de')&&latin))matching+=1;
  }
  return relevant?matching/relevant:1;
}

function validateTranslatedLine(candidate,source,target){
  let value=String(candidate||'').trim();
  const original=String(source||'').trim();
  if(!value)return '';
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith('“')&&value.endsWith('”'))){
    value=value.slice(1,-1).trim();
  }
  if(!value||/[\r\n]/.test(value))return '';
  if(AI_REASONING_PATTERNS.some(pattern=>pattern.test(value)))return '';
  const maxLength=Math.max(180,Math.min(3600,original.length*3+180));
  if(value.length>maxLength)return '';
  if(['ru','uk','ka'].includes(target)&&targetScriptShare(value,target)<0.4){
    const properName=/^[A-Z0-9][A-Za-z0-9 .&'’\-]{0,80}$/.test(original);
    if(!properName)return '';
  }
  return value;
}

function extractStructuredTranslation(result){
  const candidates=[result?.response,result?.choices?.[0]?.message?.content,result?.output_text];
  for(const candidate of candidates){
    if(candidate&&typeof candidate==='object'&&typeof candidate.translation==='string')return candidate.translation;
    if(typeof candidate!=='string')continue;
    const text=candidate.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    if(!text.startsWith('{'))continue;
    try{
      const parsed=JSON.parse(text);
      if(typeof parsed?.translation==='string')return parsed.translation;
    }catch(error){}
  }
  return '';
}

async function runPrimaryOnce(ai,value,source,target){
  const result=await ai.run(MODEL,{
    text:value,
    source_lang:source,
    target_lang:target
  });
  const candidate=typeof result?.translated_text==='string' ? result.translated_text : '';
  return validateTranslatedLine(candidate,value,target);
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
    'Return the translation in the required JSON field.',
    'Never explain, analyze, quote the source, add notes, or use markdown.',
    'Preserve the emotional meaning and natural wording.',
    '',
    value
  ].join('\n');

  const result=await ai.run(FALLBACK_MODEL,{
    messages:[
      {role:'system',content:'You are a precise professional translator. Fill only the required JSON schema.'},
      {role:'user',content:prompt}
    ],
    temperature:0,
    max_tokens:512,
    response_format:{type:'json_schema',json_schema:TRANSLATION_SCHEMA},
    stream:false
  });

  return validateTranslatedLine(extractStructuredTranslation(result),value,target);
}

async function secondFallbackTranslateText(ai,value,source,target){
  const sourceName=LANGUAGE_NAMES[source]||source;
  const targetName=LANGUAGE_NAMES[target]||target;
  const prompt=[
    `Translate the following single line from ${sourceName} to ${targetName}.`,
    'Return the translation in the required JSON field.',
    'Never explain, analyze, quote the source, add notes, or use markdown.',
    '',
    value
  ].join('\n');

  const result=await ai.run(SECOND_FALLBACK_MODEL,{
    messages:[
      {role:'system',content:'Translate precisely and fill only the required JSON schema.'},
      {role:'user',content:prompt}
    ],
    temperature:0,
    max_tokens:512,
    response_format:{type:'json_schema',json_schema:TRANSLATION_SCHEMA},
    stream:false
  });

  return validateTranslatedLine(extractStructuredTranslation(result),value,target);
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
