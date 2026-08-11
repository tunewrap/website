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

let wide=read('js/responsive-wide.js');

const oldBlock=`      // The small play button stays a quick play/pause control.
      // Clicking the artwork/card opens the complete story player.
      if(event.target.closest('.play-btn[data-track]')){
        afterEngine(syncWideMini);
        return;
      }

      afterEngine(()=>{
        syncWideMini();
        openWidePlayer();
      });`;

const newBlock=`      // Homepage Featured Story / Featured Author are quick-play surfaces
      // on every viewport. They must never auto-open the Wide Full Player.
      if(origin.matches('[data-featured-track]')){
        afterEngine(syncWideMini);
        return;
      }

      // The small play button stays a quick play/pause control.
      // Library artwork/cards can still open the complete story player.
      if(event.target.closest('.play-btn[data-track]')){
        afterEngine(syncWideMini);
        return;
      }

      afterEngine(()=>{
        syncWideMini();
        openWidePlayer();
      });`;

if(!wide.includes(newBlock)){
  if(!wide.includes(oldBlock))throw new Error('Stage 12.13.4.1: responsive-wide click block anchor not found.');
  wide=wide.replace(oldBlock,newBlock);
}
write('js/responsive-wide.js',wide);
check('js/responsive-wide.js');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['widefeaturedplay:test']='node scripts/stage-12.13.4.1-wide-featured-play-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('widefeaturedplay:test')){
  pkg.scripts.test += ' && npm run widefeaturedplay:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.4.1 installed.');
console.log('Desktop/tablet Featured Story + Featured Author now stay in-page and only play/pause.');
console.log('Wide Mini Player still appears.');
console.log('Full Player still opens from Mini Player or library cards.');
console.log('D1 migration: not required.');
