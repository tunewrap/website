// TuneWrap Stage 12.2 — Pricing CMS runtime.
// Content/prices come from D1 and overlay the existing tested pricing core.
// If the API is unavailable, the built-in pricing remains a safe fallback.
(function(){
  'use strict';

  const config=window.TUNEWRAP_PRICING_CMS;
  if(!config)return;

  const TIER_INDEX={simple:0,advanced:1,hit:2};
  const state={panel:null,selected:null,scheduled:false};

  const $=selector=>document.querySelector(selector);
  const lang=()=>{
    const value=(document.documentElement.lang||'ru').toLowerCase();
    if(value.startsWith('uk'))return 'uk';
    if(value.startsWith('ka'))return 'ka';
    if(value.startsWith('en'))return 'en';
    if(value.startsWith('de'))return 'de';
    return 'ru';
  };

  function locale(map){
    return map?.[lang()]||null;
  }

  function settings(){
    return locale(config.settings?.locales);
  }

  function tierByIndex(index){
    const id=Object.keys(TIER_INDEX).find(key=>TIER_INDEX[key]===Number(index));
    return config.tiers?.find(item=>item.id===id)||null;
  }

  function weddingById(id){
    return config.weddings?.find(item=>item.id===id)||null;
  }

  function offerLocale(offer){
    return locale(offer?.locales);
  }

  function money(value){
    return `$${Number(value)||0}`;
  }

  function setText(selector,value){
    const node=$(selector);
    if(node&&typeof value==='string'&&value.trim())node.textContent=value;
  }

  function patchPageCopy(){
    const s=settings();
    if(!s)return;
    setText('[data-i18n="pricing_eyebrow"]',s.pricingEyebrow);
    setText('[data-i18n="pricing_h2"]',s.pricingTitle);
    setText('[data-i18n="pricing_p"]',s.pricingIntro);
    setText('[data-i18n="pricing_promo_title"]',s.promoTitle);
    setText('[data-i18n="pricing_promo_until"]',s.promoUntil);
    setText('#pricing .wedding-packages-eyebrow',s.weddingTitle);
    setText('#pricing .wedding-packages-heading p',s.weddingSubtitle);

    const urgent=$('#fieldUrgent')?.closest('label')?.querySelector('span');
    if(urgent&&s.urgentLabel){
      urgent.textContent=s.urgentLabel.replace('${fee}',money(config.urgentFee));
    }
  }

  function patchTierCards(){
    const cards=Array.from(document.querySelectorAll('#tiersGrid .tier-card'));
    cards.forEach(card=>{
      const index=Number(card.dataset.tierIndex);
      const offer=tierByIndex(index);
      if(!offer)return;
      const loc=offerLocale(offer);
      card.hidden=offer.enabled===false;
      if(loc?.name)card.querySelector('.tier-name').textContent=loc.name;
      const old=card.querySelector('.tier-price s');
      const price=card.querySelector('.tier-price strong');
      if(old)old.textContent=money(offer.oldPrice);
      if(price)price.textContent=money(offer.price);
      const open=card.querySelector('.tier-card-open');
      if(open&&settings()?.detailsLabel){
        const svg=open.querySelector('svg');
        open.textContent=settings().detailsLabel;
        if(svg)open.appendChild(svg);
      }
    });

    const grid=$('#tiersGrid');
    if(grid){
      [...cards].sort((a,b)=>{
        const ao=tierByIndex(a.dataset.tierIndex)?.order||99;
        const bo=tierByIndex(b.dataset.tierIndex)?.order||99;
        return ao-bo;
      }).forEach(card=>grid.appendChild(card));
    }
  }

  function patchWeddingCards(){
    const cards=Array.from(document.querySelectorAll('#weddingPackagesGrid .wedding-offer-card'));
    cards.forEach(card=>{
      const offer=weddingById(card.dataset.weddingPackage);
      if(!offer)return;
      const loc=offerLocale(offer);
      card.hidden=offer.enabled===false;
      if(loc?.name)card.querySelector('.tier-name').textContent=loc.name;
      const old=card.querySelector('.tier-price s');
      const price=card.querySelector('.tier-price strong');
      if(old)old.textContent=money(offer.oldPrice);
      if(price)price.textContent=money(offer.price);
      const open=card.querySelector('.tier-card-open');
      if(open&&settings()?.detailsLabel){
        const svg=open.querySelector('svg');
        open.textContent=settings().detailsLabel;
        if(svg)open.appendChild(svg);
      }
    });

    const grid=$('#weddingPackagesGrid');
    if(grid){
      [...cards].sort((a,b)=>{
        const ao=weddingById(a.dataset.weddingPackage)?.order||99;
        const bo=weddingById(b.dataset.weddingPackage)?.order||99;
        return ao-bo;
      }).forEach(card=>grid.appendChild(card));
    }
    patchWeddingSelect();
  }

  function patchWeddingSelect(){
    const select=$('#fieldWeddingPackage');
    if(!select)return;
    Array.from(select.options).forEach(option=>{
      const offer=weddingById(option.value);
      const loc=offerLocale(offer);
      if(offer&&loc?.name)option.textContent=loc.name;
    });
  }

  function buildList(node,items){
    if(!node||!Array.isArray(items))return;
    node.innerHTML='';
    items.forEach(text=>{
      const li=document.createElement('li');
      li.textContent=text;
      node.appendChild(li);
    });
  }

  function patchPanel(){
    const panel=$('#tierDetailPanel');
    if(!panel?.classList.contains('is-open')||!state.panel)return;
    const s=settings();
    if(state.panel.type==='tier'){
      const offer=tierByIndex(state.panel.index);
      const loc=offerLocale(offer);
      if(!offer)return;
      if(loc?.name)setText('#tierDetailTitle',loc.name);
      setText('#tierDetailKicker',s?.promoTitle||'');
      setText('#tierDetailUntil',s?.promoUntil||'');
      const badge=$('#tierDetailBadge');
      if(badge&&loc){
        badge.textContent=loc.badge||'';
        badge.hidden=!loc.badge;
      }
      $('#tierDetailPriceWrap')?.removeAttribute('hidden');
      const old=$('#tierDetailOldPrice'); if(old)old.textContent=money(offer.oldPrice);
      const price=$('#tierDetailPrice'); if(price)price.textContent=money(offer.price);
      if(loc?.features)buildList($('#tierDetailFeatures'),loc.features);
      if(s?.tierSelect)setText('#tierDetailSelect',s.tierSelect);
    }else{
      const offer=weddingById(state.panel.id);
      const loc=offerLocale(offer);
      if(!offer)return;
      if(loc?.name)setText('#tierDetailTitle',loc.name);
      if(loc?.description)setText('#tierDetailDescription',loc.description);
      setText('#tierDetailKicker',s?.weddingTitle||'');
      setText('#tierDetailStep',s?.weddingPanelLabel||'');
      $('#tierDetailPriceWrap')?.removeAttribute('hidden');
      $('#tierDetailUntil')?.removeAttribute('hidden');
      const old=$('#tierDetailOldPrice'); if(old)old.textContent=money(offer.oldPrice);
      const price=$('#tierDetailPrice'); if(price)price.textContent=money(offer.price);
      setText('#tierDetailUntil',s?.promoUntil||'');
      if(s?.whatIncluded)setText('.tier-detail-info-block h3',s.whatIncluded);
      const headings=document.querySelectorAll('.tier-detail-info-block h3');
      if(headings[1]&&s?.idealFor)headings[1].textContent=s.idealFor;
      if(loc?.includes)buildList($('#tierDetailWeddingIncludes'),loc.includes);
      if(loc?.ideal)setText('#tierDetailWeddingIdeal',loc.ideal);
      if(loc?.button)setText('#tierDetailSelect',loc.button);
    }
  }

  function selectedOffer(){
    if(!state.selected)return null;
    return state.selected.type==='tier'
      ? tierByIndex(state.selected.index)
      : weddingById(state.selected.id);
  }

  function urgent(){
    return Boolean($('#fieldUrgent')?.checked);
  }

  function totalFor(offer){
    return (Number(offer?.price)||0)+(urgent()?Number(config.urgentFee||0):0);
  }

  function patchOrderSummary(){
    const offer=selectedOffer();
    if(!offer)return;
    const loc=offerLocale(offer);
    if(loc?.name){
      const tier=$('#sumTier');
      if(tier)tier.textContent=state.selected.type==='tier'
        ? `${loc.name} (${money(offer.price)})`
        : loc.name;
    }
    const total=$('#sumTotal');
    if(total)total.textContent=money(totalFor(offer));
    patchWeddingSelect();
  }

  function patchPreview(){
    const offer=selectedOffer();
    const preview=$('#previewText');
    if(!offer||!preview)return;
    const loc=offerLocale(offer);
    const lines=preview.textContent.split('\n');
    const total=money(totalFor(offer));

    if(state.selected.type==='tier'){
      if(lines.length>2&&loc?.name){
        const colon=lines[2].indexOf(':');
        if(colon>=0)lines[2]=lines[2].slice(0,colon+1)+' '+loc.name+' ('+money(offer.price)+')';
      }
    }else{
      const known=['First Dance','Love Story','Wedding Collection'];
      let index=lines.findIndex(line=>known.some(name=>line.includes(name)));
      if(index<0)index=3;
      if(lines[index]&&loc?.name){
        const colon=lines[index].indexOf(':');
        if(colon>=0)lines[index]=lines[index].slice(0,colon+1)+' '+loc.name;
      }
      const totalLabel=$('#sumTotal')?.parentElement?.querySelector('span')?.textContent?.trim()||'Итого:';
      if(!lines.some(line=>line.startsWith(totalLabel.replace(/\s+$/,'')))){
        lines.splice(index+1,0,`${totalLabel} ${total}`);
      }
    }

    const urgentFee=money(config.urgentFee||0);
    for(let i=0;i<lines.length;i++){
      if(/\(\+\$\d+(?:\.\d+)?\)/.test(lines[i])&&urgent())lines[i]=lines[i].replace(/\(\+\$\d+(?:\.\d+)?\)/,`(+${urgentFee})`);
    }

    const totalIndex=lines.findIndex((line,index)=>index>2&&/\$\d+/.test(line)&&!/\(\+\$/.test(line)&&line!==lines[2]);
    if(totalIndex>=0&&state.selected.type==='tier'){
      const colon=lines[totalIndex].indexOf(':');
      if(colon>=0)lines[totalIndex]=lines[totalIndex].slice(0,colon+1)+' '+total;
    }

    preview.textContent=lines.join('\n');
  }

  function captureOffer(event){
    const tier=event.target.closest?.('#tiersGrid .tier-card');
    if(tier)state.panel={type:'tier',index:Number(tier.dataset.tierIndex)};
    const wedding=event.target.closest?.('#weddingPackagesGrid .wedding-offer-card');
    if(wedding)state.panel={type:'wedding',id:wedding.dataset.weddingPackage};
  }

  function schedule(){
    if(state.scheduled)return;
    state.scheduled=true;
    requestAnimationFrame(()=>{
      state.scheduled=false;
      patchPageCopy();
      patchTierCards();
      patchWeddingCards();
      patchPanel();
      patchOrderSummary();
    });
  }

  document.addEventListener('click',captureOffer,true);

  $('#tierDetailSelect')?.addEventListener('click',()=>{
    if(!state.panel)return;
    state.selected=state.panel.type==='tier'
      ? {type:'tier',index:state.panel.index}
      : {type:'wedding',id:state.panel.id};
    patchOrderSummary();
  });

  $('#fieldUrgent')?.addEventListener('change',patchOrderSummary);

  $('#fieldWeddingPackage')?.addEventListener('change',event=>{
    if(weddingById(event.target.value)){
      state.selected={type:'wedding',id:event.target.value};
      patchOrderSummary();
    }
  });

  // Registered after the core listener and before Orders CRM.
  // Core builds the preview first; CMS then corrects package/price; CRM stores it last.
  $('#btnGenerate')?.addEventListener('click',()=>{
    patchOrderSummary();
    patchPreview();
  });

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang','class','hidden']});

  window.__tuneWrapPricing={
    config,
    refresh:schedule,
    getSelected:()=>state.selected,
    getSelectedOffer:selectedOffer,
    getTotal:()=>totalFor(selectedOffer())
  };

  schedule();
})();
