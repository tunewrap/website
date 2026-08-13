#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html');
const updater=read('js/auto-update.js');
const bootstrap=read('js/app-bootstrap.js');
const headers=read('_headers');
const mediaApi=read('functions/api/media/[[path]].js');
const pkg=JSON.parse(read('package.json'));

for(const relative of ['js/auto-update.js','js/app-bootstrap.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,relative)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${relative}\n${syntax.stderr||syntax.stdout}`);
}

// Every new deployment has an explicit build identity. An old restored mobile
// tab probes fresh HTML instead of trusting its frozen document snapshot.
assert.match(html,/<meta name="tunewrap-build" content="12\.14\.(?:9|10|11|12|13|14|15|16)">/);
assert.match(html,/<script src="\/js\/auto-update\.js\?v=12\.14\.(?:9|15)" defer><\/script>/);
assert.match(html,/js\/app-bootstrap\.js\?v=12\.14\.(?:9|15)/);
assert.ok(updater.includes("new URL('/',location.origin)"));
assert.ok(updater.includes("cache:'no-store'"));
assert.ok(updater.includes("meta\\s+name=[\"']tunewrap-build"));
assert.ok(updater.includes("window.addEventListener('pageshow'"));
assert.ok(updater.includes("document.addEventListener('visibilitychange'"));
assert.ok(updater.includes("window.addEventListener('focus'"));

// Live D1 content is checked independently of deploys, so Admin additions are
// visible after returning to a suspended tab without a Git/Cloudflare build.
for(const endpoint of [
  '/api/tracks','/api/pricing','/api/site-content',
  '/api/story-categories','/api/sound-preferences'
])assert.ok(updater.includes(`'${endpoint}'`),`freshness endpoint missing: ${endpoint}`);
assert.ok(bootstrap.includes('window.TuneWrapAutoUpdate?.setSnapshot({'));
assert.ok(updater.includes("url.searchParams.set('tw-update'"));
assert.ok(updater.includes("url.hash=''"));
assert.ok(updater.includes("history.scrollRestoration='manual'"));
assert.ok(updater.includes('location.replace(url.href)'));

// Never interrupt playback or discard a partially completed order. In those
// cases the client receives a native update action instead of a forced reload.
assert.ok(updater.includes("document.getElementById('tuneWrapAudioEngine')"));
assert.ok(updater.includes('return !audioIsPlaying()&&!formDirty'));
assert.ok(updater.includes("event.target?.matches?.('input,textarea,select')"));
assert.ok(updater.includes("notice.querySelector('button').addEventListener('click'"));
for(const copy of [
  'A newer TuneWrap version is ready.',
  'Готова новая версия TuneWrap.',
  'Готова нова версія TuneWrap.',
  'TuneWrap-ის ახალი ვერსია მზადაა.',
  'Eine neue TuneWrap-Version ist verfügbar.'
])assert.ok(updater.includes(copy),`native update copy missing: ${copy}`);

// HTML and executable assets revalidate, while covers/audio keep their
// existing immutable R2 caching and are not downloaded again unnecessarily.
assert.match(headers,/^\/\n\s+Cache-Control: no-store, no-cache, must-revalidate/m);
assert.match(headers,/^\/index\.html\n\s+Cache-Control: no-store, no-cache, must-revalidate/m);
assert.match(headers,/^\/js\/\*\n\s+Cache-Control: no-cache, must-revalidate/m);
assert.match(headers,/^\/css\/\*\n\s+Cache-Control: no-cache, must-revalidate/m);
assert.ok(mediaApi.includes('public, max-age=31536000, immutable'));
assert.equal(headers.includes('/assets/*'),false);

for(const name of [
  'catalog-runtime.js','script.js','pricing-cms-runtime.js','gift-certificate-overlay.js',
  'site-cms-runtime.js','sound-preferences-runtime.js','order-intake-completion.js',
  'orders-submit.js','playback-engine.js','ux-critical-fixes.js',
  'stage-12.10-package-ui-polish.js','stage-12.11-contact-channel-selector.js'
])assert.match(bootstrap,new RegExp(`\\./${name.replace(/\./g,'\\.')}\\?v=12\\.14\\.(?:9|15)`),`cache generation missing: ${name}`);

assert.equal(pkg.scripts['mobileupdate:test'],'node scripts/stage-12.14.9-mobile-auto-update-test.js');
assert.ok(pkg.scripts.test.includes('mobileupdate:test'));

console.log('PASS: Stage 12.14.9 — restored mobile tabs detect new deploys and live CMS/catalog changes without interrupting playback or active forms.');
