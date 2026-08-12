#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const admin=fs.readFileSync(path.join(root,'admin','admin.js'),'utf8');
const html=fs.readFileSync(path.join(root,'admin','index.html'),'utf8');
const upload=fs.readFileSync(path.join(root,'functions','_shared','upload.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'admin','admin.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.ok(admin.includes('Stage 12.14.2: Incremental Admin Editor'));
assert.ok(admin.includes('editorAbortController:null'));
assert.ok(admin.includes("'closeEditorButton'"));
assert.ok(admin.includes('state.editorAbortController.abort()'));
assert.ok(admin.includes('const operation=new AbortController()'));
assert.ok(admin.includes('async function editorApi('));
assert.ok(admin.includes('Сервер не ответил за 20 секунд'));
assert.ok(admin.includes('xhr.timeout=120000'));
assert.ok(admin.includes('editorXhrUpload'));

const pStart=admin.indexOf('async function persist(publish){');
const pEnd=admin.indexOf('\nfunction showPreview',pStart);
const persist=admin.slice(pStart,pEnd);

assert.ok(persist.includes('await editorApi('));
assert.ok(persist.includes('if(state.audioFile){'));
assert.ok(persist.includes('if(state.coverFile){'));
assert.ok(persist.includes("error?.name==='AbortError'"));
assert.equal(persist.includes('track=await autoTranslateMissing(track)'),false);

const vStart=admin.indexOf('function validateClient(');
const vEnd=admin.indexOf('\nfunction showErrors',vStart);
const validator=admin.slice(vStart,vEnd);
assert.equal(/lyrics.*push\(/.test(validator),false);
assert.equal(/description.*push\(/.test(validator),false);
assert.equal(/translation.*push\(/.test(validator),false);

assert.equal(upload.includes('await reader.cancel();'),false);
assert.ok(upload.includes('reader.cancel().catch(()=>{});'));
assert.ok(/\/admin\/admin\.js\?v=12\.14(?:\.\d+)?/.test(html));

assert.equal(pkg.scripts['adminincremental:test'],'node scripts/stage-12.14.2-incremental-admin-editor-test.js');
assert.ok(pkg.scripts.test.includes('adminincremental:test'));

console.log('PASS: Stage 12.14.2 — incremental Admin editor is cancelable, time-bounded and media-optional.');
