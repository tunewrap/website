const UI_LOCALES = Object.freeze([['en','EN'],['ru','RU'],['uk','UA'],['ka','GE'],['de','DE']]);
const PRIMARY_LOCALE = Object.freeze({RU:'ru',UA:'uk',GE:'ka',EN:'en',DE:'de'});
const FALLBACK_COVER = '/assets/covers/tunewrap-placeholder.svg';
const $ = selector => document.querySelector(selector);
const state = {tracks:[],summary:null,tab:'all',query:'',current:null,audioFile:null,audioDuration:0,coverFile:null,coverInfo:null,importBackup:null,busy:false,localeTab:'ru',primaryLocale:'ru',storyCategories:[],selectedStoryCategories:new Set(),editorAbortController:null};

// ---------- Stage 12: Admin Studio section navigation ----------
(function installAdminSectionNavigation(){
  const header=document.querySelector('.admin-header');
  if(!header||document.getElementById('adminSectionNavigation'))return;

  const style=document.createElement('style');
  style.id='adminSectionNavigationStyles';
  style.textContent=`
    .admin-section-nav{display:flex;align-items:center;gap:5px;margin-left:auto;margin-right:9px;padding:4px;border:1px solid var(--line);border-radius:13px;background:#0d0d0b}
    .admin-section-nav a{min-height:34px;display:inline-flex;align-items:center;justify-content:center;padding:0 11px;border-radius:9px;color:var(--muted);text-decoration:none;font-size:11px;font-weight:800}
    .admin-section-nav a.is-active{color:#0b0905;background:var(--gold)}
    @media(max-width:520px){.admin-header{gap:7px}.admin-section-nav{margin-right:0}.admin-section-nav a{padding:0 8px;font-size:10px}.brand small{display:none}}
  `;
  document.head.append(style);

  const nav=document.createElement('nav');
  nav.id='adminSectionNavigation';
  nav.className='admin-section-nav';
  nav.setAttribute('aria-label','Разделы Admin Studio');

  const music=document.createElement('a');
  music.href='/admin/';
  music.className='is-active';
  music.textContent='Музыка';
  music.setAttribute('aria-current','page');

  const orders=document.createElement('a');
  orders.href='/admin/orders.html';
  orders.textContent='Заказы';

  nav.append(music,orders);
  const refresh=document.getElementById('refreshButton');
  header.insertBefore(nav,refresh||null);
})();

const nodes = {
  list:$('#trackList'),empty:$('#emptyState'),search:$('#searchInput'),tabs:$('#catalogTabs'),editor:$('#trackEditor'),form:$('#trackForm'),
  formErrors:$('#formErrors'),trackId:$('#trackId'),title:$('#titleField'),section:$('#sectionField'),language:$('#languageField'),artist:$('#artistField'),
  album:$('#albumField'),category:$('#categoryField'),storyCategoryChoices:$('#storyCategoryChoices'),storyCategoryField:$('#storyCategoryAdminField'),tags:$('#tagsField'),description:$('#descriptionField'),lyrics:$('#lyricsField'),translation:$('#translationField'),
  featured:$('#featuredField'),order:$('#orderField'),audioFile:$('#audioFile'),audioLabel:$('#audioFileLabel'),audioMeta:$('#audioMeta'),audioProgress:$('#audioProgress'),
  audioPreview:$('#audioPreview'),coverFile:$('#coverFile'),coverLabel:$('#coverFileLabel'),coverMeta:$('#coverMeta'),coverProgress:$('#coverProgress'),
  coverPreview:$('#coverPreview'),localized:$('#localizedFields'),previewSheet:$('#previewSheet'),previewCover:$('#previewCover'),previewTitle:$('#previewTitle'),
  previewMeta:$('#previewMeta'),previewDescription:$('#previewDescription'),sheetAudio:$('#sheetAudio'),editorMode:$('#editorMode'),editorTitle:$('#editorTitle'),
  dangerZone:$('#dangerZone'),toast:$('#toastRegion')
};

function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function toast(message,error=false){const item=el('div','toast'+(error?' is-error':''),message);nodes.toast.append(item);setTimeout(()=>item.remove(),4200);}
function formatDuration(value){const seconds=Math.max(0,Math.round(Number(value)||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}

async function detectImageMime(file){
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
  if(bytes.length>=8 &&
    bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47 &&
    bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a) return 'image/png';
  if(bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return 'image/jpeg';
  if(bytes.length>=12 &&
    String.fromCharCode(...bytes.slice(0,4))==='RIFF' &&
    String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
  return '';
}

function localizedValue(value,locale,fallback=''){return value?.[locale]||value?.ru||value?.en||Object.values(value||{})[0]||fallback;}

async function api(path,options={}){
  const headers=new Headers(options.headers||{});
  if(options.body&&!(options.body instanceof Blob))headers.set('content-type','application/json');
  headers.set('accept','application/json');
  const response=await fetch(path,{...options,headers,body:options.body&&!(options.body instanceof Blob)?JSON.stringify(options.body):options.body});
  let payload=null;try{payload=await response.json();}catch(error){}
  if(!response.ok){const details=Array.isArray(payload?.details)?'\n'+payload.details.join('\n'):'';throw new Error((payload?.error||`HTTP ${response.status}`)+details);}
  return payload;
}
function setBusy(value){
  state.busy=value;
  const keepActive=new Set(['previewButton','closePreviewButton','previewBackdrop','closeEditorButton']);
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
}
function categoryLabel(item){return item?.labels?.ru||item?.labels?.en||item?.id||'Категория';}
function enabledStoryCategories(){return (state.storyCategories||[]).filter(item=>item?.enabled!==false).slice().sort((a,b)=>(a.order||99)-(b.order||99)||a.id.localeCompare(b.id));}
function selectedStoryCategoryIds(){return Array.from(state.selectedStoryCategories);}
function syncStoryCategoryVisibility(){if(nodes.storyCategoryField)nodes.storyCategoryField.hidden=nodes.section.value!=='stories';}
function renderStoryCategoryChoices(selected=[]){
  state.selectedStoryCategories=new Set(Array.isArray(selected)?selected:[]);
  if(!nodes.storyCategoryChoices)return;
  const categories=enabledStoryCategories();const fragment=document.createDocumentFragment();
  categories.forEach(item=>{const button=el('button','story-category-admin-chip',categoryLabel(item));button.type='button';button.dataset.storyCategoryId=item.id;const active=state.selectedStoryCategories.has(item.id);button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));button.addEventListener('click',()=>{if(state.selectedStoryCategories.has(item.id))state.selectedStoryCategories.delete(item.id);else state.selectedStoryCategories.add(item.id);renderStoryCategoryChoices(selectedStoryCategoryIds());});fragment.append(button);});
  nodes.storyCategoryChoices.replaceChildren(fragment);if(!categories.length)nodes.storyCategoryChoices.append(el('span','story-category-admin-empty','Сначала создайте категории.'));syncStoryCategoryVisibility();
}
async function loadStoryCategories(){try{const data=await api('/api/admin/story-categories');state.storyCategories=data?.config?.categories||[];renderStoryCategoryChoices(state.current?.categoryIds||[]);}catch(error){state.storyCategories=[];if(nodes.storyCategoryChoices)nodes.storyCategoryChoices.replaceChildren(el('span','story-category-admin-empty','Категории временно недоступны.'));}}
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
  [section[index],section[target]]=[section[target],section[index]];
  api('/api/admin/reorder',{method:'POST',body:{section:track.section,ids:section.map(item=>item.id)}}).then(()=>loadCatalog('Порядок обновлён')).catch(error=>toast(error.message,true));
}
function trackRow(track){
  const row=el('article','track-row');row.dataset.id=track.id;
  const identity=el('div','track-identity');const image=el('img');image.src=track.cover||FALLBACK_COVER;image.alt='';image.loading='lazy';image.addEventListener('error',()=>{image.src=FALLBACK_COVER;},{once:true});
  const copy=el('div');copy.append(el('strong','',track.title),el('small','',`${track.id} · ${track.language}`));identity.append(image,copy);
  const section=el('span','track-section',track.section==='stories'?'Stories':'Author');const order=el('span','track-order',`#${track.order}`);const status=el('span','status'+(track.published?' is-published':''),track.published?'Published':'Draft');
  const actions=el('div','row-actions');actions.append(actionButton('◉','Предпросмотр',()=>showPreview(track)),actionButton('✎','Редактировать',()=>openEditor(track)));
  const orderButtons=el('div','order-buttons');orderButtons.append(actionButton('↑','Выше в разделе',()=>moveTrack(track,-1)),actionButton('↓','Ниже в разделе',()=>moveTrack(track,1)));
  row.append(identity,section,order,status,actions,orderButtons);row.addEventListener('dblclick',()=>openEditor(track));return row;
}
function renderTracks(){const tracks=filteredTracks();nodes.list.replaceChildren(...tracks.map(trackRow));nodes.empty.hidden=tracks.length>0;}

function installLocaleStyles(){
  if(document.getElementById('tunewrapAdminLocaleStyles'))return;
  const style=document.createElement('style');
  style.id='tunewrapAdminLocaleStyles';
  style.textContent=`
    .locale-edit-tabs{display:flex;gap:7px;margin:0 0 12px;overflow-x:auto;scrollbar-width:none}
    .locale-edit-tabs::-webkit-scrollbar{display:none}
    .locale-edit-tabs button{position:relative;flex:none;min-width:52px;min-height:40px;padding:0 13px;border:1px solid var(--line);border-radius:999px;color:var(--muted);background:#0b0b09;font-weight:700}
    .locale-edit-tabs button.is-active{color:#0b0905;background:var(--gold);border-color:var(--gold)}
    .locale-edit-tabs button.is-primary::after{content:"•";position:absolute;right:6px;top:2px;color:var(--gold2);font-size:12px}
    .locale-edit-tabs button.is-active.is-primary::after{color:#5e4518}
    .locale-panel{display:none;padding:14px;border:1px solid var(--line);border-radius:15px;background:#0b0b09}
    .locale-panel.is-active{display:block}
    .locale-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .locale-panel-head strong{font:500 17px/1.2 Georgia,serif}
    .locale-primary-badge{display:none;padding:5px 8px;border:1px solid rgba(217,181,97,.28);border-radius:999px;color:var(--gold2);font-size:9px;letter-spacing:.08em;text-transform:uppercase}
    .locale-panel.is-primary .locale-primary-badge{display:inline-flex}
    .locale-grid{display:grid;gap:11px}
    .locale-field{display:block}
    .locale-field>span{display:block;margin-bottom:6px;color:var(--muted);font-size:11px}
    .locale-field input,.locale-field textarea{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:12px;outline:0;color:var(--text);background:#070707}
    .locale-field textarea{resize:vertical;line-height:1.55}
    .locale-field input:focus,.locale-field textarea:focus{border-color:rgba(224,188,104,.65);box-shadow:0 0 0 3px rgba(224,188,104,.07)}
    .locale-help{margin:10px 1px 0;color:var(--muted);font-size:10px;line-height:1.45}
    @media(min-width:720px){.locale-grid.two{grid-template-columns:1fr 1fr}.locale-grid.two .locale-field-wide{grid-column:1/-1}}
  `;
  document.head.append(style);
}
function localeField(kind,locale){return nodes.localized.querySelector(`[data-localized-${kind}="${locale}"]`);}
function setLocaleTab(locale){
  if(!UI_LOCALES.some(([code])=>code===locale))locale='ru';
  state.localeTab=locale;
  nodes.localized.querySelectorAll('[data-locale-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.localeTab===locale));
  nodes.localized.querySelectorAll('[data-locale-panel]').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.localePanel===locale));
}
function markPrimaryLocale(){
  state.primaryLocale=PRIMARY_LOCALE[nodes.language.value]||'ru';
  nodes.localized.querySelectorAll('[data-locale-tab]').forEach(button=>button.classList.toggle('is-primary',button.dataset.localeTab===state.primaryLocale));
  nodes.localized.querySelectorAll('[data-locale-panel]').forEach(panel=>panel.classList.toggle('is-primary',panel.dataset.localePanel===state.primaryLocale));
}
function syncPrimaryToLocale(){
  const locale=PRIMARY_LOCALE[nodes.language.value]||'ru';
  const pairs=[['title',nodes.title],['description',nodes.description],['lyrics',nodes.lyrics],['translation',nodes.translation]];
  for(const [kind,source] of pairs){const target=localeField(kind,locale);if(target)target.value=source.value;}
}
function syncLocaleToPrimary(kind,locale,value){
  const primary=PRIMARY_LOCALE[nodes.language.value]||'ru';
  if(locale!==primary)return;
  const map={title:nodes.title,description:nodes.description,lyrics:nodes.lyrics,translation:nodes.translation};
  if(map[kind])map[kind].value=value;
}
function makeLocaleField(label,kind,locale,rows=0){
  const wrap=el('label','locale-field'+(rows>=7?' locale-field-wide':''));
  wrap.append(el('span','',label));
  const control=rows?document.createElement('textarea'):document.createElement('input');
  if(rows){control.rows=rows;}else{control.type='text';control.maxLength=140;}
  control.dataset[`localized${kind[0].toUpperCase()+kind.slice(1)}`]=locale;
  control.placeholder=`${label} · ${UI_LOCALES.find(([code])=>code===locale)?.[1]||locale.toUpperCase()}`;
  control.addEventListener('input',()=>syncLocaleToPrimary(kind,locale,control.value));
  wrap.append(control);
  return wrap;
}
function buildLocalizedFields(){
  installLocaleStyles();
  nodes.localized.replaceChildren();
  const tabs=el('div','locale-edit-tabs');
  const panels=el('div','locale-panels');
  for(const [locale,label] of UI_LOCALES){
    const button=el('button','',label);button.type='button';button.dataset.localeTab=locale;button.addEventListener('click',()=>setLocaleTab(locale));tabs.append(button);
    const panel=el('section','locale-panel');panel.dataset.localePanel=locale;
    const head=el('div','locale-panel-head');head.append(el('strong','',`${label} · версия для сайта`),el('span','locale-primary-badge','Основной язык'));panel.append(head);
    const grid=el('div','locale-grid two');
    grid.append(
      makeLocaleField('Название','title',locale,0),
      makeLocaleField('Описание / история','description',locale,4),
      makeLocaleField('Текст песни','lyrics',locale,9),
      makeLocaleField('Перевод / альтернативный текст','translation',locale,7)
    );
    panel.append(grid,el('p','locale-help','Вручную заполнять не нужно: при сохранении пустые языки переводятся автоматически. Здесь можно проверить или при желании поправить перевод.'));
    panels.append(panel);
  }
  nodes.localized.append(tabs,panels);
  markPrimaryLocale();
  setLocaleTab(state.primaryLocale);
}
function resetUploads(){state.audioFile=null;state.audioDuration=0;state.coverFile=null;state.coverInfo=null;nodes.audioFile.value='';nodes.coverFile.value='';nodes.audioProgress.hidden=true;nodes.audioProgress.value=0;nodes.coverProgress.hidden=true;nodes.coverProgress.value=0;nodes.audioPreview.pause();nodes.audioPreview.removeAttribute('src');nodes.audioPreview.hidden=true;}
function openEditor(track=null){
  state.current=track;resetUploads();nodes.form.reset();nodes.trackId.value=track?.id||'';nodes.title.value=track?.title||'';nodes.section.value=track?.section||'stories';nodes.language.value=track?.language||'RU';nodes.artist.value=track?.artist||'TuneWrap';nodes.album.value=track?.album||'';
  const primary=PRIMARY_LOCALE[track?.language]||'ru';
  state.primaryLocale=primary;
  // Editing must never copy a fallback language into the primary-language field.
  // All locale maps are loaded below, so an unrelated edit preserves them exactly.
  nodes.category.value=track?.category?.[primary]||'';nodes.tags.value=(track?.tags||[]).join(',');renderStoryCategoryChoices(track?.categoryIds||[]);
  nodes.description.value=track?.descriptions?.[primary]||'';
  nodes.lyrics.value=track?.lyrics?.[primary]||'';
  nodes.translation.value=track?.translation?.[primary]||'';
  nodes.featured.checked=Boolean(track?.featured);nodes.order.value=track?.order||'';
  for(const [locale] of UI_LOCALES){
    localeField('title',locale).value=track?.titles?.[locale]||'';
    localeField('description',locale).value=track?.descriptions?.[locale]||'';
    localeField('lyrics',locale).value=track?.lyrics?.[locale]||'';
    localeField('translation',locale).value=track?.translation?.[locale]||'';
  }
  syncPrimaryToLocale();markPrimaryLocale();setLocaleTab(primary);
  nodes.audioLabel.textContent=track?.audio?'Текущий MP3 подключён':'Выберите MP3';nodes.audioMeta.textContent=track?.durationLabel||(track?.audio?track.audio:'До 80 MB');if(track?.audio){nodes.audioPreview.src=track.audio;nodes.audioPreview.hidden=false;}
  nodes.coverPreview.src=track?.cover||FALLBACK_COVER;nodes.coverLabel.textContent=track?.cover?'Текущая обложка':'Фирменная заглушка';nodes.coverMeta.textContent=track?.artwork?.width?`${track.artwork.width}×${track.artwork.height}`:'Квадратная обложка, до 8 MB';
  nodes.editorMode.textContent=track?(track.published?'Опубликованный трек':'Черновик'):'Новый трек';nodes.editorTitle.textContent=track?.title||'Черновик';nodes.dangerZone.hidden=!track;$('#unpublishButton').hidden=!track?.published;nodes.formErrors.hidden=true;nodes.editor.hidden=false;document.body.style.overflow='hidden';nodes.title.focus();
}
function closeEditor(){
  if(state.editorAbortController){
    try{state.editorAbortController.abort();}catch(error){}
    state.editorAbortController=null;
  }
  setBusy(false);
  nodes.editor.hidden=true;
  document.body.style.overflow='';
  state.current=null;
  resetUploads();
}
function mapsFromForm(){
  const titles={...(state.current?.titles||{})};
  const descriptions={...(state.current?.descriptions||{})};
  const lyrics={...(state.current?.lyrics||{})};
  const translation={...(state.current?.translation||{})};
  for(const [locale] of UI_LOCALES){
    for(const [kind,target] of [['title',titles],['description',descriptions],['lyrics',lyrics],['translation',translation]]){
      const value=(localeField(kind,locale)?.value||'').trim();
      if(value)target[locale]=value;else delete target[locale];
    }
  }
  const primary=PRIMARY_LOCALE[nodes.language.value]||'ru';
  const primaryValues={
    title:nodes.title.value.trim(),
    description:nodes.description.value.trim(),
    lyrics:nodes.lyrics.value.trim(),
    translation:nodes.translation.value.trim()
  };
  if(primaryValues.title)titles[primary]=primaryValues.title;else delete titles[primary];
  if(primaryValues.description)descriptions[primary]=primaryValues.description;else delete descriptions[primary];
  if(primaryValues.lyrics)lyrics[primary]=primaryValues.lyrics;else delete lyrics[primary];
  if(primaryValues.translation)translation[primary]=primaryValues.translation;else delete translation[primary];
  return{titles,descriptions,lyrics,translation,primary};
}
function readForm(){
  const{titles,descriptions,lyrics,translation,primary}=mapsFromForm();
  const category={...(state.current?.category||{})};if(nodes.category.value.trim())category[primary]=nodes.category.value.trim();else delete category[primary];
  return{...(state.current||{}),title:nodes.title.value.trim(),originalTitle:state.current?.originalTitle||nodes.title.value.trim(),titles,descriptions,section:nodes.section.value,language:nodes.language.value,artist:nodes.artist.value.trim()||'TuneWrap',album:nodes.album.value.trim(),category,categoryIds:nodes.section.value==='stories'?selectedStoryCategoryIds():[],tags:nodes.tags.value.split(',').map(value=>value.trim()).filter(Boolean),lyrics,translation,order:Number(nodes.order.value)||state.current?.order||0,featured:nodes.featured.checked,audio:state.current?.audio||'',cover:state.current?.cover||'',artwork:state.current?.artwork||{},duration:state.current?.duration||0,durationLabel:state.current?.durationLabel||''};
}

// ---------- Stage 12.14.3: Independent Admin Persistence ----------
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

function needsBackgroundTranslation(isNew,patch,track){
  if(isNew)return true;
  if(['title','titles','descriptions','lyrics','language'].some(field=>Object.prototype.hasOwnProperty.call(patch,field)))return true;
  // Re-publishing an unchanged track must also resume any language which is
  // still empty after a previous rate-limit/model failure. The public player
  // may show its EN fallback, but that is not a completed DE/UA/GE/RU locale.
  return Boolean(track&&(hasUnsafeTranslations(track)||missingTranslationTargets(track).length));
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
  nodes.coverMeta.textContent=saved.artwork?.width?`${saved.artwork.width}×${saved.artwork.height}`:'Обложка сохранена';
  nodes.coverPreview.src=saved.cover||FALLBACK_COVER;
}
function isCollapsedStructuredTranslation(sourceText,targetText){
  const source=String(sourceText||'').replace(/\r\n/g,'\n');
  const target=String(targetText||'').replace(/\r\n/g,'\n');
  if(!source.trim()||!target.trim())return false;
  const sourceBreaks=(source.match(/\n/g)||[]).length;
  const targetBreaks=(target.match(/\n/g)||[]).length;
  const sourceNonEmpty=source.split('\n').filter(line=>line.trim()).length;
  return sourceNonEmpty>=6&&sourceBreaks>=5&&targetBreaks<=1;
}

// Stage 12.14.4: detect reasoning/analysis accidentally returned by an AI
// model instead of a localized value, so a later publish can repair it.
const AI_TRANSLATION_CONTAMINATION=Object.freeze([
  /\b(?:okay|alright),?\s+let(?:'|’)?s\s+(?:tackle|translate|work through|break\s+(?:this|it)\s+down)/i,
  /\bthe user(?:'s)?\s+(?:asks|wants|provided|sentence|text)/i,
  /\b(?:source|original|target)\s+(?:sentence|text|phrase|language)\b/i,
  /\b(?:translate|translating|translated)\s+(?:this|the|it)\s+(?:sentence|line|phrase|text)\b/i,
  /\bputting it all together\b/i,
  /\bi need to\s+(?:translate|make sure|check)\b/i,
  /\b(?:here(?:'|’)?s|the)\s+(?:final\s+)?translation\b/i,
  /<\/?think>|```|^\s*(?:analysis|reasoning)\s*:/im
]);

function localizedScriptShare(value,target){
  let relevant=0;
  let matching=0;
  for(const char of String(value||'')){
    const latin=/[A-Za-zÄÖÜäöüß]/.test(char);
    const cyrillic=/[\u0400-\u04ff]/.test(char);
    const georgian=/[\u10a0-\u10ff]/.test(char);
    if(!latin&&!cyrillic&&!georgian)continue;
    relevant+=1;
    if((target==='ka'&&georgian)||((target==='ru'||target==='uk')&&cyrillic)||((target==='en'||target==='de')&&latin))matching+=1;
  }
  return relevant?matching/relevant:1;
}

function normalizedLocalizedText(value){
  return String(value||'').toLocaleLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim();
}

function isMeaningfulLocalizedSentence(value){
  const normalized=normalizedLocalizedText(value);
  return normalized.length>=18&&normalized.split(/\s+/).filter(Boolean).length>=3;
}

function looksEnglishInsteadOfGerman(value){
  const words=normalizedLocalizedText(value).split(/\s+/).filter(Boolean);
  if(words.length<4)return false;
  const english=new Set(['the','and','that','this','with','from','for','you','your','was','were','are','have','has','had','but','not','into','when','where','what','who','how','all','can','could','would','should','will','just','never','before','after','about','through','their','they','them','our','his','her','she','he','we','i','me','my','of','to','in','on','is','it','a','an']);
  const german=new Set(['der','die','das','den','dem','des','ein','eine','einer','einem','einen','und','oder','aber','nicht','mit','von','für','zu','im','in','auf','ist','sind','war','waren','ich','du','er','sie','wir','ihr','mein','meine','dein','deine','sein','seine','unser','unsere','dass','wenn','wie','was','wer','wo','nach','vor','durch','über','noch','schon','hat','haben','wird','werden']);
  let englishScore=0;
  let germanScore=0;
  for(const word of words){
    if(english.has(word))englishScore+=1;
    if(german.has(word))germanScore+=1;
  }
  return englishScore>=3&&englishScore>=germanScore+2;
}

function isUnsafeMachineTranslation(sourceText,targetText,target,englishText=''){
  const source=String(sourceText||'').trim();
  const value=String(targetText||'').trim();
  if(!source||!value)return false;
  if(AI_TRANSLATION_CONTAMINATION.some(pattern=>pattern.test(value)))return true;
  if(value.length>Math.max(420,source.length*4+240))return true;
  const sourceLines=Math.max(1,source.split(/\r?\n/).filter(line=>line.trim()).length);
  const targetLines=Math.max(1,value.split(/\r?\n/).filter(line=>line.trim()).length);
  if(targetLines>sourceLines*3+8&&value.length>source.length*2)return true;
  if(target==='de'){
    const german=normalizedLocalizedText(value);
    const english=normalizedLocalizedText(englishText);
    if(english&&german===english&&isMeaningfulLocalizedSentence(value))return true;
    if(looksEnglishInsteadOfGerman(value))return true;
  }
  if(['ru','uk','ka'].includes(target)&&value.length>120&&localizedScriptShare(value,target)<0.35)return true;
  return false;
}

function hasUnsafeTranslations(track){
  if(!track)return false;
  const source=PRIMARY_LOCALE[track.language]||'ru';
  const sourceTitle=track.titles?.[source]||track.title||'';
  const sourceDescription=track.descriptions?.[source]||'';
  const sourceLyrics=track.lyrics?.[source]||'';
  return UI_LOCALES.some(([locale])=>locale!==source&&(
    isUnsafeMachineTranslation(sourceTitle,track.titles?.[locale],locale,locale==='de'?track.titles?.en:'')||
    isUnsafeMachineTranslation(sourceDescription,track.descriptions?.[locale],locale,locale==='de'?track.descriptions?.en:'')||
    isUnsafeMachineTranslation(sourceLyrics,track.lyrics?.[locale],locale,locale==='de'?track.lyrics?.en:'')
  ));
}

function missingTranslationTargets(track){
  const source=PRIMARY_LOCALE[track.language]||'ru';
  const sourceTitle=track.titles?.[source]||track.title||'';
  const sourceDescription=track.descriptions?.[source]||'';
  const sourceLyrics=track.lyrics?.[source]||'';
  return UI_LOCALES.map(([locale])=>locale).filter(locale=>{
    if(locale===source)return false;
    return (sourceTitle&&(!track.titles?.[locale]||isUnsafeMachineTranslation(sourceTitle,track.titles?.[locale],locale,locale==='de'?track.titles?.en:''))) ||
      (sourceDescription&&(!track.descriptions?.[locale]||isUnsafeMachineTranslation(sourceDescription,track.descriptions?.[locale],locale,locale==='de'?track.descriptions?.en:''))) ||
      (sourceLyrics&&(!track.lyrics?.[locale]||isCollapsedStructuredTranslation(sourceLyrics,track.lyrics?.[locale])||isUnsafeMachineTranslation(sourceLyrics,track.lyrics?.[locale],locale,locale==='de'?track.lyrics?.en:'')));
  });
}

function buildLineItems(kind,text,avoidText=''){
  const lines=String(text||'').replace(/\r\n/g,'\n').split('\n');
  const avoidLines=String(avoidText||'').replace(/\r\n/g,'\n').split('\n');
  const items=[];
  lines.forEach((line,index)=>{
    if(line.trim())items.push({id:`${kind}:${index}`,kind,text:line,avoidText:avoidLines[index]||''});
  });
  return {lines,items};
}

function rebuildLines(lines,translated,kind){
  return lines.map((line,index)=>{
    if(!line.trim())return '';
    return translated[`${kind}:${index}`]??line;
  }).join('\n');
}

async function translateItemsChunked(sourceLanguage,target,items){
  const translated={};
  const CHUNK_SIZE=8;
  for(let offset=0;offset<items.length;offset+=CHUNK_SIZE){
    const chunk=items.slice(offset,offset+CHUNK_SIZE);
    const result=await api('/api/admin/translate',{method:'POST',body:{
      sourceLanguage,
      target,
      items:chunk
    }});
    Object.assign(translated,result.translations||{});
  }
  return translated;
}

async function translateOneTarget(track,source,target){
  const sourceTitle=track.titles?.[source]||track.title||'';
  const sourceDescription=track.descriptions?.[source]||'';
  const sourceLyrics=track.lyrics?.[source]||'';
  const targetTitle=track.titles?.[target]||'';
  const targetDescription=track.descriptions?.[target]||'';
  const targetLyrics=track.lyrics?.[target]||'';

  const englishTitle=target==='de'?(track.titles?.en||''):'';
  const englishDescription=target==='de'?(track.descriptions?.en||''):'';
  const englishLyrics=target==='de'?(track.lyrics?.en||''):'';
  const needsTitle=Boolean(sourceTitle&&(!targetTitle||isUnsafeMachineTranslation(sourceTitle,targetTitle,target,englishTitle)));
  const needsDescription=Boolean(sourceDescription&&(!targetDescription||isUnsafeMachineTranslation(sourceDescription,targetDescription,target,englishDescription)));
  const needsLyrics=Boolean(sourceLyrics&&(!targetLyrics||isCollapsedStructuredTranslation(sourceLyrics,targetLyrics)||isUnsafeMachineTranslation(sourceLyrics,targetLyrics,target,englishLyrics)));

  const items=[];
  let descriptionPack=null;
  let lyricsPack=null;

  if(needsTitle)items.push({id:'title',kind:'title',text:sourceTitle,avoidText:englishTitle});
  if(needsDescription){
    descriptionPack=buildLineItems('description',sourceDescription,englishDescription);
    items.push(...descriptionPack.items);
  }
  if(needsLyrics){
    lyricsPack=buildLineItems('lyrics',sourceLyrics,englishLyrics);
    items.push(...lyricsPack.items);
  }

  if(!items.length)return track;

  const translated=await translateItemsChunked(track.language,target,items);
  const titles={...(track.titles||{})};
  const descriptions={...(track.descriptions||{})};
  const lyrics={...(track.lyrics||{})};

  if(needsTitle&&translated.title)titles[target]=translated.title;
  if(needsDescription&&descriptionPack){
    descriptions[target]=rebuildLines(descriptionPack.lines,translated,'description');
  }
  if(needsLyrics&&lyricsPack){
    lyrics[target]=rebuildLines(lyricsPack.lines,translated,'lyrics');
  }

  return {...track,titles,descriptions,lyrics};
}

async function autoTranslateMissing(track){
  const source=PRIMARY_LOCALE[track.language]||'ru';
  const targets=missingTranslationTargets(track);
  if(!targets.length)return track;

  let next=track;
  for(let index=0;index<targets.length;index++){
    const target=targets[index];
    const label=UI_LOCALES.find(([code])=>code===target)?.[1]||target.toUpperCase();
    toast(`Автоперевод ${label} · ${index+1}/${targets.length}`);
    next=await translateOneTarget(next,source,target);
  }
  return next;
}

function validateClient(track,publish){const errors=[];if(!track.title)errors.push('Введите название');if(!track.section)errors.push('Выберите раздел');if(!track.language)errors.push('Выберите язык');if(publish&&!track.audio&&!state.audioFile)errors.push('Для публикации выберите MP3');if(state.coverFile&&!state.coverInfo)errors.push('Дождитесь проверки обложки');return errors;}
function showErrors(errors){nodes.formErrors.textContent=errors.join('\n');nodes.formErrors.hidden=!errors.length;if(errors.length)nodes.formErrors.scrollIntoView({behavior:'smooth',block:'center'});}
function xhrUpload(path,file,progress,headers={},signal=null){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();let settled=false;const finish=(fn,value)=>{if(settled)return;settled=true;fn(value);};xhr.open('POST',path);xhr.responseType='json';xhr.timeout=120000;xhr.setRequestHeader('content-type',file.type||'application/octet-stream');xhr.setRequestHeader('x-file-name',encodeURIComponent(file.name));Object.entries(headers).forEach(([key,value])=>xhr.setRequestHeader(key,String(value)));progress.hidden=false;xhr.upload.onprogress=event=>{if(event.lengthComputable)progress.value=Math.round(event.loaded/event.total*100);};xhr.onload=()=>xhr.status>=200&&xhr.status<300?finish(resolve,xhr.response):finish(reject,new Error(xhr.response?.error||`Upload HTTP ${xhr.status}`));xhr.onerror=()=>finish(reject,new Error('Загрузка прервана сетью'));xhr.ontimeout=()=>finish(reject,new Error('Загрузка не завершилась за 120 секунд. Интерфейс разблокирован.'));xhr.onabort=()=>finish(reject,editorAbortError());if(signal){if(signal.aborted){xhr.abort();return;}signal.addEventListener('abort',()=>xhr.abort(),{once:true});}xhr.send(file);});}

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
  const source=PRIMARY_LOCALE[saved.language]||'ru';
  let baseline=saved;
  let repaired=0;

  // Commit each language independently. A later model/rate-limit failure must
  // not discard translations which were already completed successfully.
  for(let index=0;index<targets.length;index++){
    const target=targets[index];
    const label=UI_LOCALES.find(([code])=>code===target)?.[1]||target.toUpperCase();
    toast(`Автоперевод ${label} · ${index+1}/${targets.length}`);
    const translated=await translateOneTarget(baseline,source,target);
    const latestPayload=await api(`/api/admin/tracks/${encodeURIComponent(saved.id)}`);
    const latest=latestPayload?.track;
    if(!latest)continue;

    const patch={};
    for(const field of ['titles','descriptions','lyrics']){
      const merged=mergeBackgroundLocaleField(baseline[field],translated[field],latest[field]);
      if(merged)patch[field]=merged;
    }

    if(Object.keys(patch).length){
      baseline=(await api(`/api/admin/tracks/${encodeURIComponent(saved.id)}`,{
        method:'PATCH',
        body:patch
      })).track;
      repaired+=1;
    }else baseline=latest;
  }

  await loadCatalog(repaired?'Изменения сохранены · переводы проверены и исправлены':'Переводы уже актуальны');
}

function queueBackgroundTranslations(saved){
  setTimeout(()=>{
    completeMissingTranslations(saved).catch(error=>{
      toast(`Изменения уже сохранены. Автоперевод не выполнен: ${error.message}`,true);
    });
  },0);
}

// ---------- Stage 12.14.2: Incremental Admin Editor ----------
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

async function persist(publish){
  if(state.busy)return null;let track=readForm();const errors=validateClient(track,publish);if(errors.length){showErrors(errors);return null;}showErrors([]);const operation=new AbortController();state.editorAbortController=operation;setBusy(true);
  const isNew=!state.current;
  const metadataPatch=isNew?{}:buildMetadataPatch(state.current,track);
  const translateAfterSave=needsBackgroundTranslation(isNew,metadataPatch,track);
  const completed=[];
  try{
    // Metadata, audio and cover are independent commits. A later failure cannot
    // roll back an earlier successful field edit or force it to be re-uploaded.
    let saved;
    if(isNew){
      saved=(await editorApi('/api/admin/tracks',{method:'POST',body:track})).track;
      state.current=saved;nodes.trackId.value=saved.id;completed.push('карточка трека');
    }else if(Object.keys(metadataPatch).length){
      saved=(await editorApi(`/api/admin/tracks/${encodeURIComponent(state.current.id)}`,{method:'PATCH',body:metadataPatch})).track;
      state.current=saved;completed.push('изменённые поля');
    }else saved=state.current;

    if(state.audioFile){
      const audioFile=state.audioFile;
      const audioDuration=state.audioDuration;
      const uploaded=await editorXhrUpload(`/api/admin/upload/audio?trackId=${encodeURIComponent(saved.id)}`,audioFile,nodes.audioProgress);
      const audioPatch={audio:uploaded.url,duration:audioDuration,durationLabel:formatDuration(audioDuration),audioQuality:{duration:audioDuration,codec:'mp3',source:'admin-upload'}};
      saved=(await editorApi(`/api/admin/tracks/${encodeURIComponent(saved.id)}`,{method:'PATCH',body:audioPatch})).track;
      state.current=saved;markAudioCommitted(saved);completed.push('MP3');
    }

    if(state.coverFile){
      const coverFile=state.coverFile;
      const coverInfo=state.coverInfo;
      const uploaded=await editorXhrUpload(`/api/admin/upload/cover?trackId=${encodeURIComponent(saved.id)}`,coverFile,nodes.coverProgress,{'x-image-width':coverInfo.width,'x-image-height':coverInfo.height});
      saved=(await editorApi(`/api/admin/tracks/${encodeURIComponent(saved.id)}`,{method:'PATCH',body:{cover:uploaded.url,artwork:uploaded.artwork}})).track;
      state.current=saved;markCoverCommitted(saved);completed.push('обложка');
    }

    if(publish){
      if(!saved.published)saved=(await editorApi(`/api/admin/tracks/${encodeURIComponent(saved.id)}/publish`,{method:'POST'})).track;
    }else if(saved.published){
      saved=(await editorApi(`/api/admin/tracks/${encodeURIComponent(saved.id)}/unpublish`,{method:'POST'})).track;
    }
    state.current=saved;setBusy(false);await loadCatalog(publish?'Трек опубликован':'Черновик сохранён');closeEditor();if(translateAfterSave)queueBackgroundTranslations(saved);return saved;
  }catch(error){
    if(error?.name==='AbortError')return null;
    const partial=completed.length?`Уже сохранено: ${completed.join(', ')}.`:'';
    showErrors([partial,...String(error?.message||error).split('\n')].filter(Boolean));
    toast(error?.message||String(error),true);
    return null;
  }finally{
    if(state.editorAbortController===operation)state.editorAbortController=null;
    setBusy(false);
  }
}
function showPreview(track=readForm()){
  const primary=PRIMARY_LOCALE[track.language]||'ru';
  const locale=nodes.editor.hidden?primary:(state.localeTab||primary);
  nodes.previewCover.src=track.cover||(state.coverFile?URL.createObjectURL(state.coverFile):FALLBACK_COVER);
  nodes.previewTitle.textContent=track.titles?.[locale]||track.title||'Без названия';
  const localeLabel=UI_LOCALES.find(([code])=>code===locale)?.[1]||locale.toUpperCase();
  nodes.previewMeta.textContent=`${track.language||'—'} · ${track.section==='author'?'Author Songs':'Musical Stories'} · preview ${localeLabel}`;
  nodes.previewDescription.textContent=localizedValue(track.descriptions,locale,'Описание пока не добавлено.');
  const audioSource=state.audioFile?URL.createObjectURL(state.audioFile):track.audio;if(audioSource){nodes.sheetAudio.src=audioSource;nodes.sheetAudio.hidden=false;}else{nodes.sheetAudio.removeAttribute('src');nodes.sheetAudio.hidden=true;}nodes.previewSheet.hidden=false;
}
function closePreview(){nodes.sheetAudio.pause();nodes.previewSheet.hidden=true;}

for(const node of [nodes.title,nodes.description,nodes.lyrics,nodes.translation])node.addEventListener('input',syncPrimaryToLocale);
nodes.language.addEventListener('change',()=>{markPrimaryLocale();syncPrimaryToLocale();setLocaleTab(state.primaryLocale);});
nodes.section.addEventListener('change',syncStoryCategoryVisibility);

nodes.audioFile.addEventListener('change',async()=>{const file=nodes.audioFile.files[0];if(!file)return;if(!/\.mp3$/i.test(file.name)||file.size>80*1024*1024){toast('Нужен MP3 до 80 MB',true);nodes.audioFile.value='';return;}const url=URL.createObjectURL(file);const probe=new Audio();probe.preload='metadata';probe.src=url;try{await new Promise((resolve,reject)=>{probe.onloadedmetadata=resolve;probe.onerror=reject;});if(!Number.isFinite(probe.duration)||probe.duration<=0)throw new Error();state.audioFile=file;state.audioDuration=probe.duration;nodes.audioLabel.textContent=file.name;nodes.audioMeta.textContent=`${(file.size/1048576).toFixed(1)} MB · ${formatDuration(probe.duration)}`;nodes.audioPreview.src=url;nodes.audioPreview.hidden=false;}catch(error){URL.revokeObjectURL(url);toast('Браузер не смог прочитать метаданные MP3',true);nodes.audioFile.value='';}});
nodes.coverFile.addEventListener('change',async()=>{const file=nodes.coverFile.files[0];if(!file)return;try{if(file.size>8*1024*1024)throw new Error('Обложка превышает 8 MB');const actualType=await detectImageMime(file);if(!actualType)throw new Error('Нужна настоящая JPEG, PNG или WebP обложка');const normalized=file.type===actualType?file:new File([file],file.name,{type:actualType,lastModified:file.lastModified});const url=URL.createObjectURL(normalized);const image=new Image();image.src=url;try{await image.decode();const ratio=image.naturalWidth/image.naturalHeight;if(image.naturalWidth<600||image.naturalHeight<600||ratio<.8||ratio>1.25)throw new Error('Минимум 600×600, форма близкая к квадрату');state.coverFile=normalized;state.coverInfo={width:image.naturalWidth,height:image.naturalHeight};nodes.coverPreview.src=url;nodes.coverLabel.textContent=file.name;const corrected=file.type&&file.type!==actualType?` · формат исправлен: ${actualType.replace('image/','').toUpperCase()}`:'';nodes.coverMeta.textContent=`${image.naturalWidth}×${image.naturalHeight} · ${(file.size/1048576).toFixed(1)} MB${corrected}`;}catch(error){URL.revokeObjectURL(url);throw error;}}catch(error){toast(error.message||'Не удалось прочитать обложку',true);nodes.coverFile.value='';state.coverFile=null;state.coverInfo=null;}});
nodes.search.addEventListener('input',()=>{state.query=nodes.search.value;renderTracks();});
nodes.tabs.addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(!button)return;state.tab=button.dataset.tab;nodes.tabs.querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));renderTracks();});
$('#newTrackButton').addEventListener('click',()=>openEditor());
$('#refreshButton').addEventListener('click',()=>loadCatalog('Каталог обновлён'));
$('#closeEditorButton').addEventListener('click',closeEditor);
$('#saveDraftButton').addEventListener('click',()=>persist(false));
$('#publishButton').addEventListener('click',()=>persist(true));
$('#previewButton').addEventListener('click',()=>showPreview());
$('#closePreviewButton').addEventListener('click',closePreview);
$('#previewBackdrop').addEventListener('click',closePreview);
$('#unpublishButton').addEventListener('click',async()=>{if(!state.current||!confirm(`Снять «${state.current.title}» с публикации?`))return;try{await api(`/api/admin/tracks/${encodeURIComponent(state.current.id)}/unpublish`,{method:'POST'});await loadCatalog('Трек снят с публикации');closeEditor();}catch(error){toast(error.message,true);}});
$('#archiveButton').addEventListener('click',async()=>{if(!state.current||!confirm(`Архивировать «${state.current.title}»? Трек исчезнет из публичного каталога.`))return;try{await api(`/api/admin/tracks/${encodeURIComponent(state.current.id)}/archive`,{method:'POST'});await loadCatalog('Трек архивирован');closeEditor();}catch(error){toast(error.message,true);}});
$('#hardDeleteButton').addEventListener('click',async()=>{if(!state.current)return;const confirmId=prompt(`Безвозвратное удаление метаданных и R2-файлов. Введите ID:\n${state.current.id}`);if(confirmId!==state.current.id){toast('ID не совпал; удаление отменено',true);return;}try{await api(`/api/admin/tracks/${encodeURIComponent(state.current.id)}?hard=1&confirm=${encodeURIComponent(confirmId)}`,{method:'DELETE'});await loadCatalog('Трек удалён');closeEditor();}catch(error){toast(error.message,true);}});
$('#exportButton').addEventListener('click',()=>{location.href='/api/admin/export';});
$('#importFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{state.importBackup=JSON.parse(await file.text());$('#importPreviewButton').disabled=false;$('#importResult').textContent=`Выбран: ${file.name}`;}catch(error){toast('Некорректный JSON backup',true);}});
$('#importPreviewButton').addEventListener('click',async()=>{try{const result=await api('/api/admin/import',{method:'POST',body:{mode:'preview',backup:state.importBackup}});const p=result.preview;$('#importResult').textContent=`Dry run: ${p.incoming} записей; создать ${p.create}; обновить ${p.update}; вне backup ${p.unchangedOutsideBackup}.`;if(confirm('Проверка пройдена. Применить этот backup к каталогу?')){await api('/api/admin/import',{method:'POST',body:{mode:'apply',backup:state.importBackup}});await loadCatalog('Backup импортирован');}}catch(error){toast(error.message,true);$('#importResult').textContent=error.message;}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!nodes.previewSheet.hidden)closePreview();else if(!nodes.editor.hidden)closeEditor();}});
buildLocalizedFields();
Promise.all([loadStoryCategories(),loadCatalog()]);
