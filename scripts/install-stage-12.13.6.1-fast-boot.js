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

['index.html','js/app-bootstrap.js','css/style.css','package.json'].forEach(read);

let html=read('index.html');

/* ---------------------------------------------------------
   1. PRELOAD THE EXISTING BOOT WATERFALL
   Keep execution order exactly as-is. We only download the resources early
   and in parallel so sequential `await import()` calls resolve from cache.
   --------------------------------------------------------- */
if(!html.includes('id="tunewrapFastBootPreloads"')){
  const anchor='<link rel="stylesheet" href="css/style.css">';
  if(!html.includes(anchor))throw new Error('Stage 12.13.6.1: main stylesheet anchor not found.');

  const modulePreloads=[
    'catalog-runtime.js',
    'script.js',
    'wide-copy-polish.js',
    'wedding-detail-wide.js',
    'pricing-cms-runtime.js',
    'gift-certificate-overlay.js',
    'site-cms-runtime.js',
    'sound-preferences-runtime.js',
    'order-intake-completion.js',
    'orders-submit.js',
    'responsive-wide.js',
    'playback-engine.js',
    'ux-critical-fixes.js',
    'stage-12.8.1-ux-hotfix.js',
    'stage-12.8.3-right-close-ux.js',
    'stage-12.8.4-corporate-card-close.js',
    'stage-12.10-package-ui-polish.js',
    'stage-12.11-contact-channel-selector.js'
  ];

  const stylePreloads=[
    'responsive-wide.css?v=12.2',
    'gift-certificate-overlay.css?v=12.8',
    'stage-12.8.1-ux-hotfix.css?v=12.8.1',
    'stage-12.8.2-certificate-fit.css?v=12.8.2',
    'stage-12.8.3-right-close-ux.css?v=12.8.3',
    'stage-12.8.4-corporate-card-close.css?v=12.8.4',
    'stage-12.10-package-ui-polish.css?v=12.10',
    'stage-12.10.4-compact-desktop-package-chooser.css?v=12.10.4',
    'stage-12.11-contact-channel-selector.css?v=12.11',
    'stage-12.12-site-polish.css?v=12.12',
    'stage-12.12.2-announcement-position.css?v=12.12.2',
    'story-categories.css?v=12.7',
    'order-intake-completion.css?v=12.6',
    'site-cms.css?v=12.3',
    'stage-12.13.3-home-logo-link.css?v=12.13.3',
    'stage-12.13.5-mobile-library-2col.css?v=12.13.5'
  ];

  const lines=[
    '<!-- Stage 12.13.6.1: preload current runtime assets in parallel; execution order is unchanged. -->',
    '<meta id="tunewrapFastBootPreloads" name="tunewrap-fast-boot" content="12.13.6.1">',
    ...stylePreloads.map(href=>`<link rel="preload" as="style" href="/css/${href}">`),
    ...modulePreloads.map(src=>`<link rel="modulepreload" href="/js/${src}">`)
  ].join('\n');

  html=html.replace(anchor,anchor+'\n'+lines);
}
write('index.html',html);

/* ---------------------------------------------------------
   2. BRANDED LOADER + SEAMLESS REVEAL
   The previous guard was correct about hiding the stale fallback, but the
   last transition could feel like a black pause. Keep a visible branded
   loader until the final UI is ready, then fade it over an already revealed
   page.
   --------------------------------------------------------- */
let bootstrap=read('js/app-bootstrap.js');

const oldMarkup=`loading.innerHTML = '<span class="catalog-bootstrap-mark" aria-hidden="true"></span><span>'+tuneWrapBootCopy.loading+'</span>';`;
const newMarkup=`loading.innerHTML = '<strong class="catalog-bootstrap-brand">Tune<span>Wrap</span></strong><span class="catalog-bootstrap-mark" aria-hidden="true"></span><span class="catalog-bootstrap-copy">'+tuneWrapBootCopy.loading+'</span>';`;

if(!bootstrap.includes(newMarkup)){
  if(!bootstrap.includes(oldMarkup))throw new Error('Stage 12.13.6.1: loader markup anchor not found.');
  bootstrap=bootstrap.replace(oldMarkup,newMarkup);
}

const oldReveal=`  document.documentElement.classList.remove('tw-boot-pending');
  loading.remove();`;

const newReveal=`  // Reveal the completed page underneath first, then fade the loader away.
  // This guarantees there is never an empty black frame between loading and UI.
  document.documentElement.classList.remove('tw-boot-pending');
  requestAnimationFrame(()=>{
    loading.classList.add('is-leaving');
    window.setTimeout(()=>loading.remove(),180);
  });`;

if(!bootstrap.includes(newReveal)){
  if(!bootstrap.includes(oldReveal))throw new Error('Stage 12.13.6.1: reveal anchor not found.');
  bootstrap=bootstrap.replace(oldReveal,newReveal);
}

write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');

/* ---------------------------------------------------------
   3. LOADER VISUALS
   --------------------------------------------------------- */
let style=read('css/style.css');

if(!style.includes('/* Stage 12.13.6.1 — Fast seamless boot */')){
  style += `

/* Stage 12.13.6.1 — Fast seamless boot */
.catalog-bootstrap{
  gap:11px;
  padding:24px;
  opacity:1;
  transition:opacity .18s ease;
}
.catalog-bootstrap-brand{
  display:block;
  margin-bottom:4px;
  color:#f6f0e5;
  font-family:'Fraunces',Georgia,serif;
  font-size:clamp(28px,5vw,38px);
  font-weight:600;
  letter-spacing:-.025em;
}
.catalog-bootstrap-brand span{
  color:#d9a441;
}
.catalog-bootstrap-copy{
  display:block;
  min-width:min(290px,78vw);
  color:#aaa4a9;
  font:600 12px/1.45 'Manrope',Inter,system-ui,sans-serif;
  letter-spacing:.02em;
}
.catalog-bootstrap.is-leaving{
  opacity:0;
  pointer-events:none;
}
@media(max-width:620px){
  .catalog-bootstrap{
    padding:20px;
  }
  .catalog-bootstrap-brand{
    font-size:30px;
  }
  .catalog-bootstrap-copy{
    min-width:min(250px,74vw);
    font-size:11px;
  }
}
`;
}
write('css/style.css',style);

/* ---------------------------------------------------------
   4. TEST REGISTRATION
   --------------------------------------------------------- */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['fastboot:test']='node scripts/stage-12.13.6.1-fast-boot-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('fastboot:test')){
  pkg.scripts.test += ' && npm run fastboot:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.6.1 Fast Seamless Boot installed.');
console.log('Runtime JS/CSS is now preloaded in parallel without changing execution order.');
console.log('Loader remains visibly branded until the final UI is ready, then fades directly into the site.');
console.log('D1 migration: not required.');
