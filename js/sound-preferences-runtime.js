import {soundIconSvg} from './sound-icons.js';

const CONFIG=window.TUNEWRAP_SOUND_PREFERENCES;
if(!CONFIG)throw new Error('Sound Preferences config is missing');

const COPY={
  ru:{
    instruments:'Инструменты и звучание',
    instrumentsHint:'Выберите от 1 до 5 вариантов. «На усмотрение TuneWrap» заменяет остальные.',
    instrumentsSummary:'Инструменты:',
    instrumentsMessage:'Инструменты',
    instrumentRequired:'Выберите инструменты/звучание или «На усмотрение TuneWrap».',
    styleLimit:'Можно выбрать максимум 5 стилей.',
    instrumentLimit:'Можно выбрать максимум 5 вариантов звучания.'
  },
  uk:{
    instruments:'Інструменти та звучання',
    instrumentsHint:'Оберіть від 1 до 5 варіантів. «На розсуд TuneWrap» замінює решту.',
    instrumentsSummary:'Інструменти:',
    instrumentsMessage:'Інструменти',
    instrumentRequired:'Оберіть інструменти/звучання або «На розсуд TuneWrap».',
    styleLimit:'Можна обрати максимум 5 стилів.',
    instrumentLimit:'Можна обрати максимум 5 варіантів звучання.'
  },
  ka:{
    instruments:'ინსტრუმენტები და ჟღერადობა',
    instrumentsHint:'აირჩიეთ 1-დან 5-მდე ვარიანტი. „TuneWrap-ის არჩევანი“ დანარჩენებს ცვლის.',
    instrumentsSummary:'ინსტრუმენტები:',
    instrumentsMessage:'ინსტრუმენტები',
    instrumentRequired:'აირჩიეთ ინსტრუმენტები/ჟღერადობა ან „TuneWrap-ის არჩევანი“.',
    styleLimit:'შეგიძლიათ აირჩიოთ მაქსიმუმ 5 სტილი.',
    instrumentLimit:'შეგიძლიათ აირჩიოთ მაქსიმუმ 5 ჟღერადობის ვარიანტი.'
  },
  en:{
    instruments:'Instruments and sound',
    instrumentsHint:'Choose 1–5 options. “TuneWrap choice” replaces the other selections.',
    instrumentsSummary:'Instruments:',
    instrumentsMessage:'Instruments',
    instrumentRequired:'Choose instruments/sound or “TuneWrap choice”.',
    styleLimit:'Choose up to 5 styles.',
    instrumentLimit:'Choose up to 5 sound options.'
  },
  de:{
    instruments:'Instrumente und Klang',
    instrumentsHint:'Wählen Sie 1–5 Optionen. „TuneWrap-Auswahl“ ersetzt die anderen.',
    instrumentsSummary:'Instrumente:',
    instrumentsMessage:'Instrumente',
    instrumentRequired:'Bitte Instrumente/Klang oder „TuneWrap-Auswahl“ wählen.',
    styleLimit:'Bis zu 5 Stile auswählen.',
    instrumentLimit:'Bis zu 5 Klangoptionen auswählen.'
  }
};

const state={
  selectedStyles:[],
  selectedInstruments:[]
};

const $=selector=>document.querySelector(selector);

function language(){
  const value=(document.documentElement.lang||'ru').toLowerCase();
  if(value.startsWith('uk'))return 'uk';
  if(value.startsWith('ka'))return 'ka';
  if(value.startsWith('en'))return 'en';
  if(value.startsWith('de'))return 'de';
  return 'ru';
}
function copy(){return COPY[language()]||COPY.ru;}

function enabledItems(kind){
  return (Array.isArray(CONFIG?.[kind])?CONFIG[kind]:[])
    .filter(item=>item&&item.enabled!==false)
    .sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999));
}

function itemById(kind,id){
  return enabledItems(kind).find(item=>item.id===id)||null;
}

function label(item,lang=language()){
  return item?.locales?.[lang]?.label
    ||item?.locales?.ru?.label
    ||item?.locales?.en?.label
    ||item?.id
    ||'';
}

function selectedLabels(kind,ids){
  return ids.map(id=>label(itemById(kind,id))).filter(Boolean);
}

function selectedPrompts(kind,ids){
  return ids.map(id=>String(itemById(kind,id)?.prompt||'').trim()).filter(Boolean);
}

function clearFieldError(group){
  group?.classList.remove('ux-field-error');
  group?.querySelector('.ux-field-error-message')?.remove();
  group?.querySelectorAll('[aria-invalid="true"]').forEach(node=>node.removeAttribute('aria-invalid'));
}

function setHint(group,message,limit=false){
  const hint=group?.querySelector('.field-hint');
  if(!hint)return;
  hint.textContent=message;
  hint.classList.toggle('is-limit',limit);
}

function chip(item,kind,selected){
  const button=document.createElement('button');
  button.type='button';
  button.className='chip sound-choice-chip'+(selected?' selected':'');
  button.dataset.soundKind=kind;
  button.dataset.soundId=item.id;
  button.setAttribute('aria-pressed',selected?'true':'false');
  button.innerHTML=`<span class="sound-choice-icon">${soundIconSvg(item.icon)}</span><span>${escapeHtml(label(item))}</span>`;
  return button;
}

function escapeHtml(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function maxFor(kind){
  const raw=kind==='styles'?CONFIG?.settings?.maxStyles:CONFIG?.settings?.maxInstruments;
  return Math.max(1,Math.min(5,Number(raw)||5));
}

function updateStyleSummary(){
  const labels=selectedLabels('styles',state.selectedStyles);
  const summary=$('#sumStyle');
  if(summary)summary.textContent=labels.length?labels.join(', '):'—';
}

function ensureInstrumentSummary(){
  let pill=$('#soundInstrumentSummaryPill');
  if(pill)return pill;
  const styleSummary=$('#sumStyle')?.closest('.order-pill');
  if(!styleSummary)return null;
  pill=document.createElement('div');
  pill.className='order-pill sound-instrument-summary';
  pill.id='soundInstrumentSummaryPill';
  pill.innerHTML='<span id="soundInstrumentSummaryLabel"></span> <strong id="sumInstruments">—</strong>';
  styleSummary.insertAdjacentElement('afterend',pill);
  return pill;
}

function updateInstrumentSummary(){
  ensureInstrumentSummary();
  const labels=selectedLabels('instruments',state.selectedInstruments);
  const labelNode=$('#soundInstrumentSummaryLabel');
  const valueNode=$('#sumInstruments');
  if(labelNode)labelNode.textContent=copy().instrumentsSummary;
  if(valueNode)valueNode.textContent=labels.length?labels.join(', '):'—';
}

function renderStyles(){
  const wrap=$('#styleChips');
  if(!wrap)return;
  const items=enabledItems('styles');
  if(!items.length)return; // built-in site styles remain as safe fallback
  state.selectedStyles=state.selectedStyles.filter(id=>items.some(item=>item.id===id));
  wrap.replaceChildren(...items.map(item=>chip(item,'styles',state.selectedStyles.includes(item.id))));
  updateStyleSummary();
}

function ensureInstrumentField(){
  let group=$('#soundInstrumentField');
  if(group)return group;
  const styleGroup=$('#styleChips')?.closest('.field-group');
  if(!styleGroup)return null;

  group=document.createElement('div');
  group.className='field-group ux-required sound-instrument-field';
  group.id='soundInstrumentField';
  group.innerHTML=`
    <span class="field-label ux-required-label" id="soundInstrumentLabel"></span>
    <div class="style-chips sound-instrument-chips" id="instrumentChips" aria-labelledby="soundInstrumentLabel"></div>
    <span class="field-hint" id="instrumentHint"></span>
  `;
  styleGroup.insertAdjacentElement('afterend',group);
  return group;
}

function renderInstruments(){
  const items=enabledItems('instruments');
  if(!items.length)return;
  const group=ensureInstrumentField();
  const wrap=$('#instrumentChips');
  if(!group||!wrap)return;
  state.selectedInstruments=state.selectedInstruments.filter(id=>items.some(item=>item.id===id));
  $('#soundInstrumentLabel').textContent=copy().instruments;
  wrap.replaceChildren(...items.map(item=>chip(item,'instruments',state.selectedInstruments.includes(item.id))));
  setHint(group,copy().instrumentsHint,false);
  updateInstrumentSummary();
}

function toggleStyle(id){
  const max=maxFor('styles');
  if(state.selectedStyles.includes(id)){
    state.selectedStyles=state.selectedStyles.filter(value=>value!==id);
  }else if(state.selectedStyles.length<max){
    state.selectedStyles=[...state.selectedStyles,id];
  }else{
    setHint($('#styleChips')?.closest('.field-group'),copy().styleLimit,true);
    return;
  }
  renderStyles();
  clearFieldError($('#styleChips')?.closest('.field-group'));
}

function toggleInstrument(id){
  const item=itemById('instruments',id);
  if(!item)return;
  const max=maxFor('instruments');
  if(item.exclusive){
    state.selectedInstruments=state.selectedInstruments.includes(id)?[]:[id];
  }else{
    state.selectedInstruments=state.selectedInstruments.filter(value=>!itemById('instruments',value)?.exclusive);
    if(state.selectedInstruments.includes(id)){
      state.selectedInstruments=state.selectedInstruments.filter(value=>value!==id);
    }else if(state.selectedInstruments.length<max){
      state.selectedInstruments=[...state.selectedInstruments,id];
    }else{
      setHint($('#soundInstrumentField'),copy().instrumentLimit,true);
      return;
    }
  }
  renderInstruments();
  clearFieldError($('#soundInstrumentField'));
}

function styleMessageLabels(){
  return selectedLabels('styles',state.selectedStyles);
}
function instrumentMessageLabels(){
  return selectedLabels('instruments',state.selectedInstruments);
}

function soundPrompt(){
  const styles=selectedPrompts('styles',state.selectedStyles);
  const instruments=selectedPrompts('instruments',state.selectedInstruments);
  return [styles.join(', '),instruments.join(', ')].filter(Boolean).join('; ');
}

function updateSendLink(id,message){
  const anchor=$(id);
  if(!anchor||!anchor.href||anchor.getAttribute('href')==='#')return;
  try{
    const url=new URL(anchor.href,location.href);
    url.searchParams.set('text',message);
    anchor.href=url.href;
  }catch(error){}
}

function augmentPreview(){
  const preview=$('#previewText');
  if(!preview)return;
  const styleLabels=styleMessageLabels();
  const instrumentLabels=instrumentMessageLabels();
  if(!instrumentLabels.length)return;

  let message=preview.textContent||'';
  const lines=message.split('\n');
  const stylePrefixes={
    ru:['Стиль:','Стиль песни:'],
    uk:['Стиль:','Стиль пісні:'],
    ka:['სტილი:','სიმღერის სტილი:'],
    en:['Style:','Song style:'],
    de:['Stil:','Song-Stil:','Liedstil:']
  }[language()]||['Стиль:'];

  const styleIndex=lines.findIndex(line=>stylePrefixes.some(prefix=>line.trim().startsWith(prefix)));
  if(styleIndex>=0){
    const prefix=lines[styleIndex].split(':')[0];
    lines[styleIndex]=`${prefix}: ${styleLabels.length?styleLabels.join(', '):'—'}`;
    lines.splice(styleIndex+1,0,`${copy().instrumentsMessage}: ${instrumentLabels.join(', ')}`);
  }else{
    const divider=lines.indexOf('—');
    const insertAt=divider>=0?divider+1:1;
    lines.splice(insertAt,0,
      `Style: ${styleLabels.length?styleLabels.join(', '):'—'}`,
      `${copy().instrumentsMessage}: ${instrumentLabels.join(', ')}`
    );
  }

  message=lines.join('\n');
  preview.textContent=message;
  updateSendLink('#waLink',message);
  updateSendLink('#tgLink',message);
}

function rerenderAfterLanguage(){
  window.setTimeout(()=>{
    renderStyles();
    renderInstruments();
  },0);
}

function init(){
  renderStyles();
  renderInstruments();

  $('#styleChips')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-sound-kind="styles"]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    toggleStyle(button.dataset.soundId);
  });

  $('#instrumentChips')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-sound-kind="instruments"]');
    if(!button)return;
    event.preventDefault();
    toggleInstrument(button.dataset.soundId);
  });

  document.querySelectorAll('.lang-btn').forEach(button=>{
    button.addEventListener('click',rerenderAfterLanguage);
  });
  document.addEventListener('tunewrap:languagechange',rerenderAfterLanguage);

  // Core Stage 9 builds preview first. This listener runs next and adds final sound choices.
  $('#btnGenerate')?.addEventListener('click',()=>window.setTimeout(augmentPreview,0));

  window.__tuneWrapSoundPreferences={
    config:CONFIG,
    getSelectedStyleIds:()=>[...state.selectedStyles],
    getSelectedStyleLabels:()=>styleMessageLabels(),
    getSelectedInstrumentIds:()=>[...state.selectedInstruments],
    getSelectedInstrumentLabels:()=>instrumentMessageLabels(),
    getSoundPrompt:()=>soundPrompt(),
    hasInstrumentSelection:()=>state.selectedInstruments.length>0
  };
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
