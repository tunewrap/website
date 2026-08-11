#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const file=rel=>path.join(root,rel);

function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){
  const result=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Syntax check failed for ${rel}\n${result.stderr||result.stdout}`);
}

[
  'index.html',
  'js/app-bootstrap.js',
  'css/stage-12.13.3-home-logo-link.css',
  'js/stage-12.13.3-home-logo-link.js',
  'package.json'
].forEach(read);

/* 1. Make the public brand block a semantic link. */
let html=read('index.html');

const oldBlock=`    <div class="logo-block">
      <div class="logo notranslate" translate="no">Tune<span>Wrap</span></div>
      <div class="tagline" data-i18n="tagline">Your story — in a song</div>
    </div>`;

const newBlock=`    <a class="logo-block home-logo-link" id="homeLogoLink" href="#top" aria-label="TuneWrap — Home">
      <div class="logo notranslate" translate="no">Tune<span>Wrap</span></div>
      <div class="tagline" data-i18n="tagline">Your story — in a song</div>
    </a>`;

if(!html.includes('id="homeLogoLink"')){
  if(!html.includes(oldBlock))throw new Error('Stage 12.13.3: header logo block anchor not found.');
  html=html.replace(oldBlock,newBlock);
}
write('index.html',html);

/* 2. Load the tiny CSS + JS via the existing bootstrap. */
let bootstrap=read('js/app-bootstrap.js');

if(!bootstrap.includes('stage-12.13.3-home-logo-link.css')){
  const cssBlock=`
if(!document.getElementById('tunewrapStage12133HomeLogoStyles')){
  const stage12133=document.createElement('link');
  stage12133.id='tunewrapStage12133HomeLogoStyles';
  stage12133.rel='stylesheet';
  stage12133.href='/css/stage-12.13.3-home-logo-link.css?v=12.13.3';
  document.head.append(stage12133);
}
`;
  bootstrap=cssBlock+'\n'+bootstrap;
}

if(!bootstrap.includes('stage-12.13.3-home-logo-link.js')){
  const jsBlock=`
if(!document.getElementById('tunewrapStage12133HomeLogoScript')){
  const stage12133Script=document.createElement('script');
  stage12133Script.id='tunewrapStage12133HomeLogoScript';
  stage12133Script.src='/js/stage-12.13.3-home-logo-link.js?v=12.13.3';
  stage12133Script.defer=true;
  document.head.append(stage12133Script);
}
`;
  bootstrap=jsBlock+'\n'+bootstrap;
}

write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');
check('js/stage-12.13.3-home-logo-link.js');

/* 3. Test registration. */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['homelogo:test']='node scripts/stage-12.13.3-home-logo-link-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('homelogo:test')){
  pkg.scripts.test += ' && npm run homelogo:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.3 Home Logo Link installed.');
console.log('TuneWrap logo now returns to the Home/Hero on desktop and mobile.');
console.log('Current language/query URL is preserved.');
console.log('D1 migration: not required.');
