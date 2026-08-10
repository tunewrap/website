#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'js/pricing-cms-runtime.js'),'utf8');
const wedding=fs.readFileSync(path.join(root,'js/wedding-detail-wide.js'),'utf8');

assert.doesNotMatch(runtime,/new MutationObserver/);
assert.doesNotMatch(runtime,/observer\.observe/);
assert.match(runtime,/document\.addEventListener\('click',captureOffer,true\)/);
assert.match(runtime,/requestAnimationFrame\(patchPanel\)/);
assert.match(runtime,/reorderIfNeeded/);
assert.match(runtime,/const same=/);
assert.match(runtime,/tunewrap:languagechange/);
assert.doesNotMatch(wedding,/new MutationObserver/);
assert.match(wedding,/wedding-offer-card/);

console.log('PASS: Stage 12.2.1 pricing card hotfix — self-triggering observers removed, core card opening preserved.');
