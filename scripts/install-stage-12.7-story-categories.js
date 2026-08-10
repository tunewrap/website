#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function file(rel){return path.join(root,rel);}
function read(rel){const target=file(rel);if(!fs.existsSync(target))throw new Error(`Missing required file: ${rel}`);return fs.readFileSync(target,'utf8');}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function replaceOnce(text,needle,replacement,label){if(text.includes(replacement))return text;const count=text.split(needle).length-1;if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);return text.replace(needle,replacement);}

// 1. Track schema adapter.
let tracks=read('functions/_shared/tracks.js');
tracks=replaceOnce(tracks,
  "  artist, album, category_json, tags_json, duration_label, duration, audio_quality_json,",
  "  artist, album, category_json, story_category_ids_json, tags_json, duration_label, duration, audio_quality_json,",
  'tracks select category ids');
tracks=replaceOnce(tracks,
  "    category:parseJson(row.category_json,{}),\n    tags:parseJson(row.tags_json,[]),",
  "    category:parseJson(row.category_json,{}),\n    categoryIds:parseJson(row.story_category_ids_json,[]),\n    tags:parseJson(row.tags_json,[]),",
  'tracks row category ids');
tracks=replaceOnce(tracks,
  "  if(input.cover && !/^(?:https?:\\/\\/|\\/api\\/media\\/|content\\/tracks\\/|assets\\/)/.test(input.cover)) errors.push('Недопустимый адрес обложки');\n  const order = Number(input.order);",
  "  if(input.cover && !/^(?:https?:\\/\\/|\\/api\\/media\\/|content\\/tracks\\/|assets\\/)/.test(input.cover)) errors.push('Недопустимый адрес обложки');\n  if(input.categoryIds!==undefined){\n    if(!Array.isArray(input.categoryIds))errors.push('Категории истории должны быть массивом');\n    else if(input.categoryIds.length>12)errors.push('У трека может быть максимум 12 категорий');\n  }\n  const order = Number(input.order);",
  'tracks category validation');
tracks=replaceOnce(tracks,
  "    category_json, tags_json, duration_label, duration, audio_quality_json, sort_order,",
  "    category_json, story_category_ids_json, tags_json, duration_label, duration, audio_quality_json, sort_order,",
  'tracks insert column');
tracks=replaceOnce(tracks,
  "    asJson(track.translation,{}), track.artist || 'TuneWrap', track.album || '', asJson(track.category,{}),\n    asJson(track.tags,[]),",
  "    asJson(track.translation,{}), track.artist || 'TuneWrap', track.album || '', asJson(track.category,{}),\n    asJson(track.categoryIds,[]), asJson(track.tags,[]),",
  'tracks insert bind');
{
  const match=tracks.match(/INSERT INTO tracks \(([\s\S]*?)\)\s*VALUES \(([\?,]+)\)/);
  if(!match)throw new Error('tracks INSERT block not found');
  const columns=match[1].split(',').map(v=>v.trim()).filter(Boolean);
  tracks=tracks.replace(match[0],`INSERT INTO tracks (${match[1]}) VALUES (${Array(columns.length).fill('?').join(',')})`);
}
tracks=replaceOnce(tracks,
  "    category_json=?, tags_json=?, duration_label=?, duration=?, audio_quality_json=?, sort_order=?,",
  "    category_json=?, story_category_ids_json=?, tags_json=?, duration_label=?, duration=?, audio_quality_json=?, sort_order=?,",
  'tracks update column');
tracks=replaceOnce(tracks,
  "    asJson(track.lyrics,{}), asJson(track.translation,{}), track.artist || 'TuneWrap', track.album || '',\n    asJson(track.category,{}), asJson(track.tags,[]),",
  "    asJson(track.lyrics,{}), asJson(track.translation,{}), track.artist || 'TuneWrap', track.album || '',\n    asJson(track.category,{}), asJson(track.categoryIds,[]), asJson(track.tags,[]),",
  'tracks update bind');
tracks=replaceOnce(tracks,
  "    'lyrics','translation','artist','album','category','tags','durationLabel','duration','audioQuality','order','featured','archived'];",
  "    'lyrics','translation','artist','album','category','categoryIds','tags','durationLabel','duration','audioQuality','order','featured','archived'];",
  'tracks merge category ids');
write('functions/_shared/tracks.js',tracks);

// 2. Admin Music UI.
let html=read('admin/index.html');
html=replaceOnce(html,
  '      <button class="gold-button" id="newTrackButton" type="button"><span>＋</span> Добавить трек</button>',
  '      <div class="admin-intro-actions">\n        <a class="secondary-button admin-category-manager-link" href="/admin/categories.html">Категории</a>\n        <button class="gold-button" id="newTrackButton" type="button"><span>＋</span> Добавить трек</button>\n      </div>',
  'admin category manager link');
html=replaceOnce(html,
  '          <label class="field"><span>Категория</span><input id="categoryField" name="category" placeholder="Wedding, Family…"></label>',
  '          <input id="categoryField" name="category" type="hidden">\n          <div class="field story-category-admin-field" id="storyCategoryAdminField">\n            <span>Категории истории</span>\n            <div class="story-category-admin-choices" id="storyCategoryChoices"></div>\n            <small>Можно выбрать несколько. Фильтры используются только в библиотеке «Музыкальные истории».</small>\n            <a href="/admin/categories.html" target="_blank" rel="noopener">Управлять категориями</a>\n          </div>',
  'admin multi-category field');
write('admin/index.html',html);

// 3. Admin Music behavior.
let admin=read('admin/admin.js');
admin=replaceOnce(admin,
  "const state = {tracks:[],summary:null,tab:'all',query:'',current:null,audioFile:null,audioDuration:0,coverFile:null,coverInfo:null,importBackup:null,busy:false,localeTab:'ru',primaryLocale:'ru'};",
  "const state = {tracks:[],summary:null,tab:'all',query:'',current:null,audioFile:null,audioDuration:0,coverFile:null,coverInfo:null,importBackup:null,busy:false,localeTab:'ru',primaryLocale:'ru',storyCategories:[],selectedStoryCategories:new Set()};",
  'admin category state');
admin=replaceOnce(admin,
  "  album:$('#albumField'),category:$('#categoryField'),tags:$('#tagsField'),description:$('#descriptionField'),lyrics:$('#lyricsField'),translation:$('#translationField'),",
  "  album:$('#albumField'),category:$('#categoryField'),storyCategoryChoices:$('#storyCategoryChoices'),storyCategoryField:$('#storyCategoryAdminField'),tags:$('#tagsField'),description:$('#descriptionField'),lyrics:$('#lyricsField'),translation:$('#translationField'),",
  'admin category nodes');
admin=replaceOnce(admin,
  "function setBusy(value){state.busy=value;document.querySelectorAll('button').forEach(button=>button.disabled=value);}\nasync function loadCatalog(message){",
  `function setBusy(value){state.busy=value;document.querySelectorAll('button').forEach(button=>button.disabled=value);}
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
async function loadCatalog(message){`,
  'admin category loader');
admin=replaceOnce(admin,
  "  nodes.category.value=localizedValue(track?.category,primary,'');nodes.tags.value=(track?.tags||[]).join(',');",
  "  nodes.category.value=localizedValue(track?.category,primary,'');nodes.tags.value=(track?.tags||[]).join(',');renderStoryCategoryChoices(track?.categoryIds||[]);",
  'admin editor selected categories');
admin=replaceOnce(admin,
  "  return{...(state.current||{}),title:nodes.title.value.trim(),originalTitle:state.current?.originalTitle||nodes.title.value.trim(),titles,descriptions,section:nodes.section.value,language:nodes.language.value,artist:nodes.artist.value.trim()||'TuneWrap',album:nodes.album.value.trim(),category,tags:nodes.tags.value.split(',').map(value=>value.trim()).filter(Boolean),lyrics,translation,order:Number(nodes.order.value)||state.current?.order||0,featured:nodes.featured.checked,audio:state.current?.audio||'',cover:state.current?.cover||'',artwork:state.current?.artwork||{},duration:state.current?.duration||0,durationLabel:state.current?.durationLabel||''};",
  "  return{...(state.current||{}),title:nodes.title.value.trim(),originalTitle:state.current?.originalTitle||nodes.title.value.trim(),titles,descriptions,section:nodes.section.value,language:nodes.language.value,artist:nodes.artist.value.trim()||'TuneWrap',album:nodes.album.value.trim(),category,categoryIds:nodes.section.value==='stories'?selectedStoryCategoryIds():[],tags:nodes.tags.value.split(',').map(value=>value.trim()).filter(Boolean),lyrics,translation,order:Number(nodes.order.value)||state.current?.order||0,featured:nodes.featured.checked,audio:state.current?.audio||'',cover:state.current?.cover||'',artwork:state.current?.artwork||{},duration:state.current?.duration||0,durationLabel:state.current?.durationLabel||''};",
  'admin form category ids');
admin=replaceOnce(admin,
  "nodes.language.addEventListener('change',()=>{markPrimaryLocale();syncPrimaryToLocale();setLocaleTab(state.primaryLocale);});",
  "nodes.language.addEventListener('change',()=>{markPrimaryLocale();syncPrimaryToLocale();setLocaleTab(state.primaryLocale);});\nnodes.section.addEventListener('change',syncStoryCategoryVisibility);",
  'admin category visibility');
admin=replaceOnce(admin,
  "buildLocalizedFields();\nloadCatalog();",
  "buildLocalizedFields();\nPromise.all([loadStoryCategories(),loadCatalog()]);",
  'admin categories init');
write('admin/admin.js',admin);

let adminCss=read('admin/admin.css');
if(!adminCss.includes('/* Stage 12.7 Story Categories */'))adminCss+=`\n/* Stage 12.7 Story Categories */
.admin-intro-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.admin-category-manager-link{text-decoration:none}.story-category-admin-field{grid-column:1/-1;padding:13px;border:1px solid var(--line);border-radius:14px;background:#0b0b09}.story-category-admin-field>span{display:block;margin-bottom:8px;color:var(--muted);font-size:11px}.story-category-admin-field>small{display:block;margin-top:8px;color:var(--muted);font-size:10px;line-height:1.45}.story-category-admin-field>a{display:inline-block;margin-top:8px;color:var(--gold2);font-size:10px;font-weight:800;text-decoration:none}.story-category-admin-choices{display:flex;flex-wrap:wrap;gap:6px}.story-category-admin-chip{min-height:33px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:#090909;color:var(--muted);font-size:10px;font-weight:800}.story-category-admin-chip.is-active{border-color:rgba(217,181,97,.48);background:rgba(217,181,97,.14);color:var(--gold2)}.story-category-admin-empty{color:var(--muted);font-size:10px}\n`;
write('admin/admin.css',adminCss);

// 4. Catalog Core: filter only. Queue code is not touched.
let core=read('js/catalog-core.js');
core=replaceOnce(core,"      ...Object.values(track.category || {}),\n      ...(track.tags || [])","      ...Object.values(track.category || {}),\n      ...(track.categoryIds || []),\n      ...(track.tags || [])",'catalog search category ids');
core=replaceOnce(core,"    const language = String(options.language || 'ALL').toUpperCase();\n    const tokens = normalize(options.query).split(/\\s+/).filter(Boolean);","    const language = String(options.language || 'ALL').toUpperCase();\n    const categoryId = String(options.categoryId || '').trim();\n    const tokens = normalize(options.query).split(/\\s+/).filter(Boolean);",'catalog category option');
core=replaceOnce(core,"      if(language !== 'ALL' && track.language !== language) return false;\n      return tokens.every(token => track._search.includes(token));","      if(language !== 'ALL' && track.language !== language) return false;\n      if(categoryId && !(Array.isArray(track.categoryIds) && track.categoryIds.includes(categoryId))) return false;\n      return tokens.every(token => track._search.includes(token));",'catalog category rule');
write('js/catalog-core.js',core);

// 5. Catalog Runtime: dynamic category filter row only for Stories.
let runtime=read('js/catalog-runtime.js');
runtime=replaceOnce(runtime,
  "  const FILTER_LABELS = {ru:'Язык песен',uk:'Мова пісень',ka:'სიმღერის ენა',en:'Song language',de:'Sprache der Songs'};",
  `  const FILTER_LABELS = {ru:'Язык песен',uk:'Мова пісень',ka:'სიმღერის ენა',en:'Song language',de:'Sprache der Songs'};
  const CATEGORY_COPY={ru:{label:'Категории',all:'Все истории'},uk:{label:'Категорії',all:'Усі історії'},ka:{label:'კატეგორიები',all:'ყველა ისტორია'},en:{label:'Categories',all:'All stories'},de:{label:'Kategorien',all:'Alle Geschichten'}};
  const DEFAULT_STORY_CATEGORIES=[{"id":"birthday","enabled":true,"order":1,"labels":{"ru":"День рождения","uk":"День народження","ka":"დაბადების დღე","en":"Birthday","de":"Geburtstag"}},{"id":"anniversary","enabled":true,"order":2,"labels":{"ru":"Юбилей","uk":"Ювілей","ka":"იუბილე","en":"Anniversary","de":"Jubiläum"}},{"id":"wedding","enabled":true,"order":3,"labels":{"ru":"Свадьба","uk":"Весілля","ka":"ქორწილი","en":"Wedding","de":"Hochzeit"}},{"id":"love","enabled":true,"order":4,"labels":{"ru":"Любовь","uk":"Кохання","ka":"სიყვარული","en":"Love","de":"Liebe"}},{"id":"family","enabled":true,"order":5,"labels":{"ru":"Семья","uk":"Родина","ka":"ოჯახი","en":"Family","de":"Familie"}},{"id":"children","enabled":true,"order":6,"labels":{"ru":"Для детей","uk":"Для дітей","ka":"ბავშვებისთვის","en":"For children","de":"Für Kinder"}},{"id":"congratulations","enabled":true,"order":7,"labels":{"ru":"Поздравления","uk":"Привітання","ka":"მილოცვები","en":"Congratulations","de":"Glückwünsche"}},{"id":"life","enabled":true,"order":8,"labels":{"ru":"О жизни","uk":"Про життя","ka":"ცხოვრებაზე","en":"Life","de":"Über das Leben"}}];
  const storyCategories=((window.TUNEWRAP_STORY_CATEGORIES?.categories||DEFAULT_STORY_CATEGORIES).filter(item=>item?.enabled!==false).slice().sort((a,b)=>(a.order||99)-(b.order||99)||a.id.localeCompare(b.id)));`,
  'runtime category config');
runtime=replaceOnce(runtime,
  "  function localizedCategory(track,language = interfaceLanguage()){\n    return Core.category(track,language);\n  }",
  "  function storyCategoryLabel(id,language = interfaceLanguage()){const item=storyCategories.find(category=>category.id===id);return item?.labels?.[language]||item?.labels?.ru||item?.labels?.en||id||'';}\n\n  function localizedCategory(track,language = interfaceLanguage()){const first=Array.isArray(track?.categoryIds)?track.categoryIds[0]:'';return first?storyCategoryLabel(first,language):Core.category(track,language);}",
  'runtime localized category');
runtime=replaceOnce(runtime,"    category:localizedCategory,\n    cover:coverSource,","    category:localizedCategory,\n    categoryLabel:storyCategoryLabel,\n    cover:coverSource,",'runtime api category label');
runtime=replaceOnce(runtime,
  "    function renderPanel(panel,{reset = false} = {}){\n      const state = panelState.get(panel);\n      if(!state) return;\n      const section = panelSection(panel);\n      state.results = api.search(state.query,{section,language:state.language});",
  `    function usedStoryCategories(){const used=new Set(api.bySection('stories').flatMap(track=>Array.isArray(track.categoryIds)?track.categoryIds:[]));return storyCategories.filter(item=>used.has(item.id));}
    function renderCategoryFilters(panel){
      if(panelSection(panel)!=='stories')return;const state=panelState.get(panel);if(!state)return;let row=panel.querySelector('[data-library-categories]');const categories=usedStoryCategories();if(!categories.length){row?.remove();state.category='ALL';return;}if(!row){row=element('div','music-library-category-row');row.dataset.libraryCategories='';panel.querySelector('.music-library-sticky')?.append(row);}const language=interfaceLanguage();const copy=CATEGORY_COPY[language]||CATEGORY_COPY.ru;const label=element('span','music-library-category-label',copy.label);const chips=element('div','music-library-category-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label',copy.label);const all=element('button','music-library-category-chip'+(state.category==='ALL'?' is-active':''),copy.all);all.type='button';all.dataset.libraryCategory='ALL';all.setAttribute('aria-pressed',String(state.category==='ALL'));chips.append(all);categories.forEach(item=>{const active=state.category===item.id;const button=element('button','music-library-category-chip'+(active?' is-active':''),storyCategoryLabel(item.id,language));button.type='button';button.dataset.libraryCategory=item.id;button.setAttribute('aria-pressed',String(active));chips.append(button);});row.replaceChildren(label,chips);row.querySelectorAll('[data-library-category]').forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.libraryCategory||'ALL';renderPanel(panel,{reset:true});}));
    }
    function renderPanel(panel,{reset = false} = {}){
      const state = panelState.get(panel);if(!state) return;const section = panelSection(panel);
      state.results = api.search(state.query,{section,language:state.language,categoryId:section==='stories'&&state.category!=='ALL'?state.category:''});`,
  'runtime category filtering');
runtime=replaceOnce(runtime,"      const desired = state.results.slice(0,state.rendered);\n      state.list.replaceChildren(...desired.map(renderCard));\n\n      panel.querySelectorAll('[data-library-language]').forEach(tab => {","      const desired = state.results.slice(0,state.rendered);\n      state.list.replaceChildren(...desired.map(renderCard));\n      renderCategoryFilters(panel);\n\n      panel.querySelectorAll('[data-library-language]').forEach(tab => {",'runtime category row');
runtime=replaceOnce(runtime,"      panelState.set(panel,{language:'ALL',query:'',results:[],rendered:0,scrollTop:0,trigger:null,list,scroller});","      panelState.set(panel,{language:'ALL',category:'ALL',query:'',results:[],rendered:0,scrollTop:0,trigger:null,list,scroller});",'runtime category state');
runtime=replaceOnce(runtime,"        state.query = '';\n        state.language = 'ALL';","        state.query = '';\n        state.language = 'ALL';\n        state.category = 'ALL';",'runtime category reset');
write('js/catalog-runtime.js',runtime);

// 6. Bootstrap categories in parallel.
let bootstrap=read('js/app-bootstrap.js');
bootstrap=replaceOnce(bootstrap,"if(!document.getElementById('tunewrapOrderCompletionStyles')){","if(!document.getElementById('tunewrapStoryCategoryStyles')){\n  const storyCategoryStyles=document.createElement('link');storyCategoryStyles.id='tunewrapStoryCategoryStyles';storyCategoryStyles.rel='stylesheet';storyCategoryStyles.href='/css/story-categories.css?v=12.7';document.head.append(storyCategoryStyles);\n}\n\nif(!document.getElementById('tunewrapOrderCompletionStyles')){",'bootstrap category css');
bootstrap=replaceOnce(bootstrap,"const soundPreferencesPromise=(async()=>{","const storyCategoriesPromise=(async()=>{\n  try{const response=await fetch('/api/story-categories',{headers:{accept:'application/json'},cache:'no-store'});if(!response.ok)return null;const payload=await response.json();return payload?.ok&&payload?.config?payload.config:null;}catch(error){console.error('TuneWrap Story Categories bootstrap failed',error);return null;}\n})();\n\nconst soundPreferencesPromise=(async()=>{",'bootstrap category api');
bootstrap=replaceOnce(bootstrap,"  window.TUNEWRAP_TRACK_CATALOG = payload.tracks;\n\n  await import('./catalog-runtime.js');","  window.TUNEWRAP_TRACK_CATALOG = payload.tracks;\n  window.TUNEWRAP_STORY_CATEGORIES = await storyCategoriesPromise;\n\n  await import('./catalog-runtime.js');",'bootstrap category config');
write('js/app-bootstrap.js',bootstrap);

// 7. Wide-only footer navigation fix. Mobile branch is unchanged.
let site=read('js/site-cms-runtime.js');
site=replaceOnce(site,
  "    if(app&&app.scrollHeight>app.clientHeight+2){\n      app.scrollTo({top:target.offsetTop,behavior});\n    }else{\n      target.scrollIntoView({behavior,block:'start'});\n    }",
  "    const wide=window.matchMedia('(min-width:621px)').matches;\n    if(wide){\n      const header=document.querySelector('body > nav');\n      const headerHeight=Math.max(0,Math.round(header?.getBoundingClientRect().height||82));\n      const top=Math.max(0,target.getBoundingClientRect().top+window.scrollY-headerHeight-10);\n      window.scrollTo({top,behavior});\n    }else if(app&&app.scrollHeight>app.clientHeight+2){\n      app.scrollTo({top:target.offsetTop,behavior});\n    }else{\n      target.scrollIntoView({behavior,block:'start'});\n    }",
  'desktop footer nav scroll owner');
write('js/site-cms-runtime.js',site);

// 8. Package test chain.
const packagePath=file('package.json');const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));pkg.scripts ||= {};pkg.scripts['categories:test']='node scripts/story-categories-test.js';if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('categories:test'))pkg.scripts.test+=' && npm run categories:test';fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n','utf8');

console.log('PASS: Stage 12.7 Story Categories + Desktop Navigation installer applied.');
console.log('Added: editable multi-category CMS, story-library category filters, and wide-only footer navigation fix.');
console.log('Public queue/audio engine are untouched.');
console.log('D1 migration 0008 is required before deployment.');
