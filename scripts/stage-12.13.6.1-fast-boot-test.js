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
const css=read('css/style.css');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/app-bootstrap.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.ok(html.includes('id="tunewrapFastBootPreloads"'));
assert.ok(html.includes('rel="modulepreload" href="/js/catalog-runtime.js"'));
assert.ok(html.includes('rel="modulepreload" href="/js/playback-engine.js"'));
assert.ok(html.includes('rel="modulepreload" href="/js/responsive-wide.js"'));
assert.ok(html.includes('rel="preload" as="style" href="/css/responsive-wide.css?v=12.2"'));
assert.ok(html.includes('rel="preload" as="style" href="/css/stage-12.13.5-mobile-library-2col.css?v=12.13.5"'));

assert.ok(bootstrap.includes('catalog-bootstrap-brand'));
assert.ok(bootstrap.includes("loading.classList.add('is-leaving')"));
assert.ok(bootstrap.includes('window.setTimeout(()=>loading.remove(),180)'));

const reveal=bootstrap.indexOf("document.documentElement.classList.remove('tw-boot-pending');");
const fade=bootstrap.indexOf("loading.classList.add('is-leaving')",reveal);
assert.ok(reveal>=0 && fade>reveal,'page must reveal before loader fade');

assert.ok(css.includes('/* Stage 12.13.6.1 — Fast seamless boot */'));
assert.ok(css.includes('.catalog-bootstrap-brand'));
assert.ok(css.includes('.catalog-bootstrap.is-leaving'));
assert.ok(css.includes('transition:opacity .18s ease'));

assert.equal(pkg.scripts['fastboot:test'],'node scripts/stage-12.13.6.1-fast-boot-test.js');
assert.ok(pkg.scripts.test.includes('fastboot:test'));

console.log('PASS: Stage 12.13.6.1 — preloaded runtime + branded loader + seamless reveal.');
