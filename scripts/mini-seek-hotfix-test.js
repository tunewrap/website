#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const runtime=read('js/ux-critical-fixes.js');
const css=read('css/ux-critical-fixes.css');

assert.match(runtime,/const fullSeek=document\.getElementById\('songPlayerSeek'\)/);
assert.match(runtime,/mirrorIntoFullSeek\('input'\)/);
assert.match(runtime,/mirrorIntoFullSeek\('change'\)/);
assert.match(runtime,/fullSeek\.dispatchEvent\(new Event\(type/);
assert.match(runtime,/seek\.addEventListener\('pointerup',commitMiniSeek\)/);
assert.match(runtime,/seek\.addEventListener\('input',previewMiniSeek\)/);
assert.match(css,/Stage 12\.4\.1 — stronger mini seek interaction target/);
assert.match(css,/pointer-events:auto!important/);
assert.match(css,/z-index:20!important/);
assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/new\s+MutationObserver\s*\(/);

console.log('PASS: Stage 12.4.1 Mini Seek Hotfix — mini slider now reuses the Full Player seek pipeline and commits drag/click/keyboard seeks.');
