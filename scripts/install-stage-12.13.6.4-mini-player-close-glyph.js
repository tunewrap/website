#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const indexPath=path.join(root,'index.html');
const sourceCss=path.join(__dirname,'..','css','stage-12.13.6.4-mini-player-close-glyph.css');
const targetCss=path.join(root,'css','stage-12.13.6.4-mini-player-close-glyph.css');

if(!fs.existsSync(indexPath))throw new Error('Missing index.html');
if(!fs.existsSync(sourceCss))throw new Error('Missing Stage 12.13.6.4 CSS');

const css=fs.readFileSync(sourceCss,'utf8');
fs.writeFileSync(targetCss,css,'utf8');

let html=fs.readFileSync(indexPath,'utf8');

if(!html.includes('id="tunewrapMiniCloseGlyph"')){
  const anchor='<link rel="stylesheet" href="css/style.css">';
  if(!html.includes(anchor))throw new Error('Main stylesheet anchor not found');

  const link='<link id="tunewrapMiniCloseGlyph" rel="stylesheet" href="/css/stage-12.13.6.4-mini-player-close-glyph.css?v=12.13.6.4">';
  html=html.replace(anchor,anchor+'\n'+link);
  fs.writeFileSync(indexPath,html,'utf8');
}

const packagePath=path.join(root,'package.json');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
pkg.scripts ||= {};
pkg.scripts['miniclose:test']='node scripts/stage-12.13.6.4-mini-player-close-glyph-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('miniclose:test')){
  pkg.scripts.test += ' && npm run miniclose:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.6.4 Mini Player Close Glyph installed.');
console.log('Visual X restored on #topMiniStop. Player behavior was not changed.');
console.log('D1 migration: not required.');
