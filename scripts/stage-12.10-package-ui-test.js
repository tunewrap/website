#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const js=read('js/stage-12.10-package-ui-polish.js');
const css=read('css/stage-12.10-package-ui-polish.css');
const bootstrap=read('js/app-bootstrap.js');
const pkg=JSON.parse(read('package.json'));

assert.match(bootstrap,/stage-12\.10-package-ui-polish\.css/);
assert.match(bootstrap,/stage-12\.10-package-ui-polish\.js/);

assert.match(js,/moveTierCloseIntoCard/);
assert.match(js,/card\.insertBefore\(close,card\.firstChild\)/);
assert.match(js,/normalizeOpenTierPanel/);
assert.match(js,/weddingOfferForOpenPanel/);
assert.match(js,/replaceFeatures/);
assert.match(js,/priceWrap\.hidden=false/);
assert.match(js,/weddingContent\.hidden=true/);

assert.match(js,/twPackageChooserOverlay/);
assert.match(js,/twPackageChooserTrigger/);
assert.match(js,/data-package-chooser-close/);
assert.match(js,/data-package-choice/);
assert.match(js,/select\.dispatchEvent\(new Event\('change'/);
assert.match(js,/window\.__tuneWrapPricing/);
assert.match(js,/window\.TUNEWRAP_PRICING_CMS/);

assert.match(css,/ONE DETAIL CARD SYSTEM FOR ALL SIX PACKAGES/);
assert.match(css,/#tierDetailClose\.tw-tier-card-close/);
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
assert.match(css,/@media\(max-width:620px\)/);
assert.match(css,/\.gift-certificate-grid\{\s*grid-template-columns:1fr!important/);
assert.match(css,/#fieldTier\.tw-package-native-select/);
assert.match(css,/\.tw-package-chooser-close/);
assert.match(css,/\.tw-package-choice\.is-selected/);

assert.equal(pkg.scripts['packageui:test'],'node scripts/stage-12.10-package-ui-test.js');
assert.match(pkg.scripts.test,/packageui:test/);

console.log('PASS: Stage 12.10 — package detail cards, gift certificate layout, branded package chooser and right-side close UX are installed.');
