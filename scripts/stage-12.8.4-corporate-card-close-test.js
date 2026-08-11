#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const runtime=read('js/stage-12.8.4-corporate-card-close.js');
const css=read('css/stage-12.8.4-corporate-card-close.css');
const bootstrap=read('js/app-bootstrap.js');
const html=read('index.html');
const core=read('js/script.js');
const pkg=JSON.parse(read('package.json'));

assert.match(html,/id="corporatePanelClose"/);
assert.match(html,/class="corporate-box"/);

assert.match(runtime,/corporatePanelClose/);
assert.match(runtime,/corporate-box/);
assert.match(runtime,/appendChild\(button\)/);
assert.match(runtime,/has-corporate-card-close/);
assert.match(runtime,/tunewrap:languagechange/);

assert.match(css,/corporate-card-close/);
assert.match(css,/top:16px!important/);
assert.match(css,/right:16px!important/);
assert.match(css,/@media\(max-width:620px\)/);
assert.match(css,/border-radius:50%!important/);

assert.match(bootstrap,/stage-12\.8\.4-corporate-card-close\.css\?v=12\.8\.4/);
assert.match(bootstrap,/import\('\.\/stage-12\.8\.4-corporate-card-close\.js'\)/);

// Existing core still owns the corporate close behavior.
assert.match(core,/corporatePanelClose/);

assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/MutationObserver/);

assert.equal(pkg.scripts['corpclose:test'],'node scripts/stage-12.8.4-corporate-card-close-test.js');
assert.match(pkg.scripts.test,/corpclose:test/);

console.log('PASS: Stage 12.8.4 — corporate close is inside the card at top-right on desktop/tablet and circular on phone.');
