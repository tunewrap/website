#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(
  path.join(root, 'css', 'stage-12.13.9-mobile-header-simplification.css'),
  'utf8'
);

assert.ok(
  index.includes('id="tunewrapStage12139MobileHeader"'),
  'Stage 12.13.9 stylesheet link is missing from index.html'
);

assert.ok(
  index.includes('/css/stage-12.13.9-mobile-header-simplification.css?v=12.13.9'),
  'Stage 12.13.9 stylesheet versioned URL is missing'
);

assert.match(
  css,
  /@media\s*\(\s*max-width:\s*620px\s*\)/
);

assert.match(
  css,
  /#top\s+\.mobile-menu\s*\{[^}]*display:\s*none\s*!important\s*;/s
);

assert.match(
  css,
  /#top\s+\.nav-right\s*\{[^}]*gap:\s*0\s*;/s
);

/*
  HTML is intentionally NOT deleted.
  That keeps the existing menu structure available for rollback
  while CSS hides it only on mobile.
*/
assert.ok(
  index.includes('<details class="mobile-menu">'),
  'Existing mobile menu HTML should remain intact for safe rollback'
);

assert.ok(
  index.includes('<details class="mobile-lang notranslate"'),
  'Mobile language selector must remain intact'
);

assert.ok(
  index.includes('class="lang-switch notranslate"'),
  'Desktop language switch must remain intact'
);

assert.ok(
  index.includes('class="nav-cta"'),
  'Desktop CTA must remain intact'
);

console.log('PASS: Stage 12.13.9 — mobile header is Logo + Language only; desktop header remains intact.');
