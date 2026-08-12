#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html');
const runtime=read('js/mobile-pull-refresh.js');
const css=read('css/stage-12.14.11-mobile-pull-refresh-control.css');
const core=read('css/style.css');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/mobile-pull-refresh.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.match(html,/<meta name="tunewrap-build" content="12\.14\.(?:11|12)">/);
assert.ok(html.includes('/js/mobile-pull-refresh.js?v=12.14.11'));
assert.ok(html.includes('/css/stage-12.14.11-mobile-pull-refresh-control.css?v=12.14.11'));

// The fixed phone viewport cannot trigger the browser's root refresh itself.
assert.match(core,/html,\s*\n\s*body\{\s*\n\s*width:100%;\s*\n\s*height:100dvh;\s*\n\s*overflow:hidden;/);
assert.match(core,/\.app-scroll\{[\s\S]{0,200}?position:fixed;/);

// Gesture starts only at the application top, follows a vertical one-finger
// pull and never steals horizontal navigation or an inner scroller.
assert.ok(runtime.includes("window.matchMedia('(max-width:620px) and (pointer:coarse)')"));
assert.ok(runtime.includes('appScroll.scrollTop>1'));
assert.ok(runtime.includes('scrollChainIsAtTop(gesture.target)'));
assert.ok(runtime.includes('Math.abs(deltaX)>Math.abs(deltaY)'));
assert.ok(runtime.includes("appScroll.addEventListener('touchmove'"));
assert.ok(runtime.includes('{capture:true,passive:false}'));

// Refresh is an explicit release action and always receives a cache-busting
// URL, so it cannot re-open the stale document that motivated Stage 12.14.9.
assert.ok(runtime.includes('gesture.distance>=REFRESH_THRESHOLD'));
assert.ok(runtime.includes('event.stopImmediatePropagation()'));
assert.ok(runtime.includes("url.searchParams.set('tw-refresh'"));
assert.ok(runtime.includes('location.replace(url.href)'));

for(const value of [
  'Pull down to refresh','Потяните вниз для обновления',
  'Потягніть вниз для оновлення','ჩამოსწიეთ განახლებისთვის',
  'Zum Aktualisieren nach unten ziehen'
])assert.ok(runtime.includes(value),`missing pull copy: ${value}`);

assert.match(css,/\.app-scroll\.is-pull-refreshing/);
assert.match(css,/\.tune-wrap-pull-refresh\.is-visible/);
assert.match(css,/@keyframes tune-wrap-pull-spin/);
assert.ok(css.includes('pointer-events:none'));

// Execute the real runtime against a minimal touch DOM. This proves that an
// inner scroll position blocks the gesture, while a sufficiently long pull at
// the real top reaches the release state and produces a cache-busted reload.
function classList(){
  const values=new Set();
  return {
    add(...items){items.forEach(item=>values.add(item));},
    remove(...items){items.forEach(item=>values.delete(item));},
    contains(item){return values.has(item);},
    toggle(item,force){const next=force===undefined?!values.has(item):Boolean(force);next?values.add(item):values.delete(item);return next;}
  };
}
function style(){
  const values=new Map();
  return {setProperty(name,value){values.set(name,value);},getPropertyValue(name){return values.get(name)||'';}};
}
const listeners={};
const appScroll={
  scrollTop:0,style:style(),classList:classList(),
  addEventListener(type,handler,options){(listeners[type]||=[]).push({handler,options});}
};
const strong={textContent:''};
const indicator={
  id:'',className:'',classList:classList(),style:style(),
  setAttribute(){},querySelector(selector){return selector==='strong'?strong:null;}
};
const timers=[];
let replaced='';
const documentElement={lang:'ru',classList:classList()};
const body={classList:classList(),append(node){assert.equal(node,indicator);}};
const sandbox={
  URL,Date,Object,console,
  location:{href:'https://tunewrap.test/?lang=ru',replace(value){replaced=value;}},
  document:{
    documentElement,body,
    getElementById(id){return id==='appScroll'?appScroll:null;},
    createElement(){return indicator;}
  },
  window:{
    matchMedia(){return{matches:true};},
    TuneWrapLanguage:{get(){return'ru';}},
    clearTimeout(){},
    setTimeout(handler){timers.push(handler);return timers.length;}
  }
};
vm.runInNewContext(runtime,sandbox);
assert.equal(sandbox.window.TuneWrapPullRefresh.enabled,true);
assert.equal(sandbox.window.TuneWrapPullRefresh.threshold,66);

function emit(type,event){for(const {handler} of listeners[type]||[])handler(event);}
function touchEvent(x,y,target){
  return {
    touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}],target,
    prevented:false,stopped:false,immediate:false,
    preventDefault(){this.prevented=true;},
    stopPropagation(){this.stopped=true;},
    stopImmediatePropagation(){this.immediate=true;}
  };
}

const inner={nodeType:1,scrollHeight:200,clientHeight:100,scrollTop:12,parentElement:appScroll};
emit('touchstart',touchEvent(20,20,inner));
emit('touchmove',touchEvent(20,180,inner));
assert.equal(indicator.classList.contains('is-visible'),false,'inner scroll must keep the gesture');

inner.scrollTop=0;
emit('touchstart',touchEvent(20,20,inner));
const move=touchEvent(20,180,inner);
emit('touchmove',move);
assert.equal(move.prevented,true);
assert.equal(indicator.classList.contains('is-ready'),true);
assert.equal(strong.textContent,'Отпустите для обновления');
const end=touchEvent(20,180,inner);
emit('touchend',end);
assert.equal(end.immediate,true,'screen-snap touchend must be isolated during refresh');
assert.equal(indicator.classList.contains('is-loading'),true);
assert.equal(strong.textContent,'Обновляем…');
assert.equal(timers.length,1);
timers[0]();
assert.match(replaced,/^https:\/\/tunewrap\.test\/\?lang=ru&tw-refresh=[a-z0-9]+$/);

assert.equal(pkg.scripts['pullrefreshcontrol:test'],'node scripts/stage-12.14.11-mobile-pull-refresh-control-test.js');
assert.ok(pkg.scripts.test.includes('pullrefreshcontrol:test'));

console.log('PASS: Stage 12.14.11 — fixed mobile screens expose a controlled pull indicator and cache-busted refresh without stealing normal scroll, player or horizontal gestures.');
