#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','package.json','admin/site.js','admin/site.html','admin/site.css',
  'js/mobile-pull-refresh.js','css/stage-12.14.11-mobile-pull-refresh-control.css',
  'scripts/stage-12.14.12-site-autotranslate-completion-test.js',
  'scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',
  'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
  'scripts/stage-12.14.9-mobile-auto-update-test.js',
  'scripts/stage-12.14.8-announcement-native-i18n-test.js',
  'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
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
if(!indexSource.includes('<meta name="tunewrap-build" content="12.14.11">')&&
   !indexSource.includes('<meta name="tunewrap-build" content="12.14.12">')){
  throw new Error('Сначала требуется установленный Stage 12.14.11. Файлы не изменены.');
}
if(!sources.get('admin/site.js').includes('TRANSLATION_UNIT_LIMIT=1800')||
   !sources.get('admin/site.js').includes('translatePreparedTarget')||
   !sources.get('admin/site.html').includes('id="siteTranslationStatus"')){
  throw new Error('Файлы Stage 12.14.12 не распакованы поверх website. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.11 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}

let index=replaceOnce(indexSource,
  '<meta name="tunewrap-build" content="12.14.11">',
  '<meta name="tunewrap-build" content="12.14.12">',
  'Public build identity');

let mobileUpdateTest=sources.get('scripts/stage-12.14.9-mobile-auto-update-test.js');
mobileUpdateTest=replaceOnce(mobileUpdateTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:9|10|11)">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:9|10|11|12)">/',
  'Stage 12.14.9 build compatibility');

let nativePullTest=sources.get('scripts/stage-12.14.10-mobile-pull-refresh-test.js');
nativePullTest=replaceOnce(nativePullTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:10|11)">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:10|11|12)">/',
  'Stage 12.14.10 build compatibility');

let controlledPullTest=sources.get('scripts/stage-12.14.11-mobile-pull-refresh-control-test.js');
controlledPullTest=replaceOnce(controlledPullTest,
  "assert.ok(html.includes('<meta name=\"tunewrap-build\" content=\"12.14.11\">'));",
  'assert.match(html,/<meta name="tunewrap-build" content="12\\.14\\.(?:11|12)">/);',
  'Stage 12.14.11 build compatibility');

let announcementTest=sources.get('scripts/stage-12.14.8-announcement-native-i18n-test.js');
announcementTest=replaceOnce(announcementTest,
  "assert.ok(adminHtml.includes('/admin/site.js?v=12.14.8'));",
  'assert.match(adminHtml,/\\/admin\\/site\\.js\\?v=12\\.14\\.(?:8|12)/);',
  'Stage 12.14.8 Admin asset compatibility');

let siteTest=sources.get('scripts/site-cms-test.js');
siteTest=replaceOnce(siteTest,
  'assert.match(adminJs,/offset\\+=8/);',
  'assert.match(adminJs,/TRANSLATION_BATCH_SIZE=8/);\nassert.match(adminJs,/offset\\+=TRANSLATION_BATCH_SIZE/);',
  'Site CMS translation batch contract');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['siteautotranslate:test']='node scripts/stage-12.14.12-site-autotranslate-completion-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('siteautotranslate:test'))pkg.scripts.test+=' && npm run siteautotranslate:test';

const updates=new Map([
  ['index.html',index],
  ['scripts/stage-12.14.9-mobile-auto-update-test.js',mobileUpdateTest],
  ['scripts/stage-12.14.10-mobile-pull-refresh-test.js',nativePullTest],
  ['scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',controlledPullTest],
  ['scripts/stage-12.14.8-announcement-native-i18n-test.js',announcementTest],
  ['scripts/site-cms-test.js',siteTest],
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
    'scripts/stage-12.14.12-site-autotranslate-completion-test.js',
    'scripts/site-cms-test.js',
    'scripts/stage-12.14.8-announcement-native-i18n-test.js',
    'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
    'scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',
    'scripts/stage-12.14.10-mobile-pull-refresh-test.js',
    'scripts/stage-12.14.9-mobile-auto-update-test.js',
    'scripts/stage-12.13.8-global-i18n-audit.js',
    'scripts/responsive-wide-test.js','scripts/admin-catalog-test.js'
  ];
  for(const relative of tests){
    const result=spawnSync(process.execPath,[path.join(root,...relative.split('/'))],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${relative} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.12 Site Auto-Translate Completion installed.');
console.log('PASS: long Terms and multiline Site CMS fields are split and rebuilt safely.');
console.log('PASS: EN/UA/GE/DE targets run independently and incomplete locales are never committed.');
console.log('PASS: Admin now reports exact completed and failed languages.');
console.log('D1 migration: not required.');

