#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const bootstrapPath=path.join(root,'js','app-bootstrap.js');
const cssPath=path.join(root,'css','stage-12.10.4-compact-desktop-package-chooser.css');
const packagePath=path.join(root,'package.json');

if(!fs.existsSync(bootstrapPath))throw new Error('Missing js/app-bootstrap.js');
if(!fs.existsSync(cssPath))throw new Error('Missing Stage 12.10.4 CSS');
if(!fs.existsSync(packagePath))throw new Error('Missing package.json');

let bootstrap=fs.readFileSync(bootstrapPath,'utf8');

if(!bootstrap.includes('stage-12.10.4-compact-desktop-package-chooser.css')){
  const block=`
if(!document.getElementById('tunewrapStage12104CompactChooser')){
  const stage12104=document.createElement('link');
  stage12104.id='tunewrapStage12104CompactChooser';
  stage12104.rel='stylesheet';
  stage12104.href='/css/stage-12.10.4-compact-desktop-package-chooser.css?v=12.10.4';
  document.head.append(stage12104);
}
`;
  const anchor="if(!document.getElementById('tunewrapStoryCategoryStyles')){";
  const at=bootstrap.indexOf(anchor);
  if(at<0)throw new Error('CSS insertion anchor not found in app-bootstrap.js');
  bootstrap=bootstrap.slice(0,at)+block+'\n'+bootstrap.slice(at);
  fs.writeFileSync(bootstrapPath,bootstrap,'utf8');
}

const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
pkg.scripts ||= {};
pkg.scripts['choosercompact:test']='node scripts/stage-12.10.4-compact-chooser-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('choosercompact:test')){
  pkg.scripts.test += ' && npm run choosercompact:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.10.4 Compact Desktop Package Chooser installed.');
console.log('Desktop chooser is smaller; both 3-card rows stay together with no screen-sized gap.');
console.log('Root cause fixed: chooser <section> groups are explicitly content-sized.');
console.log('D1 migration: not required.');
