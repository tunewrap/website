#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const route=fs.readFileSync(path.join(root,'functions','api','admin','translate.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'admin','admin.js'),'utf8');
const html=fs.readFileSync(path.join(root,'admin','index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

for(const file of ['admin/admin.js','functions/api/admin/translate.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);
}

assert.ok(route.includes("const FALLBACK_MODEL='@cf/meta/llama-3.1-8b-instruct-fast'"));
assert.ok(route.includes("const SECOND_FALLBACK_MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast'"));
assert.equal(route.includes('@cf/zai-org/glm-4.7-flash'),false);
assert.equal(route.includes('@cf/qwen/qwen3-30b-a3b-fp8'),false);
assert.ok(route.includes("response_format:{type:'json_schema',json_schema:TRANSLATION_SCHEMA}"));

const guardStart=route.indexOf('const AI_REASONING_PATTERNS=');
const guardEnd=route.indexOf('\nasync function runPrimaryOnce',guardStart);
assert.ok(guardStart>=0&&guardEnd>guardStart,'server translation guard missing');
const serverSandbox={result:null};
vm.runInNewContext(`${route.slice(guardStart,guardEnd)}\nresult={validateTranslatedLine,extractStructuredTranslation};`,serverSandbox);

const leakedReasoning=`Okay, let's tackle this translation. The user wants the Russian sentence translated into Ukrainian. First, I need to make sure I understand the original sentence correctly. Putting it all together, the final translation is: Таких я раніше не зустрічав.`;
assert.equal(serverSandbox.result.validateTranslatedLine(leakedReasoning,'Таких я раньше не встречал.','uk'),'');
assert.equal(serverSandbox.result.validateTranslatedLine('Таких я раніше не зустрічав.','Таких я раньше не встречал.','uk'),'Таких я раніше не зустрічав.');
assert.equal(serverSandbox.result.validateTranslatedLine('ასეთი ადრე არავინ შემხვედრია.','Таких я раньше не встречал.','ka'),'ასეთი ადრე არავინ შემხვედრია.');
assert.equal(serverSandbox.result.validateTranslatedLine('I had never met anyone like her before.','Таких я раньше не встречал.','en'),'I had never met anyone like her before.');
assert.equal(serverSandbox.result.validateTranslatedLine('Zeile eins\nZeile zwei','Одна строка','de'),'');
assert.equal(serverSandbox.result.extractStructuredTranslation({response:leakedReasoning}),'');
assert.equal(serverSandbox.result.extractStructuredTranslation({response:{translation:'Готово'}}),'Готово');
assert.equal(serverSandbox.result.extractStructuredTranslation({choices:[{message:{content:'{"translation":"Fertig"}'}}]}),'Fertig');

const clientStart=admin.indexOf('const AI_TRANSLATION_CONTAMINATION=');
const clientEnd=admin.indexOf('\nfunction missingTranslationTargets',clientStart);
assert.ok(clientStart>=0&&clientEnd>clientStart,'client contamination detector missing');
const clientSandbox={result:null,PRIMARY_LOCALE:{RU:'ru'},UI_LOCALES:[['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']]};
vm.runInNewContext(`${admin.slice(clientStart,clientEnd)}\nresult={isUnsafeMachineTranslation,hasUnsafeTranslations};`,clientSandbox);

assert.equal(clientSandbox.result.isUnsafeMachineTranslation('Таких я раньше не встречал.',leakedReasoning,'uk'),true);
assert.equal(clientSandbox.result.isUnsafeMachineTranslation('Таких я раньше не встречал.','Таких я раніше не зустрічав.','uk'),false);
const corruptedTrack={
  title:'Диана!',language:'RU',titles:{ru:'Диана!',uk:'Діана!'},descriptions:{ru:'История',uk:'Історія'},
  lyrics:{ru:'Таких я раньше не встречал.',uk:leakedReasoning}
};
assert.equal(clientSandbox.result.hasUnsafeTranslations(corruptedTrack),true);

assert.match(admin,/return Boolean\(track&&\(hasUnsafeTranslations\(track\)(?:\|\|missingTranslationTargets\(track\)\.length)?\)\);/);
assert.ok(admin.includes('needsBackgroundTranslation(isNew,metadataPatch,track)'));
assert.ok(admin.includes('isUnsafeMachineTranslation(sourceLyrics,targetLyrics,target'));
assert.ok(admin.includes('Commit each language independently'));
assert.ok(admin.includes('baseline=(await api(`/api/admin/tracks/${encodeURIComponent(saved.id)}`'));
assert.ok(/\/admin\/admin\.js\?v=12\.14\.(?:4|[5-9]|\d{2,})/.test(html));
assert.equal(pkg.scripts['admintranslation:test'],'node scripts/stage-12.14.4-translation-integrity-test.js');
assert.ok(pkg.scripts.test.includes('admintranslation:test'));

console.log('PASS: Stage 12.14.4 — AI reasoning is rejected, corrupted localizations are detected, and a publish queues their repair.');
