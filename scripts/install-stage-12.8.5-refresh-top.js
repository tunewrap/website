#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'js','app-bootstrap.js');
const packagePath=path.join(root,'package.json');
if(!fs.existsSync(target))throw new Error('Missing js/app-bootstrap.js');
if(!fs.existsSync(packagePath))throw new Error('Missing package.json');
let bootstrap=fs.readFileSync(target,'utf8');
const marker='/* Stage 12.8.5 — desktop refresh starts at top */';
const block=`${marker}
(function(){
  try{
    const navEntry=performance.getEntriesByType?.('navigation')?.[0];
    const isReload=navEntry?.type==='reload';
    const isWide=window.matchMedia?.('(min-width:621px)').matches;
    if(!isReload||!isWide)return;
    const previousRestoration=('scrollRestoration' in history)?history.scrollRestoration:null;
    if(previousRestoration!==null)history.scrollRestoration='manual';
    if(location.hash){history.replaceState(history.state,'',location.pathname+location.search);}
    const resetToTop=()=>{
      window.scrollTo({top:0,left:0,behavior:'auto'});
      const app=document.getElementById('appScroll');
      if(app)app.scrollTop=0;
    };
    resetToTop();
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',()=>{
        resetToTop();
        requestAnimationFrame(()=>requestAnimationFrame(resetToTop));
      },{once:true});
    }else{
      requestAnimationFrame(()=>requestAnimationFrame(resetToTop));
    }
    window.addEventListener('load',()=>{
      resetToTop();
      setTimeout(resetToTop,0);
      setTimeout(resetToTop,120);
      setTimeout(()=>{if(previousRestoration!==null)history.scrollRestoration=previousRestoration;},700);
    },{once:true});
  }catch(error){console.error('TuneWrap Stage 12.8.5 refresh-top failed',error);}
})();

`;
if(!bootstrap.includes(marker)){
  bootstrap=block+bootstrap;
  fs.writeFileSync(target,bootstrap,'utf8');
}
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
pkg.scripts ||= {};
pkg.scripts['refreshtop:test']='node scripts/stage-12.8.5-refresh-top-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('refreshtop:test'))pkg.scripts.test+=' && npm run refreshtop:test';
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');
console.log('PASS: Stage 12.8.5 Desktop Refresh Starts Top installed.');
console.log('Desktop/tablet reload now clears the stale section hash/scroll and opens TuneWrap from the beginning.');
console.log('Phone behavior is untouched.');
console.log('D1 migration is not required.');
