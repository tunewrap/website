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
  'admin/site-stage-12.12.1.css',
  'package.json'
].forEach(read);

/* ---------------------------------------------------------
   1. Site CMS JSON: global payment section switch.
   No D1 migration — same config_json.
   --------------------------------------------------------- */
let shared=read('functions/_shared/site-content.js');

if(!shared.includes('function cleanPaymentSection(value)')){
  const anchor='function cleanPayments(value){';
  const at=shared.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.12.1: cleanPayments anchor not found.');

  const helper=`function cleanPaymentSection(value){
  const source=value&&typeof value==='object'?value:{};
  return {
    // Backward compatible: old Site CMS configs did not have this object,
    // therefore the payment section stays enabled until Admin turns it off.
    enabled:source.enabled!==false
  };
}

`;
  shared=shared.slice(0,at)+helper+shared.slice(at);
}

if(!shared.includes('paymentSection:cleanPaymentSection(value.paymentSection)')){
  const token='payments:cleanPayments(value.payments),';
  const at=shared.indexOf(token);
  if(at<0)throw new Error('Stage 12.12.1: payments config anchor not found.');
  const insertAt=at+token.length;
  shared=shared.slice(0,insertAt)+
    '\n    paymentSection:cleanPaymentSection(value.paymentSection),'+
    shared.slice(insertAt);
}

write('functions/_shared/site-content.js',shared);

/* ---------------------------------------------------------
   2. Admin: master show/hide switch above payment cards.
   --------------------------------------------------------- */
let adminJs=read('admin/site.js');

if(!adminJs.includes('function ensurePaymentSectionToggle(){')){
  const anchor='function renderPayments(){';
  const at=adminJs.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.12.1: renderPayments anchor not found.');

  const helper=`function ensurePaymentSectionToggle(){
  state.config.paymentSection ||= {enabled:true};

  const toolbar=$('.site-payment-toolbar');
  if(!toolbar)return;

  let label=$('#sitePaymentMasterToggle');
  if(!label){
    label=document.createElement('label');
    label.id='sitePaymentMasterToggle';
    label.className='site-payment-master-toggle';

    const check=document.createElement('input');
    check.id='sitePaymentSectionEnabled';
    check.type='checkbox';

    const text=document.createElement('span');
    text.textContent='Показывать весь блок оплаты на сайте';

    label.append(check,text);
    toolbar.prepend(label);

    const note=document.createElement('p');
    note.className='site-payment-master-note';
    note.id='sitePaymentMasterNote';
    note.textContent='Выключите — и весь блок «Способы оплаты» вместе со ссылкой «Оплата» исчезнет с публичного сайта. Если нет ни одного включённого способа оплаты, пустой блок также скрывается автоматически.';
    toolbar.insertAdjacentElement('afterend',note);

    check.addEventListener('change',()=>{
      state.config.paymentSection.enabled=check.checked;
      label.classList.toggle('is-off',!check.checked);
      markDirty();
    });
  }

  const check=$('#sitePaymentSectionEnabled');
  check.checked=state.config.paymentSection.enabled!==false;
  label.classList.toggle('is-off',!check.checked);
}

`;
  adminJs=adminJs.slice(0,at)+helper+adminJs.slice(at);
}

if(!adminJs.includes('  ensurePaymentSectionToggle();')){
  const anchor='function renderPayments(){';
  const start=adminJs.indexOf(anchor);
  if(start<0)throw new Error('Stage 12.12.1: renderPayments missing.');
  const brace=adminJs.indexOf('\n',start)+1;
  adminJs=adminJs.slice(0,brace)+'  ensurePaymentSectionToggle();\n'+adminJs.slice(brace);
}

/* Make per-card toggle distinct from the new master toggle. */
adminJs=adminJs.replace(
  "toggle.append(check,document.createTextNode('Показывать'));",
  "toggle.append(check,document.createTextNode('Показывать карточку'));"
);

write('admin/site.js',adminJs);

/* Admin CSS */
let adminHtml=read('admin/site.html');
if(!adminHtml.includes('/admin/site-stage-12.12.1.css')){
  const token='<link rel="stylesheet" href="/admin/site.css">';
  const at=adminHtml.indexOf(token);
  if(at<0)throw new Error('Stage 12.12.1: admin site.css anchor not found.');
  const insertAt=at+token.length;
  adminHtml=adminHtml.slice(0,insertAt)+
    '\n  <link rel="stylesheet" href="/admin/site-stage-12.12.1.css?v=12.12.1">'+
    adminHtml.slice(insertAt);
}
write('admin/site.html',adminHtml);

/* ---------------------------------------------------------
   3. Public runtime:
   - global OFF hides the entire payment card;
   - zero enabled payment methods also hides empty card;
   - footer/nav "Оплата" is hidden at the same time.
   --------------------------------------------------------- */
let runtime=read('js/site-cms-runtime.js');

const oldStart=`  function patchPayments(){
    const slot=$('[data-payment-methods-slot]');
    if(!slot)return;
    const items=(Array.isArray(config.payments)?config.payments:[])
      .filter(item=>item?.enabled!==false)
      .sort((a,b)=>(a.order||99)-(b.order||99));

    if(!items.length){
      slot.classList.remove('has-methods');
      slot.setAttribute('aria-hidden','true');
      return;
    }
`;

const newStart=`  function patchPayments(){
    const slot=$('[data-payment-methods-slot]');
    const section=$('#contactHubPayment');
    const navPayment=$('[data-contact-action="payment"]');
    if(!slot)return;

    const sectionEnabled=config.paymentSection?.enabled!==false;
    const items=(Array.isArray(config.payments)?config.payments:[])
      .filter(item=>item?.enabled!==false)
      .sort((a,b)=>(a.order||99)-(b.order||99));

    // A payment block with no actual payment method is not useful to a client.
    // Hide the whole public card and its navigation link when globally disabled
    // OR when every individual payment method is disabled / absent.
    const showSection=sectionEnabled&&items.length>0;
    if(section)section.hidden=!showSection;
    if(navPayment)navPayment.hidden=!showSection;

    if(!showSection){
      slot.replaceChildren();
      slot.classList.remove('has-methods');
      slot.setAttribute('aria-hidden','true');
      const pending=$('[data-i18n="contact_payment_pending"]');
      if(pending)pending.hidden=true;
      return;
    }
`;

if(!runtime.includes('const sectionEnabled=config.paymentSection?.enabled!==false;')){
  if(!runtime.includes(oldStart)){
    throw new Error('Stage 12.12.1: current patchPayments function shape was not found.');
  }
  runtime=runtime.replace(oldStart,newStart);
}

write('js/site-cms-runtime.js',runtime);

/* ---------------------------------------------------------
   4. Test registration
   --------------------------------------------------------- */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['paymentsection:test']='node scripts/stage-12.12.1-payment-section-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('paymentsection:test')){
  pkg.scripts.test += ' && npm run paymentsection:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.12.1 Payment Section Visibility installed.');
console.log('Admin now has a global "Показывать весь блок оплаты на сайте" switch.');
console.log('Public payment card + "Оплата" nav link hide when switch is OFF.');
console.log('Empty payment section also hides automatically when there are zero enabled payment methods.');
console.log('Individual payment-card visibility remains available separately.');
console.log('D1 migration: not required.');
