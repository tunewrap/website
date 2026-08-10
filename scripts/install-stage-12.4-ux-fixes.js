#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const files={
  bootstrap:path.join(root,'js','app-bootstrap.js'),
  core:path.join(root,'js','script.js'),
  pricing:path.join(root,'js','pricing-cms-runtime.js'),
  playback:path.join(root,'js','playback-engine.js')
};

function read(file){
  if(!fs.existsSync(file))throw new Error(`Missing required file: ${path.relative(root,file)}`);
  return fs.readFileSync(file,'utf8');
}
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 patch target, found ${count}`);
  return text.replace(needle,replacement);
}

let bootstrap=read(files.bootstrap);
let core=read(files.core);
let pricing=read(files.pricing);
let playback=read(files.playback);

// A. Load the UX runtime after the persistent playback engine.
const bootstrapNeedle="  await import('./playback-engine.js');";
const bootstrapReplacement=`  await import('./playback-engine.js');

  try{
    await import('./ux-critical-fixes.js');
  }catch(error){
    console.error('TuneWrap Stage 12.4 UX runtime failed',error);
  }`;
bootstrap=replaceOnce(
  bootstrap,
  bootstrapNeedle,
  bootstrapReplacement,
  'app-bootstrap.js'
);

// B. Increase style mix limit from 2 to 5.
if(!core.includes('selectedStyles.length < 5')){
  const count=(core.match(/selectedStyles\.length\s*<\s*2/g)||[]).length;
  if(count!==1)throw new Error(`script.js style limit: expected 1 "< 2" target, found ${count}`);
  core=core.replace(/selectedStyles\.length\s*<\s*2/,'selectedStyles.length < 5');
}

// C. Allow the new package selector inside the form to update the original private Stage 9 tier state.
const coreEventNeedle="  document.addEventListener('tunewrap:reset-order-selection',resetOrderSelection);";
const coreEventReplacement=`  document.addEventListener('tunewrap:reset-order-selection',resetOrderSelection);
  document.addEventListener('tunewrap:set-order-tier',event => {
    const index=Number(event.detail?.index);
    if(Number.isInteger(index) && index >= 0 && index < TIERS[currentLang].length){
      applySelectedTier(index);
    }
  });`;
core=replaceOnce(
  core,
  coreEventNeedle,
  coreEventReplacement,
  'script.js tier selection bridge'
);

// D. Expose a safe Pricing CMS setter so direct form selection keeps the final CMS price.
const pricingNeedle=`  window.__tuneWrapPricing={
    config,refresh:schedule,getSelected:()=>state.selected,
    getSelectedOffer:selectedOffer,getTotal:()=>totalFor(selectedOffer())
  };`;
const pricingReplacement=`  window.__tuneWrapPricing={
    config,
    refresh:schedule,
    getSelected:()=>state.selected,
    getSelectedOffer:selectedOffer,
    getTotal:()=>totalFor(selectedOffer()),
    selectTier:index=>{
      const numeric=Number(index);
      const offer=tierByIndex(numeric);
      if(!offer || offer.enabled===false)return false;
      state.selected={type:'tier',index:numeric};
      patchOrderSummary();
      return true;
    }
  };`;
pricing=replaceOnce(
  pricing,
  pricingNeedle,
  pricingReplacement,
  'pricing-cms-runtime.js public setter'
);

// E. Expose the existing robust seek pipeline to the mini-player slider.
const playbackNeedle=`      next:() => advance(1,'diagnostic'),
      previous:() => advance(-1,'diagnostic')
    });`;
const playbackReplacement=`      next:() => advance(1,'diagnostic'),
      previous:() => advance(-1,'diagnostic'),
      seekTo:time => {
        const target=Number(time);
        if(!currentItem || !Number.isFinite(target))return false;
        seekToken += 1;
        commitSeek(target,seekToken,!audio.paused);
        return true;
      },
      getDuration:mediaDuration,
      getCurrentTime:() => Number(audio.currentTime) || 0
    });`;
playback=replaceOnce(
  playback,
  playbackNeedle,
  playbackReplacement,
  'playback-engine.js seek bridge'
);

// Validate every patch before writing anything.
const checks=[
  [bootstrap,"import('./ux-critical-fixes.js')",'bootstrap import'],
  [core,'selectedStyles.length < 5','five-style limit'],
  [core,"tunewrap:set-order-tier",'tier selection event'],
  [pricing,'selectTier:index=>','Pricing CMS tier setter'],
  [playback,'seekTo:time =>','mini-player seek bridge']
];
for(const [text,needle,label] of checks){
  if(!text.includes(needle))throw new Error(`Validation failed: ${label}`);
}

fs.writeFileSync(files.bootstrap,bootstrap,'utf8');
fs.writeFileSync(files.core,core,'utf8');
fs.writeFileSync(files.pricing,pricing,'utf8');
fs.writeFileSync(files.playback,playback,'utf8');

console.log('PASS: Stage 12.4 installer applied critical UX bridges.');
console.log('Modified: js/app-bootstrap.js, js/script.js, js/pricing-cms-runtime.js, js/playback-engine.js');
console.log('New runtime/CSS are supplied by the ZIP.');
