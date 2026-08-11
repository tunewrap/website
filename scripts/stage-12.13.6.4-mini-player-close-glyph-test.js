#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','stage-12.13.6.4-mini-player-close-glyph.css'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

assert.ok(html.includes('id="tunewrapMiniCloseGlyph"'));
assert.ok(html.includes('/css/stage-12.13.6.4-mini-player-close-glyph.css?v=12.13.6.4'));

assert.ok(css.includes('#topMiniStop::before'));
assert.ok(css.includes('content:"×"'));
assert.ok(css.includes('pointer-events:none'));
assert.ok(css.includes('#topMiniStop:focus-visible'));

assert.equal(
  pkg.scripts['miniclose:test'],
  'node scripts/stage-12.13.6.4-mini-player-close-glyph-test.js'
);
assert.ok(pkg.scripts.test.includes('miniclose:test'));

console.log('PASS: Stage 12.13.6.4 — Mini Player close X is visually restored.');
