// TuneWrap Stage 12.8.1 — Compact Certificate + Explicit Close Controls.
(function(){
  'use strict';

  const $=selector=>document.querySelector(selector);

  const COPY={
    ru:{closeForm:'Закрыть анкету',closePlayer:'Закрыть плеер'},
    uk:{closeForm:'Закрити анкету',closePlayer:'Закрити плеєр'},
    ka:{closeForm:'ანკეტის დახურვა',closePlayer:'პლეერის დახურვა'},
    en:{closeForm:'Close form',closePlayer:'Close player'},
    de:{closeForm:'Formular schließen',closePlayer:'Player schließen'}
  };

  function lang(){
    const value=(document.documentElement.lang||'ru').toLowerCase();
    if(value.startsWith('uk'))return 'uk';
    if(value.startsWith('ka'))return 'ka';
    if(value.startsWith('en'))return 'en';
    if(value.startsWith('de'))return 'de';
    return 'ru';
  }

  function copy(){return COPY[lang()]||COPY.ru;}

  function closeOrderForm(){
    const back=$('#storyPathBack');
    if(back){
      back.click();
      return;
    }

    const contact=$('#contact');
    contact?.classList.remove('is-story-path-form');
    const picker=$('#storyPathPicker');
    picker?.querySelector('[data-story-path="order"]')?.focus({preventScroll:true});
  }

  function ensureOrderClose(){
    const form=$('#storyOrderForm');
    if(!form)return null;

    let bar=$('#storyOrderCloseBar');
    if(bar)return bar;

    bar=document.createElement('div');
    bar.id='storyOrderCloseBar';
    bar.className='story-order-close-bar';

    const button=document.createElement('button');
    button.id='storyOrderClose';
    button.className='story-order-close';
    button.type='button';
    button.innerHTML=`
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18"/>
      </svg>
      <span></span>
    `;
    button.addEventListener('click',closeOrderForm);

    bar.append(button);
    form.prepend(bar);
    return bar;
  }

  function syncLabels(){
    const labels=copy();

    ensureOrderClose();
    const orderClose=$('#storyOrderClose');
    if(orderClose){
      orderClose.setAttribute('aria-label',labels.closeForm);
      orderClose.setAttribute('title',labels.closeForm);
      const text=orderClose.querySelector('span');
      if(text)text.textContent=labels.closeForm;
    }

    const miniClose=$('#topMiniStop');
    if(miniClose){
      // Playback Engine continues to own the stop/close behavior.
      // This layer only makes the existing control unmistakable to the user.
      miniClose.setAttribute('title',labels.closePlayer);
      miniClose.dataset.explicitClose='true';
    }
  }

  function init(){
    syncLabels();
    document.addEventListener('tunewrap:languagechange',syncLabels);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
