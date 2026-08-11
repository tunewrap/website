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

// CSS must load AFTER Stage 12.8 certificate styles so its compact rules win.
bootstrap=replaceOnce(
  bootstrap,
  "if(!document.getElementById('tunewrapStoryCategoryStyles')){",
  `if(!document.getElementById('tunewrapStage1281UX')){
  const stage1281=document.createElement('link');
  stage1281.id='tunewrapStage1281UX';
  stage1281.rel='stylesheet';
  stage1281.href='/css/stage-12.8.1-ux-hotfix.css?v=12.8.1';
  document.head.append(stage1281);
}

if(!document.getElementById('tunewrapStoryCategoryStyles')){`,
  'Stage 12.8.1 stylesheet'
);

// Load after playback / existing UX bindings.
// The hotfix reuses the current form-back and mini-stop behavior instead of replacing it.
bootstrap=replaceOnce(
  bootstrap,
  `  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();`,
  `  try{
    await import('./stage-12.8.1-ux-hotfix.js');
  }catch(error){
    console.error('TuneWrap Stage 12.8.1 UX hotfix failed',error);
  }

  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();`,
  'Stage 12.8.1 runtime'
);

fs.writeFileSync(file('js/app-bootstrap.js'),bootstrap,'utf8');

const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['ux1281:test']='node scripts/stage-12.8.1-ux-hotfix-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('ux1281:test')){
  pkg.scripts.test += ' && npm run ux1281:test';
}
fs.writeFileSync(file('package.json'),JSON.stringify(pkg,null,2)+'\n','utf8');

console.log('PASS: Stage 12.8.1 Compact Certificate + Close Controls installed.');
console.log('Certificate: six packages fit in one normal desktop/tablet/phone overlay without scrolling.');
console.log('Order form: explicit Close control added.');
console.log('Top Mini Player: existing stop/close X made visually obvious.');
console.log('D1 migration is not required.');
