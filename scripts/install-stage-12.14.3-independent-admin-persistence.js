#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const paths={
  admin:path.join(root,'admin','admin.js'),
  html:path.join(root,'admin','index.html'),
  publicTracks:path.join(root,'functions','api','tracks.js'),
  oldTest:path.join(root,'scripts','stage-12.14-admin-editor-reliability-test.js'),
  incrementalTest:path.join(root,'scripts','stage-12.14.2-incremental-admin-editor-test.js'),
  independentTest:path.join(root,'scripts','stage-12.14.3-independent-admin-persistence-test.js'),
  package:path.join(root,'package.json'),
  catalog:path.join(root,'data','track-catalog.json'),
  generatedCatalog:path.join(root,'js','track-catalog.generated.js')
};

for(const target of Object.values(paths)){
  if(!fs.existsSync(target))throw new Error(`Missing required file: ${path.relative(root,target)}`);
}

function replaceRequired(source,oldValue,newValue,label){
  if(source.includes(newValue))return source;
  if(!source.includes(oldValue))throw new Error(`${label} anchor not found. No files changed.`);
  return source.replace(oldValue,newValue);
}

let admin=fs.readFileSync(paths.admin,'utf8');
let html=fs.readFileSync(paths.html,'utf8');
let publicTracks=fs.readFileSync(paths.publicTracks,'utf8');
let oldTest=fs.readFileSync(paths.oldTest,'utf8');
let incrementalTest=fs.readFileSync(paths.incrementalTest,'utf8');
const pkg=JSON.parse(fs.readFileSync(paths.package,'utf8'));

const marker='Stage 12.14.3: Independent Admin Persistence';
if(!admin.includes(marker)){
  if(!admin.includes('Stage 12.14.2: Incremental Admin Editor')){
    throw new Error('Stage 12.14.2 is required before Stage 12.14.3. No files changed.');
  }

  admin=replaceRequired(
    admin,
    "  nodes.category.value=localizedValue(track?.category,primary,'');nodes.tags.value=(track?.tags||[]).join(',');renderStoryCategoryChoices(track?.categoryIds||[]);\n  nodes.description.value=track?localizedValue(track.descriptions,primary,''):'';\n  nodes.lyrics.value=track?localizedValue(track.lyrics,primary,''):'';\n  nodes.translation.value=track?localizedValue(track.translation,primary,''):'';",
    "  // Editing must never copy a fallback language into the primary-language field.\n  // All locale maps are loaded below, so an unrelated edit preserves them exactly.\n  nodes.category.value=track?.category?.[primary]||'';nodes.tags.value=(track?.tags||[]).join(',');renderStoryCategoryChoices(track?.categoryIds||[]);\n  nodes.description.value=track?.descriptions?.[primary]||'';\n  nodes.lyrics.value=track?.lyrics?.[primary]||'';\n  nodes.translation.value=track?.translation?.[primary]||'';",
    'primary-language editor'
  );

  admin=replaceRequired(
    admin,
    "  const category={...(state.current?.category||{})};if(nodes.category.value.trim())category[primary]=nodes.category.value.trim();",
    "  const category={...(state.current?.category||{})};if(nodes.category.value.trim())category[primary]=nodes.category.value.trim();else delete category[primary];",
    'category editor'
  );

  const modelAnchor='function isCollapsedStructuredTranslation(sourceText,targetText){';
  if(!admin.includes(modelAnchor))throw new Error('Admin metadata model anchor not found. No files changed.');
  const model=`// ---------- Stage 12.14.3: Independent Admin Persistence ----------
// Existing tracks are patched field-by-field. Unchanged values are never sent,
// so editing one property cannot overwrite a newer value in another property.
const EDITABLE_METADATA_FIELDS=Object.freeze([
  'title','originalTitle','titles','descriptions','section','language','artist','album',
  'category','categoryIds','tags','lyrics','translation','order','featured'
]);

function sameEditorValue(left,right){
  return JSON.stringify(left??null)===JSON.stringify(right??null);
}

function buildMetadataPatch(current,next){
  const patch={};
  for(const field of EDITABLE_METADATA_FIELDS){
    if(!sameEditorValue(current?.[field],next?.[field]))patch[field]=next[field];
  }
  return patch;
}

function needsBackgroundTranslation(isNew,patch){
  if(isNew)return true;
  return ['title','titles','descriptions','lyrics','language'].some(field=>Object.prototype.hasOwnProperty.call(patch,field));
}

function markAudioCommitted(saved){
  state.audioFile=null;
  state.audioDuration=0;
  nodes.audioFile.value='';
  nodes.audioProgress.hidden=true;
  nodes.audioProgress.value=0;
  nodes.audioLabel.textContent='Текущий MP3 подключён';
  nodes.audioMeta.textContent=saved.durationLabel||saved.audio||'MP3 сохранён';
  nodes.audioPreview.src=saved.audio;
  nodes.audioPreview.hidden=!saved.audio;
}

function markCoverCommitted(saved){
  state.coverFile=null;
  state.coverInfo=null;
  nodes.coverFile.value='';
  nodes.coverProgress.hidden=true;
  nodes.coverProgress.value=0;
  nodes.coverLabel.textContent='Текущая обложка';
  nodes.coverMeta.textContent=saved.artwork?.width?\`\${saved.artwork.width}×\${saved.artwork.height}\`:'Обложка сохранена';
  nodes.coverPreview.src=saved.cover||FALLBACK_COVER;
}
`;
  admin=admin.replace(modelAnchor,model+modelAnchor);

  const persistStart=admin.indexOf('async function persist(publish){');
  const persistEnd=admin.indexOf('\nfunction showPreview',persistStart);
  if(persistStart<0||persistEnd<0)throw new Error('Admin persist boundaries not found. No files changed.');
  const persist=`async function persist(publish){
  if(state.busy)return null;let track=readForm();const errors=validateClient(track,publish);if(errors.length){showErrors(errors);return null;}showErrors([]);const operation=new AbortController();state.editorAbortController=operation;setBusy(true);
  const isNew=!state.current;
  const metadataPatch=isNew?{}:buildMetadataPatch(state.current,track);
  const translateAfterSave=needsBackgroundTranslation(isNew,metadataPatch);
  const completed=[];
  try{
    // Metadata, audio and cover are independent commits. A later failure cannot
    // roll back an earlier successful field edit or force it to be re-uploaded.
    let saved;
    if(isNew){
      saved=(await editorApi('/api/admin/tracks',{method:'POST',body:track})).track;
      state.current=saved;nodes.trackId.value=saved.id;completed.push('карточка трека');
    }else if(Object.keys(metadataPatch).length){
      saved=(await editorApi(\`/api/admin/tracks/\${encodeURIComponent(state.current.id)}\`,{method:'PATCH',body:metadataPatch})).track;
      state.current=saved;completed.push('изменённые поля');
    }else saved=state.current;

    if(state.audioFile){
      const audioFile=state.audioFile;
      const audioDuration=state.audioDuration;
      const uploaded=await editorXhrUpload(\`/api/admin/upload/audio?trackId=\${encodeURIComponent(saved.id)}\`,audioFile,nodes.audioProgress);
      const audioPatch={audio:uploaded.url,duration:audioDuration,durationLabel:formatDuration(audioDuration),audioQuality:{duration:audioDuration,codec:'mp3',source:'admin-upload'}};
      saved=(await editorApi(\`/api/admin/tracks/\${encodeURIComponent(saved.id)}\`,{method:'PATCH',body:audioPatch})).track;
      state.current=saved;markAudioCommitted(saved);completed.push('MP3');
    }

    if(state.coverFile){
      const coverFile=state.coverFile;
      const coverInfo=state.coverInfo;
      const uploaded=await editorXhrUpload(\`/api/admin/upload/cover?trackId=\${encodeURIComponent(saved.id)}\`,coverFile,nodes.coverProgress,{'x-image-width':coverInfo.width,'x-image-height':coverInfo.height});
      saved=(await editorApi(\`/api/admin/tracks/\${encodeURIComponent(saved.id)}\`,{method:'PATCH',body:{cover:uploaded.url,artwork:uploaded.artwork}})).track;
      state.current=saved;markCoverCommitted(saved);completed.push('обложка');
    }

    if(publish){
      if(!saved.published)saved=(await editorApi(\`/api/admin/tracks/\${encodeURIComponent(saved.id)}/publish\`,{method:'POST'})).track;
    }else if(saved.published){
      saved=(await editorApi(\`/api/admin/tracks/\${encodeURIComponent(saved.id)}/unpublish\`,{method:'POST'})).track;
    }
    state.current=saved;setBusy(false);await loadCatalog(publish?'Трек опубликован':'Черновик сохранён');closeEditor();if(translateAfterSave)queueBackgroundTranslations(saved);return saved;
  }catch(error){
    if(error?.name==='AbortError')return null;
    const partial=completed.length?\`Уже сохранено: \${completed.join(', ')}.\`:'';
    showErrors([partial,...String(error?.message||error).split('\\n')].filter(Boolean));
    toast(error?.message||String(error),true);
    return null;
  }finally{
    if(state.editorAbortController===operation)state.editorAbortController=null;
    setBusy(false);
  }
}`;
  admin=admin.slice(0,persistStart)+persist+admin.slice(persistEnd);
}

publicTracks=replaceRequired(
  publicTracks,
  "},200,{'cache-control':'public, max-age=30, stale-while-revalidate=120'});",
  "},200,{'cache-control':'no-store'});",
  'public catalog cache'
);

const scriptRe=/<script type="module" src="\/admin\/admin\.js(?:\?v=[^"]+)?"><\/script>/;
if(!scriptRe.test(html))throw new Error('Admin script tag not found. No files changed.');
html=html.replace(scriptRe,'<script type="module" src="/admin/admin.js?v=12.14.3"></script>');

oldTest=replaceRequired(
  oldTest,
  "assert.ok(admin.includes(\"const keepActive=new Set(['previewButton','closePreviewButton','previewBackdrop'])\"));",
  "assert.ok(admin.includes(\"const keepActive=new Set(['previewButton','closePreviewButton','previewBackdrop','closeEditorButton'])\"));",
  'Stage 12.14 busy-state test'
);
oldTest=replaceRequired(
  oldTest,
  "html.includes('<script type=\"module\" src=\"/admin/admin.js?v=12.14\"></script>'),",
  "/<script type=\"module\" src=\"\\/admin\\/admin\\.js\\?v=12\\.14(?:\\.\\d+)?\"><\\/script>/.test(html),",
  'Stage 12.14 cache-version test'
);

incrementalTest=replaceRequired(
  incrementalTest,
  "assert.ok(html.includes('/admin/admin.js?v=12.14.2'));",
  "assert.ok(/\\/admin\\/admin\\.js\\?v=12\\.14(?:\\.\\d+)?/.test(html));",
  'Stage 12.14.2 cache-version test'
);

pkg.scripts||={};
pkg.scripts['adminindependent:test']='node scripts/stage-12.14.3-independent-admin-persistence-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test missing. No files changed.');
if(!pkg.scripts.test.includes('adminindependent:test'))pkg.scripts.test+=' && npm run adminindependent:test';

const tmp=path.join(root,'.stage-12.14.3-admin-check.js');
try{
  fs.writeFileSync(tmp,admin,'utf8');
  const syntax=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  if(syntax.status!==0)throw new Error(`admin/admin.js syntax check failed\n${syntax.stderr||syntax.stdout}`);
}finally{try{fs.unlinkSync(tmp);}catch(error){}}

const writes=new Map([
  [paths.admin,admin],
  [paths.html,html],
  [paths.publicTracks,publicTracks],
  [paths.oldTest,oldTest],
  [paths.incrementalTest,incrementalTest],
  [paths.package,JSON.stringify(pkg,null,2)+String.fromCharCode(10)]
]);
const rollback=new Map([
  ...Array.from(writes.keys(),target=>[target,fs.readFileSync(target)]),
  [paths.catalog,fs.readFileSync(paths.catalog)],
  [paths.generatedCatalog,fs.readFileSync(paths.generatedCatalog)]
]);

try{
  for(const [target,content] of writes)fs.writeFileSync(target,content,'utf8');

  const build=spawnSync(process.execPath,[path.join(root,'scripts','tracks-build.js')],{cwd:root,encoding:'utf8'});
  if(build.status!==0)throw new Error(`Track Catalog sync failed\n${build.stderr||build.stdout}`);

  for(const test of [paths.oldTest,paths.incrementalTest,paths.independentTest]){
    const result=spawnSync(process.execPath,[test],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${path.basename(test)} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.3 Independent Admin Persistence installed.');
console.log('PASS: title, description, lyrics, translations and parameters patch independently.');
console.log('PASS: MP3 and cover upload and commit independently.');
console.log('PASS: Save Draft always produces a draft; Publish always produces a public track.');
console.log('PASS: public catalog refresh bypasses stale API cache.');
console.log('PASS: legacy Stage 12.14/12.14.2 tests are forward-compatible.');
console.log('PASS: static Track Catalog backup synchronized.');
console.log('D1 migration: not required.');
