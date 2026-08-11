#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const player=read('js/playback-engine.js');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/playback-engine.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

const featuredStart=player.indexOf("const featured = event.target.closest('[data-featured-track]');");
assert.ok(featuredStart>=0,'Featured handler missing');

const featuredEnd=player.indexOf("const ribbon = event.target.closest('[data-start-track]');",featuredStart);
assert.ok(featuredEnd>featuredStart,'Featured handler end missing');

const featuredBlock=player.slice(featuredStart,featuredEnd);

assert.ok(featuredBlock.includes("reason:'featured-play'"));
assert.ok(featuredBlock.includes('if(currentItem === item) toggleCurrent();'));
assert.ok(featuredBlock.includes('syncMiniPlayer();'));
assert.ok(featuredBlock.includes('restoreFocus = featured;'));
assert.equal(featuredBlock.includes('openPlayer('),false,'Featured must not auto-open Full Player');

/* Keep explicit Full Player routes intact. */
assert.ok(player.includes("captureClick(miniExpand,() => {"));
assert.ok(player.includes("if(currentItem) openPlayer(currentItem,miniExpand,false);"));

/* Keep library card detail behavior intact. */
const cardStart=player.indexOf("const card = event.target.closest('.track[data-track-id],.author-card[data-track-id]');");
assert.ok(cardStart>=0);
const cardBlock=player.slice(cardStart,cardStart+700);
assert.ok(cardBlock.includes('openPlayer(item,card,true);'));

/* Both homepage sections use the same generic featured selector. */
assert.ok(player.includes("document.querySelectorAll('[data-featured-track]')"));

assert.equal(pkg.scripts['featuredplay:test'],'node scripts/stage-12.13.4-featured-play-test.js');
assert.ok(pkg.scripts.test.includes('featuredplay:test'));

console.log('PASS: Stage 12.13.4 — Featured Story/Author play in place without forcing Full Player.');
