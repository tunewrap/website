#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){
  const result=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(result.status!==0){
    throw new Error(`Syntax check failed for ${rel}\n${result.stderr||result.stdout}`);
  }
}

[
  'js/ux-critical-fixes.js',
  'js/site-cms-runtime.js',
  'js/app-bootstrap.js',
  'css/stage-12.12.2-announcement-position.css',
  'package.json'
].forEach(read);

/* ---------------------------------------------------------
   1. Restore UX runtime parsing.
   Stage 12.11 accidentally wrote slash-heavy regex escapes into
   validContact in a form that can break parsing in browser JS.
   When ux-critical-fixes.js does not execute, its package field
   (#regularPackageField / #fieldTier) is never created.
   --------------------------------------------------------- */
let ux=read('js/ux-critical-fixes.js');

const start=ux.indexOf('  function validContact(value){');
const end=ux.indexOf('\n  function clearError(group){',start);
if(start<0||end<0)throw new Error('Stage 12.12.2: validContact block not found.');

const validContact=`  function validContact(value){
    const v=String(value||'').trim();

    const split=v.indexOf(':');
    if(split>0){
      const method=v.slice(0,split).trim().toLowerCase();
      const detail=v.slice(split+1).trim();

      if(method==='email'){
        const at=detail.indexOf('@');
        const dot=detail.lastIndexOf('.');
        return at>0&&dot>at+1&&dot<detail.length-1&&!detail.includes(' ');
      }

      if(method==='whatsapp'){
        const digits=Array.from(detail).filter(char=>char>='0'&&char<='9').join('');
        return digits.length>=7&&digits.length<=16;
      }

      if(method==='telegram'){
        const digits=Array.from(detail).filter(char=>char>='0'&&char<='9').join('');
        if(digits.length>=7&&digits.length<=16)return true;

        let username=detail.trim();
        const lower=username.toLowerCase();
        const prefixes=['https://www.t.me/','http://www.t.me/','https://t.me/','http://t.me/','www.t.me/','t.me/'];
        const prefix=prefixes.find(item=>lower.startsWith(item));
        if(prefix)username=username.slice(prefix.length);
        if(username.startsWith('@'))username=username.slice(1);
        username=username.split('/')[0].split('?')[0].split('#')[0].trim();

        if(username.length<5||username.length>32)return false;
        return Array.from(username).every(char=>
          (char>='A'&&char<='Z')||
          (char>='a'&&char<='z')||
          (char>='0'&&char<='9')||
          char==='_'
        );
      }
    }

    // Legacy cached orders / old form values.
    const at=v.indexOf('@');
    const dot=v.lastIndexOf('.');
    const email=at>0&&dot>at+1&&dot<v.length-1&&!v.includes(' ');
    const digits=Array.from(v).filter(char=>char>='0'&&char<='9').join('');
    const phone=digits.length>=7&&digits.length<=16;
    return email||phone;
  }
`;

ux=ux.slice(0,start)+validContact+ux.slice(end);
write('js/ux-critical-fixes.js',ux);

/* Hard guard: this exact browser module MUST parse.
   This is the regression that hid the package selector. */
check('js/ux-critical-fixes.js');

/* ---------------------------------------------------------
   2. Homepage announcement: move the existing CMS node out of
   the Hero copy flow and attach it directly to #hero.
   CSS can then place it reliably near the top on all devices.
   --------------------------------------------------------- */
let runtime=read('js/site-cms-runtime.js');

if(!runtime.includes("const heroSection=$('#hero');")){
  const token="    const hero=$('#hero .hero-grid > div:first-child');";
  const at=runtime.indexOf(token,runtime.indexOf('function patchAnnouncement(){'));
  if(at<0)throw new Error('Stage 12.12.2: patchAnnouncement hero anchor not found.');
  const insertAt=at+token.length;
  runtime=runtime.slice(0,insertAt)+"\n    const heroSection=$('#hero');"+runtime.slice(insertAt);
}

const oldPlacement=`      const eyebrow=hero.querySelector('.eyebrow');
      if(eyebrow)eyebrow.insertAdjacentElement('afterend',node);
      else hero.prepend(node);
`;
const newPlacement=`      if(heroSection)heroSection.prepend(node);
      else hero.prepend(node);
`;

if(runtime.includes(oldPlacement)){
  runtime=runtime.replace(oldPlacement,newPlacement);
}

if(!runtime.includes("if(heroSection&&node.parentElement!==heroSection)heroSection.prepend(node);")){
  const token="    const active=announcementIsActive(announcement,texts);";
  const at=runtime.indexOf(token,runtime.indexOf('function patchAnnouncement(){'));
  if(at<0)throw new Error('Stage 12.12.2: announcement active anchor not found.');
  runtime=runtime.slice(0,at)+
    "    if(heroSection&&node.parentElement!==heroSection)heroSection.prepend(node);\n\n"+
    runtime.slice(at);
}

write('js/site-cms-runtime.js',runtime);
check('js/site-cms-runtime.js');

/* ---------------------------------------------------------
   3. Load positional CSS after Stage 12.12.
   --------------------------------------------------------- */
let bootstrap=read('js/app-bootstrap.js');
if(!bootstrap.includes('stage-12.12.2-announcement-position.css')){
  const block=`
if(!document.getElementById('tunewrapStage12122AnnouncementPosition')){
  const stage12122=document.createElement('link');
  stage12122.id='tunewrapStage12122AnnouncementPosition';
  stage12122.rel='stylesheet';
  stage12122.href='/css/stage-12.12.2-announcement-position.css?v=12.12.2';
  document.head.append(stage12122);
}
`;
  const anchor="if(!document.getElementById('tunewrapStoryCategoryStyles')){";
  const at=bootstrap.indexOf(anchor);
  if(at<0)throw new Error('Stage 12.12.2: app-bootstrap CSS anchor not found.');
  bootstrap=bootstrap.slice(0,at)+block+'\n'+bootstrap.slice(at);
}
write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');

/* ---------------------------------------------------------
   4. Test registration
   --------------------------------------------------------- */
const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['packageannouncefix:test']='node scripts/stage-12.12.2-package-announcement-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('packageannouncefix:test')){
  pkg.scripts.test += ' && npm run packageannouncefix:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.12.2 installed.');
console.log('Root cause fixed: ux-critical-fixes.js parses again, restoring Package and price inside the order form.');
console.log('Existing 6-package branded chooser remains the owner of package selection.');
console.log('Homepage announcement is now anchored to the top of Hero on phone/tablet/desktop.');
console.log('D1 migration: not required.');
