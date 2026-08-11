#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){
  const result=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Syntax check failed for ${rel}\n${result.stderr||result.stdout}`);
}
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function htmlAttr(value){
  return String(value).replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

['index.html','js/script.js','js/app-bootstrap.js','js/site-cms-runtime.js','package.json'].forEach(read);

function extractEnglishDictionary(script){
  const i18nStart=script.indexOf('const I18N = {');
  if(i18nStart<0)throw new Error('Stage 12.13: I18N dictionary not found.');
  const enStart=script.indexOf('\n    en: {',i18nStart);
  const deStart=script.indexOf('\n    de: {',enStart);
  if(enStart<0||deStart<0)throw new Error('Stage 12.13: EN dictionary block not found.');
  const block=script.slice(enStart,deStart);
  const dict={};
  const line=/^\s+([A-Za-z0-9_]+):(\"(?:\\.|[^\"\\])*\"),?\s*$/gm;
  let match;
  while((match=line.exec(block))){
    dict[match[1]]=JSON.parse(match[2]);
  }
  if(Object.keys(dict).length<60)throw new Error(`Stage 12.13: EN dictionary extraction incomplete (${Object.keys(dict).length} keys).`);
  return dict;
}

let script=read('js/script.js');
const en=extractEnglishDictionary(script);
let html=read('index.html');

html=html.replace(/<html\s+lang=\"[^\"]*\">/i,'<html lang="en">');
html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>TuneWrap — Your Story, Your Song</title>');
if(!/<meta\s+name=\"description\"/i.test(html)){
  html=html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta name="description" content="Turn real memories, people and life stories into personal songs with TuneWrap.">' 
  );
}

if(!html.includes('id="tunewrapLanguageBoot"')){
  const boot=`<script id="tunewrapLanguageBoot">\n(function(){\n  try{\n    var raw=(new URLSearchParams(location.search).get('lang')||'').toLowerCase();\n    var aliases={ge:'ka',ua:'uk'};\n    raw=aliases[raw]||raw;\n    var supported=['en','ru','uk','ka','de'];\n    var initial=supported.indexOf(raw)>=0?raw:'en';\n    document.documentElement.lang=initial;\n    window.TUNEWRAP_INITIAL_LANGUAGE=initial;\n  }catch(error){\n    document.documentElement.lang='en';\n    window.TUNEWRAP_INITIAL_LANGUAGE='en';\n  }\n})();\n</script>`;
  html=html.replace('</title>','</title>\n'+boot);
}

for(const [key,value] of Object.entries(en)){
  const re=new RegExp('(<([A-Za-z][A-Za-z0-9:-]*)[^>]*\\bdata-i18n="'+escapeRegExp(key)+'"[^>]*>)([\\s\\S]*?)(<\\/\\2>)','g');
  html=html.replace(re,(all,open,tag,old,close)=>open+value+close);
  const phRe=new RegExp('(<[^>]*\\bdata-i18n-ph="'+escapeRegExp(key)+'"[^>]*\\bplaceholder=")([^\"]*)(")','g');
  html=html.replace(phRe,(all,before,old,after)=>before+htmlAttr(value)+after);
}

const staticReplacements=[
  ['aria-label="Выбрать язык"','aria-label="Choose language"'],
  ['aria-label="Открыть меню"','aria-label="Open menu"'],
  ['aria-label="Развернуть плеер"','aria-label="Expand player"'],
  ['aria-label="Предыдущий трек"','aria-label="Previous track"'],
  ['aria-label="Воспроизвести"','aria-label="Play"'],
  ['aria-label="Следующий трек"','aria-label="Next track"'],
  ['aria-label="Остановить музыку"','aria-label="Stop music"'],
  ['aria-label="Музыкальные истории"','aria-label="Musical stories"'],
  ['aria-label="Язык песен"','aria-label="Song language"'],
  ['aria-label="Открыть песню"','aria-label="Open song"'],
  ['aria-label="Ограниченная стартовая акция"','aria-label="Limited launch offer"'],
  ['aria-label="Свадебные пакеты"','aria-label="Wedding packages"'],
  ['aria-label="Закрыть"','aria-label="Close"']
];
for(const [from,to] of staticReplacements)html=html.split(from).join(to);

html=html.replace(/class="lang-btn active"(\s+data-lang="(?:ru|uk|ka|de)")/g,'class="lang-btn"$1');
html=html.replace(/class="lang-btn"(\s+data-lang="en")/g,'class="lang-btn active"$1');
html=html.replace('class="songs-language-tab is-active" id="songsLangRU" type="button" role="tab" aria-selected="true" aria-controls="songsLibraryPanel" tabindex="0" data-song-language-filter="RU"','class="songs-language-tab" id="songsLangRU" type="button" role="tab" aria-selected="false" aria-controls="songsLibraryPanel" tabindex="-1" data-song-language-filter="RU"');
html=html.replace('class="songs-language-tab" id="songsLangEN" type="button" role="tab" aria-selected="false" aria-controls="songsLibraryPanel" tabindex="-1" data-song-language-filter="EN"','class="songs-language-tab is-active" id="songsLangEN" type="button" role="tab" aria-selected="true" aria-controls="songsLibraryPanel" tabindex="0" data-song-language-filter="EN"');
html=html.replace('id="songsLibraryLanguage">Русский<','id="songsLibraryLanguage">English<');
html=html.replace('id="songsLibraryCount">3 истории<','id="songsLibraryCount">3 stories<');
html=html.replace('aria-labelledby="songsLangRU"','aria-labelledby="songsLangEN"');
html=html.replace('id="songsLibraryEmptyTitle">Песни скоро появятся<','id="songsLibraryEmptyTitle">More songs are coming soon<');
html=html.replace('id="songsLibraryEmptyText">Библиотека TuneWrap постоянно пополняется новыми музыкальными историями.<','id="songsLibraryEmptyText">The TuneWrap library is constantly growing with new musical stories.<');
write('index.html',html);

script=read('js/script.js');
script=script.replace("  let currentLang = 'ru';","  let currentLang = 'en';");
script=script.replace("  function t(key){ return (I18N[currentLang] || I18N.ru)[key] || ''; }","  function t(key){ return (I18N[currentLang] || I18N.en)[key] || ''; }");
script=script.replace("    return (WEDDING_PACKAGES[lang] || WEDDING_PACKAGES.ru).find(item => item.id === id) || null;","    return (WEDDING_PACKAGES[lang] || WEDDING_PACKAGES.en).find(item => item.id === id) || null;");
script=script.replace("    document.documentElement.setAttribute('lang', LANG_TAGS[lang] || 'ru');","    document.documentElement.setAttribute('lang', LANG_TAGS[lang] || 'en');");

if(!script.includes('function resolveInitialLanguage(){')){
  const anchor='  buttons.forEach(btn=>{';
  const at=script.indexOf(anchor,script.indexOf('function applyLang(lang)'));
  if(at<0)throw new Error('Stage 12.13: language button anchor not found.');
  const helpers=`  function normalizeLanguage(value){\n    const raw=String(value||'').toLowerCase().trim();\n    const aliases={ge:'ka',ua:'uk'};\n    const normalized=aliases[raw]||raw;\n    return ['en','ru','uk','ka','de'].includes(normalized)?normalized:'';\n  }\n\n  function resolveInitialLanguage(){\n    const boot=normalizeLanguage(window.TUNEWRAP_INITIAL_LANGUAGE);\n    if(boot)return boot;\n    try{\n      const requested=normalizeLanguage(new URLSearchParams(location.search).get('lang'));\n      return requested||'en';\n    }catch(error){\n      return 'en';\n    }\n  }\n\n  function syncLanguageUrl(lang){\n    try{\n      const url=new URL(location.href);\n      if(lang==='en')url.searchParams.delete('lang');\n      else url.searchParams.set('lang',lang);\n      history.replaceState(history.state,'',url.pathname+url.search+url.hash);\n      window.TUNEWRAP_INITIAL_LANGUAGE=lang;\n    }catch(error){}\n  }\n\n`;
  script=script.slice(0,at)+helpers+script.slice(at);
}

const oldButton=`  buttons.forEach(btn=>{\n    btn.addEventListener('click', ()=> applyLang(btn.getAttribute('data-lang')));\n  });`;
const newButton=`  buttons.forEach(btn=>{\n    btn.addEventListener('click', ()=>{\n      const next=normalizeLanguage(btn.getAttribute('data-lang'))||'en';\n      applyLang(next);\n      syncLanguageUrl(next);\n    });\n  });`;
if(script.includes(oldButton))script=script.replace(oldButton,newButton);
script=script.replace("  applyLang('ru');","  applyLang(resolveInitialLanguage());");
write('js/script.js',script);
check('js/script.js');

let bootstrap=read('js/app-bootstrap.js');
if(!bootstrap.includes('const TUNEWRAP_BOOT_COPY=')){
  const anchor="const loading = document.createElement('div');";
  const at=bootstrap.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.13: app bootstrap loading anchor not found.');
  const copy=`const TUNEWRAP_BOOT_COPY={\n  en:{loading:'Loading the music library…',error:'The library is temporarily unavailable',retry:'Refresh the page in a few seconds.',button:'Refresh'},\n  ru:{loading:'Загружаем музыкальную библиотеку…',error:'Библиотека временно недоступна',retry:'Обновите страницу через несколько секунд.',button:'Обновить'},\n  uk:{loading:'Завантажуємо музичну бібліотеку…',error:'Бібліотека тимчасово недоступна',retry:'Оновіть сторінку за кілька секунд.',button:'Оновити'},\n  ka:{loading:'მუსიკალური ბიბლიოთეკა იტვირთება…',error:'ბიბლიოთეკა დროებით მიუწვდომელია',retry:'განაახლეთ გვერდი რამდენიმე წამში.',button:'განახლება'},\n  de:{loading:'Musikbibliothek wird geladen…',error:'Die Bibliothek ist vorübergehend nicht verfügbar',retry:'Aktualisieren Sie die Seite in wenigen Sekunden.',button:'Aktualisieren'}\n};\nconst tuneWrapBootLang=(()=>{\n  const value=String(document.documentElement.lang||'en').toLowerCase();\n  if(value.startsWith('ru'))return'ru';\n  if(value.startsWith('uk'))return'uk';\n  if(value.startsWith('ka'))return'ka';\n  if(value.startsWith('de'))return'de';\n  return'en';\n})();\nconst tuneWrapBootCopy=TUNEWRAP_BOOT_COPY[tuneWrapBootLang]||TUNEWRAP_BOOT_COPY.en;\n\n`;
  bootstrap=bootstrap.slice(0,at)+copy+bootstrap.slice(at);
}
bootstrap=bootstrap.replace("loading.innerHTML = '<span class=\"catalog-bootstrap-mark\" aria-hidden=\"true\"></span><span>Загружаем музыкальную библиотеку…</span>';","loading.innerHTML = '<span class=\"catalog-bootstrap-mark\" aria-hidden=\"true\"></span><span>'+tuneWrapBootCopy.loading+'</span>';");
bootstrap=bootstrap.replace("loading.innerHTML = '<strong>Библиотека временно недоступна</strong><span>Обновите страницу через несколько секунд.</span><button type=\"button\">Обновить</button>';","loading.innerHTML = '<strong>'+tuneWrapBootCopy.error+'</strong><span>'+tuneWrapBootCopy.retry+'</span><button type=\"button\">'+tuneWrapBootCopy.button+'</button>';");
write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');

let site=read('js/site-cms-runtime.js');
if(!site.includes('function siteFallbackCopy(){')){
  const anchor='  function patchAnnouncement(){';
  const at=site.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.13: Site CMS announcement anchor not found.');
  const helper=`  function siteFallbackCopy(){\n    const map={\n      en:{news:'News',terms:'Terms of use',close:'Close',empty:'Terms of use will be published here. You can update them in Admin Studio → Site without a new deployment.'},\n      ru:{news:'Новости',terms:'Условия использования',close:'Закрыть',empty:'Текст условий будет опубликован здесь. Его можно добавить в Admin Studio → Сайт без нового деплоя.'},\n      uk:{news:'Новини',terms:'Умови користування',close:'Закрити',empty:'Текст умов буде опубліковано тут. Його можна змінити в Admin Studio → Сайт без нового деплою.'},\n      ka:{news:'სიახლეები',terms:'გამოყენების პირობები',close:'დახურვა',empty:'გამოყენების პირობები გამოქვეყნდება აქ. მათი განახლება შესაძლებელია Admin Studio → Site-ში ახალი დეპლოის გარეშე.'},\n      de:{news:'News',terms:'Nutzungsbedingungen',close:'Schließen',empty:'Die Nutzungsbedingungen werden hier veröffentlicht. Sie können sie in Admin Studio → Site ohne neues Deployment aktualisieren.'}\n    };\n    return map[language()]||map.en;\n  }\n\n`;
  site=site.slice(0,at)+helper+site.slice(at);
}
site=site.replace("    node.querySelector('.hero-announcement-label').textContent=String(texts.announcement_label||'Новости').trim();","    node.querySelector('.hero-announcement-label').textContent=String(texts.announcement_label||siteFallbackCopy().news).trim();");
site=site.replace("    setTextContent(panel.querySelector('[data-site-terms-title]'),texts.terms_title||'Условия использования');","    setTextContent(panel.querySelector('[data-site-terms-title]'),texts.terms_title||siteFallbackCopy().terms);");
site=site.replace("      body || 'Текст условий будет опубликован здесь. Его можно добавить в Admin Studio → Сайт без нового деплоя.'","      body || siteFallbackCopy().empty");
if(!site.includes('const closeCopy=siteFallbackCopy().close;')){
  const token="    panel.classList.toggle('is-empty',!body);";
  const at=site.indexOf(token,site.indexOf('function patchTermsPanel(){'));
  if(at<0)throw new Error('Stage 12.13: Terms panel close-copy anchor not found.');
  const insert=`    const closeCopy=siteFallbackCopy().close;\n    const closeButton=panel.querySelector('[data-site-legal-close]');\n    setTextContent(closeButton?.querySelector('em'),closeCopy);\n    closeButton?.setAttribute('aria-label',closeCopy);\n`;
  site=site.slice(0,at)+insert+site.slice(at);
}
write('js/site-cms-runtime.js',site);
check('js/site-cms-runtime.js');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['englishlaunch:test']='node scripts/stage-12.13-english-launch-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('englishlaunch:test')){
  pkg.scripts.test += ' && npm run englishlaunch:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13 English-First Launch installed.');
console.log('Root URL default: English.');
console.log('Public base HTML: English before JS/CMS loads.');
console.log('Direct campaign URLs: ?lang=en|ru|uk|ka|de (aliases ge->ka, ua->uk).');
console.log('Language switcher remains multilingual. Admin remains Russian.');
console.log('D1 migration: not required.');
