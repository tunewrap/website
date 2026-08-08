#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {commandAvailable,formatResult,listPackages,validatePackage} = require('./lib/track-tools');

const projectRoot = path.resolve(__dirname,'..');
const inboxRoot = path.join(projectRoot,'content/inbox');
const tracksRoot = path.join(projectRoot,'content/tracks');
const packages = listPackages(inboxRoot);
if(!packages.length){
  console.log('INBOX is empty. Add one track package folder to content/inbox/ and run npm run tracks:import.');
  process.exit(0);
}

const probe = commandAvailable('ffprobe');
const results = packages.map(packageDir => validatePackage(projectRoot,packageDir,{probe}));
results.flatMap(formatResult).forEach(message => console.log(message));
const existingTracks = listPackages(tracksRoot)
  .map(packageDir => validatePackage(projectRoot,packageDir,{probe}))
  .map(result => result.track)
  .filter(Boolean);
const existingIds = new Set(existingTracks.map(track => track.id));
const orderKey = track => track.section + ':' + track.order;
const existingOrders = new Map(existingTracks.filter(track => track.published).map(track => [orderKey(track),track.id]));
const existingFeatured = new Map(existingTracks.filter(track => track.published && track.featured).map(track => [track.section,track.id]));
const inboxIds = new Set();
const inboxOrders = new Map();
const inboxFeatured = new Map();
for(const result of results){
  const track = result.track;
  if(!track) continue;
  if(existingIds.has(track.id) || inboxIds.has(track.id)) result.errors.push('Duplicate track id: ' + track.id);
  else inboxIds.add(track.id);
  if(track.published){
    const scopedOrder = orderKey(track);
    const orderOwner = existingOrders.get(scopedOrder) || inboxOrders.get(scopedOrder);
    if(orderOwner) result.errors.push('Published order ' + track.order + ' in ' + track.section + ' is already used by ' + orderOwner);
    else inboxOrders.set(scopedOrder,track.id);
    if(track.featured){
      const featuredOwner = existingFeatured.get(track.section) || inboxFeatured.get(track.section);
      if(featuredOwner) result.errors.push('Featured track for ' + track.section + ' already exists: ' + featuredOwner);
      else inboxFeatured.set(track.section,track.id);
    }
  }
  result.errors.forEach(message => console.error('ERROR: ' + result.folder + '\n  ' + message));
}
if(results.some(result => result.errors.length)){
  console.error('\nImport cancelled. No package was moved.');
  process.exit(1);
}

fs.mkdirSync(tracksRoot,{recursive:true});
for(const result of results){
  const source = path.join(inboxRoot,result.folder);
  const target = path.join(tracksRoot,result.track.id);
  fs.renameSync(source,target);
  console.log('IMPORTED: ' + result.track.id);
}

const build = spawnSync(process.execPath,[path.join(__dirname,'tracks-build.js')],{stdio:'inherit'});
process.exit(build.status || 0);
