#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const css=read('css/stage-12.13.5-mobile-library-2col.css');
const bootstrap=read('js/app-bootstrap.js');
const catalog=read('js/catalog-runtime.js');
const player=read('js/playback-engine.js');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/app-bootstrap.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.ok(css.includes('@media (max-width:620px)'));
assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'));
assert.ok(css.includes('.music-library-panel .track,'));
assert.ok(css.includes('.music-library-panel .author-card'));
assert.ok(css.includes('aspect-ratio:1 / 1'));
assert.ok(css.includes('.music-library-panel .play-btn'));
assert.ok(css.includes('top:13px!important'));

assert.ok(bootstrap.includes('/css/stage-12.13.5-mobile-library-2col.css?v=12.13.5'));

/* Runtime still builds the same Stories/Author cards. */
assert.ok(catalog.includes("section === 'author' ? 'author-grid music-library-card-list music-library-author-list' : 'tracks music-library-card-list music-library-story-list'"));

/* Quick play stays quick-play; card/full-player behavior is untouched. */
assert.ok(player.includes("const button = event.target.closest('.play-btn[data-track]');"));
assert.ok(player.includes("selectTrack(item.name,{autoplay:true,reason:'library-play'})"));

assert.equal(pkg.scripts['mobilelibrary2col:test'],'node scripts/stage-12.13.5-mobile-library-2col-test.js');
assert.ok(pkg.scripts.test.includes('mobilelibrary2col:test'));

console.log('PASS: Stage 12.13.5 — mobile music libraries render as a 2-column premium card grid.');
