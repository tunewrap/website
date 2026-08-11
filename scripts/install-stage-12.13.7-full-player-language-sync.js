#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const file=rel=>path.join(root,rel);

function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){
  const out=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(out.status!==0)throw new Error(`Syntax check failed for ${rel}\n${out.stderr||out.stdout}`);
}

['js/script.js','js/catalog-runtime.js','js/catalog-core.js','js/playback-engine.js','package.json'].forEach(read);

/* ---------------------------------------------------------
   1. Own the selected TuneWrap UI language explicitly.
   Do not let browser translation / DOM lang mutations become the source of
   truth for dynamic player/catalog content.
   --------------------------------------------------------- */
let script=read('js/script.js');
const applyLangOld=`  function applyLang(lang){\n    currentLang = lang;`;
const applyLangNew=`  function applyLang(lang){\n    currentLang = lang;\n    window.TUNEWRAP_CURRENT_LANGUAGE = lang;`;
if(!script.includes(applyLangNew)){
  if(!script.includes(applyLangOld))throw new Error('Stage 12.13.7: applyLang anchor not found in js/script.js');
  script=script.replace(applyLangOld,applyLangNew);
}
write('js/script.js',script);
check('js/script.js');

/* ---------------------------------------------------------
   2. Catalog runtime reads the explicit site language first.
   --------------------------------------------------------- */
let catalogRuntime=read('js/catalog-runtime.js');
const runtimeOld=`  function interfaceLanguage(){\n    const language = document.documentElement.getAttribute('lang') || 'ru';\n    return Core.UI_LANGUAGES.includes(language) ? language : 'ru';\n  }`;
const runtimeNew=`  function interfaceLanguage(){\n    const language = String(\n      window.TUNEWRAP_CURRENT_LANGUAGE ||\n      window.TUNEWRAP_INITIAL_LANGUAGE ||\n      document.documentElement.getAttribute('lang') ||\n      'en'\n    ).toLowerCase();\n    return Core.UI_LANGUAGES.includes(language) ? language : 'en';\n  }`;
if(!catalogRuntime.includes(runtimeNew)){
  if(!catalogRuntime.includes(runtimeOld))throw new Error('Stage 12.13.7: interfaceLanguage anchor not found in js/catalog-runtime.js');
  catalogRuntime=catalogRuntime.replace(runtimeOld,runtimeNew);
}
write('js/catalog-runtime.js',catalogRuntime);
check('js/catalog-runtime.js');

/* ---------------------------------------------------------
   3. English-first / original-language-safe track metadata fallback.
   Old Core fallback was requested -> RU -> EN, a leftover from RU-first.
   That could show Russian title/description while EN was selected.
   --------------------------------------------------------- */
let core=read('js/catalog-core.js');

if(!core.includes('const TRACK_LANGUAGE_LOCALE')){
  const anchor=`  const SECTION_ORDER = Object.freeze(['stories','author']);`;
  const replacement=`  const SECTION_ORDER = Object.freeze(['stories','author']);\n  const TRACK_LANGUAGE_LOCALE = Object.freeze({EN:'en',RU:'ru',UA:'uk',GE:'ka',DE:'de'});\n\n  function trackLocale(track){\n    return TRACK_LANGUAGE_LOCALE[String(track?.language||'').toUpperCase()] || '';\n  }`;
  if(!core.includes(anchor))throw new Error('Stage 12.13.7: SECTION_ORDER anchor not found in js/catalog-core.js');
  core=core.replace(anchor,replacement);
}

const oldTitleDescription=`  function title(track,language){\n    return localized(track?.titles,language,track?.title || 'TuneWrap');\n  }\n\n  function description(track,language){\n    return localized(track?.descriptions,language,'');\n  }`;

const newTitleDescription=`  function title(track,language){\n    const titles=track?.titles;\n    if(titles && typeof titles === 'object' && titles[language]) return titles[language];\n\n    const originalLocale=trackLocale(track);\n    // If the requested interface language is also the song's source language,\n    // the canonical base title is safer than falling into an unrelated locale.\n    if(language===originalLocale && track?.title) return track.title;\n\n    return titles?.en ||\n      (originalLocale ? titles?.[originalLocale] : '') ||\n      track?.title ||\n      localized(titles,language,'TuneWrap');\n  }\n\n  function description(track,language){\n    const descriptions=track?.descriptions;\n    if(descriptions && typeof descriptions === 'object' && descriptions[language]) return descriptions[language];\n\n    const originalLocale=trackLocale(track);\n    // Never show a random foreign translation when the UI already matches\n    // the source language. Empty is better than a misleading RU fallback.\n    if(language===originalLocale){\n      return typeof track?.description === 'string' ? track.description : '';\n    }\n\n    return descriptions?.en ||\n      (originalLocale ? descriptions?.[originalLocale] : '') ||\n      (typeof track?.description === 'string' ? track.description : '') ||\n      localized(descriptions,language,'');\n  }`;

if(!core.includes(newTitleDescription)){
  if(!core.includes(oldTitleDescription))throw new Error('Stage 12.13.7: title/description anchor not found in js/catalog-core.js');
  core=core.replace(oldTitleDescription,newTitleDescription);
}
write('js/catalog-core.js',core);
check('js/catalog-core.js');

/* ---------------------------------------------------------
   4. Full Player visible UI localization + stable language source.
   Existing data-player-i18n nodes had Russian fallback text but playback
   engine only translated aria-labels, not visible labels.
   --------------------------------------------------------- */
let player=read('js/playback-engine.js');

if(!player.includes('const PLAYER_VISIBLE_UI')){
  const anchor=`  document.addEventListener('DOMContentLoaded',function(){`;
  const dictionary=`  const PLAYER_VISIBLE_UI = Object.freeze({\n    en:{back:'Back',minimize:'Minimize',showFull:'Show full',lyrics:'Lyrics',translation:'Translation',order:'Order a similar story',fullDescription:'Song description',collapse:'Collapse'},\n    ru:{back:'Назад',minimize:'Свернуть',showFull:'Показать полностью',lyrics:'Текст песни',translation:'Перевод',order:'Заказать похожую историю',fullDescription:'Описание песни',collapse:'Свернуть'},\n    uk:{back:'Назад',minimize:'Згорнути',showFull:'Показати повністю',lyrics:'Текст пісні',translation:'Переклад',order:'Замовити схожу історію',fullDescription:'Опис пісні',collapse:'Згорнути'},\n    ka:{back:'უკან',minimize:'ჩაკეცვა',showFull:'სრულად ჩვენება',lyrics:'სიმღერის ტექსტი',translation:'თარგმანი',order:'მსგავსი ისტორიის შეკვეთა',fullDescription:'სიმღერის აღწერა',collapse:'ჩაკეცვა'},\n    de:{back:'Zurück',minimize:'Minimieren',showFull:'Vollständig anzeigen',lyrics:'Songtext',translation:'Übersetzung',order:'Eine ähnliche Geschichte bestellen',fullDescription:'Songbeschreibung',collapse:'Einklappen'}\n  });\n\n`;
  if(!player.includes(anchor))throw new Error('Stage 12.13.7: DOMContentLoaded anchor not found in js/playback-engine.js');
  player=player.replace(anchor,dictionary+anchor);
}

const playerLangOld=`    function interfaceLanguage(){\n      const code = document.documentElement.getAttribute('lang') || 'ru';\n      return PLAYER_UI[code] ? code : 'ru';\n    }`;
const playerLangNew=`    function interfaceLanguage(){\n      const code = String(\n        window.TUNEWRAP_CURRENT_LANGUAGE ||\n        window.TUNEWRAP_INITIAL_LANGUAGE ||\n        document.documentElement.getAttribute('lang') ||\n        'en'\n      ).toLowerCase();\n      return PLAYER_UI[code] ? code : 'en';\n    }`;
if(!player.includes(playerLangNew)){
  if(!player.includes(playerLangOld))throw new Error('Stage 12.13.7: player interfaceLanguage anchor not found');
  player=player.replace(playerLangOld,playerLangNew);
}

if(!player.includes('function itemLocale(item)')){
  const anchor=`    function itemLanguage(item){\n      return item?.language || 'TuneWrap';\n    }`;
  const replacement=`    function itemLanguage(item){\n      return item?.language || 'TuneWrap';\n    }\n\n    function itemLocale(item){\n      const map={EN:'en',RU:'ru',UA:'uk',GE:'ka',DE:'de'};\n      return map[String(item?.language||'').toUpperCase()] || '';\n    }`;
  if(!player.includes(anchor))throw new Error('Stage 12.13.7: itemLanguage anchor not found');
  player=player.replace(anchor,replacement);
}

const songTextOld=`    function songText(item,field){\n      const value = item?.[field];\n      if(!value || typeof value !== 'object') return '';\n      const code = interfaceLanguage();\n      return value[code] || value.original || value.ru || value.en || value.uk || value.ka || value.de || Object.values(value)[0] || '';\n    }`;
const songTextNew=`    function songText(item,field){\n      const value = item?.[field];\n      if(!value || typeof value !== 'object') return '';\n\n      const code=interfaceLanguage();\n      if(value[code]) return value[code];\n\n      const original=itemLocale(item);\n      // If the UI matches the song's source language, do not fall through\n      // into an unrelated translation such as RU.\n      if(code===original) return value.original || '';\n\n      return value.en ||\n        (original ? value[original] : '') ||\n        value.original ||\n        value.ru || value.uk || value.ka || value.de ||\n        Object.values(value)[0] || '';\n    }`;
if(!player.includes(songTextNew)){
  if(!player.includes(songTextOld))throw new Error('Stage 12.13.7: songText anchor not found');
  player=player.replace(songTextOld,songTextNew);
}

const syncOld=`    function syncLocalizedPlayer(){\n      const labels = ui();\n      seek.setAttribute('aria-label',labels.seek);`;
const syncNew=`    function syncLocalizedPlayer(){\n      const labels = ui();\n      const visible = PLAYER_VISIBLE_UI[interfaceLanguage()] || PLAYER_VISIBLE_UI.en;\n      document.querySelectorAll('[data-player-i18n]').forEach(node=>{\n        const key=node.dataset.playerI18n;\n        if(visible[key])node.textContent=visible[key];\n      });\n      seek.setAttribute('aria-label',labels.seek);`;
if(!player.includes(syncNew)){
  if(!player.includes(syncOld))throw new Error('Stage 12.13.7: syncLocalizedPlayer anchor not found');
  player=player.replace(syncOld,syncNew);
}

write('js/playback-engine.js',player);
check('js/playback-engine.js');

/* ---------------------------------------------------------
   5. Test registration.
   --------------------------------------------------------- */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['playerlang:test']='node scripts/stage-12.13.7-full-player-language-sync-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('playerlang:test')){
  pkg.scripts.test += ' && npm run playerlang:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.7 Full Player Language Sync installed.');
console.log('PASS: native EN/RU/UA/GE/DE selection is now the source of truth for dynamic player/catalog localization.');
console.log('PASS: visible Full Player labels are localized in all five site languages.');
console.log('PASS: EN track metadata no longer falls back to RU when its EN localized map entry is missing.');
console.log('D1 migration: not required.');
