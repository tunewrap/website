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
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);
  return text.replace(needle,replacement);
}

let bootstrap=read('js/app-bootstrap.js');

// Load after Stage 12.8.2 so this UI placement layer has final CSS priority.
bootstrap=replaceOnce(
  bootstrap,
  "if(!document.getElementById('tunewrapStoryCategoryStyles')){",
  `if(!document.getElementById('tunewrapStage1283RightClose')){
  const stage1283=document.createElement('link');
  stage1283.id='tunewrapStage1283RightClose';
  stage1283.rel='stylesheet';
  stage1283.href='/css/stage-12.8.3-right-close-ux.css?v=12.8.3';
  document.head.append(stage1283);
}

if(!document.getElementById('tunewrapStoryCategoryStyles')){`,
  'Stage 12.8.3 stylesheet'
);

// Load after Stage 12.8.1 close-control runtime.
// It repositions/relabels existing controls and leaves the original owners intact.
bootstrap=replaceOnce(
  bootstrap,
  `  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();`,
  `  try{
    await import('./stage-12.8.3-right-close-ux.js');
  }catch(error){
    console.error('TuneWrap Stage 12.8.3 right-side close UX failed',error);
  }

  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();`,
  'Stage 12.8.3 runtime'
);

fs.writeFileSync(file('js/app-bootstrap.js'),bootstrap,'utf8');

const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['closeux:test']='node scripts/stage-12.8.3-right-close-ux-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('closeux:test')){
  pkg.scripts.test += ' && npm run closeux:test';
}
fs.writeFileSync(file('package.json'),JSON.stringify(pkg,null,2)+'\n','utf8');

console.log('PASS: Stage 12.8.3 Right-side Close UX installed.');
console.log('Questionnaire close is now inside the order card at top-right.');
console.log('Stories and Author libraries now use an explicit X/Close control at top-right.');
console.log('Existing form/library close behavior remains the owner; only placement and affordance changed.');
console.log('D1 migration is not required.');
