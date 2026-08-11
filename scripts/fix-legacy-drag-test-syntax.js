#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){
  const result=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Syntax check failed for ${rel}\n${result.stderr||result.stdout}`);
}

const current=read('admin/curation.js');
if(!current.includes('function installPointerDrag') ||
   !current.includes('makePlaceholder') ||
   !current.includes('turnRowIntoFloatingGhost') ||
   !current.includes('placeSlot')){
  throw new Error('Final Stage 12.9.3 drag runtime is not present. No files changed.');
}

const curationTest=`#!/usr/bin/env node
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

assert.equal(/new\\s+Audio\\s*\\(/.test(js),false);
assert.equal(js.includes('MutationObserver'),false);

console.log('PASS: Music Curation Admin — Stories/Author ordering, arrows, true hold-drag, reorder API and featured selection are intact.');
`;

const drag1291Test=`#!/usr/bin/env node
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
`;

const drag1292Test=`#!/usr/bin/env node
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
`;

write('scripts/music-curation-admin-test.js',curationTest);
write('scripts/stage-12.9.1-drag-reorder-test.js',drag1291Test);
write('scripts/stage-12.9.2-continuous-drag-test.js',drag1292Test);

[
  'scripts/music-curation-admin-test.js',
  'scripts/stage-12.9.1-drag-reorder-test.js',
  'scripts/stage-12.9.2-continuous-drag-test.js'
].forEach(check);

console.log('PASS: Stage 12.10.3 fixed legacy drag test syntax and validated all three files with node --check.');
console.log('Runtime/UI/API/D1 were not changed.');
