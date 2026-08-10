#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const playback=read('js/playback-engine.js');
const ux=read('js/ux-critical-fixes.js');

assert.match(playback,/typeof audio\.fastSeek==='function'/);
assert.match(playback,/audio\.currentTime=requested/);
assert.match(playback,/updateTimeline\(true\)/);
assert.match(ux,/window\.__tuneWrapPlayback\?\.seekTo\?\.\(value\)/);
assert.match(ux,/requestAnimationFrame\(paint\)/);
assert.doesNotMatch(ux,/const fullSeek=document\.getElementById\('songPlayerSeek'\)/);
assert.doesNotMatch(ux,/mirrorIntoFullSeek/);
assert.doesNotMatch(ux,/new\s+Audio\s*\(/);

console.log('PASS: Stage 12.4.2 Mini Seek Direct Fix — slider commits directly to the persistent audio engine without hidden Full Player mirroring.');
