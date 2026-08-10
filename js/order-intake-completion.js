// TuneWrap Stage 12.6 — Order Intake Completion.
// Adds mandatory vocal choice to song/wedding orders.
// Package unification, footer navigation and Admin translation are patched into their owning runtimes.
(function(){
  'use strict';

  const VOCALS=Object.freeze([
    {
      id:'male',
      prompt:'male vocal',
      labels:{ru:'Мужской голос',uk:'Чоловічий голос',ka:'მამაკაცის ვოკალი',en:'Male vocal',de:'Männlicher Gesang'}
    },
    {
      id:'female',
      prompt:'female vocal',
      labels:{ru:'Женский голос',uk:'Жіночий голос',ka:'ქალის ვოკალი',en:'Female vocal',de:'Weiblicher Gesang'}
    },
    {
      id:'duet',
      prompt:'male and female duet',
      labels:{ru:'Мужчина + женщина',uk:'Чоловік + жінка',ka:'კაცი + ქალი',en:'Male + female duet',de:'Mann + Frau Duett'}
    },
    {
      id:'any',
      prompt:'vocal gender flexible, TuneWrap choice',
      labels:{ru:'Неважно / на усмотрение TuneWrap',uk:'Неважливо / на розсуд TuneWrap',ka:'არ აქვს მნიშვნელობა / TuneWrap-ის არჩევანი',en:'No preference / TuneWrap choice',de:'Egal / TuneWrap-Auswahl'}
    }
  ]);

  const COPY={
    ru:{title:'Кто должен петь?',hint:'Выберите один вариант.',summary:'Вокал:',preview:'Вокал'},
    uk:{title:'Хто має співати?',hint:'Оберіть один варіант.',summary:'Вокал:',preview:'Вокал'},
    ka:{title:'ვინ უნდა იმღეროს?',hint:'აირჩიეთ ერთი ვარიანტი.',summary:'ვოკალი:',preview:'ვოკალი'},
    en:{title:'Who should sing?',hint:'Choose one option.',summary:'Vocal:',preview:'Vocal'},
    de:{title:'Wer soll singen?',hint:'Wählen Sie eine Option.',summary:'Gesang:',preview:'Gesang'}
  };

  const state={selected:''};
  const $=selector=>document.querySelector(selector);

  function lang(){
    const value=(document.documentElement.lang||'ru').toLowerCase();
    if(value.startsWith('uk'))return 'uk';
    if(value.startsWith('ka'))return 'ka';
    if(value.startsWith('en'))return 'en';
    if(value.startsWith('de'))return 'de';
    return 'ru';
  }

  function copy(){return COPY[lang()]||COPY.ru;}
  function isCertificate(){return document.querySelector('.mode-btn.active')?.dataset.mode==='certificate';}
  function item(id){return VOCALS.find(value=>value.id===id)||null;}
  function label(value){return value?.labels?.[lang()]||value?.labels?.ru||value?.id||'';}

  function ensureField(){
    let group=$('#orderVocalField');
    if(group)return group;

    const instrument=$('#soundInstrumentField')||$('#instrumentChips')?.closest('.field-group');
    const style=$('#styleChips')?.closest('.field-group');
    const anchor=instrument||style;
    if(!anchor)return null;

    group=document.createElement('div');
    group.className='field-group ux-required order-vocal-field';
    group.id='orderVocalField';
    group.innerHTML=`
      <span class="field-label ux-required-label" id="orderVocalLabel"></span>
      <div class="style-chips order-vocal-chips" id="orderVocalChips" aria-labelledby="orderVocalLabel"></div>
      <span class="field-hint" id="orderVocalHint"></span>
    `;
    anchor.insertAdjacentElement('afterend',group);

    group.addEventListener('click',event=>{
      const button=event.target.closest('button[data-vocal-choice]');
      if(!button)return;
      event.preventDefault();
      state.selected=button.dataset.vocalChoice;
      render();
      clearValidation(group);
    });

    return group;
  }

  function clearValidation(group){
    group?.classList.remove('ux-field-error');
    group?.querySelector('.ux-field-error-message')?.remove();
    group?.querySelectorAll('[aria-invalid="true"]').forEach(node=>node.removeAttribute('aria-invalid'));
  }

  function ensureSummary(){
    let pill=$('#orderVocalSummaryPill');
    if(pill)return pill;
    const instrumentSummary=$('#soundInstrumentSummaryPill');
    const styleSummary=$('#sumStyle')?.closest('.order-pill');
    const anchor=instrumentSummary||styleSummary;
    if(!anchor)return null;

    pill=document.createElement('div');
    pill.className='order-pill order-vocal-summary';
    pill.id='orderVocalSummaryPill';
    pill.innerHTML='<span id="orderVocalSummaryLabel"></span> <strong id="sumVocal">—</strong>';
    anchor.insertAdjacentElement('afterend',pill);
    return pill;
  }

  function render(){
    const group=ensureField();
    if(!group)return;

    $('#orderVocalLabel').textContent=copy().title;
    $('#orderVocalHint').textContent=copy().hint;

    const fragment=document.createDocumentFragment();
    VOCALS.forEach(value=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='chip sound-choice-chip order-vocal-chip'+(state.selected===value.id?' selected':'');
      button.dataset.vocalChoice=value.id;
      button.setAttribute('aria-pressed',state.selected===value.id?'true':'false');
      button.textContent=label(value);
      fragment.appendChild(button);
    });
    $('#orderVocalChips').replaceChildren(fragment);

    const pill=ensureSummary();
    const hidden=isCertificate();
    group.hidden=hidden;
    if(pill)pill.hidden=hidden;
    $('#orderVocalSummaryLabel').textContent=copy().summary;
    $('#sumVocal').textContent=state.selected?label(item(state.selected)):'—';
  }

  function augmentPreview(){
    const preview=$('#previewText');
    if(!preview||!state.selected)return;
    const vocalLabel=label(item(state.selected));
    const prefix=copy().preview+':';
    const lines=(preview.textContent||'').split('\n');
    const existing=lines.findIndex(line=>line.trim().startsWith(prefix));
    if(existing>=0)lines[existing]=`${prefix} ${vocalLabel}`;
    else {
      const styleIndex=lines.findIndex(line=>/^(Стиль|Стиль пісні|სტილი|Style|Song style|Stil|Liedstil)\s*:/i.test(line.trim()));
      lines.splice(styleIndex>=0?styleIndex+1:Math.min(4,lines.length),0,`${prefix} ${vocalLabel}`);
    }
    preview.textContent=lines.join('\n');
  }

  function rerender(){
    window.setTimeout(render,0);
  }

  function init(){
    render();
    document.querySelectorAll('.lang-btn').forEach(button=>button.addEventListener('click',rerender));
    document.querySelectorAll('.mode-btn').forEach(button=>button.addEventListener('click',rerender));
    document.addEventListener('tunewrap:languagechange',rerender);
    $('#btnGenerate')?.addEventListener('click',()=>window.setTimeout(augmentPreview,0));

    window.__tuneWrapOrderCompletion={
      getVocalChoice:()=>state.selected,
      getVocalLabel:()=>state.selected?label(item(state.selected)):'',
      getVocalPrompt:()=>state.selected?item(state.selected)?.prompt||'':'',
      hasVocalChoice:()=>Boolean(state.selected)
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
