#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const admin=fs.readFileSync(path.join(root,'admin','admin.js'),'utf8');
const html=fs.readFileSync(path.join(root,'admin','index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'admin','admin.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.ok(admin.includes('Stage 12.14: Admin Editor Reliability'));
assert.ok(admin.includes("const keepActive=new Set(['previewButton','closePreviewButton','previewBackdrop'])"));
assert.ok(admin.includes("button.dataset.busyWasDisabled=button.disabled?'1':'0'"));
assert.ok(admin.includes("delete button.dataset.busyWasDisabled"));

const persistStart=admin.indexOf('async function persist(publish){');
assert.ok(persistStart>=0,'persist() missing');
const persistEnd=admin.indexOf('\nfunction showPreview',persistStart);
assert.ok(persistEnd>persistStart,'persist() end missing');
const persist=admin.slice(persistStart,persistEnd);

assert.ok(
  !persist.includes('track=await autoTranslateMissing(track)'),
  'persist() must not block on autoTranslateMissing()'
);
assert.ok(
  persist.includes('queueBackgroundTranslations(saved);return saved;'),
  'background translation queue must start only after successful persistence'
);

assert.ok(admin.includes('async function completeMissingTranslations(saved)'));
assert.ok(admin.includes("for(const field of ['titles','descriptions','lyrics'])"));
assert.ok(admin.includes('if(latestValue===beforeValue)'));
assert.ok(admin.includes("method:'PATCH'"));

assert.ok(
  html.includes('<script type="module" src="/admin/admin.js?v=12.14"></script>'),
  'Admin JS cache version missing'
);

assert.equal(
  pkg.scripts['admineditor:test'],
  'node scripts/stage-12.14-admin-editor-reliability-test.js'
);
assert.ok(pkg.scripts.test.includes('admineditor:test'));

console.log('PASS: Stage 12.14 — Admin preview/save/publish are decoupled from Workers AI translation.');
