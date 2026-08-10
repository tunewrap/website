#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const playbackPath=path.join(root,'js','playback-engine.js');
const uxPath=path.join(root,'js','ux-critical-fixes.js');

function read(file){
  if(!fs.existsSync(file)) throw new Error(`Missing file: ${path.relative(root,file)}`);
  return fs.readFileSync(file,'utf8');
}
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement)) return text;
  const count=text.split(needle).length-1;
  if(count!==1) throw new Error(`${label}: expected 1 patch target, found ${count}`);
  return text.replace(needle,replacement);
}

let playback=read(playbackPath);
let ux=read(uxPath);

// 1) Replace the diagnostic seek bridge with a direct browser seek.
// The previous bridge delegated to commitSeek(), which can wait for buffering/fallback fetch.
// For the Mini Player this made the thumb snap back before the audible position changed.
const oldSeek=`      seekTo:time => {
        const target=Number(time);
        if(!currentItem || !Number.isFinite(target))return false;
        seekToken += 1;
        commitSeek(target,seekToken,!audio.paused);
        return true;
      },
      getDuration:mediaDuration,`;

const newSeek=`      seekTo:time => {
        const target=Number(time);
        const total=mediaDuration();
        if(!currentItem || !Number.isFinite(target) || !(total>0))return false;
        const requested=Math.max(0,Math.min(total,target));
        seekToken += 1;
        userSeeking=false;
        pendingSeekTime=null;
        resumeAfterSeek=false;
        try{
          if(typeof audio.fastSeek==='function') audio.fastSeek(requested);
          else audio.currentTime=requested;
          updateTimeline(true);
          return true;
        }catch(error){
          const operation=seekToken;
          commitSeek(requested,operation,!audio.paused && !audio.ended);
          return true;
        }
      },
      getDuration:mediaDuration,`;

playback=replaceOnce(playback,oldSeek,newSeek,'playback-engine direct seek');

// 2) Stop mirroring Mini Player through the hidden Full Player slider.
// Commit the Mini range value directly to the single playback engine API.
const mirrorStart=`    let dragging=false;
    const fullSeek=document.getElementById('songPlayerSeek');

    function paint(){`;

const directStart=`    let dragging=false;

    function paint(){`;

ux=replaceOnce(ux,mirrorStart,directStart,'ux remove hidden full seek bridge');

const oldHandlers=`    function mirrorIntoFullSeek(type){
      const value=Number(seek.value)||0;
      if(fullSeek){
        fullSeek.value=String(value);
        fullSeek.dispatchEvent(new Event(type,{bubbles:false,cancelable:true}));
        return true;
      }
      if(type==='change'){
        window.__tuneWrapPlayback?.seekTo?.(value);
        return true;
      }
      return false;
    }

    function beginMiniSeek(){
      dragging=true;
    }

    function previewMiniSeek(){
      dragging=true;
      mirrorIntoFullSeek('input');
      paint();
    }

    function commitMiniSeek(){
      if(!dragging)return;
      mirrorIntoFullSeek('change');
      dragging=false;
      window.setTimeout(paint,0);
    }

    seek.addEventListener('pointerdown',beginMiniSeek);
    seek.addEventListener('input',previewMiniSeek);
    seek.addEventListener('change',commitMiniSeek);
    seek.addEventListener('pointerup',commitMiniSeek);
    seek.addEventListener('pointercancel',()=>{
      commitMiniSeek();
      dragging=false;
      paint();
    });
    seek.addEventListener('keyup',event=>{
      if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key)){
        dragging=true;
        mirrorIntoFullSeek('input');
        mirrorIntoFullSeek('change');
        dragging=false;
        paint();
      }
    });`;

const newHandlers=`    function beginMiniSeek(){
      dragging=true;
    }

    function previewMiniSeek(){
      dragging=true;
      paint();
    }

    function commitMiniSeek(){
      if(!dragging)return;
      const value=Number(seek.value)||0;
      const applied=window.__tuneWrapPlayback?.seekTo?.(value);
      if(applied===false)return;
      dragging=false;
      window.requestAnimationFrame(paint);
    }

    seek.addEventListener('pointerdown',beginMiniSeek);
    seek.addEventListener('input',previewMiniSeek);
    seek.addEventListener('change',commitMiniSeek);
    seek.addEventListener('pointerup',commitMiniSeek);
    seek.addEventListener('pointercancel',()=>{
      dragging=false;
      paint();
    });
    seek.addEventListener('keyup',event=>{
      if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key)){
        dragging=true;
        commitMiniSeek();
      }
    });`;

ux=replaceOnce(ux,oldHandlers,newHandlers,'ux direct mini seek handlers');

const assertions=[
  [playback,"if(typeof audio.fastSeek==='function') audio.fastSeek(requested);",'fastSeek bridge'],
  [playback,'else audio.currentTime=requested;','currentTime bridge'],
  [ux,"window.__tuneWrapPlayback?.seekTo?.(value)",'direct mini seek call']
];
for(const [text,needle,label] of assertions){
  if(!text.includes(needle)) throw new Error(`Validation failed: ${label}`);
}
if(ux.includes("const fullSeek=document.getElementById('songPlayerSeek')")){
  throw new Error('Validation failed: hidden Full Player seek bridge still present');
}

fs.writeFileSync(playbackPath,playback,'utf8');
fs.writeFileSync(uxPath,ux,'utf8');

console.log('PASS: Stage 12.4.2 direct Mini Seek fix installed.');
console.log('Modified: js/playback-engine.js, js/ux-critical-fixes.js');
console.log('Mini Player now commits directly to the persistent audio engine.');
