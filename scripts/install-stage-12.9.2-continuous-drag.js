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

let js=read('admin/curation.js');

const start=js.indexOf('function installPointerDrag(section,track,row,handle){');
const end=js.indexOf('\nfunction sortRow(section,track,index,total){',start);

if(start<0||end<0){
  throw new Error('Stage 12.9.2: current pointer-drag function was not found.');
}

const replacement=`function installPointerDrag(section,track,row,handle){
  let active=false;
  let changed=false;
  let pointerId=null;
  let ghost=null;
  let grabOffsetY=0;
  let lastClientY=0;
  let autoScrollFrame=0;
  let originalIds=[];

  handle.style.touchAction='none';
  handle.setAttribute('role','button');
  handle.setAttribute('aria-label','Перетащить трек');
  handle.title='Зажмите и тяните в любое место';

  row.classList.add('is-long-drag-ready');

  function currentDomIds(){
    return Array.from(nodes[section].list.querySelectorAll('.sort-row'))
      .map(item=>item.dataset.id)
      .filter(Boolean);
  }

  function createGhost(clientY){
    const rect=row.getBoundingClientRect();
    grabOffsetY=Math.max(8,Math.min(rect.height-8,clientY-rect.top));

    ghost=row.cloneNode(true);
    ghost.classList.remove('is-dragging','is-pointer-dragging','is-drag-placeholder');
    ghost.classList.add('sort-row-drag-ghost');
    ghost.removeAttribute('data-id');
    ghost.querySelectorAll('button').forEach(button=>button.disabled=true);

    ghost.style.position='fixed';
    ghost.style.left=rect.left+'px';
    ghost.style.top=(clientY-grabOffsetY)+'px';
    ghost.style.width=rect.width+'px';
    ghost.style.height=rect.height+'px';
    ghost.style.margin='0';
    ghost.style.zIndex='9999';
    ghost.style.pointerEvents='none';

    document.body.append(ghost);
  }

  function moveGhost(clientY){
    if(!ghost)return;
    ghost.style.top=(clientY-grabOffsetY)+'px';
  }

  function placePlaceholder(clientY){
    const list=nodes[section].list;
    const siblings=Array.from(list.querySelectorAll('.sort-row'))
      .filter(item=>item!==row);

    let reference=null;
    for(const item of siblings){
      const rect=item.getBoundingClientRect();
      if(clientY<rect.top+(rect.height/2)){
        reference=item;
        break;
      }
    }

    const before=row.previousElementSibling;
    const after=row.nextElementSibling;

    if(reference){
      if(reference!==after){
        list.insertBefore(row,reference);
        changed=true;
      }
    }else if(row!==list.lastElementChild){
      list.append(row);
      changed=true;
    }

    if(before!==row.previousElementSibling||after!==row.nextElementSibling){
      changed=true;
      syncDomPositions(section);
    }
  }

  function autoScrollTick(){
    autoScrollFrame=0;
    if(!active)return;

    const edge=118;
    let delta=0;

    if(lastClientY<edge){
      const strength=(edge-lastClientY)/edge;
      delta=-Math.max(10,Math.round(30*strength));
    }else if(lastClientY>window.innerHeight-edge){
      const strength=(lastClientY-(window.innerHeight-edge))/edge;
      delta=Math.max(10,Math.round(30*strength));
    }

    if(delta){
      window.scrollBy({top:delta,left:0,behavior:'auto'});
      moveGhost(lastClientY);
      placePlaceholder(lastClientY);
      autoScrollFrame=requestAnimationFrame(autoScrollTick);
    }
  }

  function ensureAutoScroll(){
    if(autoScrollFrame)return;
    const edge=118;
    if(lastClientY<edge||lastClientY>window.innerHeight-edge){
      autoScrollFrame=requestAnimationFrame(autoScrollTick);
    }
  }

  function stopAutoScroll(){
    if(autoScrollFrame){
      cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame=0;
    }
  }

  function finish(event,cancelled=false){
    if(!active)return;
    active=false;
    stopAutoScroll();

    try{
      if(pointerId!==null&&row.hasPointerCapture?.(pointerId)){
        row.releasePointerCapture(pointerId);
      }
    }catch(error){}

    ghost?.remove();
    ghost=null;

    row.classList.remove(
      'is-dragging',
      'is-pointer-dragging',
      'is-drag-placeholder',
      'is-long-drag-active'
    );
    handle.classList.remove('is-grabbing');

    if(cancelled){
      state.sections[section].ids=originalIds.slice();
      renderList(section);
      return;
    }

    const ids=currentDomIds();
    if(ids.length===state.sections[section].ids.length){
      const differs=ids.some((id,index)=>id!==originalIds[index]);
      state.sections[section].ids=ids;
      if(changed||differs)updateDirty(section,true);
    }

    renderList(section);
  }

  function begin(event){
    if(state.busy||active)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;

    const interactive=event.target.closest?.('button,a,input,select,textarea');
    if(interactive&&!interactive.classList.contains('drag-handle'))return;

    event.preventDefault();
    event.stopPropagation();

    active=true;
    changed=false;
    pointerId=event.pointerId;
    lastClientY=event.clientY;
    originalIds=state.sections[section].ids.slice();

    createGhost(event.clientY);

    row.classList.add(
      'is-dragging',
      'is-pointer-dragging',
      'is-drag-placeholder',
      'is-long-drag-active'
    );
    handle.classList.add('is-grabbing');

    try{row.setPointerCapture?.(event.pointerId);}catch(error){}
  }

  function continueDrag(event){
    if(!active||event.pointerId!==pointerId)return;

    event.preventDefault();
    lastClientY=event.clientY;

    moveGhost(lastClientY);
    placePlaceholder(lastClientY);
    ensureAutoScroll();
  }

  handle.addEventListener('pointerdown',begin);

  row.addEventListener('pointerdown',event=>{
    if(event.target===handle||event.target.closest?.('.drag-handle'))return;
    begin(event);
  });

  row.addEventListener('pointermove',continueDrag);
  row.addEventListener('pointerup',event=>finish(event,false));
  row.addEventListener('pointercancel',event=>finish(event,true));
  row.addEventListener('lostpointercapture',event=>{
    if(active&&event.pointerId===pointerId)finish(event,false);
  });
}
`;

js=js.slice(0,start)+replacement+js.slice(end);
fs.writeFileSync(file('admin/curation.js'),js,'utf8');

let css=read('admin/curation.css');
if(!css.includes('/* Stage 12.9.2 Continuous Drag */')){
  css+=`

/* Stage 12.9.2 Continuous Drag */
.sort-row.is-long-drag-ready{
  cursor:grab;
}
.sort-row.is-long-drag-ready:active{
  cursor:grabbing;
}
.sort-row.is-drag-placeholder{
  opacity:.18!important;
  background:rgba(217,181,97,.08)!important;
  outline:1px dashed rgba(217,181,97,.5)!important;
  outline-offset:-2px!important;
}
.sort-row-drag-ghost{
  box-sizing:border-box!important;
  opacity:.96!important;
  border:1px solid rgba(217,181,97,.65)!important;
  border-radius:13px!important;
  background:#15130f!important;
  box-shadow:0 18px 48px rgba(0,0,0,.58)!important;
  transform:scale(1.012)!important;
  cursor:grabbing!important;
}
.sort-row-drag-ghost .drag-handle{
  cursor:grabbing!important;
  border-color:rgba(217,181,97,.7)!important;
  background:rgba(217,181,97,.14)!important;
  color:var(--gold2)!important;
}
body:has(.sort-row.is-long-drag-active){
  user-select:none!important;
  -webkit-user-select:none!important;
}
`;
  fs.writeFileSync(file('admin/curation.css'),css,'utf8');
}

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['longdrag:test']='node scripts/stage-12.9.2-continuous-drag-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('longdrag:test')){
  pkg.scripts.test += ' && npm run longdrag:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.9.2 Continuous Drag Reorder installed.');
console.log('Grab a track and keep holding: it can now travel through the full list until release.');
console.log('A floating ghost follows the pointer while the placeholder moves through the list.');
console.log('Edge auto-scroll lets long lists continue moving while still held.');
console.log('Arrows and existing save API remain unchanged.');
console.log('D1 migration is not required.');
