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
const style=read('css/style.css');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/app-bootstrap.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

const guardAdd=html.indexOf("document.documentElement.classList.add('tw-boot-pending');");
const bodyAt=html.indexOf('<body>');
assert.ok(guardAdd>=0,'tw-boot-pending class is not added');
assert.ok(bodyAt>guardAdd,'first-paint guard must start before <body>');

assert.ok(html.includes('id="tunewrapFirstPaintGuard"'));
assert.ok(html.includes('html.tw-boot-pending body{'));
assert.ok(html.includes('visibility:hidden!important'));
assert.ok(html.includes('body > .catalog-bootstrap'));
assert.ok(html.includes('visibility:visible!important'));
assert.ok(html.includes('TUNEWRAP_BOOT_GUARD_TIMER'));
assert.ok(html.includes('},10000);'));

assert.ok(style.includes('.catalog-bootstrap{'));
assert.ok(style.includes('position:fixed'));
assert.ok(style.includes('background:#070707'));

const reveal=bootstrap.indexOf("document.documentElement.classList.remove('tw-boot-pending');");
const loadingRemove=bootstrap.indexOf('loading.remove();',reveal);
assert.ok(reveal>=0,'bootstrap does not clear first-paint guard');
assert.ok(loadingRemove>reveal,'loader must be removed after reveal');
assert.ok(bootstrap.includes('clearTimeout(window.TUNEWRAP_BOOT_GUARD_TIMER)'));

assert.equal(pkg.scripts['firstpaint:test'],'node scripts/stage-12.13.6-first-paint-guard-test.js');
assert.ok(pkg.scripts.test.includes('firstpaint:test'));

console.log('PASS: Stage 12.13.6 — no static/legacy first-paint flash before TuneWrap bootstrap.');
