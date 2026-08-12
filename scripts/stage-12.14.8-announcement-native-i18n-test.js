#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const runtime=read('js/site-cms-runtime.js');
const admin=read('admin/site.js');
const adminHtml=read('admin/site.html');
const adminCss=read('admin/site-stage-12.12.css');
const html=read('index.html');
const bootstrap=read('js/app-bootstrap.js');
const pkg=JSON.parse(read('package.json'));

for(const relative of ['js/site-cms-runtime.js','admin/site.js','js/app-bootstrap.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,relative)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${relative}\n${syntax.stderr||syntax.stdout}`);
}

const localeStart=runtime.indexOf('function language()');
const localeEnd=runtime.indexOf('\n  function normalize',localeStart);
const announcementStart=runtime.indexOf('function normalizedAnnouncementIdentity');
const announcementEnd=runtime.indexOf('\n  function patchAnnouncement',announcementStart);
assert.ok(localeStart>=0&&localeEnd>localeStart,'site locale resolver missing');
assert.ok(announcementStart>=0&&announcementEnd>announcementStart,'announcement resolver missing');

const source={
  announcement_label:'СКОРО СТАРТ!',
  announcement_title:'',
  announcement_text:'Уже совсем скоро мы запускаем наш проект.'
};
const expected={
  en:{label:'COMING SOON!',text:'We’re launching our project very soon.'},
  ru:{label:'СКОРО СТАРТ!',text:'Уже совсем скоро мы запускаем наш проект.'},
  uk:{label:'НЕЗАБАРОМ СТАРТ!',text:'Уже зовсім скоро ми запускаємо наш проєкт.'},
  ka:{label:'მალე ვიწყებთ!',text:'სულ მალე ჩვენს პროექტს ვიწყებთ.'},
  de:{label:'BALD GEHT ES LOS!',text:'Schon sehr bald starten wir unser Projekt.'}
};

function resolve(language,locales){
  const sandbox={
    window:{TuneWrapLanguage:{get:()=>language}},
    config:{texts:{locales}},
    result:null
  };
  vm.runInNewContext(
    `${runtime.slice(localeStart,localeEnd)}\n${runtime.slice(announcementStart,announcementEnd)}\n`+
    'result=resolvedAnnouncementTexts();',
    sandbox
  );
  return sandbox.result;
}

// The live configuration has only RU announcement copy. Every public locale
// must receive reviewed native wording for this exact launch announcement.
for(const [language,copy] of Object.entries(expected)){
  const resolved=resolve(language,{ru:source});
  assert.equal(resolved.announcement_label,copy.label,`${language} label`);
  assert.equal(resolved.announcement_text,copy.text,`${language} text`);
}

// Exact CMS copy remains authoritative, and an unrelated future announcement
// is never replaced with the old launch wording.
const exact=resolve('de',{ru:source,de:{announcement_label:'AKTUELL',announcement_text:'Eigener deutscher Text.'}});
assert.equal(exact.announcement_label,'AKTUELL');
assert.equal(exact.announcement_text,'Eigener deutscher Text.');
assert.equal(Object.keys(resolve('en',{ru:{announcement_label:'ВАЖНО',announcement_text:'Другой текст.'}})).length,0);

assert.ok(admin.includes('Не заполнены языки:'));
assert.ok(admin.includes('перед изменением текста заполните все языки'));
assert.ok(adminCss.includes('.site-announcement-note.is-warning'));
assert.ok(adminHtml.includes('/admin/site.js?v=12.14.8'));
assert.ok(adminHtml.includes('/admin/site-stage-12.12.css?v=12.14.8'));

assert.ok(html.includes('js/app-bootstrap.js?v=12.14.8'));
for(const name of ['script.js','pricing-cms-runtime.js','site-cms-runtime.js','orders-submit.js','ux-critical-fixes.js']){
  assert.ok(bootstrap.includes(`./${name}?v=12.14.8`),`cache version missing for ${name}`);
}

assert.equal(pkg.scripts['announcementi18n:test'],'node scripts/stage-12.14.8-announcement-native-i18n-test.js');
assert.ok(pkg.scripts.test.includes('announcementi18n:test'));

console.log('PASS: Stage 12.14.8 — the active launch announcement renders in native EN/RU/UA/GE/DE, while arbitrary CMS text never crosses locales.');
