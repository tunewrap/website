#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const catalogData = require('../data/track-catalog.json');
const Core = require('../js/catalog-core.js');

const EXPECTED_STORIES = [
  'story-127-ru',
  'main-road-ru',
  'natalia-65-ru',
  'grow-old-together-ua',
  'just-five-more-minutes-en',
  'diana-ru',
  'best-husband-father-ru',
  'everything-begins-ua',
  'five-more-minutes-ua',
  'grow-old-together-en',
  'neues-leben-de',
  'grow-old-together-ge',
  'five-more-minutes-ge'
];
const EXPECTED_AUTHOR = [
  'amsterdam-ru',
  'my-choice-ua',
  'tbilisi-ua',
  'tbilisi-ge',
  'good-vibe-en',
  'pulse-of-the-night-en',
  'amsterdam-en',
  'my-choice-en',
  'ya-ya-ya-en',
  'i-do-what-i-want-ua',
  'ya-ya-ya-alternative-en',
  'days-pass-ua',
  'on-the-ashes-ua',
  'new-flight-ua',
  'no-way-back-ua',
  'our-way-53-en'
];

function queueFor(rawTracks){
  return Core.queue(Core.createCatalog(rawTracks));
}

function nextId(queue,id){
  const index = queue.findIndex(track => track.id === id);
  assert.notEqual(index,-1,'track is present: ' + id);
  return queue[(index + 1) % queue.length].id;
}

function previousId(queue,id){
  const index = queue.findIndex(track => track.id === id);
  assert.notEqual(index,-1,'track is present: ' + id);
  return queue[(index - 1 + queue.length) % queue.length].id;
}

const catalog = Core.createCatalog(catalogData.tracks);
const playable = catalog.filter(track => track.published && track.audio);
const queue = Core.queue(catalog);
const ids = queue.map(track => track.id);
const storyIds = queue.filter(track => track.section === 'stories').map(track => track.id);
const authorIds = queue.filter(track => track.section === 'author').map(track => track.id);

assert.equal(queue.length,playable.length,'queue length equals all published playable tracks');
assert.equal(new Set(ids).size,queue.length,'every published playable track appears exactly once');
assert.deepEqual(storyIds,EXPECTED_STORIES,'all Stories use explicit section-local order');
assert.deepEqual(authorIds,EXPECTED_AUTHOR,'all Author tracks use explicit section-local order');
assert.deepEqual(ids,[...EXPECTED_STORIES,...EXPECTED_AUTHOR],'global queue is Stories followed by Author');

const bestDadIndex = ids.indexOf('best-husband-father-ru');
assert.deepEqual(ids.slice(bestDadIndex - 1,bestDadIndex + 3),[
  'diana-ru',
  'best-husband-father-ru',
  'everything-begins-ua',
  'five-more-minutes-ua'
],'the regression path continues with Musical Stories after Best Husband and Dad');
assert.equal(nextId(queue,'five-more-minutes-ge'),'amsterdam-ru','last Story advances to first Author');
assert.equal(previousId(queue,'amsterdam-ru'),'five-more-minutes-ge','first Author returns to last Story');
assert.equal(nextId(queue,'our-way-53-en'),'story-127-ru','last Author wraps to first Story');
assert.equal(previousId(queue,'story-127-ru'),'our-way-53-en','first Story wraps back to last Author');
assert.equal(nextId(queue,'grow-old-together-en'),'neues-leben-de','manual start at Story #10 continues globally');
assert.equal(nextId(queue,'tbilisi-ua'),'tbilisi-ge','manual start at Author #3 continues inside Author');

const beforeUiQueries = ids.join('|');
Core.filter(catalog,{section:'stories',language:'GE'});
Core.filter(catalog,{section:'stories',query:'Лучший муж'});
Core.featured(catalog,'stories');
assert.equal(Core.queue(catalog).map(track => track.id).join('|'),beforeUiQueries,'filters, search and Featured do not mutate playback queue');

const newStory = {
  ...catalogData.tracks.find(track => track.section === 'stories'),
  id:'new-story-test',
  order:14,
  featured:false,
  title:'New Story',
  originalTitle:'New Story',
  titles:{en:'New Story'}
};
const newAuthor = {
  ...catalogData.tracks.find(track => track.section === 'author'),
  id:'new-author-test',
  order:17,
  featured:false,
  title:'New Author',
  originalTitle:'New Author',
  titles:{en:'New Author'}
};
const futureQueue = queueFor([newAuthor,...catalogData.tracks,newStory]);
const futureIds = futureQueue.map(track => track.id);
assert.equal(futureQueue.length,31,'future metadata entries are added without losing existing tracks');
assert.equal(new Set(futureIds).size,futureQueue.length,'future queue remains unique');
assert.equal(futureIds[13],'new-story-test','new Story stays inside the Stories block');
assert.equal(futureIds[14],'amsterdam-ru','Author boundary moves after the new Story');
assert.equal(futureIds.at(-1),'new-author-test','new Author stays inside the Author block');
ids.forEach(id => assert.ok(futureIds.includes(id),'future queue retains ' + id));

console.log('GLOBAL PLAYBACK QUEUE');
queue.forEach((track,index) => console.log(String(index + 1).padStart(2,'0') + '. [' + track.section.toUpperCase() + '] ' + track.id));
console.log('STORIES: ' + storyIds.length + ' tracks');
console.log('AUTHOR: ' + authorIds.length + ' tracks');
console.log('TOTAL: ' + queue.length);
console.log('VALID: queue boundaries, wrap-around, UI-entry invariance and future metadata insertion passed.');
