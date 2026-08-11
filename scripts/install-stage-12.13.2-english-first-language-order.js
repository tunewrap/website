#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const ORDER=['en','ru','uk','ka','de'];
const CODE={en:'EN',ru:'RU',uk:'UA',ka:'GE',de:'DE'};

function file(rel){return path.join(root,rel);}
function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){
  const out=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(out.status!==0)throw new Error(`Syntax check failed for ${rel}\n${out.stderr||out.stdout}`);
}

function reorderButtons(block,attribute){
  const re=new RegExp(`<button\\b[^>]*\\b${attribute}="([^"]+)"[^>]*>[\\s\\S]*?<\\/button>`,'g');
  const buttons=[...block.matchAll(re)].map(match=>({key:match[1],html:match[0]}));
  if(buttons.length<2)return block;
  const map=new Map(buttons.map(item=>[item.key,item.html]));
  const desired=ORDER.map(lang=>{
    const key=attribute==='data-song-language-filter'?CODE[lang]:lang;
    return map.get(key);
  }).filter(Boolean);
  if(desired.length!==buttons.length)return block;
  let index=0;
  return block.replace(re,()=>desired[index++]);
}

function reorderOptions(block){
  const re=/<option\b[^>]*value="([^"]+)"[^>]*>[\s\S]*?<\/option>/g;
  const options=[...block.matchAll(re)].map(match=>({key:match[1].toLowerCase(),html:match[0]}));
  if(options.length<2)return block;
  const map=new Map(options.map(item=>[item.key,item.html]));
  const desired=ORDER.map(lang=>map.get(lang)).filter(Boolean);
  if(desired.length!==options.length)return block;
  let index=0;
  return block.replace(re,()=>desired[index++]);
}

function reorderContainer(html,startPattern,endTag='</div>',attribute='data-lang'){
  const start=html.search(startPattern);
  if(start<0)return html;
  const openEnd=html.indexOf('>',start);
  const end=html.indexOf(endTag,openEnd+1);
  if(openEnd<0||end<0)return html;
  const fullEnd=end+endTag.length;
  const block=html.slice(start,fullEnd);
  const next=reorderButtons(block,attribute);
  return html.slice(0,start)+next+html.slice(fullEnd);
}

/* ---------------------------------------------------------
   PUBLIC SITE
   --------------------------------------------------------- */
let html=read('index.html');

/* Top desktop selector */
html=reorderContainer(
  html,
  /<div class="lang-switch[^"]*" id="langSwitch"[^>]*>/,
  '</div>',
  'data-lang'
);

/* Mobile selector */
const mobileStart=html.search(/<div class="mobile-lang-options"[^>]*>/);
if(mobileStart>=0){
  const openEnd=html.indexOf('>',mobileStart);
  const end=html.indexOf('</div>',openEnd+1);
  const block=html.slice(mobileStart,end+6);
  const next=reorderButtons(block,'data-lang');
  html=html.slice(0,mobileStart)+next+html.slice(end+6);
}

/* Legacy song-language rail */
const songsStart=html.search(/<div class="songs-language-rail[^"]*"[^>]*>/);
if(songsStart>=0){
  const openEnd=html.indexOf('>',songsStart);
  const end=html.indexOf('</div>',openEnd+1);
  const block=html.slice(songsStart,end+6);
  const next=reorderButtons(block,'data-song-language-filter');
  html=html.slice(0,songsStart)+next+html.slice(end+6);
}

/* Package detail language select, if present. */
const selectMatch=html.match(/<select\b[^>]*id="tierDetailLanguageSelect"[^>]*>[\s\S]*?<\/select>/);
if(selectMatch){
  html=html.replace(selectMatch[0],reorderOptions(selectMatch[0]));
}

write('index.html',html);

/* Full-screen library filters are generated from Core.UI_LANGUAGES. */
let core=read('js/catalog-core.js');
core=core.replace(
  "const UI_LANGUAGES = ['ru','uk','ka','en','de'];",
  "const UI_LANGUAGES = ['en','ru','uk','ka','de'];"
);
write('js/catalog-core.js',core);
check('js/catalog-core.js');

/* ---------------------------------------------------------
   ADMIN
   Admin UI remains Russian. Only language ORDER becomes EN first.
   Existing active editing language is intentionally not changed.
   --------------------------------------------------------- */
function reorderAdminTabs(rel,id){
  let text=read(rel);
  const re=new RegExp(`<div class="[^"]*" id="${id}">[\\s\\S]*?<\\/div>`);
  const match=text.match(re);
  if(!match)throw new Error(`Language tabs not found: ${rel}#${id}`);
  text=text.replace(match[0],reorderButtons(match[0],'data-language'));
  write(rel,text);
}

reorderAdminTabs('admin/site.html','siteLanguageTabs');
reorderAdminTabs('admin/pricing.html','pricingLanguageTabs');
reorderAdminTabs('admin/sound.html','soundLanguageTabs');

/* Track language selector */
let adminIndex=read('admin/index.html');
const languageSelect=adminIndex.match(/<select\b[^>]*id="languageField"[^>]*>[\s\S]*?<\/select>/);
if(!languageSelect)throw new Error('admin/index.html #languageField not found.');
const trackOptions=[...languageSelect[0].matchAll(/<option>([^<]+)<\/option>/g)].map(m=>m[1]);
const desiredCodes=['EN','RU','UA','GE','DE'];
if(desiredCodes.every(code=>trackOptions.includes(code))){
  let idx=0;
  const reordered=languageSelect[0].replace(/<option>[^<]+<\/option>/g,()=>`<option>${desiredCodes[idx++]}</option>`);
  adminIndex=adminIndex.replace(languageSelect[0],reordered);
}
write('admin/index.html',adminIndex);

/* Category editor header */
let categoriesHtml=read('admin/categories.html');
categoriesHtml=categoriesHtml.replace('RU / UA / GE / EN / DE','EN / RU / UA / GE / DE');
write('admin/categories.html',categoriesHtml);

/* Dynamic Admin locale tabs / fields. */
const replacements=[
  ['admin/admin.js',
   "const UI_LOCALES = Object.freeze([['ru','RU'],['uk','UA'],['ka','GE'],['en','EN'],['de','DE']]);",
   "const UI_LOCALES = Object.freeze([['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']]);"],
  ['admin/categories.js',
   "const LOCALES=[['ru','RU'],['uk','UA'],['ka','GE'],['en','EN'],['de','DE']];",
   "const LOCALES=[['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']];"],
  ['admin/site.js',
   "const LANGUAGES=['ru','uk','ka','en','de'];",
   "const LANGUAGES=['en','ru','uk','ka','de'];"],
  ['admin/pricing.js',
   "const LANGUAGES=['ru','uk','ka','en','de'];",
   "const LANGUAGES=['en','ru','uk','ka','de'];"],
  ['admin/sound.js',
   "const LANGUAGES=['ru','uk','ka','en','de'];",
   "const LANGUAGES=['en','ru','uk','ka','de'];"]
];

for(const [rel,from,to] of replacements){
  let text=read(rel);
  if(!text.includes(from))throw new Error(`Expected language-order anchor not found: ${rel}`);
  text=text.replace(from,to);
  write(rel,text);
  check(rel);
}

/* ---------------------------------------------------------
   TEST
   --------------------------------------------------------- */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['englishorder:test']='node scripts/stage-12.13.2-english-first-order-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('englishorder:test')){
  pkg.scripts.test += ' && npm run englishorder:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.2 English-first language order installed.');
console.log('Public language order: EN / RU / UA / GE / DE.');
console.log('Library language order follows EN first.');
console.log('Admin language lists also show EN first; Admin interface itself remains Russian.');
console.log('D1 migration: not required.');
