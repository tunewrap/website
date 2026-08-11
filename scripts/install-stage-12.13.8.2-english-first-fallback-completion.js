#!/usr/bin/env node
'use strict';

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

const pending=new Map();

function read(rel){
  const p=path.join(root,rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}

function stage(rel,source){
  pending.set(rel,source);
}

function syntaxCheck(rel,source){
  const tmp=path.join(root,`.stage-12.13.8.2-check-${path.basename(rel)}.js`);
  try{
    fs.writeFileSync(tmp,source,'utf8');
    const out=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
    if(out.status!==0)throw new Error(`Syntax check failed for ${rel}\n${out.stderr||out.stdout}`);
  }finally{
    try{fs.unlinkSync(tmp);}catch(error){}
  }
}

function replaceAll(source,from,to){
  return source.split(from).join(to);
}

const replacements=[
  // Exact forbidden signature reported by the Stage 12.13.8 audit.
  ["offer?.locales?.ru||offer?.locales?.en","offer?.locales?.en||offer?.locales?.ru"],
  ["cfg?.settings?.locales?.ru||cfg?.settings?.locales?.en","cfg?.settings?.locales?.en||cfg?.settings?.locales?.ru"],

  // Other public RU-first legacy fallbacks from the same family.
  ["item?.locales?.ru||item?.locales?.en","item?.locales?.en||item?.locales?.ru"],
  ["map?.ru||map?.en","map?.en||map?.ru"],
  ["locales.ru?.name||locales.en?.name","locales.en?.name||locales.ru?.name"],
  ["value?.labels?.ru||value?.labels?.en","value?.labels?.en||value?.labels?.ru"],
  ["item?.locales?.ru?.label\n    ||item?.locales?.en?.label","item?.locales?.en?.label\n    ||item?.locales?.ru?.label"],

  // Known exact Stage 12.x forms where EN fallback was missing entirely.
  ["return item?.locales?.[language()]||item?.locales?.ru||null;",
   "return item?.locales?.[language()]||item?.locales?.en||item?.locales?.ru||null;"],

  ["function loc(map){return map?.[lang()]||map?.ru||map?.en||null}",
   "function loc(map){return map?.[lang()]||map?.en||map?.ru||null}"],

  ["return value?.labels?.[lang()]||value?.labels?.ru||value?.id||'';",
   "return value?.labels?.[lang()]||value?.labels?.en||value?.labels?.ru||value?.id||'';"],

  ["return locales[lang()]?.name||locales.ru?.name||offer?.id||'';",
   "return locales[lang()]?.name||locales.en?.name||locales.ru?.name||offer?.id||'';"],

  ["return locales[lang()]?.name||locales.ru?.name||offer.id||'';",
   "return locales[lang()]?.name||locales.en?.name||locales.ru?.name||offer.id||'';"],

  ["return offer?.locales?.[lang()]||offer?.locales?.ru||offer?.locales?.en||{};",
   "return offer?.locales?.[lang()]||offer?.locales?.en||offer?.locales?.ru||{};"],

  ["return cfg?.settings?.locales?.[lang()]||cfg?.settings?.locales?.ru||cfg?.settings?.locales?.en||{};",
   "return cfg?.settings?.locales?.[lang()]||cfg?.settings?.locales?.en||cfg?.settings?.locales?.ru||{};"]
];

let changed=0;

for(const rel of files){
  let source=read(rel);
  const original=source;

  for(const [from,to] of replacements){
    source=replaceAll(source,from,to);
  }

  if(source!==original){
    syntaxCheck(rel,source);
    stage(rel,source);
    changed++;
    console.log(`PASS: fixed English-first fallback in ${rel}`);
  }
}

/*
  Final invariant: none of the exact RU-first public signatures that the
  Stage 12.13.8 audit rejects may remain in these modules.
*/
const forbidden=[
  'locales?.ru||offer?.locales?.en',
  'locales?.ru||cfg?.settings?.locales?.en',
  'locales?.ru||item?.locales?.en',
  'map?.ru||map?.en',
  'locales.ru?.name||locales.en?.name',
  'labels?.ru||value?.labels?.en'
];

let combined='';
for(const rel of files){
  combined += '\n' + (pending.get(rel) ?? read(rel));
}

for(const token of forbidden){
  if(combined.includes(token)){
    throw new Error(`RU-first fallback still remains after patch: ${token}`);
  }
}

/*
  Commit only after every target file has passed syntax + invariant checks.
*/
for(const [rel,source] of pending.entries()){
  fs.writeFileSync(path.join(root,rel),source,'utf8');
}

console.log(`PASS: Stage 12.13.8.2 completed. Modified ${changed} public runtime file(s).`);
console.log('PASS: public fallback invariant is selected language -> English -> Russian legacy rescue.');
console.log('D1 migration: not required.');
