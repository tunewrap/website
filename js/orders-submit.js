const COPY={
  ru:{
    saving:'Сохраняем заявку в TuneWrap…',
    success:id=>`Заявка сохранена. Номер: ${id}`,
    duplicate:id=>`Эта заявка уже сохранена. Номер: ${id}`,
    needContact:'Укажите имя и способ связи, чтобы мы могли принять заявку.',
    needStory:'Расскажите главное в истории или добавьте описание.',
    error:'Не удалось сохранить заявку. WhatsApp / Telegram и копирование текста продолжают работать.'
  },
  uk:{
    saving:'Зберігаємо заявку в TuneWrap…',
    success:id=>`Заявку збережено. Номер: ${id}`,
    duplicate:id=>`Цю заявку вже збережено. Номер: ${id}`,
    needContact:"Вкажіть ім'я та спосіб зв'язку, щоб ми могли прийняти заявку.",
    needStory:'Розкажіть головне в історії або додайте опис.',
    error:'Не вдалося зберегти заявку. WhatsApp / Telegram і копіювання тексту продовжують працювати.'
  },
  ka:{
    saving:'მოთხოვნა ინახება TuneWrap-ში…',
    success:id=>`მოთხოვნა შენახულია. ნომერი: ${id}`,
    duplicate:id=>`ეს მოთხოვნა უკვე შენახულია. ნომერი: ${id}`,
    needContact:'მიუთითეთ სახელი და საკონტაქტო ინფორმაცია.',
    needStory:'მოგვიყევით ისტორიის მთავარი ნაწილი ან დაამატეთ აღწერა.',
    error:'მოთხოვნის შენახვა ვერ მოხერხდა. WhatsApp / Telegram და ტექსტის კოპირება კვლავ მუშაობს.'
  },
  en:{
    saving:'Saving your request in TuneWrap…',
    success:id=>`Request saved. Reference: ${id}`,
    duplicate:id=>`This request is already saved. Reference: ${id}`,
    needContact:'Add your name and contact details so we can receive the request.',
    needStory:'Tell us the heart of the story or add a description.',
    error:'We could not save the request. WhatsApp / Telegram and copy still work.'
  },
  de:{
    saving:'Anfrage wird in TuneWrap gespeichert…',
    success:id=>`Anfrage gespeichert. Nummer: ${id}`,
    duplicate:id=>`Diese Anfrage ist bereits gespeichert. Nummer: ${id}`,
    needContact:'Bitte Name und Kontaktmöglichkeit angeben.',
    needStory:'Erzählen Sie das Wesentliche der Geschichte oder ergänzen Sie eine Beschreibung.',
    error:'Die Anfrage konnte nicht gespeichert werden. WhatsApp / Telegram und Kopieren funktionieren weiterhin.'
  }
};

const state={busy:false,lastFingerprint:'',lastOrderId:''};

function lang(){
  const value=(document.documentElement.lang||'ru').toLowerCase();
  if(value.startsWith('uk'))return 'uk';
  if(value.startsWith('ka'))return 'ka';
  if(value.startsWith('en'))return 'en';
  if(value.startsWith('de'))return 'de';
  return 'ru';
}

function copy(){return COPY[lang()]||COPY.ru;}
function text(id){return document.getElementById(id)?.value?.trim?.()||'';}
function content(id){return document.getElementById(id)?.textContent?.trim?.()||'';}
function visible(node){return Boolean(node)&&!node.hidden&&!node.classList.contains('hidden')&&getComputedStyle(node).display!=='none';}

function ensureStatus(){
  let node=document.getElementById('crmSubmitStatus');
  if(node)return node;
  const button=document.getElementById('btnGenerate');
  if(!button)return null;
  node=document.createElement('div');
  node.id='crmSubmitStatus';
  node.className='crm-submit-status';
  node.setAttribute('role','status');
  node.setAttribute('aria-live','polite');
  button.insertAdjacentElement('afterend',node);

  if(!document.getElementById('crmSubmitStyles')){
    const style=document.createElement('style');
    style.id='crmSubmitStyles';
    style.textContent=`
      .crm-submit-status{display:none;margin-top:12px;padding:12px 14px;border:1px solid rgba(217,164,65,.24);border-radius:13px;color:#d8c89f;background:rgba(217,164,65,.055);font-size:12px;line-height:1.5}
      .crm-submit-status.is-visible{display:block}
      .crm-submit-status.is-success{border-color:rgba(134,185,112,.32);color:#b9d8aa;background:rgba(134,185,112,.065)}
      .crm-submit-status.is-error{border-color:rgba(218,118,99,.34);color:#edb5aa;background:rgba(218,118,99,.065)}
      .crm-submit-status strong{color:inherit}
    `;
    document.head.append(style);
  }
  return node;
}

function show(message,type=''){
  const node=ensureStatus();
  if(!node)return;
  node.className='crm-submit-status is-visible'+(type?` is-${type}`:'');
  node.textContent=message;
}

function activeMode(){
  return document.querySelector('.mode-btn.active')?.dataset.mode||'order';
}

function goldenAnswers(){
  return Array.from(document.querySelectorAll('#goldenBox > div')).map(group=>{
    const question=group.querySelector('.golden-q-label')?.textContent?.trim()||'';
    const answer=group.querySelector('textarea')?.value?.trim()||'';
    return question&&answer?{question,answer}:null;
  }).filter(Boolean);
}

function parsePrice(){
  const raw=content('sumTotal');
  const match=raw.match(/(\d+(?:[.,]\d+)?)/);
  return match?Math.round(Number(match[1].replace(',','.'))):null;
}

function collect(){
  const mode=activeMode();
  const weddingField=document.getElementById('weddingPackageField');
  const wedding=visible(weddingField);
  const orderType=wedding?'wedding':mode==='certificate'?'certificate':'order';
  const weddingSelect=document.getElementById('fieldWeddingPackage');

  return {
    clientSubmissionId:crypto.randomUUID(),
    orderType,
    language:lang(),
    name:text('fieldName'),
    contact:text('fieldContact'),
    occasion:text('fieldOccasion'),
    occasionDetail:text('fieldOtherOccasion'),
    storyCore:text('fieldStoryCore'),
    description:text('fieldDescription'),
    goldenAnswers:goldenAnswers(),
    tierLabel:content('sumTier'),
    weddingPackageId:wedding?weddingSelect?.value||'':'',
    weddingPackageLabel:wedding?weddingSelect?.selectedOptions?.[0]?.textContent?.trim()||'':'',
    styles:window.__tuneWrapSoundPreferences?.getSelectedStyleLabels?.()
      ||(content('sumStyle')&&content('sumStyle')!=='—'?content('sumStyle').split(',').map(v=>v.trim()).filter(Boolean):[]),
    instruments:window.__tuneWrapSoundPreferences?.getSelectedInstrumentLabels?.()||[],
    soundPrompt:window.__tuneWrapSoundPreferences?.getSoundPrompt?.()||'',
    urgent:Boolean(document.getElementById('fieldUrgent')?.checked),
    quotedPrice:parsePrice(),
    rawMessage:content('previewText'),
    source:'web',
    sourceUrl:location.pathname+location.search
  };
}

function fingerprint(payload){
  const clone={...payload};
  delete clone.clientSubmissionId;
  return JSON.stringify(clone);
}

async function submit(){
  if(state.busy)return;
  const payload=collect();
  const c=copy();

  if(!payload.name||!payload.contact){
    show(c.needContact,'error');
    return;
  }
  if(payload.orderType!=='certificate'&&!payload.storyCore&&!payload.description){
    show(c.needStory,'error');
    return;
  }

  const fp=fingerprint(payload);
  if(fp===state.lastFingerprint&&state.lastOrderId){
    show(c.duplicate(state.lastOrderId),'success');
    return;
  }

  state.busy=true;
  show(c.saving);
  try{
    const response=await fetch('/api/orders',{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify(payload)
    });
    let data=null;
    try{data=await response.json();}catch(error){}
    if(!response.ok)throw new Error(data?.error||`HTTP ${response.status}`);
    state.lastFingerprint=fp;
    state.lastOrderId=data.order.id;
    show(c.success(data.order.id),'success');
    document.getElementById('orderPreview')?.setAttribute('data-order-reference',data.order.id);
  }catch(error){
    console.error('TuneWrap order save failed',error);
    show(`${c.error}${error?.message?` (${error.message})`:''}`,'error');
  }finally{
    state.busy=false;
  }
}

function init(){
  const button=document.getElementById('btnGenerate');
  if(!button||button.dataset.crmBound==='1')return;
  button.dataset.crmBound='1';
  ensureStatus();
  // Existing Stage 9 listener runs first and builds the preview/message.
  // This listener then stores the exact same request in D1.
  button.addEventListener('click',()=>{void submit();});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
