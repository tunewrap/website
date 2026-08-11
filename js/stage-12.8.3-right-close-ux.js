// TuneWrap Stage 12.8.3 — Right-side Close UX.
(function(){
  'use strict';

  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));

  const COPY={
    ru:{form:'Закрыть анкету',library:'Закрыть'},
    uk:{form:'Закрити анкету',library:'Закрити'},
    ka:{form:'ანკეტის დახურვა',library:'დახურვა'},
    en:{form:'Close form',library:'Close'},
    de:{form:'Formular schließen',library:'Schließen'}
  };

  function language(){
    const value=(document.documentElement.lang||'ru').toLowerCase();
    if(value.startsWith('uk'))return 'uk';
    if(value.startsWith('ka'))return 'ka';
    if(value.startsWith('en'))return 'en';
    if(value.startsWith('de'))return 'de';
    return 'ru';
  }

  function copy(){return COPY[language()]||COPY.ru;}

  function closeIconSvg(){
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18"/>
      </svg>
    `;
  }

  function closeOrderForm(){
    // Reuse the existing, tested navigation owner.
    const legacyBack=$('#storyPathBack');
    if(legacyBack){
      legacyBack.click();
      return;
    }

    const contact=$('#contact');
    contact?.classList.remove('is-story-path-form');
  }

  function ensureOrderClose(){
    const form=$('#storyOrderForm');
    if(!form)return;

    let bar=$('#storyOrderCloseBar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='storyOrderCloseBar';
      bar.className='story-order-close-bar';

      const button=document.createElement('button');
      button.id='storyOrderClose';
      button.className='story-order-close';
      button.type='button';
      button.addEventListener('click',closeOrderForm);
      bar.append(button);
      form.prepend(bar);
    }

    const button=$('#storyOrderClose');
    if(button&&!button.dataset.rightCloseReady){
      button.dataset.rightCloseReady='true';
      button.innerHTML=`${closeIconSvg()}<span></span>`;
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        closeOrderForm();
      });
    }
  }

  function syncOrderClose(){
    ensureOrderClose();
    const button=$('#storyOrderClose');
    if(!button)return;

    const label=copy().form;
    button.setAttribute('aria-label',label);
    button.setAttribute('title',label);
    const text=button.querySelector('span');
    if(text)text.textContent=label;
  }

  function prepareLibraryClose(button){
    if(!button||button.dataset.rightCloseReady)return;
    button.dataset.rightCloseReady='true';

    // Keep data-library-close intact so Catalog Runtime remains the sole owner
    // of opening/closing and scroll restoration.
    button.innerHTML=`${closeIconSvg()}<span></span>`;
    button.classList.add('music-library-close-right');
  }

  function syncLibraryClose(){
    const label=copy().library;
    $$('.music-library-close[data-library-close]').forEach(button=>{
      prepareLibraryClose(button);
      button.setAttribute('aria-label',label);
      button.setAttribute('title',label);
      const text=button.querySelector('span');
      if(text){
        text.removeAttribute('data-i18n');
        text.textContent=label;
      }
    });
  }

  function syncAll(){
    syncOrderClose();
    syncLibraryClose();
  }

  function init(){
    syncAll();

    document.addEventListener('tunewrap:languagechange',()=>{
      requestAnimationFrame(syncAll);
    });

    // Some language buttons update <html lang> before the custom event.
    // A second frame keeps the visible labels aligned without observing DOM.
    document.addEventListener('click',event=>{
      if(event.target.closest?.('.lang-btn,[data-lang]')){
        requestAnimationFrame(()=>requestAnimationFrame(syncAll));
      }
    },true);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
