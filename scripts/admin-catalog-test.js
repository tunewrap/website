#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../js/catalog-core.js');

const root = path.resolve(__dirname,'..');
const catalog = JSON.parse(fs.readFileSync(path.join(root,'data/track-catalog.json'),'utf8'));
const seed = fs.readFileSync(path.join(root,'migrations/0002_seed_tracks.sql'),'utf8');
const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const bootstrap = fs.readFileSync(path.join(root,'js/app-bootstrap.js'),'utf8');
const admin = fs.readFileSync(path.join(root,'admin/admin.js'),'utf8');

assert.equal(catalog.tracks.length,29,'Stage 11 migration source must contain all 29 tracks');
assert.equal((seed.match(/INSERT OR IGNORE INTO tracks/g)||[]).length,29,'D1 seed must contain 29 track inserts');
assert.match(seed,/Imported: 29; Missing: 0; Duplicates: 0/);
assert.doesNotMatch(index,/track-catalog\.generated\.js/,'Production HTML must not load the static catalog');
assert.match(index,/type="module" src="js\/app-bootstrap\.js(?:\?v=[^"]+)?"/);
assert.match(bootstrap,/fetch\('\/api\/tracks'/,'Production bootstrap must use the public Track Catalog API');
assert.match(admin,/\/api\/admin\/tracks/,'Admin Studio must use authenticated admin API routes');
assert.doesNotMatch(admin,/password|api[_-]?key|bearer\s+[a-z0-9]/i,'Admin frontend must not contain credentials');

const queue = Core.queue(Core.createCatalog(catalog.tracks));
assert.equal(queue.length,29);
assert.equal(new Set(queue.map(track=>track.id)).size,29);
const firstAuthor = queue.findIndex(track=>track.section==='author');
assert.ok(firstAuthor>0);
assert.ok(queue.slice(0,firstAuthor).every(track=>track.section==='stories'));
assert.ok(queue.slice(firstAuthor).every(track=>track.section==='author'));

const future = [
  ...catalog.tracks,
  {...catalog.tracks[0],id:'future-story-stage11',section:'stories',order:999,published:true},
  {...catalog.tracks.at(-1),id:'future-author-stage11',section:'author',order:999,published:true}
];
const futureQueue = Core.queue(Core.createCatalog(future));
assert.ok(futureQueue.findIndex(track=>track.id==='future-story-stage11') < futureQueue.findIndex(track=>track.id==='future-author-stage11'));
console.log('PASS: Stage 11 CMS contract — D1 seed 29/29, API bootstrap, no frontend secrets, scalable Stories→Author queue.');
