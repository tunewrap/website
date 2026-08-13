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
const adminCss=read('admin/site.css');
const html=read('index.html');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'admin/site.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.match(html,/<meta name="tunewrap-build" content="12\.14\.(?:12|13|14|15|16)">/);
assert.match(adminHtml,/\/admin\/site\.js\?v=12\.14\.(?:12|13|14)/);
assert.ok(adminHtml.includes('id="siteTranslationStatus"'));
assert.ok(adminCss.includes('.site-translation-status.is-success'));
assert.ok(adminCss.includes('.site-translation-status.is-error'));

// Execute the real split/rebuild helpers. A long Terms document must reach the
// API only as safe single-line units while preserving its paragraph layout.
const helperStart=admin.indexOf('function splitLongTranslationLine');
const helperEnd=admin.indexOf('\nfunction setTranslationStatus',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,'translation preparation helpers missing');
const sandbox={result:null};
vm.runInNewContext(
  `const TRANSLATION_UNIT_LIMIT=1800;${admin.slice(helperStart,helperEnd)}\n`+
  'result={splitLongTranslationLine,prepareTranslationEntry,prepareTranslationEntries};',
  sandbox
);

const longLine=('Это длинный пункт условий, который должен безопасно переводиться и сохранять смысл. ').repeat(80).trim();
const source=`Заголовок\n\n${longLine}\n\nФинальный абзац.`;
let committed='';
const prepared=sandbox.result.prepareTranslationEntry({
  id:'text.terms_body',
  text:source,
  set:(target,value)=>{if(target==='de')committed=value;}
});

assert.ok(prepared.units.length>3,'long Terms text was not split');
for(const unit of prepared.units){
  assert.ok(unit.text.length<=1800,`oversized unit: ${unit.text.length}`);
  assert.doesNotMatch(unit.text,/\r|\n/,'unit must be a single line');
}
const translations=Object.fromEntries(prepared.units.map(unit=>[unit.id,`DE:${unit.text}`]));
prepared.entry.set('de',prepared.compose(translations));
assert.ok(committed.startsWith('DE:Заголовок'));
assert.ok(committed.includes('\n\n'),'paragraph boundaries were lost');
assert.ok(committed.endsWith('DE:Финальный абзац.'));

// Translation targets remain independent, so an error in one locale never
// aborts the remaining UA/GE/DE work. Stage 12.14.13 strengthens this further
// by isolating errors field by field.
const targetStart=admin.indexOf('async function translatePreparedTarget');
const targetEnd=admin.indexOf('\nasync function autoTranslate',targetStart);
assert.ok(targetStart>=0&&targetEnd>targetStart,'atomic target translator missing');
const targetSource=admin.slice(targetStart,targetEnd);
assert.ok(targetSource.indexOf('prepared.forEach')>targetSource.indexOf('for(let offset='));
assert.ok(admin.includes('for(const target of targets){\n      try{'));
assert.ok(admin.includes('translateChunkWithRetry'));

assert.equal(pkg.scripts['siteautotranslate:test'],'node scripts/stage-12.14.12-site-autotranslate-completion-test.js');
assert.ok(pkg.scripts.test.includes('siteautotranslate:test'));

console.log('PASS: Stage 12.14.12 — Site CMS safely splits long multiline content and isolates EN/UA/GE/DE translation targets.');
