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
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);
  return text.replace(needle,replacement);
}

let js=read('admin/curation.js');

js=replaceOnce(
  js,
  "  image.loading='lazy';\n  image.addEventListener('error',()=>{image.src=FALLBACK_COVER;},{once:true});",
  "  image.loading='lazy';\n  image.draggable=false;\n  image.addEventListener('error',()=>{image.src=FALLBACK_COVER;},{once:true});",
  'disable native image dragging'
);

js=replaceOnce(
  js,
  "function sortRow(section,track,index,total){",
  `function syncDomPositions(section){
  nodes[section].list.querySelectorAll('.sort-row').forEach((row,index)=>{
    const position=row.querySelector('.sort-position');
    if(position)position.textContent='#'+(index+1);
  });
}

function installPointerDrag(section,track,row,handle){
  let active=false;
  let changed=false;

  handle.style.touchAction='none';
  handle.tabIndex=0;
  handle.setAttribute('role','button');
  handle.setAttribute('aria-label','Перетащить трек');
  handle.title='Зажмите и перетащите';

  const finish=(event,cancelled=false)=>{
    if(!active)return;
    active=false;

    try{
      if(handle.hasPointerCapture?.(event.pointerId)){
        handle.releasePointerCapture(event.pointerId);
      }
    }catch(error){}

    row.classList.remove('is-dragging','is-pointer-dragging');
    handle.classList.remove('is-grabbing');

    if(cancelled){
      renderList(section);
      return;
    }

    if(changed){
      const ids=Array.from(nodes[section].list.querySelectorAll('.sort-row'))
        .map(item=>item.dataset.id)
        .filter(Boolean);

      if(ids.length===state.sections[section].ids.length){
        state.sections[section].ids=ids;
        updateDirty(section,true);
      }
    }

    renderList(section);
  };

  handle.addEventListener('pointerdown',event=>{
    if(state.busy)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;

    event.preventDefault();
    event.stopPropagation();

    active=true;
    changed=false;
    row.classList.add('is-dragging','is-pointer-dragging');
    handle.classList.add('is-grabbing');

    try{handle.setPointerCapture?.(event.pointerId);}catch(error){}
  });

  handle.addEventListener('pointermove',event=>{
    if(!active)return;

    event.preventDefault();

    const list=nodes[section].list;
    const target=document.elementsFromPoint(event.clientX,event.clientY)
      .map(node=>node.closest?.('.sort-row'))
      .find(candidate=>candidate&&candidate!==row&&candidate.parentElement===list);

    if(target){
      const rect=target.getBoundingClientRect();
      const insertAfter=event.clientY>rect.top+(rect.height/2);
      const reference=insertAfter?target.nextElementSibling:target;

      if(reference!==row&&row.nextElementSibling!==reference){
        list.insertBefore(row,reference);
        changed=true;
        syncDomPositions(section);
      }
    }

    const edge=92;
    if(event.clientY<edge){
      window.scrollBy({top:-18,left:0,behavior:'auto'});
    }else if(event.clientY>window.innerHeight-edge){
      window.scrollBy({top:18,left:0,behavior:'auto'});
    }
  });

  handle.addEventListener('pointerup',event=>finish(event,false));
  handle.addEventListener('pointercancel',event=>finish(event,true));
  handle.addEventListener('lostpointercapture',event=>{
    if(active)finish(event,false);
  });
}

function sortRow(section,track,index,total){`,
  'pointer reorder helper'
);

js=replaceOnce(
  js,
  "  row.dataset.id=track.id;\n  row.draggable=true;",
  "  row.dataset.id=track.id;\n  row.draggable=false;",
  'disable native row dragging'
);

js=replaceOnce(
  js,
  "  const handle=el('span','drag-handle','⋮⋮');\n  handle.title='Перетащить';",
  "  const handle=el('span','drag-handle','⠿');",
  'drag handle label'
);

js=replaceOnce(
  js,
  "  row.append(handle,cover(track),identity,position,status,actions);\n\n  row.addEventListener('dragstart',event=>{",
  "  row.append(handle,cover(track),identity,position,status,actions);\n  installPointerDrag(section,track,row,handle);\n\n  row.addEventListener('dragstart',event=>{",
  'install pointer drag'
);

fs.writeFileSync(file('admin/curation.js'),js,'utf8');

let css=read('admin/curation.css');
if(!css.includes('/* Stage 12.9.1 Pointer Drag */')){
  css += `

/* Stage 12.9.1 Pointer Drag */
.drag-handle{
  cursor:grab!important;
  touch-action:none!important;
  user-select:none!important;
  -webkit-user-select:none!important;
  color:var(--gold)!important;
  font-size:20px!important;
  letter-spacing:0!important;
}
.drag-handle:hover,
.drag-handle:focus-visible{
  border-color:rgba(217,181,97,.55)!important;
  background:rgba(217,181,97,.08)!important;
  color:var(--gold2)!important;
  outline:none!important;
}
.drag-handle.is-grabbing{
  cursor:grabbing!important;
  border-color:rgba(217,181,97,.78)!important;
  background:rgba(217,181,97,.14)!important;
  color:var(--gold2)!important;
}
.sort-row.is-pointer-dragging{
  opacity:.58!important;
  border-color:rgba(217,181,97,.42)!important;
  background:rgba(217,181,97,.07)!important;
  box-shadow:0 14px 32px rgba(0,0,0,.28)!important;
}
`;
  fs.writeFileSync(file('admin/curation.css'),css,'utf8');
}

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['dragreorder:test']='node scripts/stage-12.9.1-drag-reorder-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('dragreorder:test')){
  pkg.scripts.test += ' && npm run dragreorder:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.9.1 Drag Reorder Hotfix installed.');
console.log('Native HTML5 drag was replaced by reliable pointer dragging from the gold handle.');
console.log('Works with mouse, touchpad and touch/pointer input.');
console.log('Arrow reorder remains available as fallback.');
console.log('D1 migration is not required.');
