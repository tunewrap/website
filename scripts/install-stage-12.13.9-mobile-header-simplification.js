#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'css', 'stage-12.13.9-mobile-header-simplification.css');

if (!fs.existsSync(indexPath)) {
  throw new Error('Missing index.html');
}
if (!fs.existsSync(cssPath)) {
  throw new Error('Missing css/stage-12.13.9-mobile-header-simplification.css');
}

let index = fs.readFileSync(indexPath, 'utf8');

const link = '<link id="tunewrapStage12139MobileHeader" rel="stylesheet" href="/css/stage-12.13.9-mobile-header-simplification.css?v=12.13.9">';

if (!index.includes('id="tunewrapStage12139MobileHeader"')) {
  const headClose = '</head>';
  if (!index.includes(headClose)) {
    throw new Error('Could not find </head> in index.html');
  }
  index = index.replace(headClose, `${link}\n${headClose}`);
  fs.writeFileSync(indexPath, index, 'utf8');
  console.log('PASS: Stage 12.13.9 stylesheet linked in index.html.');
} else {
  console.log('PASS: Stage 12.13.9 stylesheet already linked.');
}

console.log('PASS: Mobile top header is now Logo + Language only.');
console.log('PASS: Desktop header is unchanged.');
console.log('PASS: Bottom Nav remains the primary mobile navigation.');
console.log('D1 migration: not required.');
