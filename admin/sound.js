import {SOUND_ICON_KEYS,SOUND_ICON_LABELS,soundIconSvg} from '/js/sound-icons.js';

const LANGUAGES=['en','ru','uk','ka','de'];
const AI_CODES={ru:'RU',uk:'UA',ka:'GE',en:'EN',de:'DE'};
const state={config:null,language:'ru',dirty:false,busy:false,audit:null};

const $=selector=>document.querySelector(selector);

function toast(message,type=''){
  const region=$('#soundToastRegion');
  if(!region)return;
  const node=document.createElement('div');
  node.className='toast'+(type?` ${type}`:'');
  node.textContent=message;
  region.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
  setTimeout(()=>{node.classList.remove('show');setTimeout(()=>node.remove(),250);},3000);
}

async function api(path,options={}){
  const headers=new Headers(options.headers||{});
  headers.set('accept','application/json');
  if(options.body)headers.set('content-type','application/json');
  const response=await fetch(path,{
    ...options,
    headers,
    body:options.body?JSON.stringify(options.body):undefined
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw new Error(data?.error||`HTTP ${response.status}`);
  return data;
}

function markDirty(){
  state.dirty=true;
  $('#soundSaveBar')?.classList.add('is-dirty');
  $('#soundDirtyLabel').textContent='Есть несохранённые изменения';
}

function markSaved(audit){
  state.dirty=false;
  state.audit=audit||state.audit;
  $('#soundSaveBar')?.classList.remove('is-dirty');
  $('#soundDirtyLabel').textContent='Все изменения сохранены';
  renderAudit();
}

function renderAudit(){
  const node=$('#soundAudit');
  if(!node)return;
  if(!state.audit?.updatedAt){node.textContent='—';return;}
  const date=new Date(state.audit.updatedAt);
  node.textContent=`Обновлено ${Number.isNaN(date.getTime())?state.audit.updatedAt:date.toLocaleString('ru-RU')}${state.audit.lastEditedBy?` · ${state.audit.lastEditedBy}`:''}`;
}

function locale(item,language=state.language){
  item.locales ||= {};
  item.locales[language] ||= {label:''};
  return item.locales[language];
}

function nextOrder(kind){
  return Math.max(0,...(state.config?.[kind]||[]).map(item=>Number(item.order)||0))+1;
}

function randomId(prefix){
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
}

function addItem(kind,inputId){
  const input=$(inputId);
  const name=input?.value?.trim();
  if(!name){input?.focus();return;}
  const isInstrument=kind==='instruments';
  const item={
    id:randomId(isInstrument?'instrument':'style'),
    enabled:true,
    order:nextOrder(kind),
    icon:isInstrument?'music-note':'waveform',
    prompt:state.language==='en'?name:'',
    exclusive:false,
    locales:{[state.language]:{label:name}}
  };
  state.config[kind].push(item);
  input.value='';
  markDirty();
  render();
}

function deleteItem(kind,item){
  const name=locale(item).label||item.locales?.ru?.label||item.id;
  if(!confirm(`Удалить «${name}»?`))return;
  state.config[kind]=state.config[kind].filter(candidate=>candidate!==item);
  markDirty();
  render();
}

function iconOptions(selected){
  return SOUND_ICON_KEYS.map(key=>`<option value="${key}"${key===selected?' selected':''}>${SOUND_ICON_LABELS[key]||key}</option>`).join('');
}

function itemEditor(kind,item){
  const isInstrument=kind==='instruments';
  const node=document.createElement('article');
  node.className='sound-item'+(item.enabled===false?' is-disabled':'');
  const current=locale(item);

  const meta=document.createElement('div');
  meta.className='sound-item-meta';
  meta.innerHTML=`
    <label class="sound-item-enabled"><input type="checkbox" ${item.enabled!==false?'checked':''}> Показывать</label>
    <input class="sound-item-order" type="number" min="1" max="999" value="${Number(item.order)||1}" title="Порядок">
  `;
  meta.querySelector('input[type="checkbox"]').addEventListener('change',event=>{
    item.enabled=event.target.checked;markDirty();render();
  });
  meta.querySelector('input[type="number"]').addEventListener('input',event=>{
    item.order=Math.max(1,Number(event.target.value)||1);markDirty();
  });

  const labelField=document.createElement('label');
  labelField.className='sound-field';
  labelField.innerHTML=`<span>Название ${state.language.toUpperCase()}</span><input type="text">`;
  labelField.querySelector('input').value=current.label||'';
  labelField.querySelector('input').addEventListener('input',event=>{current.label=event.target.value;markDirty();});

  const promptField=document.createElement('label');
  promptField.className='sound-field sound-prompt-column';
  promptField.innerHTML='<span>Suno / prompt (EN)</span><input type="text" placeholder="Например: neo soul, warm groove">';
  promptField.querySelector('input').value=item.prompt||'';
  promptField.querySelector('input').addEventListener('input',event=>{item.prompt=event.target.value;markDirty();});

  const iconField=document.createElement('label');
  iconField.className='sound-field sound-icon-column';
  iconField.innerHTML=`
    <span>Иконка</span>
    <div class="sound-icon-select">
      <span class="sound-icon-preview">${soundIconSvg(item.icon)}</span>
      <select>${iconOptions(item.icon)}</select>
    </div>
  `;
  iconField.querySelector('select').addEventListener('change',event=>{
    item.icon=event.target.value;markDirty();render();
  });

  const remove=document.createElement('button');
  remove.className='sound-item-delete';
  remove.type='button';
  remove.title='Удалить';
  remove.textContent='×';
  remove.addEventListener('click',()=>deleteItem(kind,item));

  node.append(meta,labelField,promptField,iconField,remove);

  if(isInstrument){
    const exclusive=document.createElement('label');
    exclusive.className='sound-item-exclusive';
    exclusive.innerHTML=`<input type="checkbox" ${item.exclusive?'checked':''}> Эксклюзивный выбор — при выборе этого пункта остальные инструменты снимаются`;
    exclusive.querySelector('input').addEventListener('change',event=>{
      item.exclusive=event.target.checked;markDirty();
    });
    node.append(exclusive);
  }

  return node;
}

function renderList(kind,rootId,emptyId){
  const list=[...(state.config?.[kind]||[])].sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999));
  const root=$(rootId);
  root.replaceChildren(...list.map(item=>itemEditor(kind,item)));
  $(emptyId).hidden=list.length>0;
}

function render(){
  if(!state.config)return;
  $('#soundLanguageTabs').querySelectorAll('button').forEach(button=>{
    button.classList.toggle('is-active',button.dataset.language===state.language);
  });
  $('#soundLanguageHint').textContent=`Редактируется ${state.language.toUpperCase()}. Название для Suno / prompt остаётся общим для всех языков.`;
  renderList('styles','#styleEditors','#stylesEmpty');
  renderList('instruments','#instrumentEditors','#instrumentsEmpty');
  renderAudit();
}

async function load(){
  if(state.busy)return;
  state.busy=true;
  try{
    const data=await api('/api/admin/sound-preferences');
    state.config=data.config;
    markSaved({updatedAt:data.updatedAt,lastEditedBy:data.lastEditedBy});
    render();
  }catch(error){
    toast(`Не удалось загрузить Sound CMS: ${error.message}`,'error');
  }finally{state.busy=false;}
}

async function save(){
  if(!state.config||state.busy)return;
  state.busy=true;
  document.querySelectorAll('#saveSoundButton,#saveSoundBottomButton').forEach(button=>button.disabled=true);
  try{
    const data=await api('/api/admin/sound-preferences',{method:'PUT',body:{config:state.config}});
    state.config=data.config;
    markSaved({updatedAt:data.updatedAt,lastEditedBy:data.lastEditedBy});
    render();
    toast('Стили и звучание сохранены. Сайт обновится без деплоя.','success');
  }catch(error){
    toast(`Не удалось сохранить: ${error.message}`,'error');
  }finally{
    state.busy=false;
    document.querySelectorAll('#saveSoundButton,#saveSoundBottomButton').forEach(button=>button.disabled=false);
  }
}

function translationEntries(){
  const entries=[];
  ['styles','instruments'].forEach(kind=>{
    (state.config?.[kind]||[]).forEach(item=>{
      const source=locale(item,state.language).label?.trim();
      if(!source)return;
      entries.push({
        id:`${kind}:${item.id}`,
        text:source,
        set:(target,value)=>{locale(item,target).label=value;}
      });
    });
  });
  return entries;
}

async function translateChunk(source,target,items){
  const response=await fetch('/api/admin/translate',{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({
      sourceLanguage:AI_CODES[source],
      target:AI_CODES[target],
      items:items.map(item=>({id:item.id,text:item.text}))
    })
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw new Error(data?.error||`HTTP ${response.status}`);
  return data.translations||{};
}

async function autoTranslate(){
  if(!state.config||state.busy)return;
  const source=state.language;
  const entries=translationEntries();
  if(!entries.length){toast('В текущем языке нет названий для перевода.','error');return;}
  if(!confirm(`Перевести ${AI_CODES[source]} во все остальные языки?`))return;

  const button=$('#translateSoundButton');
  state.busy=true;button.disabled=true;
  try{
    for(const target of LANGUAGES.filter(lang=>lang!==source)){
      for(let offset=0;offset<entries.length;offset+=8){
        const chunk=entries.slice(offset,offset+8);
        button.textContent=`${AI_CODES[target]} · ${Math.min(offset+8,entries.length)}/${entries.length}`;
        const translated=await translateChunk(source,target,chunk);
        chunk.forEach(entry=>{
          const value=translated[entry.id];
          if(typeof value==='string'&&value.trim())entry.set(target,value.trim());
        });
      }
    }
    markDirty();render();
    toast('Переводы готовы. Нажмите «Сохранить».','success');
  }catch(error){
    toast(`Автоперевод остановлен: ${error.message}`,'error');
  }finally{
    state.busy=false;button.disabled=false;button.textContent='Автоперевести язык';
  }
}

function init(){
  $('#refreshSoundButton').addEventListener('click',()=>{
    if(!state.dirty||confirm('Отменить несохранённые изменения?'))load();
  });
  $('#saveSoundButton').addEventListener('click',save);
  $('#saveSoundBottomButton').addEventListener('click',save);
  $('#translateSoundButton').addEventListener('click',autoTranslate);
  $('#addStyleButton').addEventListener('click',()=>addItem('styles','#newStyleName'));
  $('#addInstrumentButton').addEventListener('click',()=>addItem('instruments','#newInstrumentName'));
  $('#newStyleName').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addItem('styles','#newStyleName');}});
  $('#newInstrumentName').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addItem('instruments','#newInstrumentName');}});

  $('#soundLanguageTabs').addEventListener('click',event=>{
    const button=event.target.closest('button[data-language]');
    if(!button)return;
    state.language=button.dataset.language;render();
  });

  window.addEventListener('beforeunload',event=>{
    if(!state.dirty)return;
    event.preventDefault();event.returnValue='';
  });

  load();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
