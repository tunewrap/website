#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const target=file(rel);
  if(!fs.existsSync(target))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(target,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);
  return text.replace(needle,replacement);
}

let adminIndex=read('admin/index.html');

adminIndex=replaceOnce(
  adminIndex,
  `<a class="secondary-button admin-category-manager-link" href="/admin/categories.html">Категории</a>`,
  `<a class="secondary-button admin-curation-manager-link" href="/admin/curation.html">Порядок и витрина</a>
        <a class="secondary-button admin-category-manager-link" href="/admin/categories.html">Категории</a>`,
  'Admin Music curation link'
);

adminIndex=replaceOnce(
  adminIndex,
  `<label class="switch-field"><input id="featuredField" type="checkbox"><span></span><b>Featured в разделе</b></label>`,
  `<label class="switch-field"><input id="featuredField" type="checkbox"><span></span><b>Главная песня раздела</b></label>`,
  'Featured label'
);

write('admin/index.html',adminIndex);

const packagePath=file('package.json');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
pkg.scripts ||= {};
pkg.scripts['curation:test']='node scripts/music-curation-admin-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('curation:test')){
  pkg.scripts.test += ' && npm run curation:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.9 Music Curation Admin installed.');
console.log('Added Admin → Music → Order & Showcase.');
console.log('Stories and Author can be reordered independently by drag/drop or arrows.');
console.log('Main featured track can be selected independently for Stories and Author.');
console.log('Existing sort_order / featured database fields and APIs are reused.');
console.log('D1 migration is not required.');
