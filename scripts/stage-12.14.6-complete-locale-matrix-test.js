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
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'admin','admin.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

const needsStart=admin.indexOf('function needsBackgroundTranslation');
const needsEnd=admin.indexOf('\nfunction markAudioCommitted',needsStart);
const guardStart=admin.indexOf('function isCollapsedStructuredTranslation');
const guardEnd=admin.indexOf('\nfunction buildLineItems',guardStart);
assert.ok(needsStart>=0&&needsEnd>needsStart,'background translation trigger missing');
assert.ok(guardStart>=0&&guardEnd>guardStart,'locale completeness guard missing');

const UI_LOCALES=[['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']];
const PRIMARY_LOCALE={RU:'ru',UA:'uk',GE:'ka',EN:'en',DE:'de'};
const sandbox={result:null,UI_LOCALES,PRIMARY_LOCALE};
vm.runInNewContext(
  `${admin.slice(needsStart,needsEnd)}\n${admin.slice(guardStart,guardEnd)}\n`+
  'result={needsBackgroundTranslation,missingTranslationTargets};',
  sandbox
);

const localized={
  en:{title:'A Family Song',description:'A warm story about a loving family.',lyrics:'Verse one\nWe stay together through every day.'},
  ru:{title:'Песня о семье',description:'Тёплая история о любящей семье.',lyrics:'Куплет первый\nМы каждый день остаёмся вместе.'},
  uk:{title:'Пісня про родину',description:'Тепла історія про люблячу родину.',lyrics:'Куплет перший\nМи щодня залишаємося разом.'},
  ka:{title:'სიმღერა ოჯახზე',description:'თბილი ამბავი მოსიყვარულე ოჯახის შესახებ.',lyrics:'პირველი სტროფი\nჩვენ ყოველდღე ერთად ვრჩებით.'},
  de:{title:'Ein Lied über die Familie',description:'Eine warme Geschichte über eine liebevolle Familie.',lyrics:'Erste Strophe\nWir bleiben jeden Tag zusammen.'}
};

function completeTrack(language){
  const source=PRIMARY_LOCALE[language];
  return {
    language,
    title:localized[source].title,
    titles:Object.fromEntries(UI_LOCALES.map(([locale])=>[locale,localized[locale].title])),
    descriptions:Object.fromEntries(UI_LOCALES.map(([locale])=>[locale,localized[locale].description])),
    lyrics:Object.fromEntries(UI_LOCALES.map(([locale])=>[locale,localized[locale].lyrics]))
  };
}

for(const language of Object.keys(PRIMARY_LOCALE)){
  const source=PRIMARY_LOCALE[language];
  const sourceOnly={
    language,
    title:localized[source].title,
    titles:{[source]:localized[source].title},
    descriptions:{[source]:localized[source].description},
    lyrics:{[source]:localized[source].lyrics}
  };
  const expected=UI_LOCALES.map(([locale])=>locale).filter(locale=>locale!==source);
  assert.deepEqual(Array.from(sandbox.result.missingTranslationTargets(sourceOnly)),expected,
    `${language} source must request every other UI locale`);
  assert.equal(sandbox.result.needsBackgroundTranslation(false,{},sourceOnly),true,
    `${language} no-op publish must resume missing translations`);

  const complete=completeTrack(language);
  assert.deepEqual(Array.from(sandbox.result.missingTranslationTargets(complete)),[]);
  assert.equal(sandbox.result.needsBackgroundTranslation(false,{},complete),false);

  for(const target of expected){
    for(const field of ['titles','descriptions','lyrics']){
      const missing=completeTrack(language);
      delete missing[field][target];
      assert.ok(sandbox.result.missingTranslationTargets(missing).includes(target),
        `${language} -> ${target} must repair a missing ${field}`);
      assert.equal(sandbox.result.needsBackgroundTranslation(false,{},missing),true,
        `${language} -> ${target} missing ${field} must resume on no-op publish`);
    }
  }
}

assert.ok(admin.includes('hasUnsafeTranslations(track)||missingTranslationTargets(track).length'));
assert.ok(admin.includes('queueBackgroundTranslations(saved)'));
assert.ok(html.includes('/admin/admin.js?v=12.14.6'));
assert.equal(pkg.scripts['adminlocales:test'],'node scripts/stage-12.14.6-complete-locale-matrix-test.js');
assert.ok(pkg.scripts.test.includes('adminlocales:test'));

console.log('PASS: Stage 12.14.6 — every RU/UA/GE/EN/DE source completes every other interface locale, including no-op publish repair.');
