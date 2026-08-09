import {requireAdmin,requireSameOrigin} from '../../_shared/auth.js';
import {HttpError,handleError,json,readJson} from '../../_shared/http.js';

const MODEL = '@cf/meta/m2m100-1.2b';
const LANGUAGE_TO_LOCALE = Object.freeze({RU:'ru',UA:'uk',GE:'ka',EN:'en',DE:'de'});
const ALLOWED_LOCALES = Object.freeze(['ru','uk','ka','en','de']);

function cleanText(value,max){
  const text=String(value||'').trim();
  if(text.length>max) throw new HttpError(413,`Текст слишком длинный для автоперевода (${max} символов максимум)`);
  return text;
}

async function translateText(ai,text,source,target){
  if(!text) return '';
  const result=await ai.run(MODEL,{text,source_lang:source,target_lang:target});
  const translated=typeof result?.translated_text==='string' ? result.translated_text.trim() : '';
  if(!translated) throw new Error(`Translation model returned no text for ${target}`);
  return translated;
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

    if(!targets.length) return json({ok:true,model:MODEL,source,translations:{}});

    const payload={
      title:cleanText(body.title,400),
      description:cleanText(body.description,12000),
      lyrics:cleanText(body.lyrics,24000)
    };
    if(!payload.title&&!payload.description&&!payload.lyrics) throw new HttpError(400,'Нет текста для перевода');

    const entries=await Promise.all(targets.map(async target=>{
      const [title,description,lyrics]=await Promise.all([
        translateText(context.env.AI,payload.title,source,target),
        translateText(context.env.AI,payload.description,source,target),
        translateText(context.env.AI,payload.lyrics,source,target)
      ]);
      return [target,{title,description,lyrics}];
    }));

    return json({ok:true,model:MODEL,source,translations:Object.fromEntries(entries)});
  }catch(error){
    return handleError(error);
  }
}
