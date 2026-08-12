#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','package.json','js/mobile-pull-refresh.js',
  'css/stage-12.14.11-mobile-pull-refresh-control.css',
  'scripts/stage-12.13.8-global-i18n-audit.js',
  'scripts/stage-12.14.8-announcement-native-i18n-test.js',
  'scripts/stage-12.14.9-mobile-auto-update-test.js',
  'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
  'scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',
  'scripts/responsive-wide-test.js','scripts/admin-catalog-test.js','scripts/site-cms-test.js'
];
const sources=new Map();
for(const relative of required){
  const target=path.join(root,...relative.split('/'));
  if(!fs.existsSync(target))throw new Error(`${relative} не найден. Распакуйте ZIP прямо в корень website.`);
  sources.set(relative,fs.readFileSync(target,'utf8'));
}
if(!sources.get('index.html').includes('<meta name="tunewrap-build" content="12.14.10">')&&
   !sources.get('index.html').includes('<meta name="tunewrap-build" content="12.14.11">')){
  throw new Error('Сначала требуется установленный Stage 12.14.10. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.10 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}

let index=sources.get('index.html');
index=replaceOnce(index,
  '<meta name="tunewrap-build" content="12.14.10">',
  '<meta name="tunewrap-build" content="12.14.11">',
  'Public build identity');
index=replaceOnce(index,
  '<script src="/js/auto-update.js?v=12.14.9" defer></script>',
  '<script src="/js/auto-update.js?v=12.14.9" defer></script>\n<script src="/js/mobile-pull-refresh.js?v=12.14.11" defer></script>',
  'Mobile pull runtime');
index=replaceOnce(index,
  '<link id="tunewrapStage121410PullRefresh" rel="stylesheet" href="/css/stage-12.14.10-mobile-pull-refresh.css?v=12.14.10">',
  '<link id="tunewrapStage121410PullRefresh" rel="stylesheet" href="/css/stage-12.14.10-mobile-pull-refresh.css?v=12.14.10">\n<link id="tunewrapStage121411PullRefreshControl" rel="stylesheet" href="/css/stage-12.14.11-mobile-pull-refresh-control.css?v=12.14.11">',
  'Mobile pull indicator styles');

let mobileUpdateTest=sources.get('scripts/stage-12.14.9-mobile-auto-update-test.js');
mobileUpdateTest=replaceOnce(mobileUpdateTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:9|10)">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:9|10|11)">/',
  'Stage 12.14.9 build compatibility');

let nativePullTest=sources.get('scripts/stage-12.14.10-mobile-pull-refresh-test.js');
nativePullTest=replaceOnce(nativePullTest,
  "assert.ok(html.includes('<meta name=\"tunewrap-build\" content=\"12.14.10\">'));",
  "assert.match(html,/<meta name=\"tunewrap-build\" content=\"12\\.14\\.(?:10|11)\">/);",
  'Stage 12.14.10 build compatibility');
nativePullTest=replaceOnce(nativePullTest,
  '// No synthetic refresh handler and no touchmove preventDefault are introduced.\n// Existing screen snapping and passive swipe navigation remain authoritative.',
  '// This CSS-only stage introduces no synthetic handler of its own. The later\n// controlled fallback is isolated in its own Stage 12.14.11 asset.',
  'Stage 12.14.10 fallback note');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['pullrefreshcontrol:test']='node scripts/stage-12.14.11-mobile-pull-refresh-control-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('pullrefreshcontrol:test'))pkg.scripts.test+=' && npm run pullrefreshcontrol:test';

const updates=new Map([
  ['index.html',index],
  ['scripts/stage-12.14.9-mobile-auto-update-test.js',mobileUpdateTest],
  ['scripts/stage-12.14.10-mobile-pull-refresh-test.js',nativePullTest],
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
    'scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',
    'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
    'scripts/stage-12.14.9-mobile-auto-update-test.js',
    'scripts/stage-12.14.8-announcement-native-i18n-test.js',
    'scripts/stage-12.13.8-global-i18n-audit.js',
    'scripts/responsive-wide-test.js','scripts/admin-catalog-test.js','scripts/site-cms-test.js'
  ];
  for(const relative of tests){
    const result=spawnSync(process.execPath,[path.join(root,...relative.split('/'))],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${relative} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.11 Mobile Pull-to-Refresh Control installed.');
console.log('PASS: pull, release and cache-busted refresh behavior passed against the real runtime.');
console.log('PASS: normal scroll, screen snapping, horizontal gestures and player behavior are unchanged.');
console.log('D1 migration: not required.');

