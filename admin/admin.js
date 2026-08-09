const UI_LOCALES = Object.freeze([['ru','RU'],['uk','UA'],['ka','GE'],['en','EN'],['de','DE']]);
const PRIMARY_LOCALE = Object.freeze({RU:'ru',UA:'uk',GE:'ka',EN:'en',DE:'de'});
const FALLBACK_COVER = '/assets/covers/tunewrap-placeholder.svg';
const $ = selector => document.querySelector(selector);
const state = {tracks:[],summary:null,tab:'all',query:'',current:null,audioFile:null,audioDuration:0,coverFile:null,coverInfo:null,importBackup:null,busy:false};
const nodes = {
  list:$('#trackList'),empty:$('#emptyState'),search:$('#searchInput'),tabs:$('#catalogTabs'),editor:$('#trackEditor'),form:$('#trackForm'),
  formErrors:$('#formErrors'),trackId:$('#trackId'),title:$('#titleField'),section:$('#sectionField'),language:$('#languageField'),artist:$('#artistField'),
  album:$('#albumField'),category:$('#categoryField'),tags:$('#tagsField'),description:$('#descriptionField'),lyrics:$('#lyricsField'),translation:$('#translationField'),
  featured:$('#featuredField'),order:$('#orderField'),audioFile:$('#audioFile'),audioLabel:$('#audioFileLabel'),audioMeta:$('#audioMeta'),audioProgress:$('#audioProgress'),
  audioPreview:$('#audioPreview'),coverFile:$('#coverFile'),coverLabel:$('#coverFileLabel'),coverMeta:$('#coverMeta'),coverProgress:$('#coverProgress'),
  coverPreview:$('#coverPreview'),localized:$('#localizedFields'),previewSheet:$('#previewSheet'),previewCover:$('#previewCover'),previewTitle:$('#previewTitle'),
  previewMeta:$('#previewMeta'),previewDescription:$('#previewDescription'),sheetAudio:$('#sheetAudio'),editorMode:$('#editorMode'),editorTitle:$('#editorTitle'),
  dangerZone:$('#dangerZone'),toast:$('#toastRegion')
};

function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function toast(message,error=false){const item=el('div','toast'+(error?' is-error':''),message);nodes.toast.append(item);setTimeout(()=>item.remove(),4200);}
function formatDuration(value){const seconds=Math.max(0,Math.round(Number(value)||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
function localizedValue(value,locale,fallback=''){return value?.[locale]||value?.ru||value?.en||Object.values(value||{})[0]||fallback;}

async function api(path,options={}){
  const headers=new Headers(options.headers||{});if(options.body&&!(options.body instanceof Blob))headers.set('content-type','application/json');headers.set('accept','application/json');
  const response=await fetch(path,{...options,headers,body:options.body&&!(options.body instanceof Blob)?JSON.stringify(options.body):options.body});
  let payload=null;try{payload=await response.json();}catch(error){}
  if(!response.ok){const details=Array.isArray(payload?.details)?'\n'+payload.details.join('\n'):'';throw new Error((payload?.error||`HTTP ${response.status}`)+details);}
  return payload;
}
function setBusy(value){state.busy=value;document.querySelectorAll('button').forEach(button=>button.disabled=value);}
async function loadCatalog(message){
  try{const data=await api('/api/admin/tracks');state.tracks=data.tracks;state.summary=data.summary;renderSummary();renderTracks();if(message)toast(message);}
  catch(error){toast(error.message,true);nodes.list.replaceChildren(el('p','empty-state','Не удалось загрузить каталог.'));}
}
function renderSummary(){const s=state.summary||{total:0,published:0,drafts:0,stories:0,author:0};$('#metricTotal').textContent=s.total;$('#metricPublished').textContent=s.published;$('#metricDrafts').textContent=s.drafts;$('#metricSections').textContent=`${s.stories} / ${s.author}`;}
function filteredTracks(){const query=state.query.trim().toLocaleLowerCase();return state.tracks.filter(track=>{
  if(state.tab==='stories'&&track.section!=='stories')return false;if(state.tab==='author'&&track.section!=='author')return false;
  if(state.tab==='drafts'&&track.published)return false;if(state.tab==='published'&&!track.published)return false;if(!query)return true;
  return [track.id,track.title,track.originalTitle,track.language,track.section,...Object.values(track.titles||{})].join(' ').toLocaleLowerCase().includes(query);
});}
function actionButton(label,title,action){const button=el('button','',label);button.type='button';button.title=title;button.setAttribute('aria-label',title);button.addEventListener('click',event=>{event.stopPropagation();action();});return button;}
function moveTrack(track,direction){
  const section=state.tracks.filter(item=>item.section===track.section).sort((a,b)=>a.order-b.order);const index=section.findIndex(item=>item.id===track.id);const target=index+direction;if(target<0||target>=section.length)return;
  [section[index],section[target]]=[section[target],section[index]];api('/api/admin/reorder',{method:'POST',body:{section:track.section,ids:section.map(item=>item.id)}}).then(()=>loadCatalog('Порядок обновлён')).catch(error=>toast(error.message,true));
}
function trackRow(track){
  const row=el('article','track-row');row.dataset.id=track.id;const identity=el('div','track-identity');const image=el('img');image.src=track.cover||FALLBACK_COVER;image.alt='';image.loading='lazy';image.addEventListener('error',()=>{image.src=FALLBACK_COVER;},{once:true});
  const copy=el('div');copy.append(el('strong','',track.title),el('small','',`${track.id} · ${track.language}`));identity.append(image,copy);
  const section=el('span','track-section',track.section==='stories'?'Stories':'Author');const order=el('span','track-order',`#${track.order}`);const status=el('span','status'+(track.published?' is-published':''),track.published?'Published':'Draft');
  const actions=el('div','row-actions');actions.append(actionButton('◉','Предпросмотр',()=>showPreview(track)),actionButton('✎','Редактировать',()=>openEditor(track)));
  const orderButtons=el('div','order-buttons');orderButtons.append(actionButton('↑','Выше в разделе',()=>moveTrack(track,-1)),actionButton('↓','Ниже в разделе',()=>moveTrack(track,1)));
  row.append(identity,section,order,status,actions,orderButtons);row.addEventListener('dblclick',()=>openEditor(track));return row;
}
function renderTracks(){const tracks=filteredTracks();nodes.list.replaceChildren(...tracks.map(trackRow));nodes.empty.hidden=tracks.length>0;}

function buildLocalizedFields(){
  nodes.localized.replaceChildren();for(const [locale,label] of UI_LOCALES){const row=el('div','locale-row');row.dataset.locale=locale;const code=el('b','',label);const title=el('input');title.type='text';title.maxLength=140;title.placeholder=`Название ${label}`;title.dataset.localizedTitle=locale;const description=el('textarea');description.rows=3;description.placeholder=`Описание ${label}`;description.dataset.localizedDescription=locale;row.append(code,title,description);nodes.localized.append(row);}
}
function resetUploads(){state.audioFile=null;state.audioDuration=0;state.coverFile=null;state.coverInfo=null;nodes.audioFile.value='';nodes.coverFile.value='';nodes.audioProgress.hidden=true;nodes.audioProgress.value=0;nodes.coverProgress.hidden=true;nodes.coverProgress.value=0;nodes.audioPreview.pause();nodes.audioPreview.removeAttribute('src');nodes.audioPreview.hidden=true;}
function openEditor(track=null){
  state.current=track;resetUploads();nodes.form.reset();nodes.trackId.value=track?.id||'';nodes.title.value=track?.title||'';nodes.section.value=track?.section||'stories';nodes.language.value=track?.language||'RU';nodes.artist.value=track?.artist||'TuneWrap';nodes.album.value=track?.album||'';
  const primary=PRIMARY_LOCALE[track?.language]||'ru';nodes.category.value=localizedValue(track?.category,primary,'');nodes.tags.value=(track?.tags||[]).join(', ');nodes.description.value=track?localizedValue(track.descriptions,primary,''):'';nodes.lyrics.value=track?localizedValue(track.lyrics,primary,''):'';nodes.translation.value=track?localizedValue(track.translation,primary,''):'';nodes.featured.checked=Boolean(track?.featured);nodes.order.value=track?.order||'';
  for(const [locale] of UI_LOCALES){nodes.localized.querySelector(`[data-localized-title="${locale}"]`).value=track?.titles?.[locale]||'';nodes.localized.querySelector(`[data-localized-description="${locale}"]`).value=track?.descriptions?.[locale]||'';}
  nodes.audioLabel.textContent=track?.audio?'Текущий MP3 подключён':'Выберите MP3';nodes.audioMeta.textContent=track?.durationLabel||(track?.audio?track.audio:'До 80 MB');if(track?.audio){nodes.audioPreview.src=track.audio;nodes.audioPreview.hidden=false;}
  nodes.coverPreview.src=track?.cover||FALLBACK_COVER;nodes.coverLabel.textContent=track?.cover?'Текущая обложка':'Фирменная заглушка';nodes.coverMeta.textContent=track?.artwork?.width?`${track.artwork.width}×${track.artwork.height}`:'Квадратная обложка, до 8 MB';nodes.editorMode.textContent=track?(track.published?'Опубликованный трек':'Черновик'):'Новый трек';nodes.editorTitle.textContent=track?.title||'Черновик';nodes.dangerZone.hidden=!track;$('#unpublishButton').hidden=!track?.published;nodes.formErrors.hidden=true;nodes.editor.hidden=false;document.body.style.overflow='hidden';nodes.title.focus();
}
function closeEditor(){if(state.busy)return;nodes.editor.hidden=true;document.body.style.overflow='';state.current=null;resetUploads();}
function mapsFromForm(){
  const titles={...(state.current?.titles||{})};const descriptions={...(state.current?.descriptions||{})};for(const [locale] of UI_LOCALES){const title=nodes.localized.querySelector(`[data-localized-title="${locale}"]`).value.trim();const description=nodes.localized.querySelector(`[data-localized-description="${locale}"]`).value.trim();if(title)titles[locale]=title;else delete titles[locale];if(description)descriptions[locale]=description;else delete descriptions[locale];}
  const primary=PRIMARY_LOCALE[nodes.language.value]||'ru';titles[primary]=nodes.title.value.trim();if(nodes.description.value.trim())descriptions[primary]=nodes.description.value.trim();return{titles,descriptions,primary};
}
function readForm(){
  const{titles,descriptions,primary}=mapsFromForm();const category={...(state.current?.category||{})};if(nodes.category.value.trim())category[primary]=nodes.category.value.trim();const lyrics={...(state.current?.lyrics||{})};const translation={...(state.current?.translation||{})};if(nodes.lyrics.value.trim())lyrics[primary]=nodes.lyrics.value.trim();else delete lyrics[primary];if(nodes.translation.value.trim())translation[primary]=nodes.translation.value.trim();else delete translation[primary];
  return{...(state.current||{}),title:nodes.title.value.trim(),originalTitle:state.current?.originalTitle||nodes.title.value.trim(),titles,descriptions,section:nodes.section.value,language:nodes.language.value,artist:nodes.artist.value.trim()||'TuneWrap',album:nodes.album.value.trim(),category,tags:nodes.tags.value.split(',').map(value=>value.trim()).filter(Boolean),lyrics,translation,order:Number(nodes.order.value)||state.current?.order||0,featured:nodes.featured.checked,audio:state.current?.audio||'',cover:state.current?.cover||'',artwork:state.current?.artwork||{},duration:state.current?.duration||0,durationLabel:state.current?.durationLabel||''};
}
function validateClient(track,publish){const errors=[];if(!track.title)errors.push('Введите название');if(!track.section)errors.push('Выберите раздел');if(!track.language)errors.push('Выберите язык');if(publish&&!track.audio&&!state.audioFile)errors.push('Для публикации выберите MP3');if(state.coverFile&&!state.coverInfo)errors.push('Дождитесь проверки обложки');return errors;}
function showErrors(errors){nodes.formErrors.textContent=errors.join('\n');nodes.formErrors.hidden=!errors.length;if(errors.length)nodes.formErrors.scrollIntoView({behavior:'smooth',block:'center'});}
function xhrUpload(path,file,progress,headers={}){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('POST',path);xhr.responseType='json';xhr.setRequestHeader('content-type',file.type||'application/octet-stream');xhr.setRequestHeader('x-file-name',encodeURIComponent(file.name));Object.entries(headers).forEach(([key,value])=>xhr.setRequestHeader(key,String(value)));progress.hidden=false;xhr.upload.onprogress=event=>{if(event.lengthComputable)progress.value=Math.round(event.loaded/event.total*100);};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve(xhr.response):reject(new Error(xhr.response?.error||`Upload HTTP ${xhr.status}`));xhr.onerror=()=>reject(new Error('Загрузка прервана сетью'));xhr.send(file);});}
async function persist(publish){
  if(state.busy)return null;let track=readForm();const errors=validateClient(track,publish);if(errors.length){showErrors(errors);return null;}showErrors([]);setBusy(true);
  try{let saved;if(!state.current){saved=(await api('/api/admin/tracks',{method:'POST',body:track})).track;state.current=saved;nodes.trackId.value=saved.id;}else saved=(await api(`/api/admin/tracks/${encodeURIComponent(state.current.id)}`,{method:'PATCH',body:track})).track;
    const patch={};if(state.audioFile){const uploaded=await xhrUpload(`/api/admin/upload/audio?trackId=${encodeURIComponent(saved.id)}`,state.audioFile,nodes.audioProgress);patch.audio=uploaded.url;patch.duration=state.audioDuration;patch.durationLabel=formatDuration(state.audioDuration);patch.audioQuality={duration:state.audioDuration,codec:'mp3',source:'admin-upload'};}
    if(state.coverFile){const uploaded=await xhrUpload(`/api/admin/upload/cover?trackId=${encodeURIComponent(saved.id)}`,state.coverFile,nodes.coverProgress,{'x-image-width':state.coverInfo.width,'x-image-height':state.coverInfo.height});patch.cover=uploaded.url;patch.artwork=uploaded.artwork;}
    if(Object.keys(patch).length)saved=(await api(`/api/admin/tracks/${encodeURIComponent(saved.id)}`,{method:'PATCH',body:patch})).track;if(publish)saved=(await api(`/api/admin/tracks/${encodeURIComponent(saved.id)}/publish`,{method:'POST'})).track;state.current=saved;setBusy(false);await loadCatalog(publish?'Трек опубликован':'Черновик сохранён');closeEditor();return saved;
  }catch(error){showErrors(error.message.split('\n'));toast(error.message,true);return null;}finally{setBusy(false);}
}
function showPreview(track=readForm()){
  const primary=PRIMARY_LOCALE[track.language]||'ru';nodes.previewCover.src=track.cover||(state.coverFile?URL.createObjectURL(state.coverFile):FALLBACK_COVER);nodes.previewTitle.textContent=track.title||'Без названия';nodes.previewMeta.textContent=`${track.language||'—'} · ${track.section==='author'?'Author Songs':'Musical Stories'}`;nodes.previewDescription.textContent=localizedValue(track.descriptions,primary,'Описание пока не добавлено.');const audioSource=state.audioFile?URL.createObjectURL(state.audioFile):track.audio;if(audioSource){nodes.sheetAudio.src=audioSource;nodes.sheetAudio.hidden=false;}else{nodes.sheetAudio.removeAttribute('src');nodes.sheetAudio.hidden=true;}nodes.previewSheet.hidden=false;
}
function closePreview(){nodes.sheetAudio.pause();nodes.previewSheet.hidden=true;}

nodes.audioFile.addEventListener('change',async()=>{const file=nodes.audioFile.files[0];if(!file)return;if(!/\.mp3$/i.test(file.name)||file.size>80*1024*1024){toast('Нужен MP3 до 80 MB',true);nodes.audioFile.value='';return;}const url=URL.createObjectURL(file);const probe=new Audio();probe.preload='metadata';probe.src=url;try{await new Promise((resolve,reject)=>{probe.onloadedmetadata=resolve;probe.onerror=reject;});if(!Number.isFinite(probe.duration)||probe.duration<=0)throw new Error();state.audioFile=file;state.audioDuration=probe.duration;nodes.audioLabel.textContent=file.name;nodes.audioMeta.textContent=`${(file.size/1048576).toFixed(1)} MB · ${formatDuration(probe.duration)}`;nodes.audioPreview.src=url;nodes.audioPreview.hidden=false;}catch(error){URL.revokeObjectURL(url);toast('Браузер не смог прочитать метаданные MP3',true);nodes.audioFile.value='';}});
nodes.coverFile.addEventListener('change',async()=>{const file=nodes.coverFile.files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){toast('Нужна JPEG, PNG или WebP до 8 MB',true);nodes.coverFile.value='';return;}const url=URL.createObjectURL(file);const image=new Image();image.src=url;try{await image.decode();const ratio=image.naturalWidth/image.naturalHeight;if(image.naturalWidth<600||image.naturalHeight<600||ratio<.8||ratio>1.25)throw new Error('Минимум 600×600, форма близкая к квадрату');state.coverFile=file;state.coverInfo={width:image.naturalWidth,height:image.naturalHeight};nodes.coverPreview.src=url;nodes.coverLabel.textContent=file.name;nodes.coverMeta.textContent=`${image.naturalWidth}×${image.naturalHeight} · ${(file.size/1048576).toFixed(1)} MB`;}catch(error){URL.revokeObjectURL(url);toast(error.message||'Не удалось прочитать обложку',true);nodes.coverFile.value='';}});
nodes.search.addEventListener('input',()=>{state.query=nodes.search.value;renderTracks();});nodes.tabs.addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(!button)return;state.tab=button.dataset.tab;nodes.tabs.querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));renderTracks();});
$('#newTrackButton').addEventListener('click',()=>openEditor());$('#refreshButton').addEventListener('click',()=>loadCatalog('Каталог обновлён'));$('#closeEditorButton').addEventListener('click',closeEditor);$('#saveDraftButton').addEventListener('click',()=>persist(false));$('#publishButton').addEventListener('click',()=>persist(true));$('#previewButton').addEventListener('click',()=>showPreview());$('#closePreviewButton').addEventListener('click',closePreview);$('#previewBackdrop').addEventListener('click',closePreview);
$('#unpublishButton').addEventListener('click',async()=>{if(!state.current||!confirm(`Снять «${state.current.title}» с публикации?`))return;try{await api(`/api/admin/tracks/${encodeURIComponent(state.current.id)}/unpublish`,{method:'POST'});await loadCatalog('Трек снят с публикации');closeEditor();}catch(error){toast(error.message,true);}});
$('#archiveButton').addEventListener('click',async()=>{if(!state.current||!confirm(`Архивировать «${state.current.title}»? Трек исчезнет из публичного каталога.`))return;try{await api(`/api/admin/tracks/${encodeURIComponent(state.current.id)}/archive`,{method:'POST'});await loadCatalog('Трек архивирован');closeEditor();}catch(error){toast(error.message,true);}});
$('#hardDeleteButton').addEventListener('click',async()=>{if(!state.current)return;const confirmId=prompt(`Безвозвратное удаление метаданных и R2-файлов. Введите ID:\n${state.current.id}`);if(confirmId!==state.current.id){toast('ID не совпал; удаление отменено',true);return;}try{await api(`/api/admin/tracks/${encodeURIComponent(state.current.id)}?hard=1&confirm=${encodeURIComponent(confirmId)}`,{method:'DELETE'});await loadCatalog('Трек удалён');closeEditor();}catch(error){toast(error.message,true);}});
$('#exportButton').addEventListener('click',()=>{location.href='/api/admin/export';});$('#importFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{state.importBackup=JSON.parse(await file.text());$('#importPreviewButton').disabled=false;$('#importResult').textContent=`Выбран: ${file.name}`;}catch(error){toast('Некорректный JSON backup',true);}});
$('#importPreviewButton').addEventListener('click',async()=>{try{const result=await api('/api/admin/import',{method:'POST',body:{mode:'preview',backup:state.importBackup}});const p=result.preview;$('#importResult').textContent=`Dry run: ${p.incoming} записей; создать ${p.create}; обновить ${p.update}; вне backup ${p.unchangedOutsideBackup}.`;if(confirm('Проверка пройдена. Применить этот backup к каталогу?')){await api('/api/admin/import',{method:'POST',body:{mode:'apply',backup:state.importBackup}});await loadCatalog('Backup импортирован');}}catch(error){toast(error.message,true);$('#importResult').textContent=error.message;}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!nodes.previewSheet.hidden)closePreview();else if(!nodes.editor.hidden)closeEditor();}});
buildLocalizedFields();loadCatalog();
