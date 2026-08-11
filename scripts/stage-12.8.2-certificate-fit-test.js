#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const css=read('css/stage-12.8.2-certificate-fit.css');
const bootstrap=read('js/app-bootstrap.js');
const gift=read('js/gift-certificate-overlay.js');
const pkg=JSON.parse(read('package.json'));

assert.match(css,/\.gift-certificate-groups\{\s*display:block!important/);
assert.match(css,/\.gift-certificate-group \+ \.gift-certificate-group/);
assert.match(css,/\.gift-certificate-grid\{/);
assert.match(css,/align-content:start!important/);
assert.match(css,/@media\(max-width:620px\)/);
assert.match(css,/@media\(max-height:560px\)/);

assert.match(bootstrap,/stage-12\.8\.2-certificate-fit\.css\?v=12\.8\.2/);

// Runtime still provides both live Pricing CMS families.
assert.match(gift,/pricingConfig\.tiers/);
assert.match(gift,/pricingConfig\.weddings/);

assert.equal(pkg.scripts['certificate-fit:test'],'node scripts/stage-12.8.2-certificate-fit-test.js');
assert.match(pkg.scripts.test,/certificate-fit:test/);

console.log('PASS: Stage 12.8.2 — certificate grid no longer stretches; all six live Pricing CMS offers fit in normal overlay flow.');
