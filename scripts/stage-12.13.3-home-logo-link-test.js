#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const html=read('index.html');
const bootstrap=read('js/app-bootstrap.js');
const script=read('js/stage-12.13.3-home-logo-link.js');
const css=read('css/stage-12.13.3-home-logo-link.css');
const pkg=JSON.parse(read('package.json'));

assert.ok(html.includes('<a class="logo-block home-logo-link" id="homeLogoLink" href="#top"'));
assert.ok(html.includes('aria-label="TuneWrap — Home"'));
assert.ok(html.includes('Tune<span>Wrap</span>'));

assert.ok(bootstrap.includes('/css/stage-12.13.3-home-logo-link.css?v=12.13.3'));
assert.ok(bootstrap.includes('/js/stage-12.13.3-home-logo-link.js?v=12.13.3'));

assert.ok(script.includes("document.getElementById('appScroll')"));
assert.ok(script.includes("window.scrollTo({top:0"));
assert.ok(script.includes("url.hash=''"));
assert.ok(script.includes("history.replaceState"));

assert.ok(css.includes('.home-logo-link'));
assert.ok(css.includes('cursor:pointer'));

for(const rel of ['js/app-bootstrap.js','js/stage-12.13.3-home-logo-link.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,rel)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${rel}\n${syntax.stderr||syntax.stdout}`);
}

assert.equal(pkg.scripts['homelogo:test'],'node scripts/stage-12.13.3-home-logo-link-test.js');
assert.ok(pkg.scripts.test.includes('homelogo:test'));

console.log('PASS: Stage 12.13.3 — TuneWrap logo is an accessible Home link across desktop/mobile.');
