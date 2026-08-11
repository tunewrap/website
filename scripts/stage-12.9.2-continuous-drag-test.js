#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const js=read('admin/curation.js');
const css=read('admin/curation.css');
const reorder=read('functions/api/admin/reorder.js');
const pkg=JSON.parse(read('package.json'));

assert.match(js,/function installPointerDrag/);
assert.match(js,/sort-row-drag-ghost/);
assert.match(js,/is-drag-placeholder/);
assert.match(js,/createGhost/);
assert.match(js,/moveGhost/);
assert.match(js,/placePlaceholder/);
assert.match(js,/getBoundingClientRect/);
assert.match(js,/list\.insertBefore\(row,reference\)/);
assert.match(js,/list\.append\(row\)/);
assert.match(js,/requestAnimationFrame\(autoScrollTick\)/);
assert.match(js,/window\.scrollBy/);
assert.match(js,/row\.setPointerCapture/);
assert.match(js,/row\.addEventListener\('pointermove'/);
assert.match(js,/row\.addEventListener\('pointerup'/);
assert.match(js,/state\.sections\[section\]\.ids=ids/);
assert.match(js,/updateDirty\(section,true\)/);

// Existing arrow fallback and persistence are preserved.
assert.match(js,/function move\(section,id,direction\)/);
assert.match(js,/\/api\/admin\/reorder/);
assert.match(reorder,/UPDATE tracks SET sort_order/);

assert.match(css,/Stage 12\.9\.2 Continuous Drag/);
assert.match(css,/\.sort-row-drag-ghost/);
assert.match(css,/\.sort-row\.is-drag-placeholder/);

assert.equal(pkg.scripts['longdrag:test'],'node scripts/stage-12.9.2-continuous-drag-test.js');
assert.match(pkg.scripts.test,/longdrag:test/);

console.log('PASS: Stage 12.9.2 — continuous hold-and-drag reorder with floating ghost and edge auto-scroll is installed.');
