#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}

let html=read('index.html');

/* Desktop language switch */
html=html.replace(
  '<div class="lang-switch" id="langSwitch">',
  '<div class="lang-switch notranslate" id="langSwitch" translate="no">'
);

/* Mobile language switch */
html=html.replace(
  '<details class="mobile-lang">',
  '<details class="mobile-lang notranslate" translate="no">'
);

/* Tier-detail language select */
html=html.replace(
  '<select id="tierDetailLanguageSelect" aria-label="Language">',
  '<select id="tierDetailLanguageSelect" class="notranslate" translate="no" aria-label="Language">'
);

/* Full-screen library language filters */
html=html.replaceAll(
  'class="music-library-filters"',
  'class="music-library-filters notranslate" translate="no"'
);

/* Legacy songs language rail (kept for compatibility) */
html=html.replace(
  'class="songs-language-rail" role="tablist"',
  'class="songs-language-rail notranslate" translate="no" role="tablist"'
);

/* Featured track language badges, wherever present */
html=html.replaceAll(
  'data-featured-language>',
  'class="notranslate" translate="no" data-featured-language>'
);

/* Brand should also never be translated/transliterated */
html=html.replace(
  '<div class="logo">Tune<span>Wrap</span></div>',
  '<div class="logo notranslate" translate="no">Tune<span>Wrap</span></div>'
);

write('index.html',html);

/* package test registration */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['languagecodes:test']='node scripts/stage-12.13.1-language-codes-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('languagecodes:test')){
  pkg.scripts.test += ' && npm run languagecodes:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.1 installed.');
console.log('Chrome/Google Translate is instructed not to translate language codes or TuneWrap branding.');
console.log('Language selector remains RU / UA / GE / EN / DE in Latin letters.');
console.log('D1 migration: not required.');
