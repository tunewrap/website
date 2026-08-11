#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const runtime=read('js/stage-12.8.3-right-close-ux.js');
const css=read('css/stage-12.8.3-right-close-ux.css');
const bootstrap=read('js/app-bootstrap.js');
const html=read('index.html');
const catalog=read('js/catalog-runtime.js');
const pkg=JSON.parse(read('package.json'));

assert.match(html,/id="storyPathBack"/);
assert.match(html,/class="music-library-close"[^>]*data-library-close/);

assert.match(runtime,/storyOrderCloseBar/);
assert.match(runtime,/storyPathBack/);
assert.match(runtime,/music-library-close\[data-library-close\]/);
assert.match(runtime,/M6 6l12 12M18 6 6 18/);
assert.match(runtime,/data-library-close intact/);

assert.match(css,/#storyOrderCloseBar\.story-order-close-bar/);
assert.match(css,/right:14px!important/);
assert.match(css,/#contact\.is-story-path-form #storyPathBack/);
assert.match(css,/display:none!important/);
assert.match(css,/music-library-topbar/);
assert.match(css,/grid-column:3!important/);
assert.match(css,/music-library-close-right/);
assert.match(css,/@media\(max-width:620px\)/);

assert.match(bootstrap,/stage-12\.8\.3-right-close-ux\.css\?v=12\.8\.3/);
assert.match(bootstrap,/import\('\.\/stage-12\.8\.3-right-close-ux\.js'\)/);

// Catalog runtime still owns library close behavior.
assert.match(catalog,/data-library-close/);

// No new navigation/audio engine.
assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/MutationObserver/);
assert.doesNotMatch(runtime,/history\.pushState/);

assert.equal(pkg.scripts['closeux:test'],'node scripts/stage-12.8.3-right-close-ux-test.js');
assert.match(pkg.scripts.test,/closeux:test/);

console.log('PASS: Stage 12.8.3 — order-card close and both library close controls are explicit, right-aligned and mobile-responsive.');
