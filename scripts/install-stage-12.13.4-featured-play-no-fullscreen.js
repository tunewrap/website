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
  const result=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Syntax check failed for ${rel}\n${result.stderr||result.stdout}`);
}

let player=read('js/playback-engine.js');

const oldFeatured=`      const featured = event.target.closest('[data-featured-track]');
      if(featured){
        const item = itemsByName.get(featured.dataset.featuredTrack);
        if(!item) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openPlayer(item,featured,true);
        return;
      }`;

const newFeatured=`      const featured = event.target.closest('[data-featured-track]');
      if(featured){
        const item = itemsByName.get(featured.dataset.featuredTrack);
        if(!item) return;
        event.preventDefault();
        event.stopImmediatePropagation();

        // Homepage Featured Story / Featured Author must behave like a normal
        // play surface. Starting playback must NOT cover the page with the
        // mobile Full Player. The Full Player remains available explicitly
        // through the Mini Player expand action.
        restoreFocus = featured;
        if(currentItem === item) toggleCurrent();
        else selectTrack(item.name,{autoplay:true,reason:'featured-play'});
        syncMiniPlayer();
        return;
      }`;

if(!player.includes(newFeatured)){
  if(!player.includes(oldFeatured)){
    throw new Error('Stage 12.13.4: featured playback handler anchor not found.');
  }
  player=player.replace(oldFeatured,newFeatured);
}

write('js/playback-engine.js',player);
check('js/playback-engine.js');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['featuredplay:test']='node scripts/stage-12.13.4-featured-play-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('featuredplay:test')){
  pkg.scripts.test += ' && npm run featuredplay:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.4 installed.');
console.log('Featured Story and Featured Author now play/pause in place.');
console.log('They no longer auto-open the mobile Full Player.');
console.log('Mini Player still appears and can be expanded manually.');
console.log('Library cards and explicit Mini Player expand behavior are unchanged.');
console.log('D1 migration: not required.');
