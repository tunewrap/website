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
const endpoint=read('functions/api/admin/translate.js');
const html=read('index.html');
const adminHtml=read('admin/site.html');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'admin/site.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);
assert.match(html,/<meta name="tunewrap-build" content="12\.14\.(?:14|15)">/);
assert.ok(adminHtml.includes('/admin/site.js?v=12.14.14'));
assert.ok(endpoint.includes("const ALLOWED_LOCALES=Object.freeze(['ru','uk','ka','en','de'])"));

const start=admin.indexOf('async function translateChunk(source,target,items)');
const end=admin.indexOf('\nasync function translateChunkWithRetry',start);
assert.ok(start>=0&&end>start,'translateChunk missing');

async function sentTarget(target){
  let payload;
  const sandbox={
    AI_CODES:{ru:'RU',uk:'UA',ka:'GE',en:'EN',de:'DE'},
    fetch:async(_url,options)=>{
      payload=JSON.parse(options.body);
      return {ok:true,json:async()=>({ok:true,translations:{sample:'done'}})};
    },
    result:null
  };
  vm.runInNewContext(`${admin.slice(start,end)}\nresult=translateChunk;`,sandbox);
  await sandbox.result('ru',target,[{id:'sample',text:'Текст'}]);
  return payload.target;
}

Promise.all(['en','uk','ka','de'].map(sentTarget)).then(values=>{
  assert.deepEqual(values,['en','uk','ka','de']);
  assert.ok(!admin.includes('target:AI_CODES[target]'),'display codes must never be sent to translation API');
  assert.equal(pkg.scripts['sitelocalecodes:test'],'node scripts/stage-12.14.14-site-translation-locale-codes-test.js');
  assert.ok(pkg.scripts.test.includes('sitelocalecodes:test'));
  console.log('PASS: Stage 12.14.14 — Site CMS sends ISO targets en/uk/ka/de; UA/GE display labels can no longer invalidate Ukrainian or Georgian requests.');
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
});
