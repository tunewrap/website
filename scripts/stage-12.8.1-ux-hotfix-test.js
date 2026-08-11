#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const runtime=read('js/stage-12.8.1-ux-hotfix.js');
const css=read('css/stage-12.8.1-ux-hotfix.css');
const bootstrap=read('js/app-bootstrap.js');
const gift=read('js/gift-certificate-overlay.js');
const player=read('js/playback-engine.js');
const pkg=JSON.parse(read('package.json'));

assert.match(runtime,/storyOrderClose/);
assert.match(runtime,/storyPathBack/);
assert.match(runtime,/topMiniStop/);
assert.match(runtime,/closeOrderForm/);
assert.match(runtime,/tunewrap:languagechange/);

assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
assert.match(css,/overflow:hidden!important/);
assert.match(css,/@media\(max-width:620px\)/);
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
assert.match(css,/story-order-close-bar/);
assert.match(css,/#topMiniStop\[data-explicit-close="true"\]/);
assert.match(css,/@media\(max-height:560px\)/);

assert.match(bootstrap,/stage-12\.8\.1-ux-hotfix\.css\?v=12\.8\.1/);
assert.match(bootstrap,/import\('\.\/stage-12\.8\.1-ux-hotfix\.js'\)/);

// Existing behavior remains the owner.
assert.match(gift,/data-story-path="certificate"/);
assert.match(player,/captureClick\(miniStop,stopPlayback\)/);

// No player/audio replacement in the hotfix.
assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/stopPlayback\s*=/);
assert.doesNotMatch(runtime,/MutationObserver/);

assert.equal(pkg.scripts['ux1281:test'],'node scripts/stage-12.8.1-ux-hotfix-test.js');
assert.match(pkg.scripts.test,/ux1281:test/);

console.log('PASS: Stage 12.8.1 — compact six-offer certificate, responsive mobile layout, explicit order-form close and visible Mini Player close.');
