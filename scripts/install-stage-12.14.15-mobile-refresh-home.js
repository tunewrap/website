#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','package.json','js/mobile-pull-refresh.js','js/auto-update.js','js/app-bootstrap.js',
  'scripts/stage-12.14.15-mobile-refresh-home-test.js',
  'scripts/stage-12.14.14-site-translation-locale-codes-test.js',
  'scripts/stage-12.14.13-site-field-translation-recovery-test.js',
  'scripts/stage-12.14.12-site-autotranslate-completion-test.js',
  'scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',
  'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
  'scripts/stage-12.14.9-mobile-auto-update-test.js',
  'scripts/stage-12.14.8-announcement-native-i18n-test.js',
  'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
  'scripts/stage-12.8.5-refresh-top-test.js',
  'scripts/stage-12.13.8-global-i18n-audit.js','scripts/site-cms-test.js',
  'scripts/responsive-wide-test.js','scripts/admin-catalog-test.js'
];
const sources=new Map();
for(const relative of required){
  const target=path.join(root,...relative.split('/'));
  if(!fs.existsSync(target))throw new Error(`${relative} не найден. Распакуйте ZIP прямо в корень website.`);
  sources.set(relative,fs.readFileSync(target,'utf8'));
}

const indexSource=sources.get('index.html');
if(!indexSource.includes('<meta name="tunewrap-build" content="12.14.14">')&&
   !indexSource.includes('<meta name="tunewrap-build" content="12.14.15">')){
  throw new Error('Сначала требуется установленный Stage 12.14.14. Файлы не изменены.');
}
if(!sources.get('js/mobile-pull-refresh.js').includes("url.hash=''" )||
   !sources.get('js/auto-update.js').includes("url.hash=''" )||
   !sources.get('js/app-bootstrap.js').includes("refreshParams.has('tw-update')")){
  throw new Error('Файлы Stage 12.14.15 не распакованы поверх website. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.14 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}

let index=replaceOnce(indexSource,
  '<meta name="tunewrap-build" content="12.14.14">',
  '<meta name="tunewrap-build" content="12.14.15">',
  'Public build identity');
index=replaceOnce(index,
  '<script src="/js/auto-update.js?v=12.14.9" defer></script>',
  '<script src="/js/auto-update.js?v=12.14.15" defer></script>',
  'Auto-update asset version');
index=replaceOnce(index,
  '<script src="/js/mobile-pull-refresh.js?v=12.14.11" defer></script>',
  '<script src="/js/mobile-pull-refresh.js?v=12.14.15" defer></script>',
  'Pull-refresh asset version');
index=replaceOnce(index,
  '<script type="module" src="js/app-bootstrap.js?v=12.14.9"></script>',
  '<script type="module" src="js/app-bootstrap.js?v=12.14.15"></script>',
  'Bootstrap asset version');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['mobilerefreshhome:test']='node scripts/stage-12.14.15-mobile-refresh-home-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('mobilerefreshhome:test'))pkg.scripts.test+=' && npm run mobilerefreshhome:test';

const updates=new Map([
  ['index.html',index],
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
    'scripts/stage-12.14.15-mobile-refresh-home-test.js',
    'scripts/stage-12.8.5-refresh-top-test.js',
    'scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',
    'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
    'scripts/stage-12.14.9-mobile-auto-update-test.js',
    'scripts/stage-12.14.8-announcement-native-i18n-test.js',
    'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
    'scripts/stage-12.13.8-global-i18n-audit.js',
    'scripts/stage-12.14.14-site-translation-locale-codes-test.js',
    'scripts/stage-12.14.13-site-field-translation-recovery-test.js',
    'scripts/stage-12.14.12-site-autotranslate-completion-test.js',
    'scripts/site-cms-test.js','scripts/responsive-wide-test.js','scripts/admin-catalog-test.js'
  ];
  for(const relative of tests){
    const result=spawnSync(process.execPath,[path.join(root,...relative.split('/'))],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${relative} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.15 Mobile Refresh Home installed.');
console.log('PASS: pull, browser reload and automatic update reopen TuneWrap Home.');
console.log('PASS: deliberate Packages/Contact navigation and all mobile gestures remain intact.');
console.log('D1 migration: not required.');
