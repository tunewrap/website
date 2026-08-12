// TuneWrap Stage 12.4 — Critical UX fixes.
// 1) Mini-player seek bar.
// 2) One clear action for library cards: open full player + autoplay.
// 3) Package selection inside the order form.
// 4) Required-field validation before preview / CRM submit.
// 5) Up to five music styles.
(function(){
  'use strict';

  const TIER_INDEX={simple:0,advanced:1,hit:2};
  const COPY={
    ru:{
      packageLabel:'Пакет и стоимость',
      packagePlaceholder:'Выберите пакет',
      packageHint:'Пакет можно изменить здесь, не выходя из заявки.',
      requiredNote:'Поля со звёздочкой обязательны для отправки заявки.',
      styleHint:'Можно смешать до пяти стилей',
      styleMax:'Выбрано 5 из 5. Чтобы добавить другой стиль, сначала снимите один.',
      errors:{
        package:'Выберите пакет и стоимость.',
        style:'Выберите хотя бы один стиль песни.',
        instrument:'Выберите инструменты/звучание или «На усмотрение TuneWrap».',
        vocal:'Выберите, кто должен петь.',
        name:'Укажите ваше имя.',
        occasion:'Выберите повод или историю.',
        story:'Выберите пример истории или напишите свою.',
        description:'Расскажите о человеке или вставьте готовый текст песни.',
        contact:'Выберите WhatsApp, Telegram или Email и укажите корректный контакт.'
      }
    },
    uk:{
      packageLabel:'Пакет і вартість',
      packagePlaceholder:'Оберіть пакет',
      packageHint:'Пакет можна змінити тут, не виходячи із заявки.',
      requiredNote:'Поля із зірочкою обов’язкові для надсилання заявки.',
      styleHint:'Можна поєднати до п’яти стилів',
      styleMax:'Обрано 5 з 5. Щоб додати інший стиль, спочатку зніміть один.',
      errors:{
        package:'Оберіть пакет і вартість.',
        style:'Оберіть хоча б один стиль пісні.',
        instrument:'Оберіть інструменти/звучання або «На розсуд TuneWrap».',
        vocal:'Оберіть, хто має співати.',
        name:'Вкажіть ваше ім’я.',
        occasion:'Оберіть подію або історію.',
        story:'Оберіть приклад історії або напишіть свою.',
        description:'Розкажіть про людину або вставте готовий текст пісні.',
        contact:'Оберіть WhatsApp, Telegram або Email і вкажіть коректний контакт.'
      }
    },
    ka:{
      packageLabel:'პაკეტი და ფასი',
      packagePlaceholder:'აირჩიეთ პაკეტი',
      packageHint:'პაკეტის შეცვლა შეგიძლიათ აქვე, განაცხადიდან გასვლის გარეშე.',
      requiredNote:'ვარსკვლავით მონიშნული ველები სავალდებულოა.',
      styleHint:'შეგიძლიათ ხუთამდე სტილის შერწყმა',
      styleMax:'არჩეულია 5-დან 5. სხვა სტილის დასამატებლად ჯერ ერთი მოხსენით.',
      errors:{
        package:'აირჩიეთ პაკეტი და ფასი.',
        style:'აირჩიეთ მინიმუმ ერთი მუსიკალური სტილი.',
        instrument:'აირჩიეთ ინსტრუმენტები/ჟღერადობა ან „TuneWrap-ის არჩევანი“.',
        vocal:'აირჩიეთ, ვინ უნდა იმღეროს.',
        name:'მიუთითეთ თქვენი სახელი.',
        occasion:'აირჩიეთ შემთხვევა ან ისტორია.',
        story:'აირჩიეთ მაგალითი ან დაწერეთ თქვენი ისტორია.',
        description:'მოგვიყევით ადამიანზე ან ჩასვით მზა ტექსტი.',
        contact:'აირჩიეთ WhatsApp, Telegram ან Email და მიუთითეთ სწორი კონტაქტი.'
      }
    },
    en:{
      packageLabel:'Package and price',
      packagePlaceholder:'Choose a package',
      packageHint:'You can change the package here without leaving the request.',
      requiredNote:'Fields marked with an asterisk are required.',
      styleHint:'Mix up to five styles',
      styleMax:'5 of 5 selected. Remove one style before adding another.',
      errors:{
        package:'Choose a package and price.',
        style:'Choose at least one music style.',
        instrument:'Choose instruments/sound or “TuneWrap choice”.',
        vocal:'Choose who should sing.',
        name:'Enter your name.',
        occasion:'Choose an occasion or story.',
        story:'Choose a story example or write your own.',
        description:'Tell us about the person or paste ready song lyrics.',
        contact:'Choose WhatsApp, Telegram or Email and enter a valid contact.'
      }
    },
    de:{
      packageLabel:'Paket und Preis',
      packagePlaceholder:'Paket auswählen',
      packageHint:'Sie können das Paket hier ändern, ohne die Anfrage zu verlassen.',
      requiredNote:'Mit Sternchen markierte Felder sind Pflichtfelder.',
      styleHint:'Bis zu fünf Stile kombinieren',
      styleMax:'5 von 5 ausgewählt. Entfernen Sie zuerst einen Stil.',
      errors:{
        package:'Bitte Paket und Preis auswählen.',
        style:'Bitte mindestens einen Musikstil auswählen.',
        instrument:'Bitte Instrumente/Klang oder „TuneWrap-Auswahl“ wählen.',
        vocal:'Bitte auswählen, wer singen soll.',
        name:'Bitte Ihren Namen eingeben.',
        occasion:'Bitte Anlass oder Geschichte auswählen.',
        story:'Bitte ein Beispiel wählen oder Ihre eigene Geschichte schreiben.',
        description:'Beschreiben Sie die Person oder fügen Sie einen fertigen Songtext ein.',
        contact:'Wählen Sie WhatsApp, Telegram oder E-Mail und geben Sie einen gültigen Kontakt an.'
      }
    }
  };

  function lang(){
    const value=String(window.TuneWrapLanguage?.get?.()||'en').toLowerCase();
    if(value.startsWith('uk'))return 'uk';
    if(value.startsWith('ka'))return 'ka';
    if(value.startsWith('en'))return 'en';
    if(value.startsWith('de'))return 'de';
    return 'ru';
  }
  const copy=()=>COPY[lang()]||COPY.ru;
  const $=selector=>document.querySelector(selector);

  function installCss(){
    if(document.getElementById('tunewrapUxCriticalStyles'))return;
    const link=document.createElement('link');
    link.id='tunewrapUxCriticalStyles';
    link.rel='stylesheet';
    link.href='/css/ux-critical-fixes.css?v=12.4';
    document.head.append(link);
  }

  function pricing(){
    return window.__tuneWrapPricing||null;
  }

  function localizedOfferName(offer){
    if(!offer)return '';
    const locales=offer.locales||{};
    return locales[lang()]?.name||window.__tuneWrapPricingFallback?.offer?.(lang(),offer.id)?.name||offer.id||'';
  }

  function tierIndex(offer){
    return Number.isInteger(TIER_INDEX[offer?.id])?TIER_INDEX[offer.id]:-1;
  }

  function enabledTiers(){
    const list=pricing()?.config?.tiers;
    return (Array.isArray(list)?list:[])
      .filter(offer=>offer&&offer.enabled!==false&&tierIndex(offer)>=0)
      .sort((a,b)=>(a.order||99)-(b.order||99));
  }

  function enabledWeddings(){
    const list=pricing()?.config?.weddings;
    return (Array.isArray(list)?list:[])
      .filter(offer=>offer&&offer.enabled!==false)
      .sort((a,b)=>(a.order||99)-(b.order||99));
  }

  function selectedPackageValue(){
    const selected=pricing()?.getSelected?.();
    if(selected?.type==='tier'&&Number.isInteger(Number(selected.index)))return 'tier:'+Number(selected.index);
    if(selected?.type==='wedding'&&selected.id)return 'wedding:'+selected.id;
    return '';
  }

  function packageGroupLabels(){
    return {
      ru:{regular:'Песни',wedding:'Свадебные форматы'},
      uk:{regular:'Пісні',wedding:'Весільні формати'},
      ka:{regular:'სიმღერები',wedding:'საქორწილო ფორმატები'},
      en:{regular:'Songs',wedding:'Wedding formats'},
      de:{regular:'Songs',wedding:'Hochzeitsformate'}
    }[lang()]||{regular:'Песни',wedding:'Свадебные форматы'};
  }

  function selectedTierIndex(){
    const selected=pricing()?.getSelected?.();
    return selected?.type==='tier'&&Number.isInteger(Number(selected.index))
      ? Number(selected.index)
      : null;
  }

  function regularPackageField(){
    return $('#regularPackageField');
  }

  function ensureRegularPackageField(){
    let group=regularPackageField();
    if(group)return group;

    const styleGroup=$('#styleChips')?.closest('.field-group');
    if(!styleGroup)return null;

    group=document.createElement('div');
    group.className='field-group ux-required';
    group.id='regularPackageField';

    const label=document.createElement('label');
    label.className='field-label ux-required-label';
    label.htmlFor='fieldTier';

    const select=document.createElement('select');
    select.id='fieldTier';
    select.setAttribute('aria-describedby','fieldTierHint');

    const hint=document.createElement('span');
    hint.className='field-hint';
    hint.id='fieldTierHint';

    group.append(label,select,hint);
    styleGroup.insertAdjacentElement('beforebegin',group);

    select.addEventListener('change',()=>{
      clearError(group);
      const value=String(select.value||'');
      if(!value)return;

      const [kind,key]=value.split(':');
      if(kind==='tier'){
        const index=Number(key);
        if(!Number.isInteger(index))return;
        document.dispatchEvent(new CustomEvent('tunewrap:set-order-tier',{detail:{index}}));
        pricing()?.selectTier?.(index);
      }else if(kind==='wedding'&&key){
        document.dispatchEvent(new CustomEvent('tunewrap:set-order-wedding',{detail:{id:key}}));
        pricing()?.selectWedding?.(key);
      }
      window.setTimeout(syncRegularPackageField,0);
    });

    return group;
  }

  function syncRegularPackageField(){
    const group=ensureRegularPackageField();
    const select=$('#fieldTier');
    if(!group||!select)return;

    const c=copy();
    group.querySelector('label').textContent=c.packageLabel;
    group.querySelector('.field-hint').textContent=c.packageHint;
    group.hidden=false;

    // Stage 12.6 uses one selector for all six packages.
    // Keep the old wedding select populated for core compatibility, but do not show a duplicate field.
    const weddingField=$('#weddingPackageField');
    if(weddingField)weddingField.hidden=true;

    const current=selectedPackageValue();
    const fragment=document.createDocumentFragment();
    const placeholder=document.createElement('option');
    placeholder.value='';
    placeholder.textContent=c.packagePlaceholder;
    fragment.appendChild(placeholder);

    const groups=packageGroupLabels();

    const regularGroup=document.createElement('optgroup');
    regularGroup.label=groups.regular;
    enabledTiers().forEach(offer=>{
      const option=document.createElement('option');
      option.value='tier:'+tierIndex(offer);
      option.textContent=localizedOfferName(offer)+' — $'+(Number(offer.price)||0);
      regularGroup.appendChild(option);
    });
    if(regularGroup.children.length)fragment.appendChild(regularGroup);

    const weddingGroup=document.createElement('optgroup');
    weddingGroup.label=groups.wedding;
    enabledWeddings().forEach(offer=>{
      const option=document.createElement('option');
      option.value='wedding:'+offer.id;
      option.textContent=localizedOfferName(offer)+' — $'+(Number(offer.price)||0);
      weddingGroup.appendChild(option);
    });
    if(weddingGroup.children.length)fragment.appendChild(weddingGroup);

    select.replaceChildren(fragment);
    select.value=current;
  }

  function requiredTargets(){
    return {
      package:regularPackageField(),
      style:$('#styleChips')?.closest('.field-group'),
      instrument:$('#instrumentChips')?.closest('.field-group'),
      vocal:$('#orderVocalField'),
      name:$('#fieldName')?.closest('.field-group'),
      occasion:$('#fieldOccasion')?.closest('.field-group'),
      story:$('#storyCore'),
      description:$('#fieldDescription')?.closest('.field-group'),
      contact:$('#fieldContact')?.closest('.field-group')
    };
  }

  function markRequired(){
    const targets=requiredTargets();
    ['style','instrument','vocal','name','occasion','story','description','contact'].forEach(key=>{
      targets[key]?.classList.add('ux-required');
    });
    $('#styleChips')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');
    $('#instrumentChips')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');
    $('#orderVocalField')?.querySelector('.field-label')?.classList.add('ux-required-label');
    $('#fieldName')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');
    $('#fieldOccasion')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');
    $('#fieldDescription')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');
    $('#fieldContact')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');
    $('#storyCore h3')?.classList.add('ux-required-title');

    let note=$('#uxRequiredNote');
    if(!note){
      note=document.createElement('div');
      note.id='uxRequiredNote';
      note.className='ux-required-note';
      const summary=$('.order-summary');
      summary?.insertAdjacentElement('afterend',note);
    }
    if(note)note.textContent=copy().requiredNote;
  }

  function styleCount(){
    return Array.from(document.querySelectorAll('#styleChips .chip.selected')).length;
  }

  function instrumentCount(){
    return Array.from(document.querySelectorAll('#instrumentChips .chip.selected')).length;
  }

  function updateStyleHint(){
    const hint=$('#styleChips')?.closest('.field-group')?.querySelector('.field-hint');
    if(!hint)return;
    hint.textContent=styleCount()>=5?copy().styleMax:copy().styleHint;
    hint.classList.toggle('is-limit',styleCount()>=5);
  }

  function text(id){
    return $(id.startsWith('#')?id:'#'+id)?.value?.trim?.()||'';
  }

  function currentMode(){
    return document.querySelector('.mode-btn.active')?.dataset.mode||'order';
  }

  function weddingSelected(){
    const field=$('#weddingPackageField');
    return Boolean(field&&!field.hidden&&$('#fieldWeddingPackage')?.value);
  }

  function packageSelected(){
    return Boolean(pricing()?.getSelected?.())||weddingSelected()||selectedTierIndex()!==null;
  }

  function validContact(value){
    const v=String(value||'').trim();

    const split=v.indexOf(':');
    if(split>0){
      const method=v.slice(0,split).trim().toLowerCase();
      const detail=v.slice(split+1).trim();

      if(method==='email'){
        const at=detail.indexOf('@');
        const dot=detail.lastIndexOf('.');
        return at>0&&dot>at+1&&dot<detail.length-1&&!detail.includes(' ');
      }

      if(method==='whatsapp'){
        const digits=Array.from(detail).filter(char=>char>='0'&&char<='9').join('');
        return digits.length>=7&&digits.length<=16;
      }

      if(method==='telegram'){
        const digits=Array.from(detail).filter(char=>char>='0'&&char<='9').join('');
        if(digits.length>=7&&digits.length<=16)return true;

        let username=detail.trim();
        const lower=username.toLowerCase();
        const prefixes=['https://www.t.me/','http://www.t.me/','https://t.me/','http://t.me/','www.t.me/','t.me/'];
        const prefix=prefixes.find(item=>lower.startsWith(item));
        if(prefix)username=username.slice(prefix.length);
        if(username.startsWith('@'))username=username.slice(1);
        username=username.split('/')[0].split('?')[0].split('#')[0].trim();

        if(username.length<5||username.length>32)return false;
        return Array.from(username).every(char=>
          (char>='A'&&char<='Z')||
          (char>='a'&&char<='z')||
          (char>='0'&&char<='9')||
          char==='_'
        );
      }
    }

    // Legacy cached orders / old form values.
    const at=v.indexOf('@');
    const dot=v.lastIndexOf('.');
    const email=at>0&&dot>at+1&&dot<v.length-1&&!v.includes(' ');
    const digits=Array.from(v).filter(char=>char>='0'&&char<='9').join('');
    const phone=digits.length>=7&&digits.length<=16;
    return email||phone;
  }

  function clearError(group){
    if(!group)return;
    group.classList.remove('ux-field-error');
    group.querySelectorAll('[aria-invalid="true"]').forEach(node=>node.removeAttribute('aria-invalid'));
    group.querySelector('.ux-field-error-message')?.remove();
  }

  function setError(group,message){
    if(!group)return;
    clearError(group);
    group.classList.add('ux-field-error');
    const focusable=group.querySelector('input,select,textarea,button');
    focusable?.setAttribute('aria-invalid','true');
    const error=document.createElement('div');
    error.className='ux-field-error-message';
    error.setAttribute('role','alert');
    error.textContent=message;
    group.appendChild(error);
  }

  function clearAllErrors(){
    Object.values(requiredTargets()).forEach(clearError);
    $('#uxValidationSummary')?.remove();
  }

  function focusGroup(group){
    if(!group)return;
    group.scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',
      block:'center'
    });
    const focusable=group.querySelector('select,input,textarea,button');
    window.setTimeout(()=>focusable?.focus({preventScroll:true}),220);
  }

  function showValidationSummary(count){
    let node=$('#uxValidationSummary');
    if(!node){
      node=document.createElement('div');
      node.id='uxValidationSummary';
      node.className='ux-validation-summary';
      node.setAttribute('role','alert');
      $('#btnGenerate')?.insertAdjacentElement('beforebegin',node);
    }
    if(node){
      const labels={
        ru:`Проверьте обязательные поля: ${count}.`,
        uk:`Перевірте обов’язкові поля: ${count}.`,
        ka:`შეამოწმეთ სავალდებულო ველები: ${count}.`,
        en:`Check the required fields: ${count}.`,
        de:`Bitte Pflichtfelder prüfen: ${count}.`
      };
      node.textContent=labels[lang()]||labels.ru;
    }
  }

  function validateOrder(){
    clearAllErrors();
    const c=copy();
    const groups=requiredTargets();
    const errors=[];

    if(!packageSelected())errors.push([groups.package||$('#weddingPackageField'),c.errors.package]);

    // Gift certificate intentionally keeps the existing simpler flow:
    // package + buyer name + contact are required, recipient details come later.
    if(currentMode()!=='certificate'){
      if(styleCount()<1)errors.push([groups.style,c.errors.style]);
      if($('#instrumentChips')&&instrumentCount()<1)errors.push([groups.instrument,c.errors.instrument]);
      if($('#orderVocalField')&&!window.__tuneWrapOrderCompletion?.hasVocalChoice?.())errors.push([groups.vocal,c.errors.vocal]);
      if(!text('fieldOccasion'))errors.push([groups.occasion,c.errors.occasion]);
      if(!text('fieldStoryCore'))errors.push([groups.story,c.errors.story]);
      if(!text('fieldDescription'))errors.push([groups.description,c.errors.description]);
    }

    if(!text('fieldName'))errors.push([groups.name,c.errors.name]);
    if(!validContact(text('fieldContact')))errors.push([groups.contact,c.errors.contact]);

    errors.forEach(([group,message])=>setError(group,message));
    if(errors.length){
      showValidationSummary(errors.length);
      focusGroup(errors[0][0]);
      return false;
    }
    return true;
  }

  function bindValidation(){
    const button=$('#btnGenerate');
    if(!button||button.dataset.uxValidationBound==='1')return;
    button.dataset.uxValidationBound='1';

    // Capture phase runs before the existing Stage 9 preview and Stage 12 CRM listeners.
    button.addEventListener('click',event=>{
      if(validateOrder())return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },true);

    $('#storyOrderForm')?.addEventListener('input',event=>{
      clearError(event.target.closest('.field-group,.story-core'));
      $('#uxValidationSummary')?.remove();
    });
    $('#storyOrderForm')?.addEventListener('change',event=>{
      clearError(event.target.closest('.field-group,.story-core'));
      $('#uxValidationSummary')?.remove();
    });
  }

  function installMiniSeek(){
    const controls=$('.top-mini-controls');
    const audio=window.__tuneWrapPlayback?.engine;
    if(!controls||!audio)return;
    let seek=$('#topMiniSeek');
    if(!seek){
      seek=document.createElement('input');
      seek.id='topMiniSeek';
      seek.className='top-mini-seek';
      seek.type='range';
      seek.min='0';
      seek.max='0';
      seek.step='0.1';
      seek.value='0';
      seek.disabled=true;
      seek.setAttribute('aria-label',copy().styleHint); // replaced below with seek label
      controls.appendChild(seek);
    }

    const seekLabels={
      ru:'Перемотка песни',
      uk:'Перемотування пісні',
      ka:'სიმღერის გადახვევა',
      en:'Seek through song',
      de:'Im Song spulen'
    };

    let dragging=false;

    function paint(){
      const playback=window.__tuneWrapPlayback;
      const total=Number(playback?.getDuration?.()||audio.duration||0);
      const current=Number(playback?.getCurrentTime?.()||audio.currentTime||0);
      seek.max=total>0?String(total):'0';
      seek.disabled=!(total>0);
      if(!dragging)seek.value=String(Math.min(current,total||0));
      const shown=Number(seek.value)||0;
      const progress=total>0?Math.max(0,Math.min(100,shown/total*100)):0;
      seek.style.setProperty('--mini-seek-progress',progress+'%');
      seek.setAttribute('aria-label',seekLabels[lang()]||seekLabels.ru);
    }

    function beginMiniSeek(){
      dragging=true;
    }

    function previewMiniSeek(){
      dragging=true;
      paint();
    }

    function commitMiniSeek(){
      if(!dragging)return;
      const value=Number(seek.value)||0;
      const applied=window.__tuneWrapPlayback?.seekTo?.(value);
      if(applied===false)return;
      dragging=false;
      window.requestAnimationFrame(paint);
    }

    seek.addEventListener('pointerdown',beginMiniSeek);
    seek.addEventListener('input',previewMiniSeek);
    seek.addEventListener('change',commitMiniSeek);
    seek.addEventListener('pointerup',commitMiniSeek);
    seek.addEventListener('pointercancel',()=>{
      dragging=false;
      paint();
    });
    seek.addEventListener('keyup',event=>{
      if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key)){
        dragging=true;
        commitMiniSeek();
      }
    });

    ['loadedmetadata','durationchange','timeupdate','seeked','play','pause','ended'].forEach(type=>{
      audio.addEventListener(type,paint);
    });
    document.addEventListener('tunewrap:languagechange',()=>window.setTimeout(paint,0));
    paint();
  }

  function syncAfterLanguage(){
    window.setTimeout(()=>{
      syncRegularPackageField();
      markRequired();
      updateStyleHint();
    },20);
  }

  function bindSelectionSync(){
    $('#tierDetailSelect')?.addEventListener('click',()=>window.setTimeout(syncRegularPackageField,0));
    $('#fieldWeddingPackage')?.addEventListener('change',()=>window.setTimeout(syncRegularPackageField,0));
    document.addEventListener('tunewrap:reset-order-selection',()=>window.setTimeout(syncRegularPackageField,0));
    document.addEventListener('tunewrap:languagechange',syncAfterLanguage);
    $('#styleChips')?.addEventListener('click',()=>window.setTimeout(updateStyleHint,0));
    document.addEventListener('tunewrap:catalogrendered',()=>{});
  }

  let miniSeekAttempts=0;
  function ensureMiniSeekReady(){
    if(window.__tuneWrapPlayback?.engine){
      installMiniSeek();
      return;
    }
    if(miniSeekAttempts>=30)return;
    miniSeekAttempts+=1;
    window.setTimeout(ensureMiniSeekReady,50);
  }

  function init(){
    installCss();
    ensureRegularPackageField();
    syncRegularPackageField();
    markRequired();
    updateStyleHint();
    bindValidation();
    bindSelectionSync();
    ensureMiniSeekReady();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  // app-bootstrap can dispatch a synthetic DOMContentLoaded after playback-engine is imported.
  // Keep one explicit retry hook so the seek bar is installed even when this runtime loads first.
  document.addEventListener('DOMContentLoaded',()=>window.setTimeout(ensureMiniSeekReady,0),{once:true});
})();
