#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const html=read('index.html');
const pkg=JSON.parse(read('package.json'));

assert.ok(html.includes('class="lang-switch notranslate" id="langSwitch" translate="no"'));
assert.ok(html.includes('class="mobile-lang notranslate" translate="no"'));
assert.ok(html.includes('id="tierDetailLanguageSelect" class="notranslate" translate="no"'));
assert.ok(html.includes('class="music-library-filters notranslate" translate="no"'));
assert.ok(html.includes('class="songs-language-rail notranslate" translate="no"'));
assert.ok(html.includes('class="logo notranslate" translate="no"'));

for(const code of ['RU','UA','GE','EN','DE']){
  assert.ok(html.includes('>'+code+'</button>'),`Missing language code ${code}`);
}

assert.equal(pkg.scripts['languagecodes:test'],'node scripts/stage-12.13.1-language-codes-test.js');
assert.ok(pkg.scripts.test.includes('languagecodes:test'));

console.log('PASS: Stage 12.13.1 — language codes are protected from browser translation.');
