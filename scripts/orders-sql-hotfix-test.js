#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const text=fs.readFileSync(path.join(root,'functions/_shared/orders.js'),'utf8');

const match=text.match(/INSERT INTO orders \(([\s\S]*?)\)\s*VALUES \(([\?,\s]+)\)/);
assert.ok(match,'orders INSERT block not found');

const columns=match[1].split(',').map(v=>v.trim()).filter(Boolean);
const placeholders=(match[2].match(/\?/g)||[]).length;

assert.equal(columns.length,28,`Expected 28 INSERT columns, found ${columns.length}`);
assert.equal(placeholders,28,`Expected 28 SQL placeholders, found ${placeholders}`);

console.log('PASS: Stage 12.5.3 Orders SQL Hotfix — INSERT has 28 columns and 28 placeholders.');
