#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const html = read('index.html');
const bootstrap = read('js/app-bootstrap.js');
const pkg = JSON.parse(read('package.json'));

const syntax = spawnSync(
  process.execPath,
  ['--check', path.join(root, 'js/app-bootstrap.js')],
  { encoding: 'utf8' }
);
assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);

/* Failed 12.13.6.2 must not still be present. */
assert.equal(
  bootstrap.includes('function releaseTuneWrapBoot'),
  false,
  'Broken Progressive Boot code is still present'
);

/* 12.13.6.1 preload flood must be gone. */
assert.equal(
  html.includes('Stage 12.13.6.1: preload current runtime assets'),
  false
);
assert.equal(html.includes('rel="modulepreload"'), false);
assert.equal(html.includes('id="tunewrapFastBootPreloads"'), false);

/* First paint must be visible, not BODY-hidden. */
assert.ok(html.includes('html.tw-boot-pending body{'));
assert.ok(html.includes('visibility:visible!important'));
assert.equal(
  /html\.tw-boot-pending body\s*\{[^}]*visibility\s*:\s*hidden/i.test(html),
  false
);

/* Normal loader is non-blocking, real error remains available. */
assert.ok(
  html.includes('body > .catalog-bootstrap:not(.is-error)')
);
assert.ok(html.includes('display:none!important'));
assert.ok(html.includes('body > .catalog-bootstrap.is-error'));

/* Current final desktop CSS is render-ready from HEAD. */
const mainStyle = html.indexOf('<link rel="stylesheet" href="css/style.css">');
const wideStyle = html.indexOf('id="tunewrapResponsiveWide"');
const logoStyle = html.indexOf('id="tunewrapStage12133HomeLogoStyles"');
const body = html.indexOf('<body>');

assert.ok(mainStyle >= 0);
assert.ok(wideStyle > mainStyle && wideStyle < body);
assert.ok(logoStyle > mainStyle && logoStyle < body);
assert.ok(
  html.includes(
    '<link id="tunewrapResponsiveWide" rel="stylesheet" href="/css/responsive-wide.css?v=12.2" media="(min-width:621px)">'
  )
);

/* The main regression suite now uses the replacement boot test. */
assert.equal(
  pkg.scripts['immediatepaint:test'],
  'node scripts/stage-12.13.6.3-immediate-first-paint-test.js'
);
assert.ok(pkg.scripts.test.includes('npm run immediatepaint:test'));
assert.equal(pkg.scripts.test.includes('npm run firstpaint:test'), false);
assert.equal(pkg.scripts.test.includes('npm run fastboot:test'), false);

console.log(
  'PASS: Stage 12.13.6.3 — visible first paint, critical wide CSS in HEAD, no blocking normal loader.'
);
