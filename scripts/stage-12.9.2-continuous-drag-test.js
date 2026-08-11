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
  'makePlaceholder',
  'turnRowIntoFloatingGhost',
  'moveGhost',
  'placeSlot',
  'getBoundingClientRect',
  'requestAnimationFrame(autoScrollTick)',
  'window.scrollBy',
  'row.setPointerCapture',
  "row.addEventListener('pointermove'",
  "row.addEventListener('pointerup'",
  'currentDomIds',
  'updateDirty(section,true)',
  'list.insertBefore(placeholder,reference)',
  'list.append(placeholder)',
  'placeholder.parentElement.insertBefore(row,placeholder)',
  'function move(section,id,direction)',
  '/api/admin/reorder'
].forEach(token=>assert.ok(js.includes(token),token));

assert.ok(reorder.includes('UPDATE tracks SET sort_order'));
assert.ok(css.includes('Stage 12.9.3 True Hold Drag'));
assert.ok(css.includes('.sort-drop-slot'));
assert.ok(css.includes('.sort-row.sort-row-live-ghost'));

assert.equal(pkg.scripts['longdrag:test'],'node scripts/stage-12.9.2-continuous-drag-test.js');
assert.ok(pkg.scripts.test.includes('longdrag:test'));

console.log('PASS: Continuous drag + edge auto-scroll capability remains present under final Stage 12.9.3.');
