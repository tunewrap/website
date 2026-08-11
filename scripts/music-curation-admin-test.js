#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const html=read('admin/curation.html');
const js=read('admin/curation.js');
const css=read('admin/curation.css');
const index=read('admin/index.html');
const reorder=read('functions/api/admin/reorder.js');
const trackPatch=read('functions/api/admin/tracks/[id].js');
const shared=read('functions/_shared/tracks.js');
const core=read('js/catalog-core.js');
const runtime=read('js/catalog-runtime.js');
const pkg=JSON.parse(read('package.json'));

assert.match(index,/href="\/admin\/curation\.html">Порядок и витрина/);
assert.match(index,/Главная песня раздела/);

assert.match(html,/data-curation-section="stories"/);
assert.match(html,/data-curation-section="author"/);
assert.match(html,/storiesFeaturedSelect/);
assert.match(html,/authorFeaturedSelect/);
assert.match(html,/storiesSortList/);
assert.match(html,/authorSortList/);

assert.match(js,/\/api\/admin\/reorder/);
assert.match(js,/method:'POST'/);
assert.match(js,/featured:true/);
assert.match(js,/\/api\/admin\/tracks\//);
assert.match(js,/draggable=true/);
assert.match(js,/dragstart/);
assert.match(js,/drop/);
assert.match(js,/move\(section,id,direction\)/);

assert.match(reorder,/UPDATE tracks SET sort_order/);
assert.match(trackPatch,/UPDATE tracks SET featured=0 WHERE section=\? AND id<>\?/);
assert.match(shared,/sort_order, featured/);
assert.match(core,/function featured\(tracks,section\)/);
assert.match(core,/track\.featured/);
assert.match(runtime,/syncFeatured\(section\)/);

assert.match(css,/\.featured-manager/);
assert.match(css,/\.sort-row/);
assert.match(css,/@media\(max-width:520px\)/);

assert.equal(pkg.scripts['curation:test'],'node scripts/music-curation-admin-test.js');
assert.match(pkg.scripts.test,/curation:test/);

assert.doesNotMatch(js,/new\s+Audio\s*\(/);
assert.doesNotMatch(js,/MutationObserver/);

console.log('PASS: Stage 12.9 Music Curation Admin — independent Stories/Author ordering, drag + arrows, and per-section featured track selection using existing CMS fields.');
