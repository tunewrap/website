#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js','script.js'),'utf8');

const order=['ru','uk','ka','en','de'];
const keys=[
  'player_back',
  'player_minimize',
  'player_show_full',
  'player_lyrics',
  'player_translation',
  'player_order',
  'player_full_description',
  'player_collapse'
];

const i18nStart=source.indexOf('const I18N = {');
const i18nEnd=source.indexOf('\n  };\n\n  const TIERS',i18nStart);

assert.ok(i18nStart>=0&&i18nEnd>i18nStart,'Main I18N dictionary not found');

for(let index=0; index<order.length; index++){
  const lang=order[index];
  const start=source.indexOf(`${lang}: {`,i18nStart);
  assert.ok(start>=0&&start<i18nEnd,`${lang} dictionary block not found`);

  let end=i18nEnd;
  for(let j=index+1;j<order.length;j++){
    const candidate=source.indexOf(`${order[j]}: {`,start+1);
    if(candidate>start&&candidate<end){
      end=candidate;
      break;
    }
  }

  const block=source.slice(start,end);
  for(const key of keys){
    assert.ok(new RegExp(`\\b${key}\\s*:`).test(block),`${lang} is missing ${key}`);
  }
}

assert.equal((source.match(/\bplayer_back\s*:/g)||[]).length,5);
assert.equal((source.match(/\bplayer_order\s*:/g)||[]).length,5);

console.log('PASS: Stage 12.13.8.1 — player i18n keys exist inside each of RU/UA/GE/EN/DE dictionaries.');
