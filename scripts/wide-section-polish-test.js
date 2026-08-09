#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const css=fs.readFileSync(path.resolve(__dirname,'../css/responsive-wide.css'),'utf8');
const marker=css.indexOf('STAGE 12.1.2 · WIDE SECTION POLISH');
assert.ok(marker>=0,'Stage 12.1.2 marker missing');
const patch=css.slice(marker);

assert.match(patch,/@media \(min-width:900px\)/);
assert.match(patch,/#philosophy \.philosophy-inner[\s\S]*grid-template-areas/);
assert.match(patch,/#how \.step[\s\S]*min-height:188px/);
assert.match(patch,/#pricing \.tier-card[\s\S]*min-height:238px/);
assert.match(patch,/#pricing \.wedding-packages-heading[\s\S]*grid-template-columns/);
assert.match(patch,/@media \(min-width:621px\) and \(max-width:899px\)/);
assert.doesNotMatch(patch,/@media\s*\([^)]*max-width\s*:\s*620px/i,
  'Stage 12.1.2 must not target phone <=620px');

console.log('PASS: Stage 12.1.2 wide section polish — philosophy, process, libraries, pricing and wedding layouts refined; phone <=620px untouched.');
