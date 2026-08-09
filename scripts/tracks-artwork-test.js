#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const catalogData = require('../data/track-catalog.json');
const {FALLBACK_COVER,validatePackage} = require('./lib/track-tools');

const projectRoot = path.resolve(__dirname,'..');
const mimeByExtension = new Map([
  ['.png','image/png'],
  ['.jpg','image/jpeg'],
  ['.jpeg','image/jpeg'],
  ['.webp','image/webp'],
  ['.avif','image/avif'],
  ['.svg','image/svg+xml']
]);
const published = catalogData.tracks.filter(track => track.published && track.audio);
const failures = [];
let realCovers = 0;
let fallbackCovers = 0;

for(const track of published){
  try{
    assert.equal(typeof track.cover,'string','cover must be a frontend-ready string');
    assert.ok(track.cover.length > 0,'cover path is empty');
    assert.ok(!track.cover.includes('[object Object]'),'cover path contains [object Object]');
    assert.ok(!/content\/tracks\/content\/tracks\//.test(track.cover),'cover contains a doubled content/tracks path');
    assert.ok(!/assets\/assets\//.test(track.cover),'cover contains a doubled assets path');
    const absolute = path.resolve(projectRoot,track.cover);
    assert.ok(absolute.startsWith(projectRoot + path.sep),'cover resolves outside the project');
    assert.ok(fs.existsSync(absolute),'cover file does not exist: ' + track.cover);
    assert.ok(fs.statSync(absolute).isFile(),'cover path is not a file: ' + track.cover);
    fs.accessSync(absolute,fs.constants.R_OK);
    const extension = path.extname(absolute).toLowerCase();
    assert.ok(mimeByExtension.has(extension),'unsupported cover extension: ' + extension);
    assert.ok(track.artwork && typeof track.artwork.fallback === 'boolean','generated artwork metadata is missing');
    if(track.artwork.fallback){
      fallbackCovers += 1;
      assert.equal(track.cover,FALLBACK_COVER,'fallback track must use the branded fallback URL');
    } else {
      realCovers += 1;
      assert.ok(track.cover.startsWith('content/tracks/' + track.id + '/'),'real cover must resolve from its track package');
    }
  } catch(error){
    failures.push(track.id + ': ' + error.message);
  }
}

assert.deepEqual(failures,[],'broken cover records:\n' + failures.join('\n'));
assert.equal(new Set(published.map(track => track.id)).size,published.length,'published track IDs are unique');

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(),'tunewrap-cover-validation-'));
try{
  const packageDir = path.join(temporaryRoot,'missing-cover-test');
  fs.mkdirSync(packageDir);
  fs.writeFileSync(path.join(packageDir,'track.json'),JSON.stringify({
    id:'missing-cover-test',
    title:'Missing Cover Test',
    section:'stories',
    language:'EN',
    cover:'cover.webp',
    order:1,
    published:false
  }));
  const result = validatePackage(temporaryRoot,packageDir,{probe:false});
  assert.ok(result.errors.some(message => message.includes('Track "missing-cover-test" cover file not found: content/tracks/missing-cover-test/cover.webp') || message.includes('Track "missing-cover-test" cover file not found: missing-cover-test/cover.webp')),
    'missing configured cover produces a precise validation error');
} finally {
  fs.rmSync(temporaryRoot,{recursive:true,force:true});
}

console.log('Published tracks: ' + published.length);
console.log('Tracks with real covers: ' + realCovers);
console.log('Tracks using fallback: ' + fallbackCovers);
console.log('Broken cover paths: 0');
console.log('VALID: generated cover paths, files, supported MIME mappings and missing-cover build protection passed.');
