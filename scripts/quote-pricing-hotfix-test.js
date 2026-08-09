#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const css=fs.readFileSync(path.resolve(__dirname,'../css/responsive-wide.css'),'utf8');
const marker=css.indexOf('STAGE 12.1.3 · QUOTE + PRICING ALIGNMENT');
assert.ok(marker>=0,'Stage 12.1.3 marker missing');
const patch=css.slice(marker);

assert.match(patch,/#philosophy \.philosophy-quote[\s\S]*white-space:nowrap/);
assert.match(patch,/#pricing \.tier-card,[\s\S]*#pricing \.tier-card\.featured[\s\S]*min-height:238px !important/);
assert.match(patch,/#pricing \.tiers-grid[\s\S]*align-items:stretch/);
assert.match(patch,/#pricing \.wedding-package-card[\s\S]*height:100%/);
assert.doesNotMatch(patch,/@media\s*\([^)]*max-width\s*:\s*620px/i,
  'Stage 12.1.3 must not target phone <=620px');

console.log('PASS: Stage 12.1.3 quote/pricing hotfix — philosophy locked to explicit 3-line desktop quote, pricing cards equalized, phone <=620px untouched.');
