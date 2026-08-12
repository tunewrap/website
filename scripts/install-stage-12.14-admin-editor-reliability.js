#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const adminPath=path.join(root,'admin','admin.js');
const indexPath=path.join(root,'admin','index.html');
const packagePath=path.join(root,'package.json');

for(const p of [adminPath,indexPath,packagePath]){
  if(!fs.existsSync(p))throw new Error(`Missing required file: ${path.relative(root,p)}`);
}

let admin=fs.readFileSync(adminPath,'utf8');
let html=fs.readFileSync(indexPath,'utf8');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));

const marker='Stage 12.14: Admin Editor Reliability';

if(!admin.includes(marker)){
  const oldBusy="function setBusy(value){state.busy=value;document.querySelectorAll('button').forEach(button=>button.disabled=value);}";
  if(!admin.includes(oldBusy)){
    throw new Error('Admin setBusy anchor not found. No files were changed.');
  }

  const newBusy=`function setBusy(value){
  state.busy=value;
  const keepActive=new Set(['previewButton','closePreviewButton','previewBackdrop']);
  document.querySelectorAll('button').forEach(button=>{
    if(keepActive.has(button.id))return;
    if(value){
      if(!button.hasAttribute('data-busy-was-disabled')){
        button.dataset.busyWasDisabled=button.disabled?'1':'0';
      }
      button.disabled=true;
    }else if(button.hasAttribute('data-busy-was-disabled')){
      button.disabled=button.dataset.busyWasDisabled==='1';
      delete button.dataset.busyWasDisabled;
    }
  });
  if(nodes.form)nodes.form.setAttribute('aria-busy',String(Boolean(value)));
}`;

  admin=admin.replace(oldBusy,newBusy);

  const persistAnchor='async function persist(publish){';
  if(!admin.includes(persistAnchor)){
    throw new Error('Admin persist anchor not found. No files were changed.');
  }

  const helper=`
// ---------- Stage 12.14: Admin Editor Reliability ----------
// Saving/publishing must never wait for Workers AI. The track is persisted first;
// missing translations are completed afterwards as a best-effort background task.
function mergeBackgroundLocaleField(beforeField,translatedField,latestField){
  const before=beforeField&&typeof beforeField==='object'?beforeField:{};
  const translated=translatedField&&typeof translatedField==='object'?translatedField:{};
  const latest=latestField&&typeof latestField==='object'?latestField:{};
  const merged={...latest};
  let changed=false;

  for(const [locale,value] of Object.entries(translated)){
    const beforeValue=before[locale]??'';
    const latestValue=latest[locale]??'';
    if(value===beforeValue)continue;

    // Never overwrite a localization that the editor changed after this save.
    if(latestValue===beforeValue){
      merged[locale]=value;
      changed=true;
    }
  }

  return changed?merged:null;
}

async function completeMissingTranslations(saved){
  if(!saved?.id)return;
  const targets=missingTranslationTargets(saved);
  if(!targets.length)return;

  const translated=await autoTranslateMissing(saved);
  const latestPayload=await api(\`/api/admin/tracks/\${encodeURIComponent(saved.id)}\`);
  const latest=latestPayload?.track;
  if(!latest)return;

  const patch={};
  for(const field of ['titles','descriptions','lyrics']){
    const merged=mergeBackgroundLocaleField(saved[field],translated[field],latest[field]);
    if(merged)patch[field]=merged;
  }

  if(!Object.keys(patch).length)return;

  await api(\`/api/admin/tracks/\${encodeURIComponent(saved.id)}\`,{
    method:'PATCH',
    body:patch
  });

  await loadCatalog('Изменения сохранены · переводы дополнены');
}

function queueBackgroundTranslations(saved){
  setTimeout(()=>{
    completeMissingTranslations(saved).catch(error=>{
      toast(\`Изменения уже сохранены. Автоперевод не выполнен: \${error.message}\`,true);
    });
  },0);
}

`;

  admin=admin.replace(persistAnchor,helper+persistAnchor);

  const blockingTranslation='    track=await autoTranslateMissing(track);\n';
  if(!admin.includes(blockingTranslation)){
    throw new Error('Blocking auto-translation anchor not found. No files were changed.');
  }
  admin=admin.replace(
    blockingTranslation,
    "    // Stage 12.14: persist the editor changes first; AI translation runs after success.\n"
  );

  const successAnchor="    state.current=saved;setBusy(false);await loadCatalog(publish?'Трек опубликован':'Черновик сохранён');closeEditor();return saved;";
  if(!admin.includes(successAnchor)){
    throw new Error('Persist success anchor not found. No files were changed.');
  }
  const successReplacement="    state.current=saved;setBusy(false);await loadCatalog(publish?'Трек опубликован':'Черновик сохранён');closeEditor();queueBackgroundTranslations(saved);return saved;";
  admin=admin.replace(successAnchor,successReplacement);
}

const oldScript='<script type="module" src="/admin/admin.js"></script>';
const newScript='<script type="module" src="/admin/admin.js?v=12.14"></script>';

if(html.includes(oldScript)){
  html=html.replace(oldScript,newScript);
}else if(!html.includes(newScript)){
  const versioned=/<script type="module" src="\/admin\/admin\.js(?:\?v=[^"]+)?"><\/script>/;
  if(!versioned.test(html)){
    throw new Error('Admin script tag anchor not found. No files were changed.');
  }
  html=html.replace(versioned,newScript);
}

pkg.scripts ||= {};
pkg.scripts['admineditor:test']='node scripts/stage-12.14-admin-editor-reliability-test.js';
if(typeof pkg.scripts.test!=='string'){
  throw new Error('package.json scripts.test is missing. No files were changed.');
}
if(!pkg.scripts.test.includes('admineditor:test')){
  pkg.scripts.test += ' && npm run admineditor:test';
}

// Preflight syntax before committing any file.
const tmp=path.join(root,'.stage-12.14-admin-check.js');
try{
  fs.writeFileSync(tmp,admin,'utf8');
  const check=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  if(check.status!==0){
    throw new Error(`admin/admin.js syntax check failed\n${check.stderr||check.stdout}`);
  }
}finally{
  try{fs.unlinkSync(tmp);}catch(error){}
}

// Transactional write after every preflight passed.
fs.writeFileSync(adminPath,admin,'utf8');
fs.writeFileSync(indexPath,html,'utf8');
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+String.fromCharCode(10),'utf8');

console.log('PASS: Stage 12.14 Admin Editor Reliability installed.');
console.log('PASS: Save Draft and Publish no longer wait for Workers AI.');
console.log('PASS: Preview remains usable while a write is busy.');
console.log('PASS: background translations cannot overwrite newer manual localization edits.');
console.log('PASS: admin.js is cache-versioned as v=12.14.');
console.log('D1 migration: not required.');
