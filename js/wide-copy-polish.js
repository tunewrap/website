// TuneWrap Stage 12.1.4 — desktop copy composition.
// This file changes presentation only on >=621px and only the Russian copy
// explicitly reviewed in the wide layout. It does not edit the i18n dictionary.
(function(){
  'use strict';

  const wide=window.matchMedia('(min-width:621px)');
  const desktop=window.matchMedia('(min-width:900px)');
  const natural=new Map();

  const targets={
    hero:()=>document.querySelector('.hero p.lead'),
    philosophy:()=>document.querySelector('#philosophy .philosophy-quote'),
    tracks:()=>document.querySelector('#tracks .sec-head p'),
    author:()=>document.querySelector('#author .sec-head p'),
    pricing:()=>document.querySelector('#pricing .sec-head p'),
    weddingTitle:()=>document.querySelector('#pricing .wedding-packages-eyebrow'),
    weddingSubtitle:()=>document.querySelector('#pricing .wedding-packages-heading p'),
    contact:()=>document.querySelector('#contact .sec-head p')
  };

  function language(){
    const active=document.querySelector('.lang-switch .lang-btn.active, .mobile-lang .lang-btn.active');
    const raw=String(window.TuneWrapLanguage?.get?.()||active?.dataset.lang||'en').toLowerCase();
    return raw.startsWith('ru')?'ru':raw;
  }

  function remember(lang,key,node){
    if(!node)return;
    const cacheKey=`${lang}:${key}`;
    if(!natural.has(cacheKey))natural.set(cacheKey,node.innerHTML);
  }

  function restore(lang){
    Object.entries(targets).forEach(([key,get])=>{
      const node=get();
      const value=natural.get(`${lang}:${key}`);
      if(node&&value!==undefined)node.innerHTML=value;
    });
  }

  function line(text){
    return `<span class="wide-copy-line">${text}</span>`;
  }

  function applyRussian(){
    const hero=targets.hero();
    const philosophy=targets.philosophy();
    const tracks=targets.tracks();
    const author=targets.author();
    const pricing=targets.pricing();
    const weddingTitle=targets.weddingTitle();
    const weddingSubtitle=targets.weddingSubtitle();
    const contact=targets.contact();

    if(hero){
      hero.innerHTML=
        line('Первая встреча. Любимая фраза мамы. Семейная шутка.')+
        line('Число на обручальном кольце.')+
        '<br>'+
        line('Расскажите нам самое важное —')+
        line('и мы создадим для вас персональную песню,')+
        line('к которой захочется возвращаться спустя годы.');
    }

    if(philosophy){
      philosophy.innerHTML=
        line('Сначала — ваша история.')+
        line('Потом — слова.')+
        line('Потом — музыка.');
    }

    if(tracks){
      tracks.innerHTML=
        line('Сначала — человек и важные детали его жизни.')+
        line('Потом — текст, музыка и момент, в котором близкие узнают себя.');
    }

    if(author){
      author.innerHTML=line('Авторские песни из путешествий, встреч, свободы выбора и любви к жизни.');
    }

    if(pricing){
      pricing.innerHTML=
        line('Выберите глубину работы: от песни по готовому тексту')+
        line('до полного создания истории и текста.');
    }

    if(weddingTitle){
      weddingTitle.textContent='Свадебный формат';
    }

    if(weddingSubtitle){
      weddingSubtitle.innerHTML=
        line('Музыка для моментов,')+
        line('которые останутся с вами навсегда.');
    }

    if(contact){
      contact.innerHTML=line('Выберите пакет и стиль, расскажите о человеке — и мы отправим готовую заявку в один клик.');
    }
  }

  function compose(){
    const lang=language();

    // Capture the natural i18n output before applying the wide composition.
    Object.entries(targets).forEach(([key,get])=>{
      const node=get();
      remember(lang,key,node);
    });

    if(!wide.matches){
      restore(lang);
      return;
    }

    // Exact copy composition was reviewed for RU. Other languages keep their
    // own natural translations to avoid forcing Russian-specific line lengths.
    if(lang==='ru'){
      applyRussian();
    }else{
      restore(lang);
    }

    document.documentElement.classList.toggle('tw-desktop-copy',desktop.matches);
  }

  function schedule(){
    window.requestAnimationFrame(compose);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  }else{
    schedule();
  }

  document.addEventListener('tunewrap:languagechange',schedule);
  wide.addEventListener?.('change',schedule);
  desktop.addEventListener?.('change',schedule);
})();
