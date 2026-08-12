#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const admin=read('admin/site.js');
const adminHtml=read('admin/site.html');
const html=read('index.html');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'admin/site.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);
assert.match(html,/<meta name="tunewrap-build" content="12\.14\.(?:13|14|15)">/);
assert.match(adminHtml,/\/admin\/site\.js\?v=12\.14\.(?:13|14)/);
assert.equal(pkg.scripts['sitefieldrecovery:test'],'node scripts/stage-12.14.13-site-field-translation-recovery-test.js');
assert.ok(pkg.scripts.test.includes('sitefieldrecovery:test'));

const start=admin.indexOf('async function translatePreparedTarget');
const end=admin.indexOf('\nasync function autoTranslate',start);
assert.ok(start>=0&&end>start,'field recovery translator missing');

const source=admin.slice(start,end);
assert.ok(source.includes('async function translateResilient'));
assert.ok(source.includes('translateResilient(chunk.slice(0,middle))'));
assert.ok(source.includes('const failedFields=[]'));

async function verifyTarget(target){
  const commits={};
  const calls=[];
  const prepared=[
    field('text.hero_lead','hero'),
    field('text.terms_body','bad'),
    field('text.nav_cta','nav')
  ];
  const sandbox={
    TRANSLATION_BATCH_SIZE:8,
    AI_CODES:{ru:'RU',uk:'UA',ka:'GE'},
    setTranslationStatus(){},
    async translateChunkWithRetry(_source,_target,items){
      calls.push(items.map(item=>item.id));
      if(items.some(item=>item.id==='text.terms_body::0'))throw new Error('simulated model rejection');
      return Object.fromEntries(items.map(item=>[item.id,`${target.toUpperCase()}:${item.text}`]));
    },
    result:null
  };

  function field(id,text){
    return {
      entry:{id,set(language,value){commits[id]={language,value};}},
      units:[{id:`${id}::0`,text}],
      compose(translated){return translated[`${id}::0`];}
    };
  }

  vm.runInNewContext(`${source}\nresult=translatePreparedTarget;`,sandbox);
  const result=await sandbox.result('ru',target,prepared,{textContent:''});

  assert.deepEqual(Object.keys(commits).sort(),['text.hero_lead','text.nav_cta']);
  assert.equal(commits['text.hero_lead'].language,target);
  assert.equal(commits['text.nav_cta'].language,target);
  assert.equal(result.committedFields,2);
  assert.equal(result.totalFields,3);
  assert.equal(result.failedFields.length,1);
  assert.equal(result.failedFields[0].id,'text.terms_body');
  assert.equal(calls[0].length,3,'initial request should stay batched');
  assert.ok(calls.some(call=>call.length===1&&call[0]==='text.terms_body::0'),'bad field was not isolated');
}

Promise.all([verifyTarget('uk'),verifyTarget('ka')]).then(()=>{
  console.log('PASS: Stage 12.14.13 — failed UA/GE fields are isolated while every valid Site CMS field is preserved and can be saved.');
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
});
