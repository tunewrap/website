#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const paths={
  admin:path.join(root,'admin','admin.js'),
  html:path.join(root,'admin','index.html'),
  package:path.join(root,'package.json'),
  test144:path.join(root,'scripts','stage-12.14.4-translation-integrity-test.js'),
  test145:path.join(root,'scripts','stage-12.14.5-german-translation-adaptation-test.js'),
  test146:path.join(root,'scripts','stage-12.14.6-complete-locale-matrix-test.js')
};

for(const [name,target] of Object.entries(paths)){
  if(!fs.existsSync(target)){
    throw new Error(`${name} не найден. Распакуйте ZIP с заменой файлов прямо в папку website.`);
  }
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.5 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}

let admin=fs.readFileSync(paths.admin,'utf8');
if(!admin.includes('function looksEnglishInsteadOfGerman')){
  throw new Error('Сначала требуется установленный Stage 12.14.5. Файлы не изменены.');
}
admin=replaceOnce(
  admin,
  '  return Boolean(track&&hasUnsafeTranslations(track));',
  "  // Re-publishing an unchanged track must also resume any language which is\n"+
  "  // still empty after a previous rate-limit/model failure. The public player\n"+
  "  // may show its EN fallback, but that is not a completed DE/UA/GE/RU locale.\n"+
  "  return Boolean(track&&(hasUnsafeTranslations(track)||missingTranslationTargets(track).length));",
  'Admin locale completion trigger'
);

let html=fs.readFileSync(paths.html,'utf8');
html=replaceOnce(html,'/admin/admin.js?v=12.14.5','/admin/admin.js?v=12.14.6','Admin cache version');

let test144=fs.readFileSync(paths.test144,'utf8');
test144=replaceOnce(
  test144,
  "assert.ok(admin.includes('return Boolean(track&&hasUnsafeTranslations(track));'));",
  "assert.match(admin,/return Boolean\\(track&&\\(hasUnsafeTranslations\\(track\\)(?:\\|\\|missingTranslationTargets\\(track\\)\\.length)?\\)\\);/);",
  'Stage 12.14.4 forward compatibility'
);

let test145=fs.readFileSync(paths.test145,'utf8');
test145=replaceOnce(
  test145,
  "assert.ok(html.includes('/admin/admin.js?v=12.14.5'));",
  "assert.match(html,/\\/admin\\/admin\\.js\\?v=12\\.14\\.(?:[5-9]|\\d{2,})/);",
  'Stage 12.14.5 forward compatibility'
);

const pkg=JSON.parse(fs.readFileSync(paths.package,'utf8'));
pkg.scripts||={};
pkg.scripts['adminlocales:test']='node scripts/stage-12.14.6-complete-locale-matrix-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('adminlocales:test'))pkg.scripts.test+=' && npm run adminlocales:test';

const writes=new Map([
  [paths.admin,Buffer.from(admin)],
  [paths.html,Buffer.from(html)],
  [paths.test144,Buffer.from(test144)],
  [paths.test145,Buffer.from(test145)],
  [paths.package,Buffer.from(JSON.stringify(pkg,null,2)+'\n')]
]);
const rollback=new Map(Array.from(writes.keys(),target=>[target,fs.readFileSync(target)]));

try{
  for(const [target,content] of writes)fs.writeFileSync(target,content);
  const tests=[
    'scripts/stage-12.14-admin-editor-reliability-test.js',
    'scripts/stage-12.14.2-incremental-admin-editor-test.js',
    'scripts/stage-12.14.3-independent-admin-persistence-test.js',
    'scripts/stage-12.14.4-translation-integrity-test.js',
    'scripts/stage-12.14.5-german-translation-adaptation-test.js',
    'scripts/stage-12.14.6-complete-locale-matrix-test.js'
  ];
  for(const relative of tests){
    const result=spawnSync(process.execPath,[path.join(root,...relative.split('/'))],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${relative} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.6 Complete Locale Matrix installed.');
console.log('PASS: unchanged Publish resumes every missing RU/UA/GE/EN/DE localization.');
console.log('PASS: title, description and lyrics are checked independently for every source language.');
console.log('PASS: German cannot use the English public fallback as a completed translation.');
console.log('PASS: Admin save/draft/publish/media compatibility tests passed.');
console.log('D1 migration: not required.');
