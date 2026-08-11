#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const file=rel=>path.join(root,rel);

function read(rel){
  const p=file(rel);
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function check(rel){
  const result=spawnSync(process.execPath,['--check',file(rel)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Syntax check failed for ${rel}\n${result.stderr||result.stdout}`);
}

[
  'js/app-bootstrap.js',
  'css/stage-12.13.5-mobile-library-2col.css',
  'package.json'
].forEach(read);

let bootstrap=read('js/app-bootstrap.js');

if(!bootstrap.includes('stage-12.13.5-mobile-library-2col.css')){
  const block=`
if(!document.getElementById('tunewrapStage12135MobileLibrary2Col')){
  const stage12135=document.createElement('link');
  stage12135.id='tunewrapStage12135MobileLibrary2Col';
  stage12135.rel='stylesheet';
  stage12135.href='/css/stage-12.13.5-mobile-library-2col.css?v=12.13.5';
  document.head.append(stage12135);
}
`;
  bootstrap=block+'\n'+bootstrap;
}

write('js/app-bootstrap.js',bootstrap);
check('js/app-bootstrap.js');

const packagePath=file('package.json');
const pkg=JSON.parse(read('package.json'));
pkg.scripts ||= {};
pkg.scripts['mobilelibrary2col:test']='node scripts/stage-12.13.5-mobile-library-2col-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('mobilelibrary2col:test')){
  pkg.scripts.test += ' && npm run mobilelibrary2col:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.13.5 installed.');
console.log('Phone Stories + Originals libraries now use 2 compact cards per row.');
console.log('Desktop remains 3 columns; tablet/wide behavior remains unchanged.');
console.log('Playback logic is unchanged.');
console.log('D1 migration: not required.');
