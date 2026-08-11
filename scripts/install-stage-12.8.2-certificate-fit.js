#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=rel=>path.join(root,rel);

function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);
  return text.replace(needle,replacement);
}

let bootstrap=read('js/app-bootstrap.js');

bootstrap=replaceOnce(
  bootstrap,
  "if(!document.getElementById('tunewrapStoryCategoryStyles')){",
  `if(!document.getElementById('tunewrapStage1282CertificateFit')){
  const stage1282=document.createElement('link');
  stage1282.id='tunewrapStage1282CertificateFit';
  stage1282.rel='stylesheet';
  stage1282.href='/css/stage-12.8.2-certificate-fit.css?v=12.8.2';
  document.head.append(stage1282);
}

if(!document.getElementById('tunewrapStoryCategoryStyles')){`,
  'Stage 12.8.2 certificate-fit stylesheet'
);

fs.writeFileSync(file('js/app-bootstrap.js'),bootstrap,'utf8');

const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['certificate-fit:test']='node scripts/stage-12.8.2-certificate-fit-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('certificate-fit:test')){
  pkg.scripts.test += ' && npm run certificate-fit:test';
}
fs.writeFileSync(file('package.json'),JSON.stringify(pkg,null,2)+'\n','utf8');

console.log('PASS: Stage 12.8.2 Certificate Six-Packages Fit installed.');
console.log('Fixed: vertical grid stretch that pushed the three wedding packages below the visible area.');
console.log('All six Pricing CMS packages remain unchanged.');
console.log('D1 migration is not required.');
