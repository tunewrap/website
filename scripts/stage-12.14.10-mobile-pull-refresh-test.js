#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html');
const pull=read('css/stage-12.14.10-mobile-pull-refresh.css');
const core=read('css/style.css');
const runtime=read('js/script.js');
const pkg=JSON.parse(read('package.json'));

assert.match(html,/<meta name="tunewrap-build" content="12\.14\.(?:10|11|12)">/);
assert.ok(html.includes('/css/stage-12.14.10-mobile-pull-refresh.css?v=12.14.10'));

// The regression was caused by Stage 6/8 deliberately stopping overscroll at
// html/body and at the fixed .app-scroll application viewport.
assert.match(core,/html,\s*\n\s*body\{\s*\n\s*overscroll-behavior:none;/);
assert.match(core,/\.app-scroll\{[\s\S]{0,300}?overscroll-behavior-y:contain;/);

// Coarse touch devices (phones and tablets) now pass a downward top-boundary
// gesture through to the browser, where native pull-to-refresh is owned.
assert.match(pull,/@media\s*\(max-width:1024px\)\s*and\s*\(pointer:coarse\)/);
assert.match(pull,/html,\s*\n\s*body\{[\s\S]{0,260}?overscroll-behavior-y:auto!important;/);
assert.match(pull,/\.app-scroll\{[\s\S]{0,180}?overscroll-behavior-y:auto!important;/);
assert.match(pull,/overscroll-behavior-x:contain!important/);

// This CSS-only stage introduces no synthetic handler of its own. The later
// controlled fallback is isolated in its own Stage 12.14.11 asset.
assert.doesNotMatch(pull,/touchstart|touchmove|preventDefault|location\.reload/);
assert.ok(core.includes('scroll-snap-type:y mandatory'));
assert.ok(runtime.includes("appScroll.addEventListener('touchstart'"));
assert.ok(runtime.includes("appScroll.addEventListener('touchend'"));
assert.equal(runtime.includes("appScroll.addEventListener('touchmove'"),false);

assert.equal(pkg.scripts['pullrefresh:test'],'node scripts/stage-12.14.10-mobile-pull-refresh-test.js');
assert.ok(pkg.scripts.test.includes('pullrefresh:test'));

console.log('PASS: Stage 12.14.10 — native pull-to-refresh is restored on touch phones and tablets without changing screen snapping or player gestures.');
