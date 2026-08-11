#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}

const current=read('admin/curation.js');
if(!/function installPointerDrag/.test(current) ||
   !/makePlaceholder/.test(current) ||
   !/turnRowIntoFloatingGhost/.test(current) ||
   !/sort-drop-slot/.test(current)){
  throw new Error('Stage 12.10.2: final Stage 12.9.3 drag runtime is not present. Refusing to rewrite tests.');
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

assert.match(index,/href="\\\\/admin\\\\/curation\\\\.html">Порядок и витрина/);
assert.match(index,/Главная песня раздела/);

assert.match(html,/data-curation-section="stories"/);
assert.match(html,/data-curation-section="author"/);
assert.match(html,/storiesFeaturedSelect/);
assert.match(html,/authorFeaturedSelect/);
assert.match(html,/storiesSortList/);
assert.match(html,/authorSortList/);

assert.match(js,/\\\\/api\\\\/admin\\\\/reorder/);
assert.match(js,/method:'POST'/);
assert.match(js,/featured:true/);
assert.match(js,/\\\\/api\\\\/admin\\\\/tracks\\\\//);

// Drag implementation owner is now Stage 12.9.3 Pointer Events.
// Stage 12.9 native HTML5 draggable=true/dragstart/drop was intentionally superseded.
assert.match(js,/function installPointerDrag/);
assert.match(js,/pointerdown/);
assert.match(js,/pointermove/);
assert.match(js,/pointerup/);
assert.match(js,/makePlaceholder/);
assert.match(js,/turnRowIntoFloatingGhost/);
assert.match(js,/placeSlot/);
assert.match(js,/row\\\\.setPointerCapture/);
assert.match(js,/function move\\\\(section,id,direction\\\\)/);

assert.match(reorder,/UPDATE tracks SET sort_order/);
assert.match(trackPatch,/UPDATE tracks SET featured=0 WHERE section=\\\\? AND id<>\\\\?/);
assert.match(shared,/sort_order, featured/);
assert.match(core,/function featured\\\\(tracks,section\\\\)/);
assert.match(core,/track\\\\.featured/);
assert.match(runtime,/syncFeatured\\\\(section\\\\)/);

assert.match(css,/\\\\.featured-manager/);
assert.match(css,/\\\\.sort-row/);
assert.match(css,/@media\\\\(max-width:520px\\\\)/);
assert.match(css,/Stage 12\\\\.9\\\\.3 True Hold Drag/);

assert.equal(pkg.scripts['curation:test'],'node scripts/music-curation-admin-test.js');
assert.match(pkg.scripts.test,/curation:test/);

assert.doesNotMatch(js,/new\\\\s+Audio\\\\s*\\\\(/);
assert.doesNotMatch(js,/MutationObserver/);

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

assert.match(js,/function installPointerDrag/);
assert.match(js,/pointerdown/);
assert.match(js,/pointermove/);
assert.match(js,/pointerup/);
assert.match(js,/pointercancel/);
assert.match(js,/setPointerCapture/);
assert.match(js,/row\\\\.draggable=false/);
assert.match(js,/image\\\\.draggable=false/);
assert.match(js,/installPointerDrag\\\\(section,track,row,handle\\\\)/);

// The original 12.9.1 elementsFromPoint + moving-row algorithm was
// superseded by 12.9.3 to preserve pointer capture across the whole drag.
assert.match(js,/makePlaceholder/);
assert.match(js,/turnRowIntoFloatingGhost/);
assert.match(js,/placeSlot/);

assert.match(js,/function move\\\\(section,id,direction\\\\)/);
assert.match(js,/\\\\/api\\\\/admin\\\\/reorder/);
assert.match(reorder,/UPDATE tracks SET sort_order/);

assert.match(css,/touch-action:none!important/);
assert.match(css,/cursor:grab!important/);
assert.match(css,/Stage 12\\\\.9\\\\.3 True Hold Drag/);

assert.equal(pkg.scripts['dragreorder:test'],'node scripts/stage-12.9.1-drag-reorder-test.js');
assert.match(pkg.scripts.test,/dragreorder:test/);

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

assert.match(js,/function installPointerDrag/);
assert.match(js,/makePlaceholder/);
assert.match(js,/turnRowIntoFloatingGhost/);
assert.match(js,/moveGhost/);
assert.match(js,/placeSlot/);
assert.match(js,/getBoundingClientRect/);
assert.match(js,/requestAnimationFrame\\\\(autoScrollTick\\\\)/);
assert.match(js,/window\\\\.scrollBy/);
assert.match(js,/row\\\\.setPointerCapture/);
assert.match(js,/row\\\\.addEventListener\\\\('pointermove'/);
assert.match(js,/row\\\\.addEventListener\\\\('pointerup'/);
assert.match(js,/currentDomIds/);
assert.match(js,/updateDirty\\\\(section,true\\\\)/);

// Regression guard for the final fix: only the placeholder moves while held.
assert.match(js,/list\\\\.insertBefore\\\\(placeholder,reference\\\\)/);
assert.match(js,/list\\\\.append\\\\(placeholder\\\\)/);
assert.match(js,/placeholder\\\\.parentElement\\\\.insertBefore\\\\(row,placeholder\\\\)/);

assert.match(js,/function move\\\\(section,id,direction\\\\)/);
assert.match(js,/\\\\/api\\\\/admin\\\\/reorder/);
assert.match(reorder,/UPDATE tracks SET sort_order/);

assert.match(css,/Stage 12\\\\.9\\\\.3 True Hold Drag/);
assert.match(css,/\\\\.sort-drop-slot/);
assert.match(css,/\\\\.sort-row\\\\.sort-row-live-ghost/);

assert.equal(pkg.scripts['longdrag:test'],'node scripts/stage-12.9.2-continuous-drag-test.js');
assert.match(pkg.scripts.test,/longdrag:test/);

console.log('PASS: Continuous drag + edge auto-scroll capability remains present under the final Stage 12.9.3 implementation.');
`;

write('scripts/music-curation-admin-test.js',curationTest);
write('scripts/stage-12.9.1-drag-reorder-test.js',drag1291Test);
write('scripts/stage-12.9.2-continuous-drag-test.js',drag1292Test);

console.log('PASS: Stage 12.10.2 legacy drag tests updated to the final Stage 12.9.3 implementation.');
console.log('Only test files changed. Runtime/UI/API/D1 were not touched.');
