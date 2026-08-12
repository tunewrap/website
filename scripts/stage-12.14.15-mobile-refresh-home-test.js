#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const bootstrap=read('js/app-bootstrap.js');
const pull=read('js/mobile-pull-refresh.js');
const html=read('index.html');
const pkg=JSON.parse(read('package.json'));

for(const relative of ['js/app-bootstrap.js','js/mobile-pull-refresh.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,relative)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${relative}\n${syntax.stderr||syntax.stdout}`);
}
assert.match(html,/<meta name="tunewrap-build" content="12\.14\.15">/);
assert.ok(html.includes('/js/mobile-pull-refresh.js?v=12.14.15'));
assert.ok(html.includes('/js/auto-update.js?v=12.14.15'));
assert.ok(html.includes('js/app-bootstrap.js?v=12.14.15'));
assert.ok(pull.includes("url.hash=''"));
assert.ok(pull.includes("history.scrollRestoration='manual'"));

const start=bootstrap.indexOf('/* Stage 12.14.15 — every real refresh starts deterministically at Home */');
const end=bootstrap.indexOf('\nconst TUNEWRAP_BOOT_COPY',start);
assert.ok(start>=0&&end>start,'refresh-home bootstrap guard missing');
const guard=bootstrap.slice(start,end);

function runGuard({href,type}){
  const url=new URL(href);
  const app={scrollTop:640};
  const calls={replace:[],scroll:0,timers:[],events:[]};
  const sandbox={
    URL,URLSearchParams,console,
    location:{href:url.href,search:url.search,hash:url.hash,pathname:url.pathname},
    performance:{getEntriesByType(){return[{type}];}},
    history:{state:null,scrollRestoration:'auto',replaceState(_state,_title,value){calls.replace.push(value);}},
    document:{readyState:'complete',getElementById(id){return id==='appScroll'?app:null;},addEventListener(){}},
    window:{
      scrollTo(){calls.scroll+=1;},
      addEventListener(name,handler){calls.events.push(name);if(name==='pageshow'||name==='load')handler();}
    },
    requestAnimationFrame(handler){handler();},
    setTimeout(handler,delay){calls.timers.push(delay);handler();return calls.timers.length;}
  };
  vm.runInNewContext(guard,sandbox);
  return {app,calls,history:sandbox.history};
}

// Controlled refresh must discard a stale Packages hash and its temporary
// cache-buster, then hold the application at Home through late layout passes.
const controlled=runGuard({href:'https://tunewrap.test/?lang=ru&tw-refresh=abc#pricing',type:'navigate'});
assert.equal(controlled.app.scrollTop,0);
assert.equal(controlled.history.scrollRestoration,'auto');
assert.ok(controlled.calls.replace.includes('/?lang=ru'));
assert.ok(controlled.calls.scroll>=3);
assert.ok(controlled.calls.timers.includes(1400));

// A normal mobile browser reload also starts at Home even if Contact was the
// last bottom-navigation target.
const browserReload=runGuard({href:'https://tunewrap.test/?lang=uk#contactHub',type:'reload'});
assert.equal(browserReload.app.scrollTop,0);
assert.ok(browserReload.calls.replace.includes('/?lang=uk'));

// Automatic CMS/deployment freshness uses tw-update instead of tw-refresh,
// but must obey the same deterministic Home contract.
const autoUpdate=runGuard({href:'https://tunewrap.test/?lang=ka&tw-update=12.14.15#pricing',type:'navigate'});
assert.equal(autoUpdate.app.scrollTop,0);
assert.ok(autoUpdate.calls.replace.includes('/?lang=ka'));

// First-time navigation to a deliberate section link is not a refresh and
// must remain untouched.
const deepLink=runGuard({href:'https://tunewrap.test/?lang=de#pricing',type:'navigate'});
assert.equal(deepLink.app.scrollTop,640);
assert.equal(deepLink.calls.replace.length,0);

assert.equal(pkg.scripts['mobilerefreshhome:test'],'node scripts/stage-12.14.15-mobile-refresh-home-test.js');
assert.ok(pkg.scripts.test.includes('mobilerefreshhome:test'));
console.log('PASS: Stage 12.14.15 — pull-to-refresh and browser reload always reopen mobile Home; deliberate section navigation remains intact.');
