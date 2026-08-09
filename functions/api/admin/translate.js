import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {HttpError,handleError,json,readJson} from '../../_shared/http.js';

const MODEL='@cf/meta/m2m100-1.2b';
const LANGUAGE_TO_LOCALE=Object.freeze({RU:'ru',UA:'uk',GE:'ka',EN:'en',DE:'de'});
const ALLOWED_LOCALES=Object.freeze(['ru','uk','ka','en','de']);
const MAX_ITEMS=12;

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

async function translateText(ai,text,source,target){
  const value=String(text||'').trim();
  if(!value)return '';
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const result=await ai.run(MODEL,{text:value,source_lang:source,target_lang:target});
      const translated=typeof result?.translated_text==='string'?result.translated_text.trim():'';
      if(!translated)throw new Error(`Translation model returned no text for ${target}`);
      return translated;
    }catch(error){
      lastError=error;
      const message=String(error?.message||error||'');
      if(message.includes('3036')||message.includes('3006')||message.includes('Too many subrequests'))break;
      if(attempt<2)await sleep(500);
    }
  }
  throw new HttpError(502,aiErrorMessage(lastError));
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
