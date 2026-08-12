#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','css/style.css','css/stage-12.14.10-mobile-pull-refresh.css',
  'js/script.js','package.json',
  'scripts/stage-12.13.6.3-immediate-first-paint-test.js',
  'scripts/stage-12.13.8-global-i18n-audit.js',
  'scripts/stage-12.14.8-announcement-native-i18n-test.js',
  'scripts/stage-12.14.9-mobile-auto-update-test.js',
  'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
  'scripts/responsive-wide-test.js','scripts/admin-catalog-test.js','scripts/site-cms-test.js'
];
const sources=new Map();
for(const relative of required){
  const target=path.join(root,...relative.split('/'));
  if(!fs.existsSync(target))throw new Error(`${relative} не найден. Распакуйте ZIP прямо в корень website.`);
  sources.set(relative,fs.readFileSync(target,'utf8'));
}
if(!sources.get('index.html').includes('<meta name="tunewrap-build" content="12.14.9">')&&
   !sources.get('index.html').includes('<meta name="tunewrap-build" content="12.14.10">')){
  throw new Error('Сначала требуется установленный Stage 12.14.9. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.9 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}

let index=sources.get('index.html');
index=replaceOnce(index,
  '<meta name="tunewrap-build" content="12.14.9">',
  '<meta name="tunewrap-build" content="12.14.10">',
  'Public build identity');
index=replaceOnce(index,
  '<link id="tunewrapStage12139MobileHeader" rel="stylesheet" href="/css/stage-12.13.9-mobile-header-simplification.css?v=12.13.9">',
  '<link id="tunewrapStage12139MobileHeader" rel="stylesheet" href="/css/stage-12.13.9-mobile-header-simplification.css?v=12.13.9">\n<link id="tunewrapStage121410PullRefresh" rel="stylesheet" href="/css/stage-12.14.10-mobile-pull-refresh.css?v=12.14.10">',
  'Pull-to-refresh stylesheet');

let mobileUpdateTest=sources.get('scripts/stage-12.14.9-mobile-auto-update-test.js');
mobileUpdateTest=replaceOnce(mobileUpdateTest,
  "assert.ok(html.includes('<meta name=\"tunewrap-build\" content=\"12.14.9\">'));",
  "assert.match(html,/<meta name=\"tunewrap-build\" content=\"12\\.14\\.(?:9|10)\">/);",
  'Stage 12.14.9 build compatibility');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['pullrefresh:test']='node scripts/stage-12.14.10-mobile-pull-refresh-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('pullrefresh:test'))pkg.scripts.test+=' && npm run pullrefresh:test';

const updates=new Map([
  ['index.html',index],
  ['scripts/stage-12.14.9-mobile-auto-update-test.js',mobileUpdateTest],
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
    'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
    'scripts/stage-12.14.9-mobile-auto-update-test.js',
    'scripts/stage-12.14.8-announcement-native-i18n-test.js',
    'scripts/stage-12.13.8-global-i18n-audit.js',
    'scripts/stage-12.13.6.3-immediate-first-paint-test.js',
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

console.log('PASS: Stage 12.14.10 Mobile Pull-to-Refresh installed.');
console.log('PASS: native downward refresh is restored for touch phones and tablets.');
console.log('PASS: screen snapping, inner scrolling, player gestures and Stage 12.14.9 freshness checks are unchanged.');
console.log('D1 migration: not required.');
