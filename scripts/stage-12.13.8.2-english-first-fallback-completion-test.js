#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const files=[
  'js/site-cms-runtime.js',
  'js/pricing-cms-runtime.js',
  'js/sound-preferences-runtime.js',
  'js/gift-certificate-overlay.js',
  'js/order-intake-completion.js',
  'js/orders-submit.js',
  'js/stage-12.10-package-ui-polish.js',
  'js/stage-12.11-contact-channel-selector.js',
  'js/ux-critical-fixes.js',
  'js/wide-copy-polish.js'
];

let combined='';

for(const rel of files){
  const p=path.join(root,rel);
  const source=fs.readFileSync(p,'utf8');
  combined+='\n'+source;

  const out=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
  assert.equal(out.status,0,`${rel}\n${out.stderr||out.stdout}`);
}

const forbidden=[
  'locales?.ru||offer?.locales?.en',
  'locales?.ru||cfg?.settings?.locales?.en',
  'locales?.ru||item?.locales?.en',
  'map?.ru||map?.en',
  'locales.ru?.name||locales.en?.name',
  'labels?.ru||value?.labels?.en'
];

for(const token of forbidden){
  assert.equal(combined.includes(token),false,`RU-first fallback remains: ${token}`);
}

console.log('PASS: Stage 12.13.8.2 — no known RU-first public fallback signatures remain.');
