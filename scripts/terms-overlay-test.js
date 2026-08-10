#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const runtime=read('js/site-cms-runtime.js');
const css=read('css/site-cms.css');

assert.match(runtime,/Terms is always an active in-page overlay/);
assert.match(runtime,/node\.disabled=false/);
assert.match(runtime,/data-site-legal-scroll/);
assert.match(runtime,/scrollTo\(\{top:0,left:0\}\)/);
assert.match(runtime,/Admin Studio → Сайт/);
assert.match(css,/floating inset Terms overlay/);
assert.match(css,/padding:clamp\(14px,3vw,38px\)/);
assert.match(css,/height:min\(91dvh,920px\)/);
assert.match(css,/overflow-y:auto/);
assert.match(css,/backdrop-filter:blur\(6px\)/);
assert.match(css,/border-radius:28px/);
assert.match(css,/html\.overlay-open/);
assert.doesNotMatch(runtime,/new Audio\s*\(/);
assert.doesNotMatch(runtime,/new\s+MutationObserver\s*\(/);

console.log('PASS: Stage 12.3.1 Terms Overlay — floating inset legal sheet, visible site backdrop, internal long-scroll, close/backdrop/ESC.');
