#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const rel='functions/_shared/orders.js';
const file=path.join(root,rel);

if(!fs.existsSync(file))throw new Error(`Missing file: ${rel}`);
let text=fs.readFileSync(file,'utf8');

const insertMatch=text.match(/INSERT INTO orders \(([\s\S]*?)\)\s*VALUES \(([\?,\s]+)\)/);
if(!insertMatch)throw new Error('orders INSERT block not found');

const columns=insertMatch[1].split(',').map(v=>v.trim()).filter(Boolean);
const placeholders=(insertMatch[2].match(/\?/g)||[]).length;

if(columns.length!==28){
  throw new Error(`Expected 28 INSERT columns, found ${columns.length}`);
}

if(placeholders===28){
  console.log('PASS: Stage 12.5.3 Orders SQL Hotfix already applied.');
  process.exit(0);
}

if(placeholders!==26){
  throw new Error(`Expected broken 26 placeholders, found ${placeholders}`);
}

const fixedValues=Array(28).fill('?').join(',');
text=text.replace(
  insertMatch[0],
  `INSERT INTO orders (${insertMatch[1]}) VALUES (${fixedValues})`
);

fs.writeFileSync(file,text,'utf8');

console.log('PASS: Stage 12.5.3 Orders SQL Hotfix installed.');
console.log('Fixed: 28 INSERT columns now have 28 SQL placeholders.');
console.log('D1 migration is not required.');
