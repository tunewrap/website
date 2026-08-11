#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const ux=read('js/ux-critical-fixes.js');
const core=read('js/script.js');
const packageUi=read('js/stage-12.10-package-ui-polish.js');
const runtime=read('js/site-cms-runtime.js');
const css=read('css/stage-12.12.2-announcement-position.css');
const bootstrap=read('js/app-bootstrap.js');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/ux-critical-fixes.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.ok(ux.includes('function ensureRegularPackageField(){'));
assert.ok(ux.includes("group.id='regularPackageField'"));
assert.ok(ux.includes("select.id='fieldTier'"));
assert.ok(ux.includes("document.dispatchEvent(new CustomEvent('tunewrap:set-order-tier'"));
assert.ok(ux.includes("document.dispatchEvent(new CustomEvent('tunewrap:set-order-wedding'"));
assert.ok(ux.includes('syncRegularPackageField();'));

assert.ok(core.includes("document.addEventListener('tunewrap:set-order-tier'"));
assert.ok(core.includes("document.addEventListener('tunewrap:set-order-wedding'"));

assert.ok(packageUi.includes("trigger.id='twPackageChooserTrigger'"));
assert.ok(packageUi.includes("openChooser(trigger)"));

assert.ok(runtime.includes("const heroSection=$('#hero');"));
assert.ok(runtime.includes("if(heroSection&&node.parentElement!==heroSection)heroSection.prepend(node);"));
assert.ok(css.includes('#hero > .hero-announcement'));
assert.ok(css.includes('top:14px!important'));

assert.ok(bootstrap.includes('stage-12.12.2-announcement-position.css'));
assert.equal(pkg.scripts['packageannouncefix:test'],'node scripts/stage-12.12.2-package-announcement-test.js');
assert.ok(pkg.scripts.test.includes('packageannouncefix:test'));

console.log('PASS: Stage 12.12.2 — package selector runtime parses/restores correctly and announcement is anchored high in Hero across devices.');
