#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}

[
  'functions/_shared/site-content.js',
  'admin/site.html',
  'admin/site.js',
  'js/site-cms-runtime.js',
  'js/app-bootstrap.js',
  'css/stage-12.12-site-polish.css',
  'admin/site-stage-12.12.css',
  'package.json'
].forEach(read);

/* Site CMS JSON schema extension — no D1 migration */
let shared=read('functions/_shared/site-content.js');

if(!shared.includes('function cleanAnnouncement(value)')){
  const anchor='export function normalizeSiteContentConfig(value){';
  const at=shared.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.12: Site CMS normalize anchor not found.');

  const helper=`function cleanDate(value){
  const raw=cleanText(value,20);
  return /^\\d{4}-\\d{2}-\\d{2}$/.test(raw)?raw:'';
}

function cleanAnnouncement(value){
  const source=value&&typeof value==='object'?value:{};
  return {
    enabled:source.enabled===true,
    startDate:cleanDate(source.startDate),
    endDate:cleanDate(source.endDate)
  };
}

`;
  shared=shared.slice(0,at)+helper+shared.slice(at);
}

if(!shared.includes('announcement:cleanAnnouncement(value.announcement)')){
  const token='payments:cleanPayments(value.payments)';
  const at=shared.indexOf(token);
  if(at<0)throw new Error('Stage 12.12: Site CMS payments anchor not found.');
  shared=shared.slice(0,at)+
    'payments:cleanPayments(value.payments),\n    announcement:cleanAnnouncement(value.announcement)'+
    shared.slice(at+token.length);
}
write('functions/_shared/site-content.js',shared);

/* Admin payment wording + announcement editor */
let adminJs=read('admin/site.js');
adminJs=adminJs.replace(
  "toggle.append(check,document.createTextNode('Показывать'));",
  "toggle.append(check,document.createTextNode('Показывать на сайте'));"
);

if(!adminJs.includes('function renderAnnouncement(){')){
  const anchor='function render(){';
  const at=adminJs.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.12: admin render() anchor not found.');

  const block=`function renderAnnouncement(){
  let section=$('#siteAnnouncementSection');
  if(!section){
    section=document.createElement('section');
    section.id='siteAnnouncementSection';
    section.className='form-section site-section site-announcement-admin';
    $('#siteSaveBar')?.insertAdjacentElement('beforebegin',section);
  }

  state.config.announcement ||= {enabled:false,startDate:'',endDate:''};
  const announcement=state.config.announcement;
  const locale=texts();

  section.replaceChildren();

  const heading=document.createElement('div');
  heading.className='section-heading';
  heading.innerHTML='<span>10</span><div><h2>Новости / уведомление на главной</h2><p>Акции, важные сообщения, временная недоступность и другие объявления. Можно задать период показа.</p></div>';
  section.appendChild(heading);

  const controls=document.createElement('div');
  controls.className='site-announcement-controls';

  const enabled=document.createElement('label');
  enabled.className='site-announcement-switch';
  const checkbox=document.createElement('input');
  checkbox.type='checkbox';
  checkbox.checked=announcement.enabled===true;
  checkbox.addEventListener('change',()=>{announcement.enabled=checkbox.checked;markDirty();});
  enabled.append(checkbox,document.createTextNode('Показывать на главной'));
  controls.appendChild(enabled);

  const dateField=(label,key)=>{
    const wrap=document.createElement('label');
    wrap.className='site-announcement-date';
    const title=document.createElement('span');
    title.textContent=label;
    const input=document.createElement('input');
    input.type='date';
    input.value=announcement[key]||'';
    input.addEventListener('change',()=>{announcement[key]=input.value;markDirty();});
    wrap.append(title,input);
    return wrap;
  };

  controls.append(
    dateField('Показывать с','startDate'),
    dateField('Показывать до','endDate')
  );
  section.appendChild(controls);

  const grid=document.createElement('div');
  grid.className='site-fields-grid';
  grid.append(
    makeField('Метка',locale.announcement_label||'',value=>{locale.announcement_label=value;},{help:'Например: НОВОСТИ, ВАЖНО, АКЦИЯ'}),
    makeField('Заголовок',locale.announcement_title||'',value=>{locale.announcement_title=value;},{wide:true}),
    makeField('Текст объявления',locale.announcement_text||'',value=>{locale.announcement_text=value;},{textarea:4,wide:true})
  );
  section.appendChild(grid);

  const note=document.createElement('p');
  note.className='site-announcement-note';
  note.textContent='Тексты объявления участвуют в кнопке «Автоперевести язык». Если период не указан, объявление показывается постоянно, пока включён переключатель.';
  section.appendChild(note);
}

`;
  adminJs=adminJs.slice(0,at)+block+adminJs.slice(at);
}

if(!adminJs.includes('  renderAnnouncement();')){
  const token='  renderPayments();';
  const at=adminJs.indexOf(token,adminJs.indexOf('function render(){'));
  if(at<0)throw new Error('Stage 12.12: renderPayments() in render() not found.');
  const insertAt=at+token.length;
  adminJs=adminJs.slice(0,insertAt)+'\n  renderAnnouncement();'+adminJs.slice(insertAt);
}
write('admin/site.js',adminJs);

/* Admin stylesheet */
let adminHtml=read('admin/site.html');
if(!adminHtml.includes('/admin/site-stage-12.12.css')){
  const token='<link rel="stylesheet" href="/admin/site.css">';
  const at=adminHtml.indexOf(token);
  if(at<0)throw new Error('Stage 12.12: admin site.css link not found.');
  const insertAt=at+token.length;
  adminHtml=adminHtml.slice(0,insertAt)+'\n  <link rel="stylesheet" href="/admin/site-stage-12.12.css?v=12.12">'+adminHtml.slice(insertAt);
}
write('admin/site.html',adminHtml);

/* Public homepage announcement runtime */
let runtime=read('js/site-cms-runtime.js');
if(!runtime.includes('function patchAnnouncement(){')){
  const anchor='  function ensureTermsPanel(){';
  const at=runtime.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.12: public terms anchor not found.');

  const block=`  function announcementTodayKey(){
    const now=new Date();
    const y=now.getFullYear();
    const m=String(now.getMonth()+1).padStart(2,'0');
    const d=String(now.getDate()).padStart(2,'0');
    return \`\${y}-\${m}-\${d}\`;
  }

  function announcementDateLocale(){
    return {ru:'ru-RU',uk:'uk-UA',ka:'ka-GE',en:'en-US',de:'de-DE'}[language()]||'ru-RU';
  }

  function formatAnnouncementDate(value){
    if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(value||'')))return '';
    const [year,month,day]=value.split('-').map(Number);
    const date=new Date(year,month-1,day);
    if(Number.isNaN(date.getTime()))return '';
    return new Intl.DateTimeFormat(announcementDateLocale(),{day:'numeric',month:'short'}).format(date);
  }

  function announcementRangeText(announcement){
    const start=formatAnnouncementDate(announcement?.startDate);
    const end=formatAnnouncementDate(announcement?.endDate);
    if(start&&end)return start===end?start:\`\${start} — \${end}\`;
    return start||end||'';
  }

  function announcementIsActive(announcement,texts){
    if(announcement?.enabled!==true)return false;
    if(!String(texts?.announcement_title||'').trim()&&!String(texts?.announcement_text||'').trim())return false;
    const today=announcementTodayKey();
    const start=String(announcement.startDate||'');
    const end=String(announcement.endDate||'');
    if(start&&today<start)return false;
    if(end&&today>end)return false;
    return true;
  }

  function patchAnnouncement(){
    const hero=$('#hero .hero-grid > div:first-child');
    const texts=localized(config.texts)||{};
    const announcement=config.announcement||{};
    if(!hero)return;

    let node=$('#heroAnnouncement');
    if(!node){
      node=document.createElement('aside');
      node.id='heroAnnouncement';
      node.className='hero-announcement';
      node.setAttribute('role','status');
      node.setAttribute('aria-live','polite');
      node.innerHTML=\`
        <div class="hero-announcement-meta">
          <span class="hero-announcement-label"></span>
          <time class="hero-announcement-date"></time>
        </div>
        <strong></strong>
        <p></p>\`;

      const eyebrow=hero.querySelector('.eyebrow');
      if(eyebrow)eyebrow.insertAdjacentElement('afterend',node);
      else hero.prepend(node);
    }

    const active=announcementIsActive(announcement,texts);
    node.hidden=!active;
    if(!active)return;

    node.querySelector('.hero-announcement-label').textContent=String(texts.announcement_label||'Новости').trim();
    node.querySelector('strong').textContent=String(texts.announcement_title||'').trim();
    node.querySelector('p').textContent=String(texts.announcement_text||'').trim();

    const date=node.querySelector('.hero-announcement-date');
    const range=announcementRangeText(announcement);
    date.textContent=range;
    date.hidden=!range;
  }

`;
  runtime=runtime.slice(0,at)+block+runtime.slice(at);
}

if(!runtime.includes('    patchAnnouncement();')){
  const applyAt=runtime.indexOf('  function apply(){');
  if(applyAt<0)throw new Error('Stage 12.12: apply() not found.');
  const token='    patchPayments();';
  const at=runtime.indexOf(token,applyAt);
  if(at<0)throw new Error('Stage 12.12: patchPayments() in apply() not found.');
  const insertAt=at+token.length;
  runtime=runtime.slice(0,insertAt)+'\n    patchAnnouncement();'+runtime.slice(insertAt);
}
write('js/site-cms-runtime.js',runtime);

/* Public CSS bootstrap */
let bootstrap=read('js/app-bootstrap.js');
if(!bootstrap.includes('stage-12.12-site-polish.css')){
  const block=`
if(!document.getElementById('tunewrapStage1212SitePolish')){
  const stage1212=document.createElement('link');
  stage1212.id='tunewrapStage1212SitePolish';
  stage1212.rel='stylesheet';
  stage1212.href='/css/stage-12.12-site-polish.css?v=12.12';
  document.head.append(stage1212);
}
`;
  const anchor="if(!document.getElementById('tunewrapStoryCategoryStyles')){";
  const at=bootstrap.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.12: app-bootstrap CSS anchor not found.');
  bootstrap=bootstrap.slice(0,at)+block+'\n'+bootstrap.slice(at);
}
write('js/app-bootstrap.js',bootstrap);

/* Test registration */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['sitepolish:test']='node scripts/stage-12.12-site-polish-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('sitepolish:test')){
  pkg.scripts.test += ' && npm run sitepolish:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.12 Site Polish installed.');
console.log('Contacts: enabled channels now center automatically.');
console.log('Payments: existing enable/disable control is labeled "Показывать на сайте".');
console.log('Homepage: scheduled multilingual announcement/news editor added to Site CMS.');
console.log('D1 migration: not required.');
