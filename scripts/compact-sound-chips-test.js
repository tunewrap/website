#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const runtime=read('js/sound-preferences-runtime.js');
const css=read('css/sound-preferences.css');

assert.doesNotMatch(runtime,/soundIconSvg/);
assert.doesNotMatch(runtime,/sound-icons\.js/);
assert.match(runtime,/button\.textContent=label\(item\)/);
assert.doesNotMatch(runtime,/sound-choice-icon/);
assert.match(css,/#styleChips,\s*#instrumentChips/);
assert.match(css,/flex-wrap:wrap!important/);
assert.match(css,/width:auto!important/);
assert.match(css,/aspect-ratio:auto!important/);
assert.match(css,/border-radius:999px!important/);
assert.match(css,/\.sound-choice-chip svg/);
assert.match(css,/display:none!important/);
assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/MutationObserver/);

console.log('PASS: Stage 12.5.1 Compact Sound Chips — public pictograms removed and compact text chips restored for styles and instruments.');
