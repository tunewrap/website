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

const required=[
  'js/stage-12.10-package-ui-polish.js',
  'css/stage-12.10-package-ui-polish.css',
  'js/app-bootstrap.js',
  'package.json'
];
required.forEach(read);

let bootstrap=read('js/app-bootstrap.js');

const cssBlock=`
if(!document.getElementById('tunewrapStage1210PackageUI')){
  const stage1210=document.createElement('link');
  stage1210.id='tunewrapStage1210PackageUI';
  stage1210.rel='stylesheet';
  stage1210.href='/css/stage-12.10-package-ui-polish.css?v=12.10';
  document.head.append(stage1210);
}
`;

if(!bootstrap.includes("stage-12.10-package-ui-polish.css")){
  const cssAnchor="if(!document.getElementById('tunewrapStoryCategoryStyles')){";
  const at=bootstrap.indexOf(cssAnchor);
  if(at<0)throw new Error('Stage 12.10: CSS insertion anchor not found in app-bootstrap.js');
  bootstrap=bootstrap.slice(0,at)+cssBlock+'\n'+bootstrap.slice(at);
}

const jsBlock=`
  try{
    await import('./stage-12.10-package-ui-polish.js');
  }catch(error){
    console.error('TuneWrap Stage 12.10 package UI polish failed',error);
  }
`;

if(!bootstrap.includes("stage-12.10-package-ui-polish.js")){
  const jsAnchor="  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));";
  const at=bootstrap.indexOf(jsAnchor);
  if(at<0)throw new Error('Stage 12.10: JS insertion anchor not found in app-bootstrap.js');
  bootstrap=bootstrap.slice(0,at)+jsBlock+'\n'+bootstrap.slice(at);
}

fs.writeFileSync(file('js/app-bootstrap.js'),bootstrap,'utf8');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['packageui:test']='node scripts/stage-12.10-package-ui-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('packageui:test')){
  pkg.scripts.test += ' && npm run packageui:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.10 Package UI Polish installed.');
console.log('Wedding detail cards now use the same compact format as regular plans.');
console.log('Tier detail close button moves into the card, top-right.');
console.log('Gift Certificate is aligned as 3 + 3; phone uses six compact full-width rows.');
console.log('Native package select is replaced visually by a branded TuneWrap chooser with close X.');
console.log('Existing Pricing CMS remains the single source of names/prices/enabled offers.');
console.log('D1 migration: not required.');
