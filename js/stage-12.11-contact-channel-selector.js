// TuneWrap Stage 12.11 — Contact Channel Selector.
(function(){
'use strict';

const METHODS=Object.freeze([
  {id:'whatsapp',label:'WhatsApp',prefix:'WhatsApp'},
  {id:'telegram',label:'Telegram',prefix:'Telegram'},
  {id:'email',label:'Email',prefix:'Email'}
]);

const COPY=Object.freeze({
  ru:{
    hint:'Выберите, где вам удобнее получить ответ.',
    choose:'Сначала выберите способ связи',
    whatsapp:'Номер WhatsApp, например +995 555 00 00 00',
    telegram:'@username или номер Telegram',
    email:'name@example.com'
  },
  uk:{
    hint:'Оберіть, де вам зручніше отримати відповідь.',
    choose:'Спочатку оберіть спосіб зв’язку',
    whatsapp:'Номер WhatsApp, наприклад +995 555 00 00 00',
    telegram:'@username або номер Telegram',
    email:'name@example.com'
  },
  ka:{
    hint:'აირჩიეთ, სად გირჩევნიათ პასუხის მიღება.',
    choose:'ჯერ აირჩიეთ საკონტაქტო გზა',
    whatsapp:'WhatsApp ნომერი, მაგალითად +995 555 00 00 00',
    telegram:'@username ან Telegram ნომერი',
    email:'name@example.com'
  },
  en:{
    hint:'Choose where you would like us to reply.',
    choose:'Choose a contact method first',
    whatsapp:'WhatsApp number, e.g. +995 555 00 00 00',
    telegram:'@username or Telegram number',
    email:'name@example.com'
  },
  de:{
    hint:'Wählen Sie, wie wir Sie am besten erreichen.',
    choose:'Bitte zuerst einen Kontaktweg wählen',
    whatsapp:'WhatsApp-Nummer, z. B. +995 555 00 00 00',
    telegram:'@username oder Telegram-Nummer',
    email:'name@example.com'
  }
});

const state={method:''};

function lang(){
  const value=(document.documentElement.lang||'ru').toLowerCase();
  if(value.startsWith('uk'))return'uk';
  if(value.startsWith('ka'))return'ka';
  if(value.startsWith('en'))return'en';
  if(value.startsWith('de'))return'de';
  return'ru';
}
function copy(){return COPY[lang()]||COPY.ru}
function methodById(id){return METHODS.find(item=>item.id===id)||null}

function iconMarkup(id){
  if(id==='whatsapp'){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.7a8 8 0 0 1-11.7 7L4 20l1.3-4.1A8 8 0 1 1 20 11.7Z"/><path d="M8.4 8.1c.4 3.5 2.3 5.4 5.8 5.9l1.2-1.6-1.9-1-.9 1c-1.4-.6-2.3-1.5-2.9-2.9l.9-.9-1-1.9-1.2 1.4Z"/></svg>';
  }
  if(id==='telegram'){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 17-7-4 16-5-5-3 3 1-5 7-6-9 5-4-1Z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m5 7 7 5 7-5"/></svg>';
}

function ensureUi(){
  const owner=document.getElementById('fieldContact');
  const group=owner?.closest('.field-group');
  if(!owner||!group)return false;

  owner.type='hidden';
  owner.classList.add('tw-contact-data-owner');
  owner.removeAttribute('data-i18n-ph');
  owner.setAttribute('aria-hidden','true');

  let methods=document.getElementById('twContactMethods');
  if(!methods){
    methods=document.createElement('div');
    methods.id='twContactMethods';
    methods.className='tw-contact-methods';
    methods.setAttribute('role','radiogroup');
    methods.setAttribute('aria-label','Contact method');

    METHODS.forEach(method=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='tw-contact-method';
      button.dataset.contactMethod=method.id;
      button.setAttribute('role','radio');
      button.setAttribute('aria-checked','false');
      button.innerHTML=
        '<span class="tw-contact-method-icon">'+iconMarkup(method.id)+'</span>'+
        '<span>'+method.label+'</span>';
      methods.appendChild(button);
    });

    owner.insertAdjacentElement('beforebegin',methods);
  }

  let input=document.getElementById('fieldContactValue');
  if(!input){
    input=document.createElement('input');
    input.id='fieldContactValue';
    input.className='tw-contact-value';
    input.type='text';
    input.autocomplete='off';
    input.disabled=true;
    input.setAttribute('aria-describedby','twContactHint');
    owner.insertAdjacentElement('beforebegin',input);
  }

  let hint=document.getElementById('twContactHint');
  if(!hint){
    hint=document.createElement('span');
    hint.id='twContactHint';
    hint.className='field-hint tw-contact-hint';
    owner.insertAdjacentElement('afterend',hint);
  }

  if(methods.dataset.bound!=='1'){
    methods.dataset.bound='1';
    methods.addEventListener('click',event=>{
      const button=event.target.closest('button[data-contact-method]');
      if(!button)return;
      event.preventDefault();

      const next=String(button.dataset.contactMethod||'');
      if(!methodById(next))return;

      const changed=state.method!==next;
      state.method=next;
      if(changed)input.value='';
      render();
      syncOwner();
      input.focus({preventScroll:true});

      group.classList.remove('ux-field-error');
      group.querySelector('.ux-field-error-message')?.remove();
      document.getElementById('uxValidationSummary')?.remove();
    });
  }

  if(input.dataset.bound!=='1'){
    input.dataset.bound='1';
    input.addEventListener('input',()=>{
      syncOwner();
      group.classList.remove('ux-field-error');
      group.querySelector('.ux-field-error-message')?.remove();
      document.getElementById('uxValidationSummary')?.remove();
    });
  }

  render();
  syncOwner();
  return true;
}

function render(){
  const methods=document.getElementById('twContactMethods');
  const input=document.getElementById('fieldContactValue');
  const hint=document.getElementById('twContactHint');
  if(!methods||!input||!hint)return;

  const c=copy();
  methods.querySelectorAll('[data-contact-method]').forEach(button=>{
    const active=button.dataset.contactMethod===state.method;
    button.classList.toggle('is-selected',active);
    button.setAttribute('aria-checked',active?'true':'false');
  });

  const selected=methodById(state.method);
  input.disabled=!selected;
  hint.textContent=c.hint;

  if(!selected){
    input.placeholder=c.choose;
    input.inputMode='text';
    input.autocomplete='off';
    return;
  }

  input.placeholder=c[selected.id]||'';
  if(selected.id==='whatsapp'){
    input.inputMode='tel';
    input.autocomplete='tel';
  }else if(selected.id==='email'){
    input.inputMode='email';
    input.autocomplete='email';
  }else{
    input.inputMode='text';
    input.autocomplete='off';
  }
}

function syncOwner(){
  const owner=document.getElementById('fieldContact');
  const input=document.getElementById('fieldContactValue');
  const selected=methodById(state.method);
  if(!owner||!input)return;

  const value=String(input.value||'').trim();
  owner.value=selected&&value?selected.prefix+': '+value:'';
  owner.dispatchEvent(new Event('input',{bubbles:true}));
}

function rerender(){
  window.setTimeout(render,0);
}

function init(){
  if(!ensureUi()){
    let attempts=0;
    const timer=window.setInterval(()=>{
      attempts+=1;
      if(ensureUi()||attempts>40)window.clearInterval(timer);
    },100);
  }

  document.querySelectorAll('.lang-btn').forEach(button=>button.addEventListener('click',rerender));
  document.addEventListener('tunewrap:languagechange',rerender);

  window.__tuneWrapContactMethod={
    getMethod:()=>state.method,
    getValue:()=>document.getElementById('fieldContactValue')?.value?.trim?.()||'',
    getStoredContact:()=>document.getElementById('fieldContact')?.value?.trim?.()||''
  };
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

})();
