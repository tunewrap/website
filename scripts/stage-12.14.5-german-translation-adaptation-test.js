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

const serverStart=route.indexOf('const AI_REASONING_PATTERNS=');
const serverEnd=route.indexOf('\nasync function runPrimaryOnce',serverStart);
assert.ok(serverStart>=0&&serverEnd>serverStart,'server language guard missing');
const serverSandbox={result:null};
vm.runInNewContext(`${route.slice(serverStart,serverEnd)}\nresult={validateTranslatedLine,looksEnglishInsteadOfGerman};`,serverSandbox);

const english='I had never met anyone like her before.';
const german='So jemandem war ich noch nie zuvor begegnet.';
assert.equal(serverSandbox.result.validateTranslatedLine(english,'Таких я раньше не встречал.','de',english),'');
assert.equal(serverSandbox.result.validateTranslatedLine(english,'Таких я раньше не встречал.','de',''),'');
assert.equal(serverSandbox.result.validateTranslatedLine(german,'Таких я раньше не встречал.','de',english),german);
assert.equal(serverSandbox.result.validateTranslatedLine('Diana','Диана','de','Diana'),'Diana');
assert.equal(serverSandbox.result.looksEnglishInsteadOfGerman('Our Way. Our Choice.'),false);
assert.equal(serverSandbox.result.looksEnglishInsteadOfGerman('This is the story of a love that will never end.'),true);

assert.ok(route.includes("const avoidText=String(item?.avoidText||'').trim()"));
assert.ok(route.includes('translateText(context.env.AI,item.text,source,target,item.avoidText)'));

const clientStart=admin.indexOf('const AI_TRANSLATION_CONTAMINATION=');
const clientEnd=admin.indexOf('\nfunction missingTranslationTargets',clientStart);
assert.ok(clientStart>=0&&clientEnd>clientStart,'client German detector missing');
const clientSandbox={result:null,PRIMARY_LOCALE:{RU:'ru'},UI_LOCALES:[['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']]};
vm.runInNewContext(`${admin.slice(clientStart,clientEnd)}\nresult={isUnsafeMachineTranslation,hasUnsafeTranslations,looksEnglishInsteadOfGerman};`,clientSandbox);

assert.equal(clientSandbox.result.isUnsafeMachineTranslation('Таких я раньше не встречал.',english,'de',english),true);
assert.equal(clientSandbox.result.isUnsafeMachineTranslation('Таких я раньше не встречал.',german,'de',english),false);
assert.equal(clientSandbox.result.isUnsafeMachineTranslation('Диана','Diana','de','Diana'),false);

const copiedTrack={
  title:'Диана!',language:'RU',titles:{ru:'Диана!',en:'Diana!',de:'Diana!'},
  descriptions:{ru:'История этой встречи.',en:'The story of this meeting.',de:'Die Geschichte dieser Begegnung.'},
  lyrics:{ru:'Таких я раньше не встречал.',en:english,de:english}
};
assert.equal(clientSandbox.result.hasUnsafeTranslations(copiedTrack),true);

assert.ok(admin.includes("locale==='de'?track.lyrics?.en:''"));
assert.ok(admin.includes("buildLineItems('lyrics',sourceLyrics,englishLyrics)"));
assert.ok(admin.includes("avoidText:englishTitle"));
assert.match(html,/\/admin\/admin\.js\?v=12\.14\.(?:[5-9]|\d{2,})/);
assert.equal(pkg.scripts['admingerman:test'],'node scripts/stage-12.14.5-german-translation-adaptation-test.js');
assert.ok(pkg.scripts.test.includes('admingerman:test'));

console.log('PASS: Stage 12.14.5 — English text cannot pass as German; DE repair remains isolated from other locales.');
