#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const file=rel=>path.join(root,rel);
function read(rel){const p=file(rel);if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);return fs.readFileSync(p,'utf8');}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){const out=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});if(out.status!==0)throw new Error(`Syntax check failed for ${rel}\n${out.stderr||out.stdout}`);}

['index.html','js/playback-engine.js','package.json'].forEach(read);

/* ---------------------------------------------------------
   1. English-first static fallback + browser-translate lock.
   Full Player and Mini Player already have native TuneWrap localization.
   Chrome/Google Translate must not rewrite them independently.
   --------------------------------------------------------- */
let html=read('index.html');

html=html.replace(
  '<section class="top-mini-player" id="topMiniPlayer" aria-hidden="true" aria-label="TuneWrap Mini Player">',
  '<section class="top-mini-player notranslate" id="topMiniPlayer" aria-hidden="true" aria-label="TuneWrap Mini Player" translate="no">'
);
html=html.replace(
  '<section class="song-player-screen" id="songPlayerScreen" aria-hidden="true" aria-modal="true" role="dialog" aria-labelledby="songPlayerTitle">',
  '<section class="song-player-screen notranslate" id="songPlayerScreen" aria-hidden="true" aria-modal="true" role="dialog" aria-labelledby="songPlayerTitle" translate="no">'
);

const fallbacks=[
  ['<span data-player-i18n="back">Назад</span>','<span data-player-i18n="back">Back</span>'],
  ['data-player-i18n="minimize">Свернуть</button>','data-player-i18n="minimize">Minimize</button>'],
  ['data-player-i18n="showFull" hidden>Показать полностью</button>','data-player-i18n="showFull" hidden>Show full</button>'],
  ['<h2 data-player-i18n="lyrics">Текст песни</h2>','<h2 data-player-i18n="lyrics">Lyrics</h2>'],
  ['<h2 data-player-i18n="translation">Перевод</h2>','<h2 data-player-i18n="translation">Translation</h2>'],
  ['data-player-i18n="order">Заказать похожую историю</a>','data-player-i18n="order">Order a similar story</a>'],
  ['data-player-i18n="fullDescription">Описание песни</h2>','data-player-i18n="fullDescription">Song description</h2>'],
  ['data-player-i18n="collapse">Свернуть</button>','data-player-i18n="collapse">Collapse</button>']
];
for(const [oldText,newText] of fallbacks){
  if(html.includes(oldText))html=html.replace(oldText,newText);
}

if(!html.includes('class="song-player-screen notranslate"'))throw new Error('Stage 12.13.7.1: Full Player translate lock was not applied');
if(!html.includes('class="top-mini-player notranslate"'))throw new Error('Stage 12.13.7.1: Mini Player translate lock was not applied');
write('index.html',html);

/* ---------------------------------------------------------
   2. Re-apply native visible labels whenever player content is filled/opened.
   This makes the state deterministic even if another DOM mutator touched text.
   --------------------------------------------------------- */
let player=read('js/playback-engine.js');

if(!player.includes('function syncVisiblePlayerLabels()')){
  const anchor=`    function fillPlayer(item){\n      if(!item) return;`;
  const replacement=`    function syncVisiblePlayerLabels(){\n      const visible = PLAYER_VISIBLE_UI[interfaceLanguage()] || PLAYER_VISIBLE_UI.en;\n      screen.querySelectorAll('[data-player-i18n]').forEach(node=>{\n        const key=node.dataset.playerI18n;\n        if(visible[key])node.textContent=visible[key];\n      });\n    }\n\n    function fillPlayer(item){\n      if(!item) return;\n      syncVisiblePlayerLabels();`;
  if(!player.includes(anchor))throw new Error('Stage 12.13.7.1: fillPlayer anchor not found');
  player=player.replace(anchor,replacement);
}

const oldSync=`    function syncLocalizedPlayer(){\n      const labels = ui();\n      const visible = PLAYER_VISIBLE_UI[interfaceLanguage()] || PLAYER_VISIBLE_UI.en;\n      document.querySelectorAll('[data-player-i18n]').forEach(node=>{\n        const key=node.dataset.playerI18n;\n        if(visible[key])node.textContent=visible[key];\n      });`;
const newSync=`    function syncLocalizedPlayer(){\n      const labels = ui();\n      syncVisiblePlayerLabels();`;
if(player.includes(oldSync))player=player.replace(oldSync,newSync);

const openAnchor=`    function openPlayer(item,origin,autoplay){\n      if(!item) return;`;
const openReplacement=`    function openPlayer(item,origin,autoplay){\n      if(!item) return;\n      syncVisiblePlayerLabels();`;
if(!player.includes(openReplacement)){
  if(!player.includes(openAnchor))throw new Error('Stage 12.13.7.1: openPlayer anchor not found');
  player=player.replace(openAnchor,openReplacement);
}

write('js/playback-engine.js',player);
check('js/playback-engine.js');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['playeri18nlock:test']='node scripts/stage-12.13.7.1-player-native-i18n-lock-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('playeri18nlock:test'))pkg.scripts.test+=' && npm run playeri18nlock:test';
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.7.1 Player Native I18N Lock installed.');
console.log('PASS: Full/Mini Player are protected from browser translation overrides.');
console.log('PASS: English is the static player fallback.');
console.log('PASS: Native EN/RU/UA/GE/DE labels are re-applied on every Full Player fill/open.');
console.log('D1 migration: not required.');
