// TuneWrap Stage 12.8.4 — Corporate close moved onto card.
(function(){
  'use strict';

  const $=selector=>document.querySelector(selector);

  const COPY={
    ru:'Закрыть',
    uk:'Закрити',
    ka:'დახურვა',
    en:'Close',
    de:'Schließen'
  };

  function language(){
    const value=(document.documentElement.lang||'ru').toLowerCase();
    if(value.startsWith('uk'))return 'uk';
    if(value.startsWith('ka'))return 'ka';
    if(value.startsWith('en'))return 'en';
    if(value.startsWith('de'))return 'de';
    return 'ru';
  }

  function syncLabel(){
    const button=$('#corporatePanelClose');
    if(!button)return;
    const label=COPY[language()]||COPY.ru;
    button.setAttribute('aria-label',label);
    button.setAttribute('title',label);
    const text=button.querySelector('span');
    if(text){
      text.removeAttribute('data-i18n');
      text.textContent=label;
    }
  }

  function moveCloseToCard(){
    const button=$('#corporatePanelClose');
    const card=$('#corporate .corporate-box');
    const topbar=$('#corporate .corporate-panel-topbar');

    if(!button||!card||!topbar)return;

    if(button.parentElement!==card){
      card.appendChild(button);
    }

    button.classList.add('corporate-card-close');
    card.classList.add('has-corporate-card-close');
    topbar.classList.add('corporate-topbar-with-card-close');

    syncLabel();
  }

  function init(){
    moveCloseToCard();

    document.addEventListener('tunewrap:languagechange',()=>{
      requestAnimationFrame(syncLabel);
    });

    document.addEventListener('click',event=>{
      if(event.target.closest?.('.lang-btn,[data-lang]')){
        requestAnimationFrame(()=>requestAnimationFrame(syncLabel));
      }
    },true);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
