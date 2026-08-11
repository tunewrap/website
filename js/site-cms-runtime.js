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
    const section=$('#contactHubPayment');
    const navPayment=$('[data-contact-action="payment"]');
    if(!slot)return;

    const sectionEnabled=config.paymentSection?.enabled!==false;
    const items=(Array.isArray(config.payments)?config.payments:[])
      .filter(item=>item?.enabled!==false)
      .sort((a,b)=>(a.order||99)-(b.order||99));

    // A payment block with no actual payment method is not useful to a client.
    // Hide the whole public card and its navigation link when globally disabled
    // OR when every individual payment method is disabled / absent.
    const showSection=sectionEnabled&&items.length>0;
    if(section)section.hidden=!showSection;
    if(navPayment)navPayment.hidden=!showSection;

    if(!showSection){
      slot.replaceChildren();
      slot.classList.remove('has-methods');
      slot.setAttribute('aria-hidden','true');
      const pending=$('[data-i18n="contact_payment_pending"]');
      if(pending)pending.hidden=true;
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

  function announcementTodayKey(){
    const now=new Date();
    const y=now.getFullYear();
    const m=String(now.getMonth()+1).padStart(2,'0');
    const d=String(now.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function announcementDateLocale(){
    return {ru:'ru-RU',uk:'uk-UA',ka:'ka-GE',en:'en-US',de:'de-DE'}[language()]||'ru-RU';
  }

  function formatAnnouncementDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';
    const [year,month,day]=value.split('-').map(Number);
    const date=new Date(year,month-1,day);
    if(Number.isNaN(date.getTime()))return '';
    return new Intl.DateTimeFormat(announcementDateLocale(),{day:'numeric',month:'short'}).format(date);
  }

  function announcementRangeText(announcement){
    const start=formatAnnouncementDate(announcement?.startDate);
    const end=formatAnnouncementDate(announcement?.endDate);
    if(start&&end)return start===end?start:`${start} — ${end}`;
    return start||end||'';
  }

  function announcementIsActive(announcement,texts){
    if(announcement?.enabled!==true)return false;
    if(!String(texts?.announcement_title||'').trim()&&!String(texts?.announcement_text||'').trim())return false;
    const today=announcementTodayKey();
    const start=String(announcement.startDate||'');
    const end=String(announcement.endDate||'');
    if(start&&today<start)return false;
    if(end&&today>end)return false;
    return true;
  }

  function patchAnnouncement(){
    const hero=$('#hero .hero-grid > div:first-child');
    const texts=localized(config.texts)||{};
    const announcement=config.announcement||{};
    if(!hero)return;

    let node=$('#heroAnnouncement');
    if(!node){
      node=document.createElement('aside');
      node.id='heroAnnouncement';
      node.className='hero-announcement';
      node.setAttribute('role','status');
      node.setAttribute('aria-live','polite');
      node.innerHTML=`
        <div class="hero-announcement-meta">
          <span class="hero-announcement-label"></span>
          <time class="hero-announcement-date"></time>
        </div>
        <strong></strong>
        <p></p>`;

      const eyebrow=hero.querySelector('.eyebrow');
      if(eyebrow)eyebrow.insertAdjacentElement('afterend',node);
      else hero.prepend(node);
    }

    const active=announcementIsActive(announcement,texts);
    node.hidden=!active;
    if(!active)return;

    node.querySelector('.hero-announcement-label').textContent=String(texts.announcement_label||'Новости').trim();
    node.querySelector('strong').textContent=String(texts.announcement_title||'').trim();
    node.querySelector('p').textContent=String(texts.announcement_text||'').trim();

    const date=node.querySelector('.hero-announcement-date');
    const range=announcementRangeText(announcement);
    date.textContent=range;
    date.hidden=!range;
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
      <div class="site-legal-shell" role="document">
        <div class="site-legal-topbar">
          <div class="site-legal-brand">Tune<span>Wrap</span></div>
          <button class="site-legal-close" type="button" data-site-legal-close aria-label="Закрыть условия">
            <span aria-hidden="true">×</span>
            <em>Закрыть</em>
          </button>
        </div>
        <div class="site-legal-scroll" data-site-legal-scroll>
          <div class="site-legal-body">
            <div class="eyebrow">TuneWrap · Legal</div>
            <h2 data-site-terms-title></h2>
            <p class="site-legal-intro" data-site-terms-intro></p>
            <div class="site-legal-copy" data-site-terms-body></div>
          </div>
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
    panel.querySelector('[data-site-legal-scroll]')?.scrollTo({top:0,left:0});
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
    const body=String(texts.terms_body||'').trim();
    setTextContent(panel.querySelector('[data-site-terms-title]'),texts.terms_title||'Условия использования');
    setTextContent(panel.querySelector('[data-site-terms-intro]'),texts.terms_intro||'');
    setTextContent(
      panel.querySelector('[data-site-terms-body]'),
      body || 'Текст условий будет опубликован здесь. Его можно добавить в Admin Studio → Сайт без нового деплоя.'
    );
    panel.classList.toggle('is-empty',!body);
  }

  function setTextContent(node,value){
    if(node&&node.textContent!==String(value??''))node.textContent=String(value??'');
  }

  function patchTermsLink(){
    let node=$('[data-i18n="contact_nav_terms"]');
    if(!node)return;

    // Stage 12.3.1: Terms is always an active in-page overlay.
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

    node.classList.remove('is-pending');
    node.disabled=false;
    node.removeAttribute('aria-disabled');

    if(!node.dataset.siteTermsBound){
      node.dataset.siteTermsBound='1';
      node.addEventListener('click',openTerms);
    }

    patchTermsPanel();
  }

  function scrollMainTo(id){
    const target=document.getElementById(id);
    if(!target)return false;
    const app=document.getElementById('appScroll');
    const behavior=window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';

    const inner=target.querySelector(':scope > .wrap');
    if(inner&&inner.scrollHeight>inner.clientHeight)inner.scrollTop=0;

    const wide=window.matchMedia('(min-width:621px)').matches;
    if(wide){
      const header=document.querySelector('body > nav');
      const headerHeight=Math.max(0,Math.round(header?.getBoundingClientRect().height||82));
      const top=Math.max(0,target.getBoundingClientRect().top+window.scrollY-headerHeight-10);
      window.scrollTo({top,behavior});
    }else if(app&&app.scrollHeight>app.clientHeight+2){
      app.scrollTo({top:target.offsetTop,behavior});
    }else{
      target.scrollIntoView({behavior,block:'start'});
    }

    try{history.replaceState(null,'',`#${id}`);}catch(error){}
    return true;
  }

  function scrollInsideContact(selector){
    const hub=$('#contactHub');
    const inner=hub?.querySelector(':scope > .wrap');
    const target=$(selector);
    if(!hub||!target)return;
    scrollMainTo('contactHub');
    const behavior=window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
    window.setTimeout(()=>{
      if(inner&&inner.scrollHeight>inner.clientHeight+2){
        inner.scrollTo({top:Math.max(0,target.offsetTop-16),behavior});
      }else{
        target.scrollIntoView({behavior,block:'start'});
      }
    },80);
  }

  function installFooterNavigation(){
    const nav=$('.contact-hub-navigation');
    if(!nav||nav.dataset.siteNavigationBound==='1')return;
    nav.dataset.siteNavigationBound='1';

    nav.addEventListener('click',event=>{
      const targetLink=event.target.closest('[data-contact-target]');
      if(targetLink){
        event.preventDefault();
        event.stopImmediatePropagation();
        scrollMainTo(targetLink.dataset.contactTarget);
        return;
      }

      const action=event.target.closest('[data-contact-action]')?.dataset.contactAction;
      if(action==='wedding'){
        event.preventDefault();
        event.stopImmediatePropagation();
        scrollMainTo('pricing');
        const pricingInner=$('#pricing')?.querySelector(':scope > .wrap');
        const wedding=$('#weddingPackagesGrid');
        window.setTimeout(()=>{
          if(pricingInner&&wedding&&pricingInner.scrollHeight>pricingInner.clientHeight+2){
            pricingInner.scrollTo({top:Math.max(0,wedding.offsetTop-20),behavior:'smooth'});
          }else wedding?.scrollIntoView({behavior:'smooth',block:'center'});
        },80);
        return;
      }
      if(action==='contacts'){
        event.preventDefault();
        event.stopImmediatePropagation();
        scrollInsideContact('#contactHubTop');
        return;
      }
      if(action==='payment'){
        event.preventDefault();
        event.stopImmediatePropagation();
        scrollInsideContact('#contactHubPayment');
      }
    },true);
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
    patchAnnouncement();
    patchTermsLink();
    installFooterNavigation();
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
