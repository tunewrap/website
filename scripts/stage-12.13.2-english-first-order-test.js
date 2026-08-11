#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

function position(text,needle){
  const value=text.indexOf(needle);
  assert.ok(value>=0,`Missing: ${needle}`);
  return value;
}

const html=read('index.html');
const core=read('js/catalog-core.js');
const adminIndex=read('admin/index.html');
const siteHtml=read('admin/site.html');
const pricingHtml=read('admin/pricing.html');
const soundHtml=read('admin/sound.html');
const categoriesHtml=read('admin/categories.html');
const adminJs=read('admin/admin.js');
const categoriesJs=read('admin/categories.js');
const siteJs=read('admin/site.js');
const pricingJs=read('admin/pricing.js');
const soundJs=read('admin/sound.js');
const pkg=JSON.parse(read('package.json'));

/* Top selector order */
const top=html.match(/<div class="lang-switch[^"]*" id="langSwitch"[^>]*>[\s\S]*?<\/div>/);
assert.ok(top);
assert.ok(position(top[0],'data-lang="en"') < position(top[0],'data-lang="ru"'));
assert.ok(position(top[0],'data-lang="ru"') < position(top[0],'data-lang="uk"'));
assert.ok(position(top[0],'data-lang="uk"') < position(top[0],'data-lang="ka"'));
assert.ok(position(top[0],'data-lang="ka"') < position(top[0],'data-lang="de"'));

/* Public default still EN */
assert.ok(html.includes('<html lang="en">'));
assert.ok(html.includes('data-lang="en"'));
assert.ok(core.includes("const UI_LANGUAGES = ['en','ru','uk','ka','de'];"));

/* Admin visible ordering */
for(const [text,id] of [
  [siteHtml,'siteLanguageTabs'],
  [pricingHtml,'pricingLanguageTabs'],
  [soundHtml,'soundLanguageTabs']
]){
  const re=new RegExp(`<div class="[^"]*" id="${id}">[\\s\\S]*?<\\/div>`);
  const block=text.match(re);
  assert.ok(block,`Missing ${id}`);
  assert.ok(position(block[0],'data-language="en"') < position(block[0],'data-language="ru"'));
}

/* Admin UI remains Russian */
assert.ok(siteHtml.includes('<html lang="ru">'));
assert.ok(siteHtml.includes('Содержимое сайта'));
assert.ok(pricingHtml.includes('Стоимость и форматы'));
assert.ok(soundHtml.includes('Стили и звучание'));

/* Track language dropdown */
const select=adminIndex.match(/<select\b[^>]*id="languageField"[^>]*>[\s\S]*?<\/select>/);
assert.ok(select);
assert.ok(position(select[0],'<option>EN</option>') < position(select[0],'<option>RU</option>'));

assert.ok(categoriesHtml.includes('EN / RU / UA / GE / DE'));
assert.ok(adminJs.includes("[['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']]"));
assert.ok(categoriesJs.includes("[['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']]"));
assert.ok(siteJs.includes("const LANGUAGES=['en','ru','uk','ka','de'];"));
assert.ok(pricingJs.includes("const LANGUAGES=['en','ru','uk','ka','de'];"));
assert.ok(soundJs.includes("const LANGUAGES=['en','ru','uk','ka','de'];"));

for(const rel of ['js/catalog-core.js','admin/admin.js','admin/categories.js','admin/site.js','admin/pricing.js','admin/sound.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,rel)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${rel}\n${syntax.stderr||syntax.stdout}`);
}

assert.equal(pkg.scripts['englishorder:test'],'node scripts/stage-12.13.2-english-first-order-test.js');
assert.ok(pkg.scripts.test.includes('englishorder:test'));

console.log('PASS: Stage 12.13.2 — EN is first in public and Admin language lists; Admin UI stays Russian.');
