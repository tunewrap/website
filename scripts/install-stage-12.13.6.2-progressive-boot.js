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

/* ---------------------------------------------------------
   INDEX.HTML
   1) Remove Stage 12.13.6.1's large preload waterfall.
      It made cold start worse by competing with the real critical requests.
   2) Put the branded loader directly in HTML, so first paint is never blank.
   --------------------------------------------------------- */
let html=read('index.html');

const preloadStart=html.indexOf('<!-- Stage 12.13.6.1: preload current runtime assets in parallel; execution order is unchanged. -->');
if(preloadStart>=0){
  const preloadEndMarker='<link rel="modulepreload" href="/js/stage-12.11-contact-channel-selector.js">';
  const markerAt=html.indexOf(preloadEndMarker,preloadStart);
  if(markerAt<0)throw new Error('Stage 12.13.6.2: preload end marker not found.');
  const preloadEnd=markerAt+preloadEndMarker.length;
  html=html.slice(0,preloadStart)+html.slice(preloadEnd).replace(/^\r?\n/,'');
}

/* A failed app-bootstrap should never leave a black page for ten seconds. */
html=html.replace('},10000);','},4000);');

if(!html.includes('id="tunewrapBootSplash"')){
  const bodyAnchor='<body>';
  const splash=`<body>
<div class="catalog-bootstrap" id="tunewrapBootSplash" role="status" aria-live="polite">
  <strong class="catalog-bootstrap-brand">Tune<span>Wrap</span></strong>
  <span class="catalog-bootstrap-mark" aria-hidden="true"></span>
  <span class="catalog-bootstrap-copy"></span>
</div>`;
  if(!html.includes(bodyAnchor))throw new Error('Stage 12.13.6.2: <body> anchor not found.');
  html=html.replace(bodyAnchor,splash);
}

write('index.html',html);

/* ---------------------------------------------------------
   APP-BOOTSTRAP.JS
   Reuse the immediate HTML splash instead of creating a second one.
   --------------------------------------------------------- */
let bootstrap=read('js/app-bootstrap.js');

const oldLoader=`const loading = document.createElement('div');
loading.className = 'catalog-bootstrap';
loading.innerHTML = '<strong class="catalog-bootstrap-brand">Tune<span>Wrap</span></strong><span class="catalog-bootstrap-mark" aria-hidden="true"></span><span class="catalog-bootstrap-copy">'+tuneWrapBootCopy.loading+'</span>';
document.body.append(loading);`;

const newLoader=`const loading = document.getElementById('tunewrapBootSplash') || document.createElement('div');
if(!loading.id)loading.id='tunewrapBootSplash';
loading.className='catalog-bootstrap';
if(!loading.parentNode){
  loading.innerHTML='<strong class="catalog-bootstrap-brand">Tune<span>Wrap</span></strong><span class="catalog-bootstrap-mark" aria-hidden="true"></span><span class="catalog-bootstrap-copy"></span>';
  document.body.append(loading);
}
const bootCopyNode=loading.querySelector('.catalog-bootstrap-copy');
if(bootCopyNode)bootCopyNode.textContent=tuneWrapBootCopy.loading;

let tuneWrapBootReleased=false;
function releaseTuneWrapBoot(){
  if(tuneWrapBootReleased)return;
  tuneWrapBootReleased=true;

  if(window.TUNEWRAP_BOOT_GUARD_TIMER){
    clearTimeout(window.TUNEWRAP_BOOT_GUARD_TIMER);
    window.TUNEWRAP_BOOT_GUARD_TIMER=null;
  }

  document.documentElement.classList.remove('tw-boot-pending');
  requestAnimationFrame(()=>{
    loading.classList.add('is-leaving');
    window.setTimeout(()=>loading.remove(),180);
  });
}`;

if(!bootstrap.includes(newLoader)){
  if(!bootstrap.includes(oldLoader))throw new Error('Stage 12.13.6.2: Stage 12.13.6.1 loader block not found.');
  bootstrap=bootstrap.replace(oldLoader,newLoader);
}

/* ---------------------------------------------------------
   CRITICAL BOOT
   Only Track Catalog + core rendering + responsive/player must block first UI.
   Pricing, Site CMS, Sound, order helpers, certificate and UX hotfix modules
   continue after the user can already see/interact with the site.
   --------------------------------------------------------- */
const oldCore=`  await import('./catalog-runtime.js');
  await import('./script.js');

  await import('./wide-copy-polish.js');
  await import('./wedding-detail-wide.js');`;

const newCore=`  await import('./catalog-runtime.js');
  await import('./script.js');

  // Critical interaction/presentation layer. Once these are ready, the
  // customer can already use the visible TuneWrap page.
  await import('./responsive-wide.js');
  await import('./playback-engine.js');

  releaseTuneWrapBoot();

  // Everything below enhances lower sections / forms and must not hold the
  // first screen hostage on a cold network.
  try{
    await import('./wide-copy-polish.js');
  }catch(error){
    console.error('TuneWrap wide copy polish failed',error);
  }
  try{
    await import('./wedding-detail-wide.js');
  }catch(error){
    console.error('TuneWrap wedding detail wide failed',error);
  }`;

if(!bootstrap.includes(newCore)){
  if(!bootstrap.includes(oldCore))throw new Error('Stage 12.13.6.2: core import anchor not found.');
  bootstrap=bootstrap.replace(oldCore,newCore);
}

/* Remove the old duplicate critical imports from the later optional section. */
const duplicate=`  await import('./responsive-wide.js');
  await import('./playback-engine.js');

`;
const firstCritical=bootstrap.indexOf("// Critical interaction/presentation layer.");
const duplicateAt=bootstrap.indexOf(duplicate,firstCritical+1);
if(duplicateAt>=0){
  bootstrap=bootstrap.slice(0,duplicateAt)+bootstrap.slice(duplicateAt+duplicate.length);
}

/* The old final reveal block is no longer the first reveal. Keep a no-op-safe call. */
const oldFinal=`  if(window.TUNEWRAP_BOOT_GUARD_TIMER){
    clearTimeout(window.TUNEWRAP_BOOT_GUARD_TIMER);
    window.TUNEWRAP_BOOT_GUARD_TIMER=null;
  }

  // Reveal the completed page underneath first, then fade the loader away.
  // This guarantees there is never an empty black frame between loading and UI.
  document.documentElement.classList.remove('tw-boot-pending');
  requestAnimationFrame(()=>{
    loading.classList.add('is-leaving');
    window.setTimeout(()=>loading.remove(),180);
  });`;

if(bootstrap.includes(oldFinal)){
  bootstrap=bootstrap.replace(oldFinal,'  releaseTuneWrapBoot();');
}

/* Error flow: if failure happens after early reveal, do not resurrect a removed loader. */
const oldCatch=`}catch(error){
  console.error('TuneWrap catalog bootstrap failed',error);
  loading.classList.add('is-error');
  loading.innerHTML = '<strong>'+tuneWrapBootCopy.error+'</strong><span>'+tuneWrapBootCopy.retry+'</span><button type="button">'+tuneWrapBootCopy.button+'</button>';
  loading.querySelector('button').addEventListener('click',() => location.reload());
}`;

const newCatch=`}catch(error){
  console.error('TuneWrap catalog bootstrap failed',error);

  if(tuneWrapBootReleased){
    // Core UI is already visible. Do not cover it again because a secondary
    // enhancement failed after first paint.
    return;
  }

  loading.classList.add('is-error');
  loading.innerHTML = '<strong>'+tuneWrapBootCopy.error+'</strong><span>'+tuneWrapBootCopy.retry+'</span><button type="button">'+tuneWrapBootCopy.button+'</button>';
  loading.querySelector('button').addEventListener('click',() => location.reload());
}`;

if(!bootstrap.includes(newCatch)){
  if(!bootstrap.includes(oldCatch))throw new Error('Stage 12.13.6.2: catch block anchor not found.');
  bootstrap=bootstrap.replace(oldCatch,newCatch);
}

write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');

/* ---------------------------------------------------------
   TEST REGISTRATION
   --------------------------------------------------------- */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['progressiveboot:test']='node scripts/stage-12.13.6.2-progressive-boot-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('progressiveboot:test')){
  pkg.scripts.test += ' && npm run progressiveboot:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.6.2 Progressive Fast Boot installed.');
console.log('Removed aggressive all-site preload waterfall.');
console.log('Only critical catalog/render/responsive/player work blocks the first screen.');
console.log('Secondary CMS/forms/features continue after the site is already visible.');
console.log('D1 migration: not required.');
