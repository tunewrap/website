#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const wide=read('js/responsive-wide.js');
const player=read('js/playback-engine.js');
const pkg=JSON.parse(read('package.json'));

for(const rel of ['js/responsive-wide.js','js/playback-engine.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,rel)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${rel}\n${syntax.stderr||syntax.stdout}`);
}

const originAt=wide.indexOf("const origin=event.target.closest(");
assert.ok(originAt>=0);

const block=wide.slice(originAt,wide.indexOf("    audio.addEventListener('play'",originAt));
assert.ok(block.includes("if(origin.matches('[data-featured-track]'))"));
assert.ok(block.includes('afterEngine(syncWideMini);'));
assert.ok(block.includes('openWidePlayer();'));

const featuredGuard=block.indexOf("if(origin.matches('[data-featured-track]'))");
const wideOpen=block.indexOf('openWidePlayer();',featuredGuard);
const guardReturn=block.indexOf('return;',featuredGuard);
assert.ok(guardReturn>featuredGuard && guardReturn<wideOpen,
  'Featured guard must return before generic Wide Full Player open path.');

assert.ok(player.includes("reason:'featured-play'"));
const featuredPlayerStart=player.indexOf("const featured = event.target.closest('[data-featured-track]');");
const ribbonStart=player.indexOf("const ribbon = event.target.closest('[data-start-track]');",featuredPlayerStart);
const featuredPlayerBlock=player.slice(featuredPlayerStart,ribbonStart);
assert.equal(featuredPlayerBlock.includes('openPlayer('),false,
  'Playback engine itself must also keep Featured in-page.');

assert.ok(wide.includes("const miniOpen=event.target.closest('#topMiniExpand,.top-mini-player');"));
assert.ok(wide.includes('openWidePlayer();'));

assert.equal(pkg.scripts['widefeaturedplay:test'],'node scripts/stage-12.13.4.1-wide-featured-play-test.js');
assert.ok(pkg.scripts.test.includes('widefeaturedplay:test'));

console.log('PASS: Stage 12.13.4.1 — Featured tracks stay in-page on desktop/tablet as well as mobile.');
