#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const target=file(rel);
  if(!fs.existsSync(target))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(target,'utf8');
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
  `if(!document.getElementById('tunewrapStage1284CorporateClose')){
  const stage1284=document.createElement('link');
  stage1284.id='tunewrapStage1284CorporateClose';
  stage1284.rel='stylesheet';
  stage1284.href='/css/stage-12.8.4-corporate-card-close.css?v=12.8.4';
  document.head.append(stage1284);
}

if(!document.getElementById('tunewrapStoryCategoryStyles')){`,
  'Stage 12.8.4 stylesheet'
);

bootstrap=replaceOnce(
  bootstrap,
  `  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();`,
  `  try{
    await import('./stage-12.8.4-corporate-card-close.js');
  }catch(error){
    console.error('TuneWrap Stage 12.8.4 corporate card close failed',error);
  }

  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();`,
  'Stage 12.8.4 runtime'
);

fs.writeFileSync(file('js/app-bootstrap.js'),bootstrap,'utf8');

const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['corpclose:test']='node scripts/stage-12.8.4-corporate-card-close-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('corpclose:test')){
  pkg.scripts.test += ' && npm run corpclose:test';
}
fs.writeFileSync(file('package.json'),JSON.stringify(pkg,null,2)+'\n','utf8');

console.log('PASS: Stage 12.8.4 Corporate Card Close installed.');
console.log('Corporate close moved from the left topbar onto the card at top-right.');
console.log('Existing corporate close behavior remains unchanged.');
console.log('Phone uses a circular X at the card top-right.');
console.log('D1 migration is not required.');
