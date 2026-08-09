#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const css=read('css/responsive-wide.css');
const adapter=read('js/responsive-wide.js');
const bootstrap=read('js/app-bootstrap.js');

assert.match(css,/Stage 12\.1/);
assert.match(css,/@media \(min-width:621px\)/);
assert.doesNotMatch(css,/@media\s*\([^)]*max-width\s*:\s*620px/i,
  'Wide stylesheet must never target the verified phone breakpoint');
assert.match(css,/\.mobile-hero-title[\s\S]*display:block/);
assert.match(css,/\.desktop-hero-title/);
assert.match(css,/\.song-player-screen[\s\S]*display:block !important/);
assert.match(css,/\.top-mini-player\.is-wide-active/);
assert.match(css,/\.tiers-grid[\s\S]*repeat\(3/);
assert.match(css,/\.contact-hub-navigation[\s\S]*repeat\(2/);

assert.match(adapter,/matchMedia\('\(min-width:621px\)'\)/);
assert.match(adapter,/openWidePlayer/);
assert.match(adapter,/syncWideMini/);
assert.match(adapter,/window\.__tuneWrapPlayback/);
assert.doesNotMatch(adapter,/new Audio\s*\(/,
  'Responsive adapter must not create a second audio engine');
assert.doesNotMatch(adapter,/TUNEWRAP_TRACK_CATALOG\s*=/,
  'Responsive adapter must not rewrite Track Catalog');

const cssLoad=bootstrap.indexOf('/css/responsive-wide.css');
const adapterLoad=bootstrap.indexOf("import('./responsive-wide.js')");
const engineLoad=bootstrap.indexOf("import('./playback-engine.js')");
assert.ok(cssLoad>=0,'Wide stylesheet must be loaded');
assert.ok(adapterLoad>=0,'Wide adapter must be imported');
assert.ok(engineLoad>=0,'Playback engine must remain imported');
assert.ok(adapterLoad<engineLoad,'Wide adapter must register before playback engine');

console.log('PASS: Stage 12.1 responsive contract — phone breakpoint isolated, tablet/desktop premium layout enabled, existing audio engine reused.');
