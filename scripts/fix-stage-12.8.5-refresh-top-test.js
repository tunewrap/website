#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'scripts','stage-12.8.5-refresh-top-test.js');

if(!fs.existsSync(target)){
  throw new Error('Missing scripts/stage-12.8.5-refresh-top-test.js');
}

let text=fs.readFileSync(target,'utf8');

// Stage 12.8.5 test was written with doubled backslashes inside
// JavaScript regex literals (e.g. /12\\.8/), which matches a backslash
// instead of the intended dot. Runtime code is fine; only the test is wrong.
const replacements=[
  [String.raw`/Stage 12\\.8\\.5 — desktop refresh starts at top/`, String.raw`/Stage 12\.8\.5 — desktop refresh starts at top/`],
  [String.raw`/navEntry\\?\\.type==='reload'/`, String.raw`/navEntry\?\.type==='reload'/`],
  [String.raw`/history\\.scrollRestoration='manual'/`, String.raw`/history\.scrollRestoration='manual'/`],
  [String.raw`/history\\.replaceState/`, String.raw`/history\.replaceState/`],
  [String.raw`/location\\.pathname\\+location\\.search/`, String.raw`/location\.pathname\+location\.search/`],
  [String.raw`/window\\.scrollTo\\(\\{top:0,left:0,behavior:'auto'\\}\\)/`, String.raw`/window\.scrollTo\(\{top:0,left:0,behavior:'auto'\}\)/`],
  [String.raw`/app\\.scrollTop=0/`, String.raw`/app\.scrollTop=0/`],
  [String.raw`/if\\(!isReload\\|\\|!isWide\\)return/`, String.raw`/if\(!isReload\|\|!isWide\)return/`]
];

let changed=0;
for(const [from,to] of replacements){
  if(text.includes(from)){
    text=text.replace(from,to);
    changed+=1;
  }
}

if(changed===0){
  console.log('PASS: Stage 12.8.5 refresh-top test already uses valid regex escaping.');
  process.exit(0);
}

fs.writeFileSync(target,text,'utf8');
console.log(`PASS: fixed ${changed} malformed regex assertion(s) in Stage 12.8.5 refresh-top test.`);
console.log('Runtime code was not changed.');
console.log('D1 migration: not required.');
