#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const css=read('css/stage-12.10.4-compact-desktop-package-chooser.css');
const bootstrap=read('js/app-bootstrap.js');
const pkg=JSON.parse(read('package.json'));

assert.ok(css.includes('.tw-package-chooser-shell .tw-package-choice-group'));
assert.ok(css.includes('min-height:0!important'));
assert.ok(css.includes('height:auto!important'));
assert.ok(css.includes('@media(min-width:901px)'));
assert.ok(css.includes('width:min(820px,calc(100vw - 56px))!important'));
assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'));
assert.ok(css.includes('min-height:72px!important'));
assert.ok(bootstrap.includes('stage-12.10.4-compact-desktop-package-chooser.css'));
assert.equal(pkg.scripts['choosercompact:test'],'node scripts/stage-12.10.4-compact-chooser-test.js');
assert.ok(pkg.scripts.test.includes('choosercompact:test'));

console.log('PASS: Stage 12.10.4 — compact desktop/tablet chooser keeps all six packages together in two tight 3-card rows.');
