const LANGUAGES=['en','ru','uk','ka','de'];
const AI_CODES={ru:'RU',uk:'UA',ka:'GE',en:'EN',de:'DE'};
const state={config:null,language:'ru',dirty:false,busy:false,audit:null};

const $=selector=>document.querySelector(selector);
const $$=selector=>Array.from(document.querySelectorAll(selector));

function toast(message,type=''){
  const region=$('#pricingToastRegion');
  if(!region)return;
  const node=document.createElement('div');
  node.className='toast'+(type?` ${type}`:'');
  node.textContent=message;
  region.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
  setTimeout(()=>{node.classList.remove('show');setTimeout(()=>node.remove(),250);},2600);
}

function ensureSettingsLocale(lang){
  state.config.settings ||= {};
  state.config.settings.locales ||= {};
  state.config.settings.locales[lang] ||= {};
  return state.config.settings.locales[lang];
}

function ensureOfferLocale(offer,lang,type){
  offer.locales ||= {};
  offer.locales[lang] ||= type==='tier'
    ? {name:'',badge:'',features:[]}
    : {name:'',short:'',description:'',includes:[],ideal:'',button:''};
  return offer.locales[lang];
}

function listValue(value){return Array.isArray(value)?value.join('\n'):'';}
function parseList(value){return String(value||'').split(/\n+/).map(v=>v.trim()).filter(Boolean);}
function numberValue(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}

function markDirty(){
  state.dirty=true;
  $('#pricingSaveBar')?.classList.add('is-dirty');
  const label=$('#pricingDirtyLabel');
  if(label)label.textContent='Есть несохранённые изменения';
}

function markSaved(audit){
  state.dirty=false;
  $('#pricingSaveBar')?.classList.remove('is-dirty');
  const label=$('#pricingDirtyLabel');
  if(label)label.textContent='Все изменения сохранены';
  if(audit)state.audit=audit;
  renderAudit();
}

function renderAudit(){
  const node=$('#pricingAudit');
  if(!node)return;
  const updated=state.audit?.updatedAt;
  const editor=state.audit?.lastEditedBy;
  if(!updated){node.textContent='—';return;}
  const date=new Date(updated);
  node.textContent=`Обновлено ${Number.isNaN(date.getTime())?updated:date.toLocaleString('ru-RU')}${editor?` · ${editor}`:''}`;
}

function bindInput(node,handler){
  node.addEventListener('input',()=>{handler(node);markDirty();});
  node.addEventListener('change',()=>{handler(node);markDirty();});
}

function inputField(label,value,handler,{type='text',list=false,rows=4,placeholder=''}={}){
  const wrap=document.createElement('label');
  wrap.className='field';
  const title=document.createElement('span');
  title.textContent=label;
  wrap.appendChild(title);
  const input=list||type==='textarea'?document.createElement('textarea'):document.createElement('input');
  if(type!=='textarea'&&!list)input.type=type;
  if(input.tagName==='TEXTAREA')input.rows=rows;
  if(list)input.dataset.list='1';
  if(placeholder)input.placeholder=placeholder;
  input.value=list?listValue(value):value??'';
  bindInput(input,handler);
  wrap.appendChild(input);
  return wrap;
}

function renderSettings(){
  const locale=ensureSettingsLocale(state.language);
  $$('[data-setting]').forEach(input=>{
    input.value=locale[input.dataset.setting]||'';
    input.placeholder=input.placeholder||'Не заполнено — используется встроенный текст сайта';
    input.oninput=()=>{
      locale[input.dataset.setting]=input.value;
      markDirty();
    };
  });
  $('#pricingCurrency').value=state.config.currency||'USD';
  $('#pricingUrgentFee').value=state.config.urgentFee??25;
}

function renderTierCard(offer,index){
  const locale=ensureOfferLocale(offer,state.language,'tier');
  const card=document.createElement('article');
  card.className='pricing-cms-card'+(offer.enabled===false?' is-disabled':'');
  card.dataset.offerId=offer.id;

  const top=document.createElement('div');
  top.className='pricing-card-top';
  top.innerHTML=`<div><small>Обычный пакет · ${offer.id}</small><strong>${locale.name||offer.id}</strong></div>`;
  const enabled=document.createElement('label');
  enabled.className='pricing-enabled';
  const checkbox=document.createElement('input');
  checkbox.type='checkbox'; checkbox.checked=offer.enabled!==false;
  checkbox.addEventListener('change',()=>{offer.enabled=checkbox.checked;markDirty();renderOffers();});
  enabled.append(checkbox,document.createTextNode('Показывать'));
  top.appendChild(enabled);
  card.appendChild(top);

  const priceRow=document.createElement('div'); priceRow.className='pricing-price-row';
  priceRow.append(
    inputField('Старая цена',offer.oldPrice,n=>{offer.oldPrice=numberValue(n.value);},{type:'number'}),
    inputField('Цена',offer.price,n=>{offer.price=numberValue(n.value);},{type:'number'}),
    inputField('Порядок',offer.order,n=>{offer.order=Math.max(1,numberValue(n.value));},{type:'number'})
  );
  card.appendChild(priceRow);

  card.append(
    inputField('Название',locale.name,n=>{locale.name=n.value;top.querySelector('strong').textContent=n.value||offer.id;}),
    inputField('Бейдж',locale.badge,n=>{locale.badge=n.value;},{placeholder:'Например: Популярный'}),
    inputField('Что входит · одна строка = один пункт',locale.features,n=>{locale.features=parseList(n.value);},{list:true,rows:6})
  );
  const note=document.createElement('div');note.className='pricing-id-note';note.textContent='Технический ID остаётся неизменным — название можно менять свободно.';
  card.appendChild(note);
  return card;
}

function renderWeddingCard(offer,index){
  const locale=ensureOfferLocale(offer,state.language,'wedding');
  const card=document.createElement('article');
  card.className='pricing-cms-card'+(offer.enabled===false?' is-disabled':'');
  card.dataset.offerId=offer.id;

  const top=document.createElement('div');
  top.className='pricing-card-top';
  top.innerHTML=`<div><small>Свадебный пакет · ${offer.id}</small><strong>${locale.name||offer.id}</strong></div>`;
  const enabled=document.createElement('label');
  enabled.className='pricing-enabled';
  const checkbox=document.createElement('input');
  checkbox.type='checkbox'; checkbox.checked=offer.enabled!==false;
  checkbox.addEventListener('change',()=>{offer.enabled=checkbox.checked;markDirty();renderOffers();});
  enabled.append(checkbox,document.createTextNode('Показывать'));
  top.appendChild(enabled);
  card.appendChild(top);

  const priceRow=document.createElement('div');priceRow.className='pricing-price-row';
  priceRow.append(
    inputField('Старая цена',offer.oldPrice,n=>{offer.oldPrice=numberValue(n.value);},{type:'number'}),
    inputField('Цена',offer.price,n=>{offer.price=numberValue(n.value);},{type:'number'}),
    inputField('Порядок',offer.order,n=>{offer.order=Math.max(1,numberValue(n.value));},{type:'number'})
  );
  card.appendChild(priceRow);

  card.append(
    inputField('Название',locale.name,n=>{locale.name=n.value;top.querySelector('strong').textContent=n.value||offer.id;}),
    inputField('Короткое описание',locale.short,n=>{locale.short=n.value;}),
    inputField('Описание внутри карточки',locale.description,n=>{locale.description=n.value;},{type:'textarea',rows:4}),
    inputField('Что входит · одна строка = один пункт',locale.includes,n=>{locale.includes=parseList(n.value);},{list:true,rows:7}),
    inputField('Идеально подходит для',locale.ideal,n=>{locale.ideal=n.value;},{type:'textarea',rows:3}),
    inputField('Текст кнопки',locale.button,n=>{locale.button=n.value;})
  );
  const note=document.createElement('div');note.className='pricing-id-note';note.textContent='ID пакета технический и не зависит от видимого названия.';
  card.appendChild(note);
  return card;
}

function renderOffers(){
  const standard=$('#standardPricingEditors');
  const wedding=$('#weddingPricingEditors');
  standard.innerHTML=''; wedding.innerHTML='';
  [...state.config.tiers].sort((a,b)=>a.order-b.order).forEach((offer,index)=>standard.appendChild(renderTierCard(offer,index)));
  [...state.config.weddings].sort((a,b)=>a.order-b.order).forEach((offer,index)=>wedding.appendChild(renderWeddingCard(offer,index)));
}

function renderLanguageTabs(){
  $$('#pricingLanguageTabs button').forEach(button=>button.classList.toggle('is-active',button.dataset.language===state.language));
  const hint=$('#translationHint');
  const localeNames={ru:'RU',uk:'UA',ka:'GE',en:'EN',de:'DE'};
  hint.textContent=`Редактируется ${localeNames[state.language]}. Цена общая для всех языков. Пустое поле оставляет встроенный перевод сайта.`;
}

function render(){
  if(!state.config)return;
  renderLanguageTabs();
  renderSettings();
  renderOffers();
  renderAudit();
}

async function load(){
  if(state.busy)return;
  state.busy=true;
  try{
    const response=await fetch('/api/admin/pricing',{headers:{accept:'application/json'},cache:'no-store'});
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.ok)throw new Error(data?.error||`HTTP ${response.status}`);
    state.config=data.config;
    state.audit={updatedAt:data.updatedAt,lastEditedBy:data.lastEditedBy};
    render();
    markSaved(state.audit);
  }catch(error){
    console.error(error);
    toast(`Не удалось загрузить стоимость: ${error.message}`,'error');
  }finally{
    state.busy=false;
  }
}

async function save(){
  if(!state.config||state.busy)return;
  state.busy=true;
  const buttons=[$('#savePricingButton'),$('#savePricingBottomButton')].filter(Boolean);
  buttons.forEach(button=>{button.disabled=true;button.textContent='Сохраняем…';});
  try{
    state.config.currency=String($('#pricingCurrency').value||'USD').trim().toUpperCase();
    state.config.urgentFee=numberValue($('#pricingUrgentFee').value);
    const response=await fetch('/api/admin/pricing',{
      method:'PUT',
      headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({config:state.config})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.ok)throw new Error(data?.error||`HTTP ${response.status}`);
    state.config=data.config;
    markSaved({updatedAt:data.updatedAt,lastEditedBy:data.lastEditedBy});
    render();
    toast('Стоимость сохранена. Сайт уже использует новые данные.','success');
  }catch(error){
    console.error(error);
    toast(`Не удалось сохранить: ${error.message}`,'error');
  }finally{
    state.busy=false;
    buttons.forEach(button=>{button.disabled=false;button.textContent=button.id==='savePricingButton'?'Сохранить':'Сохранить изменения';});
  }
}

function translationEntries(sourceLang){
  const entries=[];
  const settings=ensureSettingsLocale(sourceLang);
  Object.keys(settings).forEach(key=>{
    const text=settings[key];
    if(text)entries.push({id:`settings.${key}`,text,set:(target,value)=>{ensureSettingsLocale(target)[key]=value;}});
  });
  state.config.tiers.forEach(offer=>{
    const loc=ensureOfferLocale(offer,sourceLang,'tier');
    if(loc.name)entries.push({id:`tier.${offer.id}.name`,text:loc.name,set:(target,value)=>{ensureOfferLocale(offer,target,'tier').name=value;}});
    if(loc.badge)entries.push({id:`tier.${offer.id}.badge`,text:loc.badge,set:(target,value)=>{ensureOfferLocale(offer,target,'tier').badge=value;}});
    loc.features.forEach((text,index)=>{
      if(text)entries.push({id:`tier.${offer.id}.feature.${index}`,text,set:(target,value)=>{
        const targetLoc=ensureOfferLocale(offer,target,'tier');
        targetLoc.features[index]=value;
      }});
    });
  });
  state.config.weddings.forEach(offer=>{
    const loc=ensureOfferLocale(offer,sourceLang,'wedding');
    ['name','short','description','ideal','button'].forEach(key=>{
      if(loc[key])entries.push({id:`wedding.${offer.id}.${key}`,text:loc[key],set:(target,value)=>{ensureOfferLocale(offer,target,'wedding')[key]=value;}});
    });
    loc.includes.forEach((text,index)=>{
      if(text)entries.push({id:`wedding.${offer.id}.include.${index}`,text,set:(target,value)=>{
        const targetLoc=ensureOfferLocale(offer,target,'wedding');
        targetLoc.includes[index]=value;
      }});
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
  const targets=LANGUAGES.filter(lang=>lang!==source);
  const entries=translationEntries(source);
  if(!entries.length){toast('В текущем языке нет текста для перевода.','error');return;}
  const confirmed=confirm(`Перевести ${AI_CODES[source]} во все остальные языки? Существующие переводы этих полей будут обновлены.`);
  if(!confirmed)return;

  state.busy=true;
  const button=$('#translatePricingButton');
  button.disabled=true;
  try{
    for(let ti=0;ti<targets.length;ti++){
      const target=targets[ti];
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
    markDirty();
    render();
    toast('Переводы подготовлены. Нажмите «Сохранить».','success');
  }catch(error){
    console.error(error);
    toast(`Автоперевод остановлен: ${error.message}`,'error');
  }finally{
    state.busy=false;
    button.disabled=false;
    button.textContent='Автоперевести язык';
  }
}

function init(){
  $('#refreshPricingButton')?.addEventListener('click',()=>{if(!state.dirty||confirm('Отменить несохранённые изменения?'))load();});
  $('#savePricingButton')?.addEventListener('click',save);
  $('#savePricingBottomButton')?.addEventListener('click',save);
  $('#translatePricingButton')?.addEventListener('click',autoTranslate);

  $('#pricingLanguageTabs')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-language]');
    if(!button)return;
    state.language=button.dataset.language;
    render();
  });

  bindInput($('#pricingCurrency'),node=>{state.config.currency=node.value.trim().toUpperCase();});
  bindInput($('#pricingUrgentFee'),node=>{state.config.urgentFee=numberValue(node.value);});

  window.addEventListener('beforeunload',event=>{
    if(!state.dirty)return;
    event.preventDefault();
    event.returnValue='';
  });

  load();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
