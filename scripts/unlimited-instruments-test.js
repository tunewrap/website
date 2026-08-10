#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const runtime=read('js/sound-preferences-runtime.js');
const shared=read('functions/_shared/sound-preferences.js');
const orders=read('functions/_shared/orders.js');
const admin=read('admin/sound.html');
const soundTest=read('scripts/sound-preferences-cms-test.js');

assert.match(runtime,/function maxStyles\(\)/);
assert.match(runtime,/const max=maxStyles\(\)/);
assert.doesNotMatch(runtime,/maxFor\('instruments'\)/);
assert.doesNotMatch(runtime,/selectedInstruments\.length<max/);
assert.match(runtime,/state\.selectedInstruments=\[\.\.\.state\.selectedInstruments,id\]/);
assert.match(runtime,/количество не ограничено/);
assert.match(shared,/maxStyles:5/);
assert.match(shared,/maxInstruments:null/);
assert.match(orders,/instruments:listStrings\(input\?\.instruments,80,160\)/);
assert.match(orders,/soundPrompt:clean\(input\?\.soundPrompt,12000/);
assert.match(admin,/любое количество инструментов/);
assert.match(soundTest,/unlimited instrument selection/);
assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/MutationObserver/);

console.log('PASS: Stage 12.5.2 Unlimited Instruments — styles stay max 5, instruments have no public selection limit, and Orders preserve the complete instrument set.');
