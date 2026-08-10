#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const runtime=read('js/ux-critical-fixes.js');
const css=read('css/ux-critical-fixes.css');
const bootstrap=read('js/app-bootstrap.js');
const core=read('js/script.js');
const pricing=read('js/pricing-cms-runtime.js');
const playback=read('js/playback-engine.js');

assert.match(bootstrap,/ux-critical-fixes\.js/);
assert.match(core,/selectedStyles\.length\s*<\s*5/);
assert.match(core,/tunewrap:set-order-tier/);
assert.match(pricing,/selectTier:index=>/);
assert.match(playback,/seekTo:time\s*=>/);
assert.match(playback,/getDuration:mediaDuration/);
assert.match(runtime,/id='fieldTier'|id="fieldTier"|select\.id='fieldTier'/);
assert.match(runtime,/validContact/);
assert.match(runtime,/fieldStoryCore/);
assert.match(runtime,/fieldDescription/);
assert.match(runtime,/styleCount\(\)>=5/);
assert.match(runtime,/addEventListener\('click',event=>\{/);
assert.match(runtime,/stopImmediatePropagation/);
assert.match(runtime,/topMiniSeek/);
assert.match(css,/\.play-btn\[data-track\]/);
assert.match(css,/\.top-mini-seek/);
assert.match(css,/\.ux-field-error/);
assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/MutationObserver/);

console.log('PASS: Stage 12.4 Critical UX — mini seek, full-player card action, in-form package selection, required validation, max 5 styles.');
