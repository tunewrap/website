#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','package.json','admin/site.js','admin/site.html',
  'functions/api/admin/translate.js',
  'scripts/stage-12.14.14-site-translation-locale-codes-test.js',
  'scripts/stage-12.14.13-site-field-translation-recovery-test.js',
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
if(!indexSource.includes('<meta name="tunewrap-build" content="12.14.13">')&&
   !indexSource.includes('<meta name="tunewrap-build" content="12.14.14">')){
  throw new Error('Сначала требуется установленный Stage 12.14.13. Файлы не изменены.');
}
if(sources.get('admin/site.js').includes('target:AI_CODES[target]')||
   !sources.get('admin/site.js').includes('async function translateResilient')||
   !sources.get('admin/site.html').includes('/admin/site.js?v=12.14.14')){
  throw new Error('Файлы Stage 12.14.14 не распакованы поверх website. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.13 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}

const index=replaceOnce(indexSource,
  '<meta name="tunewrap-build" content="12.14.13">',
  '<meta name="tunewrap-build" content="12.14.14">',
  'Public build identity');

let mobileUpdateTest=sources.get('scripts/stage-12.14.9-mobile-auto-update-test.js');
mobileUpdateTest=replaceOnce(mobileUpdateTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:9|10|11|12|13)">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:9|10|11|12|13|14)">/',
  'Stage 12.14.9 build compatibility');

let nativePullTest=sources.get('scripts/stage-12.14.10-mobile-pull-refresh-test.js');
nativePullTest=replaceOnce(nativePullTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:10|11|12|13)">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:10|11|12|13|14)">/',
  'Stage 12.14.10 build compatibility');

let controlledPullTest=sources.get('scripts/stage-12.14.11-mobile-pull-refresh-control-test.js');
controlledPullTest=replaceOnce(controlledPullTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:11|12|13)">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:11|12|13|14)">/',
  'Stage 12.14.11 build compatibility');

let completionTest=sources.get('scripts/stage-12.14.12-site-autotranslate-completion-test.js');
completionTest=replaceOnce(completionTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:12|13)">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:12|13|14)">/',
  'Stage 12.14.12 build compatibility');
completionTest=replaceOnce(completionTest,
  '/\\/admin\\/site\\.js\\?v=12\\.14\\.(?:12|13)/',
  '/\\/admin\\/site\\.js\\?v=12\\.14\\.(?:12|13|14)/',
  'Stage 12.14.12 Admin asset compatibility');

let recoveryTest=sources.get('scripts/stage-12.14.13-site-field-translation-recovery-test.js');
recoveryTest=replaceOnce(recoveryTest,
  '/<meta name="tunewrap-build" content="12\\.14\\.13">/',
  '/<meta name="tunewrap-build" content="12\\.14\\.(?:13|14)">/',
  'Stage 12.14.13 build compatibility');
recoveryTest=replaceOnce(recoveryTest,
  "assert.ok(adminHtml.includes('/admin/site.js?v=12.14.13'));",
  'assert.match(adminHtml,/\\/admin\\/site\\.js\\?v=12\\.14\\.(?:13|14)/);',
  'Stage 12.14.13 Admin asset compatibility');

let announcementTest=sources.get('scripts/stage-12.14.8-announcement-native-i18n-test.js');
announcementTest=replaceOnce(announcementTest,
  '/\\/admin\\/site\\.js\\?v=12\\.14\\.(?:8|12|13)/',
  '/\\/admin\\/site\\.js\\?v=12\\.14\\.(?:8|12|13|14)/',
  'Stage 12.14.8 Admin asset compatibility');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['sitelocalecodes:test']='node scripts/stage-12.14.14-site-translation-locale-codes-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('sitelocalecodes:test'))pkg.scripts.test+=' && npm run sitelocalecodes:test';

const updates=new Map([
  ['index.html',index],
  ['scripts/stage-12.14.9-mobile-auto-update-test.js',mobileUpdateTest],
  ['scripts/stage-12.14.10-mobile-pull-refresh-test.js',nativePullTest],
  ['scripts/stage-12.14.11-mobile-pull-refresh-control-test.js',controlledPullTest],
  ['scripts/stage-12.14.12-site-autotranslate-completion-test.js',completionTest],
  ['scripts/stage-12.14.13-site-field-translation-recovery-test.js',recoveryTest],
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
    'scripts/stage-12.14.14-site-translation-locale-codes-test.js',
    'scripts/stage-12.14.13-site-field-translation-recovery-test.js',
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

console.log('PASS: Stage 12.14.14 Site Translation Locale Codes installed.');
console.log('PASS: Ukrainian is sent as uk and Georgian as ka.');
console.log('PASS: UA/GE remain display labels only; EN/DE behavior is unchanged.');
console.log('D1 migration: not required.');
