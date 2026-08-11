#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const file = rel => path.join(root, rel);

function read(rel) {
  const p = file(rel);
  if (!fs.existsSync(p)) throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}
function write(rel, text) {
  fs.writeFileSync(file(rel), text, 'utf8');
}
function check(rel) {
  const out = spawnSync(process.execPath, ['--check', file(rel)], { encoding: 'utf8' });
  if (out.status !== 0) {
    throw new Error(`Syntax check failed for ${rel}\n${out.stderr || out.stdout}`);
  }
}

['index.html', 'js/app-bootstrap.js', 'package.json'].forEach(read);

let html = read('index.html');

/* ---------------------------------------------------------
   Stage 12.13.6.3 — IMMEDIATE FIRST PAINT

   IMPORTANT:
   - do NOT change app-bootstrap.js execution order;
   - do NOT move CMS / Player / Catalog code;
   - do NOT preload the whole application;
   - do NOT hide the whole BODY while runtime initializes.

   The old "first version" flash on desktop existed because final wide CSS
   was injected later from app-bootstrap.js. The previous First Paint Guard
   hid the whole page until that slow bootstrap completed.

   Correct fix:
   1. apply only the already-existing critical desktop CSS from <head>;
   2. let the current static EN hero paint immediately;
   3. keep the catalog loader non-blocking during normal bootstrap;
   4. preserve the existing full-screen loader ONLY for a real bootstrap error.
   --------------------------------------------------------- */

/* Remove Stage 12.13.6.1's aggressive preload waterfall. */
const preloadStart =
  '<!-- Stage 12.13.6.1: preload current runtime assets in parallel; execution order is unchanged. -->';
const preloadEnd =
  '<link rel="modulepreload" href="/js/stage-12.11-contact-channel-selector.js">';

if (html.includes(preloadStart)) {
  const start = html.indexOf(preloadStart);
  const endMarker = html.indexOf(preloadEnd, start);
  if (endMarker < 0) {
    throw new Error('Stage 12.13.6.3: preload block end marker not found.');
  }
  const end = endMarker + preloadEnd.length;
  html = html.slice(0, start) + html.slice(end).replace(/^\r?\n/, '');
}

/* Replace blocking BODY guard with a non-blocking first-paint guard. */
const guardPattern =
  /<style id="tunewrapFirstPaintGuard">[\s\S]*?<\/style>/;

if (!guardPattern.test(html)) {
  throw new Error('Stage 12.13.6.3: existing first-paint guard not found.');
}

const newGuard = `<style id="tunewrapFirstPaintGuard">
  /*
    Stage 12.13.6.3:
    keep the real page visible while Track Catalog / CMS initialize.
    The normal catalog loader is hidden; the error state remains available.
  */
  html,
  body{
    background:#070707;
  }

  html.tw-boot-pending body{
    visibility:visible!important;
  }

  body > .catalog-bootstrap:not(.is-error){
    display:none!important;
  }

  body > .catalog-bootstrap.is-error{
    visibility:visible!important;
  }
</style>`;

html = html.replace(guardPattern, newGuard);

/*
  Apply only ABOVE-THE-FOLD presentation CSS synchronously.
  IDs intentionally match app-bootstrap.js, so it will not append duplicates.
*/
const mainStyle = '<link rel="stylesheet" href="css/style.css">';
const criticalWide =
  '<link id="tunewrapResponsiveWide" rel="stylesheet" href="/css/responsive-wide.css?v=12.2" media="(min-width:621px)">';
const criticalLogo =
  '<link id="tunewrapStage12133HomeLogoStyles" rel="stylesheet" href="/css/stage-12.13.3-home-logo-link.css?v=12.13.3">';

if (!html.includes(mainStyle)) {
  throw new Error('Stage 12.13.6.3: main stylesheet anchor not found.');
}

if (!html.includes('id="tunewrapResponsiveWide"')) {
  html = html.replace(mainStyle, `${mainStyle}\n${criticalWide}`);
}

if (!html.includes('id="tunewrapStage12133HomeLogoStyles"')) {
  const anchor = html.includes(criticalWide) ? criticalWide : mainStyle;
  html = html.replace(anchor, `${anchor}\n${criticalLogo}`);
}

write('index.html', html);

/*
  app-bootstrap.js is intentionally NOT modified.
  Validate syntax anyway so this stage cannot accidentally ship on top of
  a broken Stage 12.13.6.2 working tree.
*/
check('js/app-bootstrap.js');
const bootstrap = read('js/app-bootstrap.js');
if (bootstrap.includes('function releaseTuneWrapBoot')) {
  throw new Error(
    'Stage 12.13.6.3 refuses to install: broken Progressive Boot code is still present. ' +
    'Revert Stage 12.13.6.2 first.'
  );
}

/* Supersede the two old boot-behavior tests in the main test chain. */
const packagePath = file('package.json');
const pkg = JSON.parse(read('package.json'));
pkg.scripts ||= {};

if (typeof pkg.scripts.test !== 'string') {
  throw new Error('Stage 12.13.6.3: package.json test script not found.');
}

pkg.scripts.test = pkg.scripts.test
  .replace(/\s*&&\s*npm run firstpaint:test/g, '')
  .replace(/\s*&&\s*npm run fastboot:test/g, '')
  .replace(/\s*&&\s*npm run immediatepaint:test/g, '');

pkg.scripts['immediatepaint:test'] =
  'node scripts/stage-12.13.6.3-immediate-first-paint-test.js';
pkg.scripts.test += ' && npm run immediatepaint:test';

fs.writeFileSync(
  packagePath,
  JSON.stringify(pkg, null, 2) + String.fromCharCode(10),
  'utf8'
);

console.log('PASS: Stage 12.13.6.3 Immediate First Paint installed.');
console.log('PASS: app-bootstrap.js was NOT modified.');
console.log('PASS: aggressive Stage 12.13.6.1 preload waterfall removed.');
console.log('PASS: final wide CSS now applies before first desktop paint.');
console.log('PASS: normal full-screen boot overlay no longer blocks the visible page.');
console.log('D1 migration: not required.');
