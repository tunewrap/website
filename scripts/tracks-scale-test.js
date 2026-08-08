#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const Core = require('../js/catalog-core.js');

const PAGE_SIZE = 24;
const sizes = [100,500,1000];

for(const size of sizes){
  const raw = Array.from({length:size},(_,index) => ({
    id:'scale-track-' + String(index + 1).padStart(4,'0'),
    title:'Scale Track ' + (index + 1),
    originalTitle:'Scale Track ' + (index + 1),
    titles:{ru:'Тестовый трек ' + (index + 1),en:'Scale Track ' + (index + 1)},
    descriptions:{},
    section:index % 4 === 0 ? 'author' : 'stories',
    language:['GE','UA','EN','DE','RU'][index % 5],
    artist:'TuneWrap',
    album:'Scale Test',
    category:{en:index % 2 ? 'Love' : 'Cities'},
    tags:['scale','catalog','tag-' + index],
    order:index % 4 === 0 ? Math.floor(index / 4) + 1 : index - Math.floor(index / 4),
    published:true,
    featured:false,
    audio:'content/mock/track.mp3',
    cover:'assets/covers/tunewrap-placeholder.svg'
  }));
  const memoryBefore = process.memoryUsage().heapUsed;
  const buildStart = performance.now();
  const catalog = Core.createCatalog(raw);
  const buildMs = performance.now() - buildStart;
  const searchStart = performance.now();
  const result = Core.filter(catalog,{section:'stories',language:'EN',query:'Scale Track'});
  const searchMs = performance.now() - searchStart;
  const firstPage = Core.page(result,0,PAGE_SIZE);
  assert.equal(catalog.length,size);
  assert.ok(result.length > 0);
  assert.ok(firstPage.length <= PAGE_SIZE);
  assert.equal(Core.queue(catalog).length,size);
  const memoryMb = Math.max(0,process.memoryUsage().heapUsed - memoryBefore) / 1024 / 1024;
  console.log('SCALE ' + size + ': build=' + buildMs.toFixed(2) + 'ms, search/filter=' + searchMs.toFixed(2) + 'ms, initial DOM model=' + firstPage.length + ', heap delta=' + memoryMb.toFixed(2) + 'MiB');
}

const draftCatalog = Core.createCatalog([
  {id:'published-track',title:'Published',titles:{en:'Published'},section:'stories',language:'EN',order:1,published:true,tags:[],audio:'content/mock/published.mp3'},
  {id:'draft-track',title:'Secret Draft',titles:{en:'Secret Draft'},section:'stories',language:'EN',order:2,published:false,tags:['hidden'],audio:'content/mock/draft.mp3'}
]);
assert.deepEqual(Core.queue(draftCatalog).map(track => track.id),['published-track']);
assert.equal(Core.filter(draftCatalog,{query:'Secret Draft'}).length,0);

console.log('VALID: Catalog scaling tests passed for 100, 500 and 1,000 tracks; draft exclusion passed; mock records were kept in memory only.');
