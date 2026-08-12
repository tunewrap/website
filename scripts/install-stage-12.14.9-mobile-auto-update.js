#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','js/app-bootstrap.js','js/auto-update.js','_headers','package.json',
  'functions/api/media/[[path]].js',
  'scripts/stage-12.13.6.3-immediate-first-paint-test.js',
  'scripts/stage-12.13.8-global-i18n-audit.js',
  'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
  'scripts/stage-12.14.8-announcement-native-i18n-test.js',
  'scripts/stage-12.14.9-mobile-auto-update-test.js',
  'scripts/admin-catalog-test.js','scripts/site-cms-test.js'
];
const sources=new Map();
for(const relative of required){
  const target=path.join(root,...relative.split('/'));
  if(!fs.existsSync(target))throw new Error(`${relative} не найден. Распакуйте ZIP прямо в корень website.`);
  sources.set(relative,fs.readFileSync(target,'utf8'));
}
if(!sources.get('scripts/stage-12.14.8-announcement-native-i18n-test.js').includes('Stage 12.14.8')){
  throw new Error('Сначала требуется установленный Stage 12.14.8. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.8 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}
function replaceAll(source,before,after,expected,label){
  if(!source.includes(before)&&source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==expected)throw new Error(`${label}: найдено ${count}, ожидалось ${expected}. Файлы не изменены.`);
  return source.split(before).join(after);
}

let index=sources.get('index.html');
index=replaceOnce(index,
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta name="tunewrap-build" content="12.14.9">',
  'Public build identity');
index=replaceOnce(index,
  '<title>TuneWrap — Your Story, Your Song</title>',
  '<title>TuneWrap — Your Story, Your Song</title>\n<script src="/js/auto-update.js?v=12.14.9" defer></script>',
  'Mobile freshness runtime');
index=replaceOnce(index,
  'js/app-bootstrap.js?v=12.14.8',
  'js/app-bootstrap.js?v=12.14.9',
  'Public bootstrap cache version');

let bootstrap=sources.get('js/app-bootstrap.js');
bootstrap=replaceAll(bootstrap,'?v=12.14.8','?v=12.14.9',12,'Public module cache versions');
const snapshotAnchor=`  // Stage 12.6: vocal preference is part of the structured order payload.`;
const snapshotBlock=`  // The mobile freshness guard receives the exact content loaded into this
  // page. On return from a suspended tab it can compare live D1 data and
  // refresh only when tracks or CMS content really changed.
  window.TuneWrapAutoUpdate?.setSnapshot({
    tracks:window.TUNEWRAP_TRACK_CATALOG,
    pricing:window.TUNEWRAP_PRICING_CMS,
    site:window.TUNEWRAP_SITE_CMS,
    categories:window.TUNEWRAP_STORY_CATEGORIES,
    sound:window.TUNEWRAP_SOUND_PREFERENCES
  });

`;
if(!bootstrap.includes('window.TuneWrapAutoUpdate?.setSnapshot({')){
  bootstrap=replaceOnce(bootstrap,snapshotAnchor,snapshotBlock+snapshotAnchor,'Live CMS snapshot handoff');
}

let headers=sources.get('_headers');
const freshnessHeaders=`

/
  Cache-Control: no-store, no-cache, must-revalidate

/index.html
  Cache-Control: no-store, no-cache, must-revalidate

/js/*
  Cache-Control: no-cache, must-revalidate

/css/*
  Cache-Control: no-cache, must-revalidate`;
if(!headers.includes('Cache-Control: no-store, no-cache, must-revalidate')){
  headers=headers.replace(/\s*$/,freshnessHeaders+'\n');
}

let publicI18nTest=sources.get('scripts/stage-12.14.7-public-pricing-terms-i18n-test.js');
publicI18nTest=replaceOnce(publicI18nTest,
  '/js\\/app-bootstrap\\.js\\?v=12\\.14\\.(?:7|8)/',
  '/js\\/app-bootstrap\\.js\\?v=12\\.14\\.(?:7|8|9)/',
  'Stage 12.14.7 HTML cache assertion');
publicI18nTest=replaceOnce(publicI18nTest,
  "\\?v=12\\\\.14\\\\.(?:7|8)`)",
  "\\?v=12\\\\.14\\\\.(?:7|8|9)`)",
  'Stage 12.14.7 module cache assertion');

let announcementTest=sources.get('scripts/stage-12.14.8-announcement-native-i18n-test.js');
announcementTest=replaceOnce(announcementTest,
  "assert.ok(html.includes('js/app-bootstrap.js?v=12.14.8'));",
  "assert.match(html,/js\\/app-bootstrap\\.js\\?v=12\\.14\\.(?:8|9)/);",
  'Stage 12.14.8 HTML cache assertion');
announcementTest=replaceOnce(announcementTest,
  "assert.ok(bootstrap.includes(`./${name}?v=12.14.8`),`cache version missing for ${name}`);",
  "assert.match(bootstrap,new RegExp(`\\\\./${name.replace(/\\./g,'\\\\.')}\\\\?v=12\\\\.14\\\\.(?:8|9)`),`cache version missing for ${name}`);",
  'Stage 12.14.8 module cache assertion');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['mobileupdate:test']='node scripts/stage-12.14.9-mobile-auto-update-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('mobileupdate:test'))pkg.scripts.test+=' && npm run mobileupdate:test';

const updates=new Map([
  ['index.html',index],['js/app-bootstrap.js',bootstrap],['_headers',headers],
  ['scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',publicI18nTest],
  ['scripts/stage-12.14.8-announcement-native-i18n-test.js',announcementTest],
  ['package.json',JSON.stringify(pkg,null,2)+'\n']
]);
const rollback=new Map();
for(const [relative] of updates){
  const target=path.join(root,...relative.split('/'));
  rollback.set(target,fs.readFileSync(target));
}

try{
  for(const [relative,content] of updates){
    fs.writeFileSync(path.join(root,...relative.split('/')),content,'utf8');
  }
  const tests=[
    'scripts/stage-12.14.9-mobile-auto-update-test.js',
    'scripts/stage-12.14.8-announcement-native-i18n-test.js',
    'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
    'scripts/stage-12.13.8-global-i18n-audit.js',
    'scripts/stage-12.13.6.3-immediate-first-paint-test.js',
    'scripts/admin-catalog-test.js','scripts/site-cms-test.js'
  ];
  for(const relative of tests){
    const result=spawnSync(process.execPath,[path.join(root,...relative.split('/'))],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${relative} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.9 Mobile Auto Update installed.');
console.log('PASS: restored mobile tabs detect new deployments and live Admin/D1 changes.');
console.log('PASS: active playback and partially completed forms are never force-refreshed.');
console.log('PASS: HTML, JS and CSS revalidate; R2 audio and cover caching is unchanged.');
console.log('PASS: all compatibility tests from Stage 12.13.6.3 through 12.14.9 passed.');
console.log('D1 migration: not required.');
