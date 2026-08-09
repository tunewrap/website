#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css/responsive-wide.css'),'utf8');
const js=fs.readFileSync(path.join(root,'js/wedding-detail-wide.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'js/app-bootstrap.js'),'utf8');

const marker=css.indexOf('STAGE 12.1.6 · WEDDING DETAIL = STANDARD FORMAT CARD');
assert.ok(marker>=0,'Stage 12.1.6 CSS marker missing');
const patch=css.slice(marker);

assert.match(patch,/\.tier-detail-panel\.is-wedding \.tier-detail-card[\s\S]*max-width:430px/);
assert.match(patch,/\.tier-detail-panel\.is-wedding \.tier-detail-visual[\s\S]*display:none !important/);
assert.match(patch,/\.tier-detail-info-block li::before[\s\S]*content:"✓"/);
assert.doesNotMatch(patch,/@media\s*\([^)]*max-width\s*:\s*620px/i);

assert.match(js,/'First Dance':\{old:'99',current:'49'\}/);
assert.match(js,/'Love Story':\{old:'199',current:'99'\}/);
assert.match(js,/'Wedding Collection':\{old:'299',current:'149'\}/);
assert.match(js,/priceWrap\.hidden=false/);
assert.doesNotMatch(js,/new Audio\s*\(/);

const weddingImport=bootstrap.indexOf("import('./wedding-detail-wide.js')");
const responsiveImport=bootstrap.indexOf("import('./responsive-wide.js')");
assert.ok(weddingImport>=0,'Wedding wide adapter must be imported');
assert.ok(responsiveImport>=0,'Responsive wide adapter must remain imported');

console.log('PASS: Stage 12.1.6 wedding detail cards — wedding modal matches standard tier card language on tablet/desktop; phone <=620px untouched.');
