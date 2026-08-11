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
assert.match(js,/pointerdown/);
assert.match(js,/pointermove/);
assert.match(js,/pointerup/);
assert.match(js,/pointercancel/);
assert.match(js,/setPointerCapture/);
assert.match(js,/elementsFromPoint/);
assert.match(js,/list\.insertBefore\(row,reference\)/);
assert.match(js,/state\.sections\[section\]\.ids=ids/);
assert.match(js,/updateDirty\(section,true\)/);
assert.match(js,/row\.draggable=false/);
assert.match(js,/image\.draggable=false/);
assert.match(js,/installPointerDrag\(section,track,row,handle\)/);

// Existing fallback + persistence remain.
assert.match(js,/function move\(section,id,direction\)/);
assert.match(js,/\/api\/admin\/reorder/);
assert.match(reorder,/UPDATE tracks SET sort_order/);

assert.match(css,/Stage 12\.9\.1 Pointer Drag/);
assert.match(css,/touch-action:none!important/);
assert.match(css,/cursor:grab!important/);
assert.match(css,/is-pointer-dragging/);

assert.equal(pkg.scripts['dragreorder:test'],'node scripts/stage-12.9.1-drag-reorder-test.js');
assert.match(pkg.scripts.test,/dragreorder:test/);

console.log('PASS: Stage 12.9.1 — pointer drag reorder is installed for Stories and Author; arrows and existing reorder API remain intact.');
