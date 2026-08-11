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
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/app-bootstrap.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

/* Aggressive preload flood is gone. */
assert.equal(html.includes('id="tunewrapFastBootPreloads"'),false);
assert.equal(html.includes('rel="modulepreload"'),false);
assert.equal(html.includes('Stage 12.13.6.1: preload current runtime assets'),false);

/* Loader exists immediately in HTML, before the real page. */
const bodyAt=html.indexOf('<body>');
const splashAt=html.indexOf('id="tunewrapBootSplash"');
const navAt=html.indexOf('<nav id="top">');
assert.ok(bodyAt>=0 && splashAt>bodyAt && navAt>splashAt);
assert.ok(html.includes('},4000);'));

/* Bootstrap reuses, not duplicates, the splash. */
assert.ok(bootstrap.includes("document.getElementById('tunewrapBootSplash')"));
assert.ok(bootstrap.includes('function releaseTuneWrapBoot()'));

/* Core is completed before first release. */
const catalogAt=bootstrap.indexOf("await import('./catalog-runtime.js');");
const scriptAt=bootstrap.indexOf("await import('./script.js');",catalogAt);
const responsiveAt=bootstrap.indexOf("await import('./responsive-wide.js');",scriptAt);
const playerAt=bootstrap.indexOf("await import('./playback-engine.js');",responsiveAt);
const releaseAt=bootstrap.indexOf('releaseTuneWrapBoot();',playerAt);
assert.ok(catalogAt>=0 && scriptAt>catalogAt && responsiveAt>scriptAt && playerAt>responsiveAt && releaseAt>playerAt);

/* Secondary CMS work happens after first reveal. */
const pricingAt=bootstrap.indexOf('window.TUNEWRAP_PRICING_CMS=await pricingPromise;',releaseAt);
const siteAt=bootstrap.indexOf('window.TUNEWRAP_SITE_CMS=await siteContentPromise;',releaseAt);
const soundAt=bootstrap.indexOf('window.TUNEWRAP_SOUND_PREFERENCES=await soundPreferencesPromise;',releaseAt);
assert.ok(pricingAt>releaseAt);
assert.ok(siteAt>releaseAt);
assert.ok(soundAt>releaseAt);

/* Responsive/player should have only one awaited import each. */
assert.equal((bootstrap.match(/await import\('\.\/responsive-wide\.js'\);/g)||[]).length,1);
assert.equal((bootstrap.match(/await import\('\.\/playback-engine\.js'\);/g)||[]).length,1);

assert.ok(bootstrap.includes('if(tuneWrapBootReleased){'));
assert.equal(pkg.scripts['progressiveboot:test'],'node scripts/stage-12.13.6.2-progressive-boot-test.js');
assert.ok(pkg.scripts.test.includes('progressiveboot:test'));

console.log('PASS: Stage 12.13.6.2 — progressive first screen, no preload flood, secondary work after reveal.');
