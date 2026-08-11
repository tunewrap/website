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

[
  'js/app-bootstrap.js',
  'js/ux-critical-fixes.js',
  'js/stage-12.11-contact-channel-selector.js',
  'css/stage-12.11-contact-channel-selector.css',
  'package.json'
].forEach(read);

let ux=read('js/ux-critical-fixes.js');

const oldValidator=/  function validContact\(value\)\{\n[\s\S]*?\n  \}\n\n  function clearError\(group\)\{/;
if(!oldValidator.test(ux)){
  throw new Error('Stage 12.11: validContact function anchor not found.');
}

const newValidator=`  function validContact(value){
    const v=String(value||'').trim();

    // Stage 12.11 stores the preferred channel in the existing contact field:
    // "WhatsApp: ...", "Telegram: ..." or "Email: ...".
    const match=v.match(/^(WhatsApp|Telegram|Email):\\\\s*(.+)$/i);
    if(match){
      const method=match[1].toLowerCase();
      const detail=String(match[2]||'').trim();

      if(method==='email'){
        return /^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]{2,}$/i.test(detail);
      }

      if(method==='whatsapp'){
        const digits=detail.replace(/\\\\D+/g,'');
        return digits.length>=7&&digits.length<=16;
      }

      if(method==='telegram'){
        const digits=detail.replace(/\\\\D+/g,'');
        if(digits.length>=7&&digits.length<=16)return true;

        const username=detail
          .replace(/^https?:\\\\/\\\\/(?:www\\\\.)?t\\\\.me\\\\//i,'')
          .replace(/^@/,'')
          .trim();
        return /^[A-Za-z0-9_]{5,32}$/.test(username);
      }
    }

    // Legacy orders/old cached form state remain accepted.
    const email=/^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]{2,}$/i.test(v);
    const digits=v.replace(/\\\\D+/g,'');
    const phone=digits.length>=7&&digits.length<=16;
    return email||phone;
  }

  function clearError(group){`;

ux=ux.replace(oldValidator,newValidator);

const messages=[
  ["contact:'Укажите номер телефона или e-mail.'","contact:'Выберите WhatsApp, Telegram или Email и укажите корректный контакт.'"],
  ["contact:'Вкажіть номер телефону або e-mail.'","contact:'Оберіть WhatsApp, Telegram або Email і вкажіть коректний контакт.'"],
  ["contact:'მიუთითეთ ტელეფონის ნომერი ან e-mail.'","contact:'აირჩიეთ WhatsApp, Telegram ან Email და მიუთითეთ სწორი კონტაქტი.'"],
  ["contact:'Enter a phone number or e-mail.'","contact:'Choose WhatsApp, Telegram or Email and enter a valid contact.'"],
  ["contact:'Bitte Telefonnummer oder E-Mail eingeben.'","contact:'Wählen Sie WhatsApp, Telegram oder E-Mail und geben Sie einen gültigen Kontakt an.'"]
];
messages.forEach(([from,to])=>{ux=ux.replace(from,to);});
fs.writeFileSync(file('js/ux-critical-fixes.js'),ux,'utf8');

let bootstrap=read('js/app-bootstrap.js');

if(!bootstrap.includes('stage-12.11-contact-channel-selector.css')){
  const block=`
if(!document.getElementById('tunewrapStage1211ContactChannel')){
  const stage1211=document.createElement('link');
  stage1211.id='tunewrapStage1211ContactChannel';
  stage1211.rel='stylesheet';
  stage1211.href='/css/stage-12.11-contact-channel-selector.css?v=12.11';
  document.head.append(stage1211);
}
`;
  const anchor="if(!document.getElementById('tunewrapStoryCategoryStyles')){";
  const at=bootstrap.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.11 CSS insertion anchor not found.');
  bootstrap=bootstrap.slice(0,at)+block+'\n'+bootstrap.slice(at);
}

if(!bootstrap.includes('stage-12.11-contact-channel-selector.js')){
  const block=`
  try{
    await import('./stage-12.11-contact-channel-selector.js');
  }catch(error){
    console.error('TuneWrap Stage 12.11 contact channel selector failed',error);
  }
`;
  const anchor="  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));";
  const at=bootstrap.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.11 JS insertion anchor not found.');
  bootstrap=bootstrap.slice(0,at)+block+'\n'+bootstrap.slice(at);
}

fs.writeFileSync(file('js/app-bootstrap.js'),bootstrap,'utf8');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['contactchannel:test']='node scripts/stage-12.11-contact-channel-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('contactchannel:test')){
  pkg.scripts.test += ' && npm run contactchannel:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.11 Contact Channel Selector installed.');
console.log('Customer must choose WhatsApp, Telegram or Email before entering contact details.');
console.log('Existing orders.contact column stores the channel prefix, so Admin immediately shows the preferred channel.');
console.log('D1 migration: not required.');
