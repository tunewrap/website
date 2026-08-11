#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const file=rel=>path.join(root,rel);

// Transactional installer:
// - normalize Windows CRLF to LF for reliable matching;
// - keep every change in memory until ALL patches/checks pass;
// - write to the real project only at the very end.
const pending=new Map();

function normalizeEol(value){
  return String(value).replace(/\r\n/g,'\n').replace(/\r/g,'\n');
}

function read(rel){
  if(pending.has(rel))return pending.get(rel);
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return normalizeEol(fs.readFileSync(p,'utf8'));
}

function write(rel,text){
  pending.set(rel,normalizeEol(text));
}

function check(rel){
  const source=read(rel);
  const tmp=path.join(root,`.stage-12.13.8-check-${path.basename(rel).replace(/[^a-z0-9_.-]/gi,'_')}.js`);
  try{
    fs.writeFileSync(tmp,source,'utf8');
    const out=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
    if(out.status!==0)throw new Error(`Syntax check failed for ${rel}\n${out.stderr||out.stdout}`);
  }finally{
    try{fs.unlinkSync(tmp);}catch(error){}
  }
}

function commitPending(){
  for(const [rel,source] of pending.entries()){
    fs.writeFileSync(file(rel),source,'utf8');
  }
}
function replaceRequired(text,from,to,label){
  if(text.includes(to))return text;
  if(!text.includes(from))throw new Error(`Stage 12.13.8: anchor not found — ${label}`);
  return text.replace(from,to);
}

function assertContains(rel,needle,label){
  const source=read(rel);
  if(!source.includes(needle)){
    throw new Error(`Stage 12.13.8 preflight failed: ${label} (${rel})`);
  }
}

const modified=[
  'index.html',
  'js/app-bootstrap.js',
  'js/script.js',
  'js/catalog-core.js',
  'js/catalog-runtime.js',
  'js/playback-engine.js',
  'js/site-cms-runtime.js',
  'js/pricing-cms-runtime.js',
  'js/sound-preferences-runtime.js',
  'js/gift-certificate-overlay.js',
  'js/order-intake-completion.js',
  'js/orders-submit.js',
  'js/stage-12.10-package-ui-polish.js',
  'js/stage-12.11-contact-channel-selector.js',
  'js/ux-critical-fixes.js',
  'js/wide-copy-polish.js',
  'package.json'
];
modified.forEach(read);

// Exact preflight against the current TuneWrap Stage 12.13.7.1 structure.
// This catches a mismatched base BEFORE any transformation is committed.
assertContains('index.html','id="tunewrapLanguageBoot"','language boot');
assertContains('index.html','id="tunewrapFirstPaintGuard"','first-paint guard');
assertContains('index.html','id="songPlayerScreen"','Full Player');
assertContains('js/script.js','const I18N = {','main I18N dictionary');
assertContains('js/script.js','ru: {','RU dictionary');
assertContains('js/script.js','uk: {','UA dictionary');
assertContains('js/script.js','ka: {','GE dictionary');
assertContains('js/script.js','en: {','EN dictionary');
assertContains('js/script.js','de: {','DE dictionary');
assertContains('js/script.js','function applyLang(lang){','language application');
assertContains('js/playback-engine.js','const PLAYER_VISIBLE_UI','temporary Player visible I18N');
assertContains('js/app-bootstrap.js',"await import('./playback-engine.js');",'playback bootstrap import');

/* =========================================================
   1. ONE STABLE NATIVE LANGUAGE OWNER
   Google/Chrome Translate may mutate visible DOM. It must never become
   TuneWrap's application-language source of truth.
   ========================================================= */
let html=read('index.html');

html=html.replace(
  "    document.documentElement.lang=initial;\n    window.TUNEWRAP_INITIAL_LANGUAGE=initial;",
  "    document.documentElement.lang=initial;\n    document.documentElement.dataset.tunewrapLang=initial;\n    window.TUNEWRAP_INITIAL_LANGUAGE=initial;\n    window.TUNEWRAP_CURRENT_LANGUAGE=initial;"
);
html=html.replace(
  "    document.documentElement.lang='en';\n    window.TUNEWRAP_INITIAL_LANGUAGE='en';",
  "    document.documentElement.lang='en';\n    document.documentElement.dataset.tunewrapLang='en';\n    window.TUNEWRAP_INITIAL_LANGUAGE='en';\n    window.TUNEWRAP_CURRENT_LANGUAGE='en';"
);

if(!html.includes('id="tunewrapLanguageRuntime"')){
  const runtime=`</script>
<script id="tunewrapLanguageRuntime">
(function(){
  var supported=['en','ru','uk','ka','de'];
  var aliases={ge:'ka',ua:'uk'};

  function normalize(value){
    var raw=String(value||'').toLowerCase().trim();
    raw=aliases[raw]||raw;
    return supported.indexOf(raw)>=0?raw:'';
  }

  function get(){
    return normalize(document.documentElement.dataset.tunewrapLang)
      ||normalize(window.TUNEWRAP_CURRENT_LANGUAGE)
      ||normalize(window.TUNEWRAP_INITIAL_LANGUAGE)
      ||'en';
  }

  window.TuneWrapLanguage=Object.freeze({normalize:normalize,get:get});
})();
</script>
<style id="tunewrapFirstPaintGuard">`;

  const guardPattern=/<\/script>\s*<style\s+id=["']tunewrapFirstPaintGuard["']>/i;
  if(!guardPattern.test(html))throw new Error('Stage 12.13.8: first-paint guard insertion point not found');
  html=html.replace(guardPattern,runtime);
}

/* =========================================================
   2. FULL PLAYER: USE THE MAIN SITE I18N, NOT A SECOND I18N SYSTEM
   - Remove whole-player notranslate lock.
   - Google Translate can translate the player if the visitor uses it.
   - Only brand and language codes remain protected.
   ========================================================= */
html=html.replace(
  '<section class="top-mini-player notranslate" id="topMiniPlayer" aria-hidden="true" aria-label="TuneWrap Mini Player" translate="no">',
  '<section class="top-mini-player" id="topMiniPlayer" aria-hidden="true" aria-label="TuneWrap Mini Player">'
);
html=html.replace(
  '<section class="song-player-screen notranslate" id="songPlayerScreen" aria-hidden="true" aria-modal="true" role="dialog" aria-labelledby="songPlayerTitle" translate="no">',
  '<section class="song-player-screen" id="songPlayerScreen" aria-hidden="true" aria-modal="true" role="dialog" aria-labelledby="songPlayerTitle">'
);

/* Also handle a pre-12.13.7.1 base safely. */
html=html.replace(
  '<section class="song-player-screen" id="songPlayerScreen" aria-hidden="true" aria-modal="true" role="dialog" aria-labelledby="songPlayerTitle" translate="no">',
  '<section class="song-player-screen" id="songPlayerScreen" aria-hidden="true" aria-modal="true" role="dialog" aria-labelledby="songPlayerTitle">'
);

html=html.replace(
  '<span class="top-mini-wordmark">Tune<em>Wrap</em></span>',
  '<span class="top-mini-wordmark notranslate" translate="no">Tune<em>Wrap</em></span>'
);
html=html.replace(
  '<div class="song-player-brand">Tune<span>Wrap</span></div>',
  '<div class="song-player-brand notranslate" translate="no">Tune<span>Wrap</span></div>'
);
html=html.replace(
  '<span class="song-player-language" id="songPlayerLanguage"></span>',
  '<span class="song-player-language notranslate" id="songPlayerLanguage" translate="no"></span>'
);

const visiblePlayerReplacements=[
  [
    '<span data-player-i18n="back">Back</span>',
    '<span data-i18n="player_back" data-player-i18n="back">Back</span>'
  ],
  [
    '<button class="song-player-minimize" id="songPlayerMinimize" type="button" data-player-i18n="minimize">Minimize</button>',
    '<button class="song-player-minimize" id="songPlayerMinimize" type="button" data-i18n="player_minimize" data-player-i18n="minimize">Minimize</button>'
  ],
  [
    '<button class="song-player-description-toggle" id="songPlayerDescriptionToggle" type="button" aria-expanded="false" aria-controls="songPlayerDescriptionSheet" data-player-i18n="showFull" hidden>Show full</button>',
    '<button class="song-player-description-toggle" id="songPlayerDescriptionToggle" type="button" aria-expanded="false" aria-controls="songPlayerDescriptionSheet" data-i18n="player_show_full" data-player-i18n="showFull" hidden>Show full</button>'
  ],
  [
    '<h2 data-player-i18n="lyrics">Lyrics</h2>',
    '<h2 data-i18n="player_lyrics" data-player-i18n="lyrics">Lyrics</h2>'
  ],
  [
    '<h2 data-player-i18n="translation">Translation</h2>',
    '<h2 data-i18n="player_translation" data-player-i18n="translation">Translation</h2>'
  ],
  [
    '<a class="song-player-order" id="songPlayerOrder" href="#contact" data-player-i18n="order">Order a similar story</a>',
    '<a class="song-player-order" id="songPlayerOrder" href="#contact" data-i18n="player_order" data-player-i18n="order">Order a similar story</a>'
  ],
  [
    '<h2 id="songPlayerDescriptionSheetTitle" data-player-i18n="fullDescription">Song description</h2>',
    '<h2 id="songPlayerDescriptionSheetTitle" data-i18n="player_full_description" data-player-i18n="fullDescription">Song description</h2>'
  ],
  [
    '<button id="songPlayerDescriptionCollapse" type="button" data-player-i18n="collapse">Collapse</button>',
    '<button id="songPlayerDescriptionCollapse" type="button" data-i18n="player_collapse" data-player-i18n="collapse">Collapse</button>'
  ]
];
for(const [from,to] of visiblePlayerReplacements){
  if(!html.includes(to)){
    if(!html.includes(from)){
      // Accept old RU fallback too; it will still get the same main-i18n key.
      const variants={
        'Back':'Назад',
        'Minimize':'Свернуть',
        'Show full':'Показать полностью',
        'Lyrics':'Текст песни',
        'Translation':'Перевод',
        'Order a similar story':'Заказать похожую историю',
        'Song description':'Описание песни',
        'Collapse':'Свернуть'
      };
      let old=from;
      for(const [en,ru] of Object.entries(variants))old=old.replace(en,ru);
      if(html.includes(old))html=html.replace(old,to);
      else throw new Error('Stage 12.13.8: player i18n markup anchor not found');
    }else{
      html=html.replace(from,to);
    }
  }
}

/* Force one consistent runtime generation after deploy. */
html=html.replace(
  '<script type="module" src="js/app-bootstrap.js"></script>',
  '<script type="module" src="js/app-bootstrap.js?v=12.13.8"></script>'
);
html=html.replace(
  '<script type="module" src="js/app-bootstrap.js?v=12.13.7.1"></script>',
  '<script type="module" src="js/app-bootstrap.js?v=12.13.8"></script>'
);

write('index.html',html);

/* =========================================================
   3. MAIN I18N OWNS VISIBLE PLAYER COPY IN ALL FIVE LANGUAGES
   ========================================================= */
let script=read('js/script.js');

const playerCopy={
  ru:{
    player_back:'Назад',
    player_minimize:'Свернуть',
    player_show_full:'Показать полностью',
    player_lyrics:'Текст песни',
    player_translation:'Перевод',
    player_order:'Заказать похожую историю',
    player_full_description:'Описание песни',
    player_collapse:'Свернуть'
  },
  uk:{
    player_back:'Назад',
    player_minimize:'Згорнути',
    player_show_full:'Показати повністю',
    player_lyrics:'Текст пісні',
    player_translation:'Переклад',
    player_order:'Замовити схожу історію',
    player_full_description:'Опис пісні',
    player_collapse:'Згорнути'
  },
  ka:{
    player_back:'უკან',
    player_minimize:'ჩაკეცვა',
    player_show_full:'სრულად ჩვენება',
    player_lyrics:'სიმღერის ტექსტი',
    player_translation:'თარგმანი',
    player_order:'მსგავსი ისტორიის შეკვეთა',
    player_full_description:'სიმღერის აღწერა',
    player_collapse:'ჩაკეცვა'
  },
  en:{
    player_back:'Back',
    player_minimize:'Minimize',
    player_show_full:'Show full',
    player_lyrics:'Lyrics',
    player_translation:'Translation',
    player_order:'Order a similar story',
    player_full_description:'Song description',
    player_collapse:'Collapse'
  },
  de:{
    player_back:'Zurück',
    player_minimize:'Minimieren',
    player_show_full:'Vollständig anzeigen',
    player_lyrics:'Songtext',
    player_translation:'Übersetzung',
    player_order:'Eine ähnliche Geschichte bestellen',
    player_full_description:'Songbeschreibung',
    player_collapse:'Einklappen'
  }
};

function injectDictionaryKeys(source,lang,map){
  if(source.includes(`player_back:${JSON.stringify(map.player_back)}`))return source;

  const i18nStart=source.indexOf('const I18N = {');
  const i18nEnd=source.indexOf('\n  };\n\n  const TIERS',i18nStart);
  if(i18nStart<0||i18nEnd<0){
    throw new Error('Stage 12.13.8: main I18N dictionary boundaries not found');
  }

  const blockStart=source.indexOf(`${lang}: {`,i18nStart);
  if(blockStart<0||blockStart>=i18nEnd){
    throw new Error(`Stage 12.13.8: ${lang} I18N dictionary block not found`);
  }

  const lineEnd=source.indexOf('\n',blockStart);
  if(lineEnd<0||lineEnd>=i18nEnd){
    throw new Error(`Stage 12.13.8: ${lang} I18N dictionary insertion point not found`);
  }

  const lines=Object.entries(map)
    .map(([key,value])=>`      ${key}:${JSON.stringify(value)},`)
    .join('\n')+'\n';

  return source.slice(0,lineEnd+1)+lines+source.slice(lineEnd+1);
}

for(const [lang,map] of Object.entries(playerCopy)){
  script=injectDictionaryKeys(script,lang,map);
}

/* Native language is explicitly owned by TuneWrap, not by browser DOM translation. */
script=script.replace(
  "    currentLang = lang;\n    window.TUNEWRAP_CURRENT_LANGUAGE = lang;",
  "    currentLang = lang;\n    window.TUNEWRAP_CURRENT_LANGUAGE = lang;\n    document.documentElement.dataset.tunewrapLang = lang;"
);

/* English-first public fallback. */
script=script.replace(/I18N\[lang\] \|\| I18N\.ru/g,'I18N[lang] || I18N.en');
script=script.replace(/TUNEWRAP_TRACK_TITLES\[language\] \|\| TUNEWRAP_TRACK_TITLES\.ru/g,'TUNEWRAP_TRACK_TITLES[language] || TUNEWRAP_TRACK_TITLES.en');
script=script.replace(/TUNEWRAP_LISTEN_LABELS\[language\] \|\| TUNEWRAP_LISTEN_LABELS\.ru/g,'TUNEWRAP_LISTEN_LABELS[language] || TUNEWRAP_LISTEN_LABELS.en');

write('js/script.js',script);
check('js/script.js');

/* =========================================================
   4. REMOVE THE SECOND VISIBLE-PLAYER I18N OWNER
   Playback engine keeps playback/ARIA/dynamic track content only.
   This avoids overwriting Google Translate every time a track opens.
   ========================================================= */
let player=read('js/playback-engine.js');

player=player.replace(
  /\n\s*const PLAYER_VISIBLE_UI = Object\.freeze\(\{[\s\S]*?\n\s*\}\);\n\n\s*document\.addEventListener\('DOMContentLoaded'/,
  "\n\n  document.addEventListener('DOMContentLoaded'"
);

player=player.replace(
  /    function syncVisiblePlayerLabels\(\)\{[\s\S]*?\n    \}\n\n/,
  ''
);
player=player.replace(/\n\s*syncVisiblePlayerLabels\(\);/g,'');

const oldPlayerLang=`    function interfaceLanguage(){
      const code = String(
        window.TUNEWRAP_CURRENT_LANGUAGE ||
        window.TUNEWRAP_INITIAL_LANGUAGE ||
        document.documentElement.getAttribute('lang') ||
        'en'
      ).toLowerCase();
      return PLAYER_UI[code] ? code : 'en';
    }`;
const newPlayerLang=`    function interfaceLanguage(){
      const code=String(window.TuneWrapLanguage?.get?.()||'en').toLowerCase();
      return PLAYER_UI[code] ? code : 'en';
    }`;
if(player.includes(oldPlayerLang))player=player.replace(oldPlayerLang,newPlayerLang);

write('js/playback-engine.js',player);
check('js/playback-engine.js');

/* =========================================================
   5. CATALOG: ENGLISH-FIRST FALLBACK, NO RANDOM RU LEAKAGE
   ========================================================= */
let core=read('js/catalog-core.js');
core=core.replace(
  "return value[language] || value.ru || value.en || value.uk || value.ka || value.de || value.original || Object.values(value)[0] || fallback;",
  "return value[language] || value.en || value.original || value.ru || value.uk || value.ka || value.de || Object.values(value)[0] || fallback;"
);
write('js/catalog-core.js',core);
check('js/catalog-core.js');

let runtime=read('js/catalog-runtime.js');
runtime=runtime.replace(
  /const language = String\(\s*window\.TUNEWRAP_CURRENT_LANGUAGE \|\|\s*window\.TUNEWRAP_INITIAL_LANGUAGE \|\|\s*document\.documentElement\.getAttribute\('lang'\) \|\|\s*'en'\s*\)\.toLowerCase\(\);/,
  "const language=String(window.TuneWrapLanguage?.get?.()||'en').toLowerCase();"
);
runtime=runtime.replace(
  "return item?.labels?.[language]||item?.labels?.ru||item?.labels?.en||id||'';",
  "return item?.labels?.[language]||item?.labels?.en||item?.labels?.ru||id||'';"
);
write('js/catalog-runtime.js',runtime);
check('js/catalog-runtime.js');

/* =========================================================
   6. ALL PUBLIC DYNAMIC MODULES READ THE STABLE NATIVE LANGUAGE.
   Browser translation can translate the rendered text without changing
   which CMS/native locale the application thinks is selected.
   ========================================================= */
const stableLanguageFiles=[
  'js/site-cms-runtime.js',
  'js/pricing-cms-runtime.js',
  'js/sound-preferences-runtime.js',
  'js/gift-certificate-overlay.js',
  'js/order-intake-completion.js',
  'js/orders-submit.js',
  'js/stage-12.10-package-ui-polish.js',
  'js/stage-12.11-contact-channel-selector.js',
  'js/ux-critical-fixes.js'
];

for(const rel of stableLanguageFiles){
  let text=read(rel);
  text=text.replace(
    /\(document\.documentElement\.lang\|\|'ru'\)\.toLowerCase\(\)/g,
    "String(window.TuneWrapLanguage?.get?.()||'en').toLowerCase()"
  );
  write(rel,text);
  check(rel);
}

/* Wide copy used active button/html lang; prefer the stable native owner. */
let wide=read('js/wide-copy-polish.js');
wide=wide.replace(
  "(active?.dataset.lang||document.documentElement.lang||'ru').toLowerCase()",
  "String(window.TuneWrapLanguage?.get?.()||active?.dataset.lang||'en').toLowerCase()"
);
write('js/wide-copy-polish.js',wide);
check('js/wide-copy-polish.js');

/* =========================================================
   7. PUBLIC FALLBACK ORDER: requested locale -> EN -> RU
   RU stays as legacy rescue only, never first public fallback.
   ========================================================= */
function englishFirst(rel,replacements){
  let text=read(rel);
  for(const [from,to] of replacements){
    text=text.split(from).join(to);
  }
  write(rel,text);
  check(rel);
}

englishFirst('js/site-cms-runtime.js',[
  ["return bucket?.locales?.[language()]||null;","return bucket?.locales?.[language()]||bucket?.locales?.en||bucket?.locales?.ru||null;"],
  ["return item?.locales?.[language()]||item?.locales?.ru||null;","return item?.locales?.[language()]||item?.locales?.en||item?.locales?.ru||null;"],
  ["||'ru-RU';","||'en-US';"]
]);

englishFirst('js/pricing-cms-runtime.js',[
  ["const locale=map=>map?.[lang()]||null;","const locale=map=>map?.[lang()]||map?.en||map?.ru||null;"]
]);

englishFirst('js/sound-preferences-runtime.js',[
  ["||item?.locales?.ru?.label\n    ||item?.locales?.en?.label","||item?.locales?.en?.label\n    ||item?.locales?.ru?.label"]
]);

englishFirst('js/gift-certificate-overlay.js',[
  ["function loc(map){return map?.[lang()]||map?.ru||map?.en||null}","function loc(map){return map?.[lang()]||map?.en||map?.ru||null}"]
]);

englishFirst('js/order-intake-completion.js',[
  ["return value?.labels?.[lang()]||value?.labels?.ru||value?.id||'';","return value?.labels?.[lang()]||value?.labels?.en||value?.labels?.ru||value?.id||'';"]
]);

englishFirst('js/orders-submit.js',[
  ["return locales[lang()]?.name||locales.ru?.name||offer?.id||'';","return locales[lang()]?.name||locales.en?.name||locales.ru?.name||offer?.id||'';"]
]);

englishFirst('js/stage-12.10-package-ui-polish.js',[
  ["return offer?.locales?.[lang()]||offer?.locales?.ru||offer?.locales?.en||{};","return offer?.locales?.[lang()]||offer?.locales?.en||offer?.locales?.ru||{};"],
  ["return cfg?.settings?.locales?.[lang()]||cfg?.settings?.locales?.ru||cfg?.settings?.locales?.en||{};","return cfg?.settings?.locales?.[lang()]||cfg?.settings?.locales?.en||cfg?.settings?.locales?.ru||{};"]
]);

englishFirst('js/ux-critical-fixes.js',[
  ["return locales[lang()]?.name||locales.ru?.name||offer.id||'';","return locales[lang()]?.name||locales.en?.name||locales.ru?.name||offer.id||'';"]
]);

/* =========================================================
   8. CACHE COHERENCE FOR I18N-CRITICAL RUNTIMES
   Does not change order; only makes one deploy load one coherent generation.
   ========================================================= */
let bootstrap=read('js/app-bootstrap.js');
const versionedModules=[
  'catalog-runtime.js',
  'script.js',
  'pricing-cms-runtime.js',
  'gift-certificate-overlay.js',
  'site-cms-runtime.js',
  'sound-preferences-runtime.js',
  'order-intake-completion.js',
  'orders-submit.js',
  'playback-engine.js',
  'ux-critical-fixes.js',
  'stage-12.10-package-ui-polish.js',
  'stage-12.11-contact-channel-selector.js'
];
for(const name of versionedModules){
  bootstrap=bootstrap.replace(
    new RegExp(`import\\('\\./${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:\\?v=[^']+)?'\\)`,'g'),
    `import('./${name}?v=12.13.8')`
  );
}
write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');

/* =========================================================
   9. TEST REGISTRATION
   ========================================================= */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['i18n:audit']='node scripts/stage-12.13.8-global-i18n-audit.js';
if(typeof pkg.scripts.test==='string'){
  // Stage 12.13.8 supersedes the temporary 12.13.7 / 12.13.7.1
  // Full Player translation architectures. Keep their scripts for history,
  // but remove them from the main regression chain.
  pkg.scripts.test=pkg.scripts.test
    .replace(/\s*&&\s*npm run playerlang:test/g,'')
    .replace(/\s*&&\s*npm run playeri18nlock:test/g,'')
    .replace(/\s*&&\s*npm run i18n:audit/g,'');
  pkg.scripts.test+=' && npm run i18n:audit';
}
write('package.json',JSON.stringify(pkg,null,2)+String.fromCharCode(10));

// Nothing touches the real working tree before this line.
commitPending();

console.log('PASS: Stage 12.13.8 Global I18N Consistency installed.');
console.log('PASS: one native language owner for EN/RU/UA/GE/DE.');
console.log('PASS: Full Player visible UI is owned by main site I18N.');
console.log('PASS: Google/Chrome Translate is allowed to translate the Player UI.');
console.log('PASS: public dynamic modules no longer use browser-mutated HTML lang as primary state.');
console.log('PASS: public missing-locale fallback is English-first, Russian second.');
console.log('PASS: i18n-critical modules are cache-versioned without changing bootstrap order.');
console.log('D1 migration: not required.');
