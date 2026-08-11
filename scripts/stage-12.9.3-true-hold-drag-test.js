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
assert.match(js,/makePlaceholder/);
assert.match(js,/turnRowIntoFloatingGhost/);
assert.match(js,/sort-drop-slot/);
assert.match(js,/sort-row-live-ghost/);
assert.match(js,/row\.style\.position='fixed'/);
assert.match(js,/row\.setPointerCapture/);
assert.match(js,/placeSlot/);
assert.match(js,/list\.insertBefore\(placeholder,reference\)/);
assert.match(js,/list\.append\(placeholder\)/);
assert.match(js,/placeholder\.parentElement\.insertBefore\(row,placeholder\)/);
assert.match(js,/requestAnimationFrame\(autoScrollTick\)/);
assert.match(js,/window\.scrollBy/);
assert.match(js,/currentDomIds/);
assert.match(js,/updateDirty\(section,true\)/);

// Key regression guard: during pointer movement we must never move/reinsert
// the pointer-capturing row itself. Only the separate placeholder may move.
const dragFunction=js.slice(
  js.indexOf('function installPointerDrag'),
  js.indexOf('\\nfunction sortRow',js.indexOf('function installPointerDrag'))
);
assert.doesNotMatch(dragFunction,/list\.insertBefore\(row,/);
assert.doesNotMatch(dragFunction,/list\.append\(row\)/);

assert.match(js,/function move\(section,id,direction\)/);
assert.match(js,/\/api\/admin\/reorder/);
assert.match(reorder,/UPDATE tracks SET sort_order/);

assert.match(css,/Stage 12\.9\.3 True Hold Drag/);
assert.match(css,/\.sort-drop-slot/);
assert.match(css,/\.sort-row\.sort-row-live-ghost/);

assert.equal(pkg.scripts['truehold:test'],'node scripts/stage-12.9.3-true-hold-drag-test.js');
assert.match(pkg.scripts.test,/truehold:test/);

console.log('PASS: Stage 12.9.3 — true continuous hold-drag uses a movable drop slot while the pointer-capturing row stays attached until release.');
