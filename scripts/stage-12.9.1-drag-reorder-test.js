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

[
  'function installPointerDrag',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'setPointerCapture',
  'row.draggable=false',
  'image.draggable=false',
  'installPointerDrag(section,track,row,handle)',
  'makePlaceholder',
  'turnRowIntoFloatingGhost',
  'placeSlot',
  'function move(section,id,direction)',
  '/api/admin/reorder'
].forEach(token=>assert.ok(js.includes(token),token));

assert.ok(reorder.includes('UPDATE tracks SET sort_order'));
assert.ok(css.includes('touch-action:none!important'));
assert.ok(css.includes('cursor:grab!important'));
assert.ok(css.includes('Stage 12.9.3 True Hold Drag'));

assert.equal(pkg.scripts['dragreorder:test'],'node scripts/stage-12.9.1-drag-reorder-test.js');
assert.ok(pkg.scripts.test.includes('dragreorder:test'));

console.log('PASS: Pointer drag foundation remains installed; final Stage 12.9.3 true-hold implementation is the current drag owner.');
