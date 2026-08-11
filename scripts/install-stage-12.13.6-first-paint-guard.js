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
  const out=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(out.status!==0)throw new Error(`Syntax check failed for ${rel}\n${out.stderr||out.stdout}`);
}

['index.html','js/app-bootstrap.js','package.json'].forEach(read);

let html=read('index.html');

if(!html.includes("document.documentElement.classList.add('tw-boot-pending');")){
  const anchor=`<script id="tunewrapLanguageBoot">
(function(){
  try{`;
  const replacement=`<script id="tunewrapLanguageBoot">
(function(){
  document.documentElement.classList.add('tw-boot-pending');

  window.TUNEWRAP_BOOT_GUARD_TIMER=setTimeout(function(){
    if(!document.querySelector('.catalog-bootstrap')){
      document.documentElement.classList.remove('tw-boot-pending');
    }
  },10000);

  try{`;
  if(!html.includes(anchor))throw new Error('Stage 12.13.6: language boot anchor not found.');
  html=html.replace(anchor,replacement);
}

if(!html.includes('id="tunewrapFirstPaintGuard"')){
  const anchor=`</script>
<link rel="preconnect" href="https://fonts.googleapis.com">`;
  const guard=`</script>
<style id="tunewrapFirstPaintGuard">
  html.tw-boot-pending,
  html.tw-boot-pending body{
    background:#070707!important;
  }

  html.tw-boot-pending body{
    visibility:hidden!important;
  }

  html.tw-boot-pending body > .catalog-bootstrap{
    visibility:visible!important;
  }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">`;
  if(!html.includes(anchor))throw new Error('Stage 12.13.6: head style anchor not found.');
  html=html.replace(anchor,guard);
}

write('index.html',html);

let bootstrap=read('js/app-bootstrap.js');

const oldSuccess=`  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();`;

const newSuccess=`  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));

  if(window.TUNEWRAP_BOOT_GUARD_TIMER){
    clearTimeout(window.TUNEWRAP_BOOT_GUARD_TIMER);
    window.TUNEWRAP_BOOT_GUARD_TIMER=null;
  }

  document.documentElement.classList.remove('tw-boot-pending');
  loading.remove();`;

if(!bootstrap.includes(newSuccess)){
  if(!bootstrap.includes(oldSuccess))throw new Error('Stage 12.13.6: bootstrap success anchor not found.');
  bootstrap=bootstrap.replace(oldSuccess,newSuccess);
}

write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['firstpaint:test']='node scripts/stage-12.13.6-first-paint-guard-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('firstpaint:test')){
  pkg.scripts.test += ' && npm run firstpaint:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.6 First Paint Guard installed.');
console.log('Cold visits now hide the static fallback until the canonical TuneWrap runtime is ready.');
console.log('D1 migration: not required.');
