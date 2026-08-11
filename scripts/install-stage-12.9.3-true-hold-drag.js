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
  throw new Error('Stage 12.9.3: current pointer-drag function was not found.');
}

const replacement=`function installPointerDrag(section,track,row,handle){
  let active=false;
  let pointerId=null;
  let placeholder=null;
  let grabOffsetY=0;
  let lastClientY=0;
  let autoScrollFrame=0;
  let originalStyle=null;
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

  function makePlaceholder(rect){
    placeholder=document.createElement('div');
    placeholder.className='sort-drop-slot';
    placeholder.setAttribute('aria-hidden','true');
    placeholder.style.height=rect.height+'px';
    row.parentElement.insertBefore(placeholder,row);
  }

  function turnRowIntoFloatingGhost(rect,clientY){
    originalStyle=row.getAttribute('style');
    grabOffsetY=Math.max(8,Math.min(rect.height-8,clientY-rect.top));

    row.classList.add(
      'is-dragging',
      'is-pointer-dragging',
      'is-long-drag-active',
      'sort-row-live-ghost'
    );

    row.style.position='fixed';
    row.style.left=rect.left+'px';
    row.style.top=(clientY-grabOffsetY)+'px';
    row.style.width=rect.width+'px';
    row.style.height=rect.height+'px';
    row.style.margin='0';
    row.style.zIndex='9999';
    row.style.pointerEvents='none';
  }

  function restoreRowStyle(){
    if(originalStyle===null)row.removeAttribute('style');
    else row.setAttribute('style',originalStyle);

    row.classList.remove(
      'is-dragging',
      'is-pointer-dragging',
      'is-long-drag-active',
      'sort-row-live-ghost'
    );
    handle.classList.remove('is-grabbing');
  }

  function moveGhost(clientY){
    row.style.top=(clientY-grabOffsetY)+'px';
  }

  function placeSlot(clientY){
    const list=nodes[section].list;
    const candidates=Array.from(list.querySelectorAll('.sort-row'))
      .filter(item=>item!==row);

    let reference=null;

    for(const item of candidates){
      const rect=item.getBoundingClientRect();
      if(clientY<rect.top+(rect.height/2)){
        reference=item;
        break;
      }
    }

    if(reference){
      if(placeholder.nextElementSibling!==reference){
        list.insertBefore(placeholder,reference);
      }
    }else if(placeholder!==list.lastElementChild){
      list.append(placeholder);
    }

    let visualIndex=0;
    Array.from(list.children).forEach(child=>{
      if(child===row)return;
      if(child===placeholder){
        placeholder.dataset.position=String(visualIndex+1);
        return;
      }
      if(child.classList?.contains('sort-row'))visualIndex+=1;
    });
  }

  function autoScrollTick(){
    autoScrollFrame=0;
    if(!active)return;

    const edge=120;
    let delta=0;

    if(lastClientY<edge){
      const strength=Math.min(1,(edge-lastClientY)/edge);
      delta=-Math.max(10,Math.round(34*strength));
    }else if(lastClientY>window.innerHeight-edge){
      const strength=Math.min(1,(lastClientY-(window.innerHeight-edge))/edge);
      delta=Math.max(10,Math.round(34*strength));
    }

    if(delta){
      window.scrollBy({top:delta,left:0,behavior:'auto'});
      moveGhost(lastClientY);
      placeSlot(lastClientY);
      autoScrollFrame=requestAnimationFrame(autoScrollTick);
    }
  }

  function ensureAutoScroll(){
    if(autoScrollFrame)return;
    const edge=120;
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

    if(cancelled){
      placeholder?.remove();
      placeholder=null;
      restoreRowStyle();
      state.sections[section].ids=originalIds.slice();
      renderList(section);
      return;
    }

    if(placeholder?.parentElement){
      placeholder.parentElement.insertBefore(row,placeholder);
      placeholder.remove();
      placeholder=null;
    }

    restoreRowStyle();

    const ids=currentDomIds();
    if(ids.length===originalIds.length){
      const differs=ids.some((id,index)=>id!==originalIds[index]);
      state.sections[section].ids=ids;
      if(differs)updateDirty(section,true);
    }

    renderList(section);
  }

  function begin(event){
    if(state.busy||active)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;

    const fromHandle=event.target===handle||event.target.closest?.('.drag-handle');
    const interactive=event.target.closest?.('button,a,input,select,textarea');

    // Desktop: grab the handle OR any free part of the track row.
    // Touch: use the handle so normal page scrolling stays natural.
    if(event.pointerType!=='mouse'&&!fromHandle)return;
    if(interactive&&!fromHandle)return;

    event.preventDefault();
    event.stopPropagation();

    active=true;
    pointerId=event.pointerId;
    lastClientY=event.clientY;
    originalIds=state.sections[section].ids.slice();

    const rect=row.getBoundingClientRect();
    makePlaceholder(rect);
    turnRowIntoFloatingGhost(rect,event.clientY);
    handle.classList.add('is-grabbing');

    try{row.setPointerCapture?.(event.pointerId);}catch(error){}
  }

  function continueDrag(event){
    if(!active||event.pointerId!==pointerId)return;

    event.preventDefault();
    lastClientY=event.clientY;

    moveGhost(lastClientY);
    placeSlot(lastClientY);
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

if(!css.includes('/* Stage 12.9.3 True Hold Drag */')){
  css+=`

/* Stage 12.9.3 True Hold Drag */
.sort-drop-slot{
  position:relative;
  width:100%;
  min-height:54px;
  border:1px dashed rgba(217,181,97,.58);
  border-radius:12px;
  background:rgba(217,181,97,.07);
  box-shadow:inset 0 0 0 1px rgba(217,181,97,.05);
}
.sort-drop-slot::after{
  content:"Отпустить здесь";
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  color:var(--gold);
  font-size:9px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  white-space:nowrap;
}
.sort-row.sort-row-live-ghost{
  opacity:.97!important;
  border:1px solid rgba(217,181,97,.72)!important;
  border-radius:13px!important;
  background:#15130f!important;
  box-shadow:0 20px 52px rgba(0,0,0,.62)!important;
  cursor:grabbing!important;
  transform:scale(1.008)!important;
}
.sort-row.sort-row-live-ghost .drag-handle{
  cursor:grabbing!important;
  border-color:rgba(217,181,97,.76)!important;
  background:rgba(217,181,97,.15)!important;
  color:var(--gold2)!important;
}
body:has(.sort-row.sort-row-live-ghost){
  user-select:none!important;
  -webkit-user-select:none!important;
}
`;
  fs.writeFileSync(file('admin/curation.css'),css,'utf8');
}

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['truehold:test']='node scripts/stage-12.9.3-true-hold-drag-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('truehold:test')){
  pkg.scripts.test += ' && npm run truehold:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.9.3 True Hold Drag installed.');
console.log('Root cause fixed: the captured DOM row is no longer reinserted during pointer movement.');
console.log('The real row now floats under the pointer while a separate drop slot moves through the full list.');
console.log('You can hold from #2 to #10 and release only at the final position.');
console.log('Edge auto-scroll remains enabled.');
console.log('D1 migration is not required.');
