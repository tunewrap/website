// TuneWrap Stage 12.3 — Site CMS runtime.
// No MutationObserver: existing tested page logic remains the owner of behavior.
(function(){
  'use strict';

  const config=window.TUNEWRAP_SITE_CMS;
  if(!config)return;

  const CHANNEL_ORDER=['whatsapp','telegram','instagram','tiktok','youtube','email'];
  const state={scheduled:false};

  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));

  function language(){
    const value=(document.documentElement.lang||'ru').toLowerCase();
    if(value.startsWith('uk'))return 'uk';
    if(value.startsWith('ka'))return 'ka';
    if(value.startsWith('en'))return 'en';
    if(value.startsWith('de'))return 'de';
    return 'ru';
  }

  function localized(bucket){
    return bucket?.locales?.[language()]||null;
  }

  function normalize(value){
    return String(value??'')
      .replace(/\*/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function appendRich(container,value){
    const text=String(value??'');
    const fragment=document.createDocumentFragment();
    const lines=text.split('\n');

    lines.forEach((line,lineIndex)=>{
      if(lineIndex)fragment.appendChild(document.createElement('br'));
      let cursor=0;
      const regex=/\*([^*]+)\*/g;
      let match;
      while((match=regex.exec(line))){
        if(match.index>cursor)fragment.appendChild(document.createTextNode(line.slice(cursor,match.index)));
        const em=document.createElement('em');
        em.textContent=match[1];
        fragment.appendChild(em);
        cursor=match.index+match[0].length;
      }
      if(cursor<line.length)fragment.appendChild(document.createTextNode(line.slice(cursor)));
    });

    container.replaceChildren(fragment);
  }

  function patchTextKey(key,value){
    if(typeof value!=='string'||!value.trim())return;
    $$(`[data-i18n="${CSS.escape(key)}"]`).forEach(node=>{
      // If the semantic content is already the same, keep the existing markup.
      // This preserves the carefully tuned responsive line composition.
      if(normalize(node.textContent)===normalize(value))return;
      appendRich(node,value);
    });
  }

  function patchPlaceholderKey(key,value){
    if(typeof value!=='string'||!value.trim())return;
    $$(`[data-i18n-ph="${CSS.escape(key)}"]`).forEach(node=>{
      if(node.getAttribute('placeholder')!==value)node.setAttribute('placeholder',value);
    });
  }

  function patchTexts(){
    const texts=localized(config.texts);
    if(texts)Object.entries(texts).forEach(([key,value])=>patchTextKey(key,value));

    const placeholders=localized(config.placeholders);
    if(placeholders)Object.entries(placeholders).forEach(([key,value])=>patchPlaceholderKey(key,value));
  }

  function channelHref(kind,channel,message=''){
    if(!channel?.enabled)return '';
    if(channel.url){
      if(!message)return channel.url;
      try{
        const url=new URL(channel.url,location.origin);
        if(kind==='whatsapp'||kind==='telegram')url.searchParams.set('text',message);
        return url.href;
      }catch(error){
        return channel.url;
      }
    }

    const value=String(channel.value||'').trim();
    if(!value)return '';

    if(kind==='whatsapp'){
      const digits=value.replace(/\D+/g,'');
      return digits?`https://wa.me/${digits}${message?`?text=${encodeURIComponent(message)}`:''}`:'';
    }
    if(kind==='telegram'){
      const handle=value.replace(/^@/,'').replace(/^https?:\/\/t\.me\//i,'').split(/[/?#]/)[0];
      return handle?`https://t.me/${handle}${message?`?text=${encodeURIComponent(message)}`:''}`:'';
    }
    if(kind==='email'){
      const address=value.replace(/^mailto:/i,'');
      return address?`mailto:${address}${message?`?body=${encodeURIComponent(message)}`:''}`:'';
    }
    if(/^https?:\/\//i.test(value))return value;
    return '';
  }

  function replaceChannelNode(node,kind,channel){
    const href=channelHref(kind,channel);
    const shouldLink=Boolean(href);
    let target=node;

    if(shouldLink&&node.tagName!=='A'){
      target=document.createElement('a');
      target.className=node.className;
      target.innerHTML=node.innerHTML;
      node.replaceWith(target);
    }else if(!shouldLink&&node.tagName==='A'){
      target=document.createElement('span');
      target.className=node.className;
      target.innerHTML=node.innerHTML;
      node.replaceWith(target);
    }

    target.dataset.siteChannel=kind;
    target.classList.toggle('is-pending',!shouldLink);
    target.hidden=channel?.enabled===false;

    const small=target.querySelector('small');
    if(small&&channel?.label)small.textContent=channel.label;

    if(shouldLink&&target.tagName==='A'){
      target.href=href;
      target.target=kind==='email'?'_self':'_blank';
      if(kind!=='email')target.rel='noopener';
      target.removeAttribute('aria-disabled');
      target.setAttribute('aria-label',`${channel.label||kind}${channel.value?` — ${channel.value}`:''}`);
    }else{
      target.removeAttribute('href');
      target.setAttribute('aria-disabled','true');
    }

    return target;
  }

  function patchChannels(){
    const root=$('.contact-hub-socials');
    const channels=config.contacts?.channels;
    if(!root||!channels)return;

    let nodes=Array.from(root.children);
    CHANNEL_ORDER.forEach((kind,index)=>{
      const channel=channels[kind];
      let node=root.querySelector(`[data-site-channel="${kind}"]`)||nodes[index];
      if(!node)return;
      node=replaceChannelNode(node,kind,channel||{enabled:false,label:kind});
      nodes=Array.from(root.children);
    });

    patchPrimaryContact();
  }

  function primaryChannel(){
    const channels=config.contacts?.channels||{};
    const preferred=config.contacts?.primary;
    if(preferred&&channels[preferred]?.enabled&&channelHref(preferred,channels[preferred])){
      return {kind:preferred,channel:channels[preferred]};
    }
    for(const kind of CHANNEL_ORDER){
      const channel=channels[kind];
      if(channel?.enabled&&channelHref(kind,channel))return {kind,channel};
    }
    return null;
  }

  function patchPrimaryContact(){
    const primary=primaryChannel();
    const write=$('[data-i18n="contact_nav_write"]');
    if(write&&primary&&write.tagName==='A'){
      write.href=channelHref(primary.kind,primary.channel);
      write.target=primary.kind==='email'?'_self':'_blank';
      if(primary.kind!=='email')write.rel='noopener';
    }
  }

  function paymentLocale(item){
    return item?.locales?.[language()]||item?.locales?.ru||null;
  }

  function patchPayments(){
    const slot=$('[data-payment-methods-slot]');
    if(!slot)return;
    const items=(Array.isArray(config.payments)?config.payments:[])
      .filter(item=>item?.enabled!==false)
      .sort((a,b)=>(a.order||99)-(b.order||99));

    if(!items.length){
      slot.classList.remove('has-methods');
      slot.setAttribute('aria-hidden','true');
      return;
    }

    const fragment=document.createDocumentFragment();
    items.forEach(item=>{
      const locale=paymentLocale(item)||{};
      const node=item.url?document.createElement('a'):document.createElement('div');
      node.className='contact-payment-method';
      if(item.url&&node.tagName==='A'){
        node.href=item.url;
        node.target='_blank';
        node.rel='noopener';
      }
      const title=document.createElement('strong');
      title.textContent=locale.title||item.id;
      node.appendChild(title);

      if(locale.subtitle){
        const subtitle=document.createElement('span');
        subtitle.textContent=locale.subtitle;
        node.appendChild(subtitle);
      }
      if(locale.note){
        const note=document.createElement('small');
        note.textContent=locale.note;
        node.appendChild(note);
      }
      fragment.appendChild(node);
    });

    slot.replaceChildren(fragment);
    slot.classList.add('has-methods');
    slot.setAttribute('aria-hidden','false');

    const pending=$('[data-i18n="contact_payment_pending"]');
    if(pending)pending.hidden=true;
  }

  function ensureTermsPanel(){
    let panel=$('#siteTermsPanel');
    if(panel)return panel;

    panel=document.createElement('section');
    panel.id='siteTermsPanel';
    panel.className='site-legal-panel';
    panel.setAttribute('aria-hidden','true');
    panel.setAttribute('aria-modal','true');
    panel.setAttribute('role','dialog');
    panel.innerHTML=`
      <div class="site-legal-shell">
        <div class="site-legal-topbar">
          <button class="site-legal-close" type="button" data-site-legal-close>Закрыть</button>
          <div class="site-legal-brand">TuneWrap</div>
          <span></span>
        </div>
        <div class="site-legal-body">
          <div class="eyebrow">TuneWrap</div>
          <h2 data-site-terms-title></h2>
          <p class="site-legal-intro" data-site-terms-intro></p>
          <div class="site-legal-copy" data-site-terms-body></div>
        </div>
      </div>`;
    document.body.appendChild(panel);

    panel.addEventListener('click',event=>{
      if(event.target===panel||event.target.closest('[data-site-legal-close]'))closeTerms();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&panel.classList.contains('is-open'))closeTerms();
    });

    return panel;
  }

  function openTerms(){
    const panel=ensureTermsPanel();
    patchTermsPanel();
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('overlay-open');
    panel.querySelector('[data-site-legal-close]')?.focus({preventScroll:true});
  }

  function closeTerms(){
    const panel=$('#siteTermsPanel');
    if(!panel)return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('overlay-open');
  }

  function patchTermsPanel(){
    const texts=localized(config.texts)||{};
    const panel=ensureTermsPanel();
    setTextContent(panel.querySelector('[data-site-terms-title]'),texts.terms_title||'Условия использования');
    setTextContent(panel.querySelector('[data-site-terms-intro]'),texts.terms_intro||'');
    setTextContent(panel.querySelector('[data-site-terms-body]'),texts.terms_body||'');
  }

  function setTextContent(node,value){
    if(node&&node.textContent!==String(value??''))node.textContent=String(value??'');
  }

  function patchTermsLink(){
    const texts=localized(config.texts)||{};
    let node=$('[data-i18n="contact_nav_terms"]');
    if(!node)return;

    const enabled=Boolean(String(texts.terms_body||'').trim());
    if(node.tagName!=='BUTTON'){
      const button=document.createElement('button');
      button.type='button';
      button.className=node.className;
      button.dataset.i18n='contact_nav_terms';
      button.dataset.siteTerms='';
      button.textContent=node.textContent;
      node.replaceWith(button);
      node=button;
    }

    node.classList.toggle('is-pending',!enabled);
    node.disabled=!enabled;
    node.removeAttribute('aria-disabled');
    if(!node.dataset.siteTermsBound){
      node.dataset.siteTermsBound='1';
      node.addEventListener('click',openTerms);
    }

    if(enabled)patchTermsPanel();
  }

  function currentPreviewMessage(){
    return $('#previewText')?.textContent||'';
  }

  function patchOrderContactLinks(){
    const channels=config.contacts?.channels||{};
    const message=currentPreviewMessage();

    const wa=$('#waLink');
    const whatsapp=channels.whatsapp;
    const waHref=channelHref('whatsapp',whatsapp,message);
    if(wa){
      wa.hidden=!waHref;
      if(waHref)wa.href=waHref;
    }

    const tg=$('#tgLink');
    const telegram=channels.telegram;
    const tgHref=channelHref('telegram',telegram,message);
    if(tg){
      tg.hidden=!tgHref;
      if(tgHref)tg.href=tgHref;
    }
  }

  function patchCorporateContact(){
    const primary=primaryChannel();
    const link=$('#corpTgLink');
    if(!primary||!link)return;

    let message='';
    try{
      const current=new URL(link.href,location.origin);
      message=current.searchParams.get('text')||'';
    }catch(error){}

    link.href=channelHref(primary.kind,primary.channel,message);
    link.target=primary.kind==='email'?'_self':'_blank';
    if(primary.kind!=='email')link.rel='noopener';
  }

  function apply(){
    patchTexts();
    patchChannels();
    patchPayments();
    patchTermsLink();
    patchOrderContactLinks();
    patchCorporateContact();
  }

  function schedule(){
    if(state.scheduled)return;
    state.scheduled=true;
    requestAnimationFrame(()=>{
      state.scheduled=false;
      apply();
    });
  }

  // Core i18n finishes first, then Site CMS becomes the final copy layer.
  document.addEventListener('tunewrap:languagechange',()=>setTimeout(schedule,0));

  // Core generates messenger links first; CMS then swaps in configured contacts.
  $('#btnGenerate')?.addEventListener('click',()=>setTimeout(patchOrderContactLinks,0));
  $('#corpQty')?.addEventListener('input',()=>setTimeout(patchCorporateContact,0));
  $('#corpTier')?.addEventListener('change',()=>setTimeout(patchCorporateContact,0));
  document.addEventListener('tunewrap:open-corporate',()=>setTimeout(patchCorporateContact,0));

  window.__tuneWrapSiteCms={
    config,
    refresh:schedule,
    openTerms,
    closeTerms
  };

  schedule();
})();
