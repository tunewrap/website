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

assert.ok(index.includes('href="/admin/curation.html">Порядок и витрина'));
assert.ok(index.includes('Главная песня раздела'));

assert.ok(html.includes('data-curation-section="stories"'));
assert.ok(html.includes('data-curation-section="author"'));
assert.ok(html.includes('storiesFeaturedSelect'));
assert.ok(html.includes('authorFeaturedSelect'));
assert.ok(html.includes('storiesSortList'));
assert.ok(html.includes('authorSortList'));

assert.ok(js.includes('/api/admin/reorder'));
assert.ok(js.includes("method:'POST'"));
assert.ok(js.includes('featured:true'));
assert.ok(js.includes('/api/admin/tracks/'));

assert.ok(js.includes('function installPointerDrag'));
assert.ok(js.includes('pointerdown'));
assert.ok(js.includes('pointermove'));
assert.ok(js.includes('pointerup'));
assert.ok(js.includes('makePlaceholder'));
assert.ok(js.includes('turnRowIntoFloatingGhost'));
assert.ok(js.includes('placeSlot'));
assert.ok(js.includes('row.setPointerCapture'));
assert.ok(js.includes('function move(section,id,direction)'));

assert.ok(reorder.includes('UPDATE tracks SET sort_order'));
assert.ok(trackPatch.includes('UPDATE tracks SET featured=0 WHERE section=? AND id<>?'));
assert.ok(shared.includes('sort_order, featured'));
assert.ok(core.includes('function featured(tracks,section)'));
assert.ok(core.includes('track.featured'));
assert.ok(runtime.includes('syncFeatured(section)'));

assert.ok(css.includes('.featured-manager'));
assert.ok(css.includes('.sort-row'));
assert.ok(css.includes('@media(max-width:520px)'));
assert.ok(css.includes('Stage 12.9.3 True Hold Drag'));

assert.equal(pkg.scripts['curation:test'],'node scripts/music-curation-admin-test.js');
assert.ok(pkg.scripts.test.includes('curation:test'));

assert.equal(/new\s+Audio\s*\(/.test(js),false);
assert.equal(js.includes('MutationObserver'),false);

console.log('PASS: Music Curation Admin — Stories/Author ordering, arrows, true hold-drag, reorder API and featured selection are intact.');
