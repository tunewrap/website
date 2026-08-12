#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const admin=fs.readFileSync(path.join(root,'admin','admin.js'),'utf8');
const html=fs.readFileSync(path.join(root,'admin','index.html'),'utf8');
const tracksApi=fs.readFileSync(path.join(root,'functions','api','tracks.js'),'utf8');
const trackStore=fs.readFileSync(path.join(root,'functions','_shared','tracks.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'admin','admin.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.ok(admin.includes('Stage 12.14.3: Independent Admin Persistence'));
assert.ok(/\/admin\/admin\.js\?v=12\.14\.(?:3|[4-9]|\d{2,})/.test(html));
assert.ok(tracksApi.includes("'cache-control':'no-store'"));
assert.equal(tracksApi.includes('stale-while-revalidate'),false);

// Opening an editor must not copy Russian/English fallback text into another
// primary locale during an otherwise unrelated save.
assert.ok(admin.includes("nodes.description.value=track?.descriptions?.[primary]||''"));
assert.ok(admin.includes("nodes.lyrics.value=track?.lyrics?.[primary]||''"));
assert.ok(admin.includes("nodes.translation.value=track?.translation?.[primary]||''"));

const modelStart=admin.indexOf('const EDITABLE_METADATA_FIELDS=');
const modelEnd=admin.indexOf('function markAudioCommitted',modelStart);
assert.ok(modelStart>=0&&modelEnd>modelStart,'incremental metadata model missing');
const sandbox={result:null};
vm.runInNewContext(`${admin.slice(modelStart,modelEnd)}\nresult={buildMetadataPatch,needsBackgroundTranslation};`,sandbox);

const base={
  title:'Title',originalTitle:'Original',titles:{en:'Title'},descriptions:{en:'Story'},
  section:'stories',language:'EN',artist:'TuneWrap',album:'Album',category:{en:'Love'},
  categoryIds:['love'],tags:['tag'],lyrics:{en:'Lyrics'},translation:{en:'Alt'},order:1,featured:false
};

const variants={
  title:'New title',originalTitle:'New original',titles:{en:'New title'},descriptions:{en:'New story'},
  section:'author',language:'RU',artist:'Other',album:'Other album',category:{en:'Family'},
  categoryIds:['family'],tags:['new'],lyrics:{en:'New lyrics'},translation:{en:'New alt'},order:2,featured:true
};

assert.deepEqual(JSON.parse(JSON.stringify(sandbox.result.buildMetadataPatch(base,{...base}))),{});
for(const [field,value] of Object.entries(variants)){
  const patch=JSON.parse(JSON.stringify(sandbox.result.buildMetadataPatch(base,{...base,[field]:value})));
  assert.deepEqual(Object.keys(patch),[field],`${field} must be the only metadata field in its PATCH`);
  assert.deepEqual(patch[field],value,`${field} PATCH value changed`);
}
assert.equal(sandbox.result.needsBackgroundTranslation(false,{album:'New'}),false);
assert.equal(sandbox.result.needsBackgroundTranslation(false,{title:'New'}),true);
assert.equal(sandbox.result.needsBackgroundTranslation(true,{}),true);

const pStart=admin.indexOf('async function persist(publish){');
const pEnd=admin.indexOf('\nfunction showPreview',pStart);
assert.ok(pStart>=0&&pEnd>pStart,'persist() boundaries missing');
const persist=admin.slice(pStart,pEnd);

assert.ok(persist.includes('body:metadataPatch'));
assert.equal(persist.includes('method:\'PATCH\',body:track'),false);
assert.ok(persist.includes('markAudioCommitted(saved)'));
assert.ok(persist.includes('markCoverCommitted(saved)'));
assert.ok(persist.indexOf('markAudioCommitted(saved)')<persist.indexOf('if(state.coverFile){'));
assert.ok(persist.includes("else if(saved.published)"));
assert.ok(persist.includes("/unpublish`"));
assert.ok(persist.includes('if(translateAfterSave)queueBackgroundTranslations(saved)'));

for(const field of ['title','originalTitle','titles','descriptions','section','language','audio','cover','artwork','lyrics','translation','artist','album','category','categoryIds','tags','durationLabel','duration','audioQuality','order','featured']){
  assert.ok(trackStore.includes(`'${field}'`),`API PATCH allow-list missing ${field}`);
}
assert.ok(trackStore.includes('if(Object.prototype.hasOwnProperty.call(input,key))'));
assert.ok(trackStore.includes('next.published = current.published'));

assert.equal(pkg.scripts['adminindependent:test'],'node scripts/stage-12.14.3-independent-admin-persistence-test.js');
assert.ok(pkg.scripts.test.includes('adminindependent:test'));

console.log('PASS: Stage 12.14.3 — every Admin field patches independently; draft/publish and public refresh are deterministic.');
