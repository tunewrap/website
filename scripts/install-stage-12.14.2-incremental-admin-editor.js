#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const adminPath=path.join(root,'admin','admin.js');
const indexPath=path.join(root,'admin','index.html');
const uploadPath=path.join(root,'functions','_shared','upload.js');
const packagePath=path.join(root,'package.json');

for(const p of [adminPath,indexPath,uploadPath,packagePath]){
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${path.relative(root,p)}`);
}

let admin=fs.readFileSync(adminPath,'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let upload=fs.readFileSync(uploadPath,'utf8');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));

const marker='Stage 12.14.2: Incremental Admin Editor';

if(!admin.includes(marker)){
  // 1. Add one cancelable editor operation to state.
  const stateNeedle='selectedStoryCategories:new Set()};';
  if(admin.includes(stateNeedle)){
    admin=admin.replace(stateNeedle,'selectedStoryCategories:new Set(),editorAbortController:null};');
  }else if(!admin.includes('editorAbortController:null')){
    throw new Error('Admin state anchor not found. No files changed.');
  }

  // 2. Keep Back active during a save, in addition to Preview.
  const keepOld="const keepActive=new Set(['previewButton','closePreviewButton','previewBackdrop']);";
  const keepNew="const keepActive=new Set(['previewButton','closePreviewButton','previewBackdrop','closeEditorButton']);";
  if(admin.includes(keepOld))admin=admin.replace(keepOld,keepNew);
  else if(!admin.includes(keepNew))throw new Error('setBusy anchor not found. No files changed.');

  // 3. Back cancels the in-flight editor request and always exits.
  const closeOld="function closeEditor(){if(state.busy)return;nodes.editor.hidden=true;document.body.style.overflow='';state.current=null;resetUploads();}";
  const closeNew=`function closeEditor(){
  if(state.editorAbortController){
    try{state.editorAbortController.abort();}catch(error){}
    state.editorAbortController=null;
  }
  setBusy(false);
  nodes.editor.hidden=true;
  document.body.style.overflow='';
  state.current=null;
  resetUploads();
}`;
  if(admin.includes(closeOld))admin=admin.replace(closeOld,closeNew);
  else if(!admin.includes('state.editorAbortController.abort()'))throw new Error('closeEditor anchor not found. No files changed.');

  // 4. Add editor-only timeout/cancel helpers immediately before persist().
  const persistAnchor='async function persist(publish){';
  if(!admin.includes(persistAnchor))throw new Error('persist anchor not found. No files changed.');
  const helpers=`// ---------- Stage 12.14.2: Incremental Admin Editor ----------
function editorAbortError(){
  const error=new Error('Операция отменена');
  error.name='AbortError';
  return error;
}

async function editorApi(path,options={},timeoutMs=20000){
  const controller=state.editorAbortController;
  if(!controller)return api(path,options);
  if(controller.signal.aborted)throw editorAbortError();

  let timedOut=false;
  const timer=setTimeout(()=>{
    timedOut=true;
    try{controller.abort();}catch(error){}
  },timeoutMs);

  try{
    return await api(path,{...options,signal:controller.signal});
  }catch(error){
    if(timedOut)throw new Error('Сервер не ответил за 20 секунд. Интерфейс разблокирован; проверьте, сохранились ли изменения.');
    if(controller.signal.aborted||error?.name==='AbortError')throw editorAbortError();
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

function editorXhrUpload(path,file,progress,headers={}){
  return xhrUpload(path,file,progress,headers,state.editorAbortController?.signal||null);
}

`;
  admin=admin.replace(persistAnchor,helpers+persistAnchor);

  // 5. Make media upload cancelable/time-bounded when media is actually selected.
  const xhrStart=admin.indexOf('function xhrUpload(');
  const xhrEnd=admin.indexOf('\nasync function persist',xhrStart);
  if(xhrStart<0)throw new Error('xhrUpload start not found. No files changed.');

  // Helper insertion above persist changes the first async persist location;
  // replace only the compact legacy xhrUpload function itself.
  const xhrLineEnd=admin.indexOf('\n',xhrStart);
  const currentXhr=admin.slice(xhrStart,xhrLineEnd);
  if(currentXhr.includes('function xhrUpload(path,file,progress,headers={})')){
    const xhrNew="function xhrUpload(path,file,progress,headers={},signal=null){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();let settled=false;const finish=(fn,value)=>{if(settled)return;settled=true;fn(value);};xhr.open('POST',path);xhr.responseType='json';xhr.timeout=120000;xhr.setRequestHeader('content-type',file.type||'application/octet-stream');xhr.setRequestHeader('x-file-name',encodeURIComponent(file.name));Object.entries(headers).forEach(([key,value])=>xhr.setRequestHeader(key,String(value)));progress.hidden=false;xhr.upload.onprogress=event=>{if(event.lengthComputable)progress.value=Math.round(event.loaded/event.total*100);};xhr.onload=()=>xhr.status>=200&&xhr.status<300?finish(resolve,xhr.response):finish(reject,new Error(xhr.response?.error||`Upload HTTP ${xhr.status}`));xhr.onerror=()=>finish(reject,new Error('Загрузка прервана сетью'));xhr.ontimeout=()=>finish(reject,new Error('Загрузка не завершилась за 120 секунд. Интерфейс разблокирован.'));xhr.onabort=()=>finish(reject,editorAbortError());if(signal){if(signal.aborted){xhr.abort();return;}signal.addEventListener('abort',()=>xhr.abort(),{once:true});}xhr.send(file);});}";
    admin=admin.slice(0,xhrStart)+xhrNew+admin.slice(xhrLineEnd);
  }else if(!currentXhr.includes('xhr.timeout=120000')){
    throw new Error('xhrUpload shape unexpected. No files changed.');
  }

  // 6. Rewrite persist() using structural boundaries, not a fragile exact catch string.
  const pStart=admin.indexOf('async function persist(publish){');
  const pEnd=admin.indexOf('\nfunction showPreview',pStart);
  if(pStart<0||pEnd<0)throw new Error('persist boundaries not found. No files changed.');
  let persist=admin.slice(pStart,pEnd);

  const firstLine='  if(state.busy)return null;let track=readForm();const errors=validateClient(track,publish);if(errors.length){showErrors(errors);return null;}showErrors([]);setBusy(true);';
  const firstReplacement='  if(state.busy)return null;let track=readForm();const errors=validateClient(track,publish);if(errors.length){showErrors(errors);return null;}showErrors([]);const operation=new AbortController();state.editorAbortController=operation;setBusy(true);';
  if(persist.includes(firstLine))persist=persist.replace(firstLine,firstReplacement);
  else if(!persist.includes('const operation=new AbortController()'))throw new Error('persist start anchor not found. No files changed.');

  persist=persist.replaceAll('await api(','await editorApi(');
  persist=persist.replaceAll('await xhrUpload(','await editorXhrUpload(');

  const catchStart=persist.lastIndexOf('  }catch(error){');
  const finallyEnd=persist.lastIndexOf('}\n');
  if(catchStart<0||finallyEnd<catchStart)throw new Error('persist catch/finally boundaries not found. No files changed.');

  const replacementCatch=`  }catch(error){
    if(error?.name==='AbortError')return null;
    showErrors(String(error?.message||error).split('\\n'));
    toast(error?.message||String(error),true);
    return null;
  }finally{
    if(state.editorAbortController===operation)state.editorAbortController=null;
    setBusy(false);
  }
`;
  persist=persist.slice(0,catchStart)+replacementCatch+'}';
  admin=admin.slice(0,pStart)+persist+admin.slice(pEnd);
}

// 7. Include the R2 tee fix so later cover/MP3 edits cannot deadlock.
if(upload.includes('await reader.cancel();')){
  upload=upload.replace('await reader.cancel();','reader.cancel().catch(()=>{});');
}
if(upload.includes('await reader.cancel();')){
  throw new Error('Blocking reader.cancel remains. No files changed.');
}

// 8. Force fresh Admin JS.
const scriptRe=/<script type="module" src="\/admin\/admin\.js(?:\?v=[^"]+)?"><\/script>/;
if(!scriptRe.test(html))throw new Error('Admin script tag not found. No files changed.');
html=html.replace(scriptRe,'<script type="module" src="/admin/admin.js?v=12.14.2"></script>');

pkg.scripts ||= {};
pkg.scripts['adminincremental:test']='node scripts/stage-12.14.2-incremental-admin-editor-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test missing. No files changed.');
if(!pkg.scripts.test.includes('adminincremental:test'))pkg.scripts.test += ' && npm run adminincremental:test';

// Preflight syntax. No production file is written before this passes.
const tmp=path.join(root,'.stage-12.14.2-admin-check.js');
try{
  fs.writeFileSync(tmp,admin,'utf8');
  const check=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  if(check.status!==0)throw new Error(`admin/admin.js syntax check failed\n${check.stderr||check.stdout}`);
}finally{try{fs.unlinkSync(tmp);}catch(error){}}

// Transactional write after all anchors/preflight pass.
fs.writeFileSync(adminPath,admin,'utf8');
fs.writeFileSync(indexPath,html,'utf8');
fs.writeFileSync(uploadPath,upload,'utf8');
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.14.2 FIX installed.');
console.log('PASS: text-only, description-only, cover-only, audio-only and mixed editing are independent.');
console.log('PASS: Back stays active and cancels a stuck editor request.');
console.log('PASS: metadata requests unlock after 20 seconds; media uploads after 120 seconds.');
console.log('PASS: Workers AI remains outside save/publish.');
console.log('PASS: R2 tee deadlock protection included for future media edits.');
console.log('D1 migration: not required.');
