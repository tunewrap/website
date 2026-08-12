#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','js/app-bootstrap.js','js/script.js','js/site-cms-runtime.js',
  'admin/site.js','admin/site.html','admin/site-stage-12.12.css',
  'scripts/stage-12.12-site-polish-test.js',
  'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
  'scripts/stage-12.14.8-announcement-native-i18n-test.js','package.json'
];
const sources=new Map();
for(const relative of required){
  const target=path.join(root,...relative.split('/'));
  if(!fs.existsSync(target))throw new Error(`${relative} не найден. Распакуйте ZIP прямо в корень website.`);
  sources.set(relative,fs.readFileSync(target,'utf8'));
}
if(!sources.get('js/script.js').includes('__tuneWrapPricingFallback')){
  throw new Error('Сначала требуется установленный Stage 12.14.7. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.7 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}
function replaceAll(source,before,after,minimum,label){
  if(!source.includes(before)&&source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count<minimum)throw new Error(`${label}: найдено ${count}, ожидалось минимум ${minimum}. Файлы не изменены.`);
  return source.split(before).join(after);
}

let site=sources.get('js/site-cms-runtime.js');
const announcementAnchor='  function patchAnnouncement(){';
const announcementBlock=String.raw`  function normalizedAnnouncementIdentity(value){
    return String(value??'')
      .toLocaleLowerCase('ru-RU')
      .normalize('NFKC')
      .replace(/[^\p{Letter}\p{Number}]+/gu,' ')
      .trim();
  }

  function launchAnnouncementCopy(){
    const map={
      en:{label:'COMING SOON!',title:'',text:'We’re launching our project very soon.'},
      ru:{label:'СКОРО СТАРТ!',title:'',text:'Уже совсем скоро мы запускаем наш проект.'},
      uk:{label:'НЕЗАБАРОМ СТАРТ!',title:'',text:'Уже зовсім скоро ми запускаємо наш проєкт.'},
      ka:{label:'მალე ვიწყებთ!',title:'',text:'სულ მალე ჩვენს პროექტს ვიწყებთ.'},
      de:{label:'BALD GEHT ES LOS!',title:'',text:'Schon sehr bald starten wir unser Projekt.'}
    };
    return map[language()]||map.en;
  }

  function isKnownLaunchAnnouncement(locale){
    const identity=normalizedAnnouncementIdentity([
      locale?.announcement_label,
      locale?.announcement_title,
      locale?.announcement_text
    ].filter(Boolean).join(' '));
    if(!identity)return false;
    return [
      'СКОРО СТАРТ! Уже совсем скоро мы запускаем наш проект.',
      'COMING SOON! We’re launching our project very soon.',
      'НЕЗАБАРОМ СТАРТ! Уже зовсім скоро ми запускаємо наш проєкт.',
      'მალე ვიწყებთ! სულ მალე ჩვენს პროექტს ვიწყებთ.',
      'BALD GEHT ES LOS! Schon sehr bald starten wir unser Projekt.'
    ].some(value=>identity.includes(normalizedAnnouncementIdentity(value)));
  }

  function resolvedAnnouncementTexts(){
    const exact=localized(config.texts)||{};
    const hasExactContent=Boolean(
      String(exact.announcement_title||'').trim()||
      String(exact.announcement_text||'').trim()
    );
    if(hasExactContent)return exact;

    const locales=Object.values(config.texts?.locales||{});
    if(!locales.some(isKnownLaunchAnnouncement))return exact;

    // Stage 12.14.8: the launch announcement existed in D1 only in RU.
    // Supply its reviewed native copy without reintroducing a general RU/EN
    // fallback for arbitrary CMS content.
    const fallback=launchAnnouncementCopy();
    return {
      ...exact,
      announcement_label:String(exact.announcement_label||fallback.label).trim(),
      announcement_title:String(exact.announcement_title||fallback.title).trim(),
      announcement_text:String(exact.announcement_text||fallback.text).trim()
    };
  }

`;
if(!site.includes('function resolvedAnnouncementTexts(){')){
  const at=site.indexOf(announcementAnchor);
  if(at<0)throw new Error('Announcement resolver: ожидаемый Stage 12.14.7 не найден. Файлы не изменены.');
  site=site.slice(0,at)+announcementBlock+site.slice(at);
}
site=replaceOnce(site,
  "  function patchAnnouncement(){\n    const hero=$('#hero .hero-grid > div:first-child');\n    const heroSection=$('#hero');\n    const texts=localized(config.texts)||{};",
  "  function patchAnnouncement(){\n    const hero=$('#hero .hero-grid > div:first-child');\n    const heroSection=$('#hero');\n    const texts=resolvedAnnouncementTexts();",
  'Announcement locale resolver');

let admin=sources.get('admin/site.js');
const oldAdminNote="  note.textContent='Тексты объявления участвуют в кнопке «Автоперевести язык». Если период не указан, объявление показывается постоянно, пока включён переключатель.';";
const newAdminNote=[
  "  const missing=LANGUAGES.filter(code=>{",
  "    const copy=state.config.texts?.locales?.[code]||{};",
  "    return !String(copy.announcement_title||'').trim()&&!String(copy.announcement_text||'').trim();",
  "  });",
  "  const base='Тексты объявления участвуют в кнопке «Автоперевести язык». Если период не указан, объявление показывается постоянно, пока включён переключатель.';",
  "  if(announcement.enabled===true&&missing.length){",
  "    note.classList.add('is-warning');",
  "    note.textContent=`${base} Не заполнены языки: ${missing.map(code=>AI_CODES[code]).join(', ')}. Текущее стартовое объявление имеет встроенный перевод; перед изменением текста заполните все языки.`;",
  "  }else{",
  "    note.textContent=base;",
  "  }"
].join('\n');
admin=replaceOnce(admin,oldAdminNote,newAdminNote,'Admin announcement warning');

let adminCss=sources.get('admin/site-stage-12.12.css');
if(!adminCss.includes('.site-announcement-note.is-warning')){
  const cssAnchor=".site-announcement-note{\n  margin-top:10px;color:#817b83;font-size:11px;line-height:1.5;\n}\n";
  adminCss=replaceOnce(adminCss,cssAnchor,cssAnchor+".site-announcement-note.is-warning{\n  color:#d9a441;\n}\n",'Admin announcement warning style');
}

let adminHtml=sources.get('admin/site.html');
adminHtml=replaceOnce(adminHtml,
  '/admin/site-stage-12.12.css?v=12.12',
  '/admin/site-stage-12.12.css?v=12.14.8',
  'Admin CSS cache version');
adminHtml=replaceOnce(adminHtml,
  '/admin/site.js',
  '/admin/site.js?v=12.14.8',
  'Admin JS cache version');

let index=sources.get('index.html');
index=replaceOnce(index,'js/app-bootstrap.js?v=12.14.7','js/app-bootstrap.js?v=12.14.8','Public cache version');
let bootstrap=sources.get('js/app-bootstrap.js');
bootstrap=replaceAll(bootstrap,'?v=12.14.7','?v=12.14.8',12,'Module cache versions');

let sitePolishTest=sources.get('scripts/stage-12.12-site-polish-test.js');
sitePolishTest=replaceOnce(sitePolishTest,
  "assert.ok(adminHtml.includes('/admin/site-stage-12.12.css?v=12.12'));",
  "assert.match(adminHtml,/\\/admin\\/site-stage-12\\.12\\.css\\?v=12\\.(?:12|14\\.8)/);",
  'Stage 12.12 cache assertion');

let publicI18nTest=sources.get('scripts/stage-12.14.7-public-pricing-terms-i18n-test.js');
publicI18nTest=replaceOnce(publicI18nTest,
  "assert.ok(html.includes('js/app-bootstrap.js?v=12.14.7'));",
  "assert.match(html,/js\\/app-bootstrap\\.js\\?v=12\\.14\\.(?:7|8)/);",
  'Stage 12.14.7 HTML cache assertion');
publicI18nTest=replaceOnce(publicI18nTest,
  "])assert.ok(bootstrap.includes(`./${name}?v=12.14.7`),`cache version missing for ${name}`);",
  "])assert.match(bootstrap,new RegExp(`\\\\./${name.replace(/\\./g,'\\\\.')}\\\\?v=12\\\\.14\\\\.(?:7|8)`),`cache version missing for ${name}`);",
  'Stage 12.14.7 module cache assertion');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['announcementi18n:test']='node scripts/stage-12.14.8-announcement-native-i18n-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('announcementi18n:test'))pkg.scripts.test+=' && npm run announcementi18n:test';

const updates=new Map([
  ['index.html',index],['js/app-bootstrap.js',bootstrap],['js/site-cms-runtime.js',site],
  ['admin/site.js',admin],['admin/site.html',adminHtml],['admin/site-stage-12.12.css',adminCss],
  ['scripts/stage-12.12-site-polish-test.js',sitePolishTest],
  ['scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',publicI18nTest],
  ['package.json',JSON.stringify(pkg,null,2)+'\n']
]);
const rollback=new Map();
for(const [relative] of updates){
  const target=path.join(root,...relative.split('/'));
  rollback.set(target,fs.readFileSync(target));
}

try{
  for(const [relative,content] of updates){
    fs.writeFileSync(path.join(root,...relative.split('/')),content,'utf8');
  }
  const tests=[
    'scripts/site-cms-test.js','scripts/stage-12.12-site-polish-test.js',
    'scripts/stage-12.12.2-package-announcement-test.js',
    'scripts/stage-12.13.8-global-i18n-audit.js',
    'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js',
    'scripts/stage-12.14.8-announcement-native-i18n-test.js'
  ];
  for(const relative of tests){
    const result=spawnSync(process.execPath,[path.join(root,...relative.split('/'))],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${relative} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.8 Announcement Native I18N installed.');
console.log('PASS: the active launch announcement is native in EN/RU/UA/GE/DE.');
console.log('PASS: arbitrary Site CMS text still never crosses languages.');
console.log('PASS: Admin warns when a future announcement is missing locale copy.');
console.log('PASS: pricing, Terms, songs, orders, Admin and media behavior are unchanged.');
console.log('D1 migration: not required.');
