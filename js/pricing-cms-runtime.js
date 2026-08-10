// TuneWrap Stage 12.2.1 — Pricing CMS runtime hotfix.
(function(){
  'use strict';
  const config=window.TUNEWRAP_PRICING_CMS;
  if(!config)return;

  const TIER_INDEX={simple:0,advanced:1,hit:2};
  const state={panel:null,selected:null,scheduled:false};
  const $=s=>document.querySelector(s);

  function lang(){
    const v=(document.documentElement.lang||'ru').toLowerCase();
    if(v.startsWith('uk'))return 'uk';
    if(v.startsWith('ka'))return 'ka';
    if(v.startsWith('en'))return 'en';
    if(v.startsWith('de'))return 'de';
    return 'ru';
  }
  const locale=map=>map?.[lang()]||null;
  const settings=()=>locale(config.settings?.locales);
  const money=v=>`$${Number(v)||0}`;
  function tierByIndex(index){
    const id=Object.keys(TIER_INDEX).find(k=>TIER_INDEX[k]===Number(index));
    return config.tiers?.find(x=>x.id===id)||null;
  }
  const weddingById=id=>config.weddings?.find(x=>x.id===id)||null;
  const offerLocale=offer=>locale(offer?.locales);

  function setTextNode(node,value){
    if(!node||typeof value!=='string'||!value.trim()||node.textContent===value)return;
    node.textContent=value;
  }
  const setText=(sel,value)=>setTextNode($(sel),value);
  function setHidden(node,value){
    if(node&&node.hidden!==Boolean(value))node.hidden=Boolean(value);
  }

  function patchOpenLabel(open,value){
    if(!open||!value)return;
    const current=Array.from(open.childNodes)
      .filter(n=>n.nodeType===Node.TEXT_NODE)
      .map(n=>n.textContent).join('').trim();
    if(current===value)return;
    const svg=open.querySelector('svg');
    open.replaceChildren(document.createTextNode(value));
    if(svg)open.appendChild(svg);
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
    if(urgent&&s.urgentLabel)setTextNode(urgent,s.urgentLabel.replace('${fee}',money(config.urgentFee)));
  }

  function reorderIfNeeded(grid,cards,getOrder){
    if(!grid||cards.length<2)return;
    const sorted=[...cards].sort((a,b)=>(getOrder(a)||99)-(getOrder(b)||99));
    const current=Array.from(grid.children).filter(n=>cards.includes(n));
    const same=sorted.length===current.length&&sorted.every((n,i)=>n===current[i]);
    if(!same)sorted.forEach(card=>grid.appendChild(card));
  }

  function patchTierCards(){
    const cards=Array.from(document.querySelectorAll('#tiersGrid .tier-card'));
    cards.forEach(card=>{
      const offer=tierByIndex(card.dataset.tierIndex);
      if(!offer)return;
      const loc=offerLocale(offer);
      setHidden(card,offer.enabled===false);
      if(loc?.name)setTextNode(card.querySelector('.tier-name'),loc.name);
      setTextNode(card.querySelector('.tier-price s'),money(offer.oldPrice));
      setTextNode(card.querySelector('.tier-price strong'),money(offer.price));
      patchOpenLabel(card.querySelector('.tier-card-open'),settings()?.detailsLabel);
    });
    reorderIfNeeded($('#tiersGrid'),cards,card=>tierByIndex(card.dataset.tierIndex)?.order);
  }

  function patchWeddingCards(){
    const cards=Array.from(document.querySelectorAll('#weddingPackagesGrid .wedding-offer-card'));
    cards.forEach(card=>{
      const offer=weddingById(card.dataset.weddingPackage);
      if(!offer)return;
      const loc=offerLocale(offer);
      setHidden(card,offer.enabled===false);
      if(loc?.name)setTextNode(card.querySelector('.tier-name'),loc.name);
      setTextNode(card.querySelector('.tier-price s'),money(offer.oldPrice));
      setTextNode(card.querySelector('.tier-price strong'),money(offer.price));
      patchOpenLabel(card.querySelector('.tier-card-open'),settings()?.detailsLabel);
    });
    reorderIfNeeded($('#weddingPackagesGrid'),cards,card=>weddingById(card.dataset.weddingPackage)?.order);
    patchWeddingSelect();
  }

  function patchWeddingSelect(){
    const select=$('#fieldWeddingPackage');
    if(!select)return;
    Array.from(select.options).forEach(option=>{
      const offer=weddingById(option.value), loc=offerLocale(offer);
      if(offer&&loc?.name)setTextNode(option,loc.name);
    });
  }

  function buildList(node,items){
    if(!node||!Array.isArray(items))return;
    const current=Array.from(node.children).map(li=>li.textContent).join('\n');
    const next=items.join('\n');
    if(current===next)return;
    const frag=document.createDocumentFragment();
    items.forEach(text=>{const li=document.createElement('li');li.textContent=text;frag.appendChild(li);});
    node.replaceChildren(frag);
  }

  function patchPanel(){
    const panel=$('#tierDetailPanel');
    if(!panel?.classList.contains('is-open')||!state.panel)return;
    const s=settings();

    if(state.panel.type==='tier'){
      const offer=tierByIndex(state.panel.index), loc=offerLocale(offer);
      if(!offer)return;
      if(loc?.name)setText('#tierDetailTitle',loc.name);
      setText('#tierDetailKicker',s?.promoTitle||'');
      setText('#tierDetailUntil',s?.promoUntil||'');
      const badge=$('#tierDetailBadge');
      if(badge&&loc){setTextNode(badge,loc.badge||' ');setHidden(badge,!loc.badge);}
      $('#tierDetailPriceWrap')?.removeAttribute('hidden');
      setText('#tierDetailOldPrice',money(offer.oldPrice));
      setText('#tierDetailPrice',money(offer.price));
      if(loc?.features)buildList($('#tierDetailFeatures'),loc.features);
      if(s?.tierSelect)setText('#tierDetailSelect',s.tierSelect);
      return;
    }

    const offer=weddingById(state.panel.id), loc=offerLocale(offer);
    if(!offer)return;
    if(loc?.name)setText('#tierDetailTitle',loc.name);
    if(loc?.description)setText('#tierDetailDescription',loc.description);
    setText('#tierDetailKicker',s?.weddingTitle||'');
    setText('#tierDetailStep',s?.weddingPanelLabel||'');
    $('#tierDetailPriceWrap')?.removeAttribute('hidden');
    $('#tierDetailUntil')?.removeAttribute('hidden');
    setText('#tierDetailOldPrice',money(offer.oldPrice));
    setText('#tierDetailPrice',money(offer.price));
    setText('#tierDetailUntil',s?.promoUntil||'');
    const heads=document.querySelectorAll('.tier-detail-info-block h3');
    if(heads[0]&&s?.whatIncluded)setTextNode(heads[0],s.whatIncluded);
    if(heads[1]&&s?.idealFor)setTextNode(heads[1],s.idealFor);
    if(loc?.includes)buildList($('#tierDetailWeddingIncludes'),loc.includes);
    if(loc?.ideal)setText('#tierDetailWeddingIdeal',loc.ideal);
    if(loc?.button)setText('#tierDetailSelect',loc.button);
  }

  function selectedOffer(){
    if(!state.selected)return null;
    return state.selected.type==='tier'?tierByIndex(state.selected.index):weddingById(state.selected.id);
  }
  const urgent=()=>Boolean($('#fieldUrgent')?.checked);
  const totalFor=offer=>(Number(offer?.price)||0)+(urgent()?Number(config.urgentFee||0):0);

  function patchOrderSummary(){
    const offer=selectedOffer();
    if(!offer)return;
    const loc=offerLocale(offer);
    if(loc?.name){
      const value=`${loc.name} (${money(offer.price)})`;
      setTextNode($('#sumTier'),value);
    }
    setText('#sumTotal',money(totalFor(offer)));
    patchWeddingSelect();
  }

  function patchPreview(){
    const offer=selectedOffer(), preview=$('#previewText');
    if(!offer||!preview)return;
    const loc=offerLocale(offer), lines=preview.textContent.split('\n'), total=money(totalFor(offer));
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
      if(!lines.some(line=>line.startsWith(totalLabel.replace(/\s+$/,''))))lines.splice(index+1,0,`${totalLabel} ${total}`);
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
    const value=lines.join('\n');
    if(preview.textContent!==value)preview.textContent=value;
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

  function captureOffer(event){
    const tier=event.target.closest?.('#tiersGrid .tier-card');
    if(tier){
      state.panel={type:'tier',index:Number(tier.dataset.tierIndex)};
      requestAnimationFrame(patchPanel);
      return;
    }
    const wedding=event.target.closest?.('#weddingPackagesGrid .wedding-offer-card');
    if(wedding){
      state.panel={type:'wedding',id:wedding.dataset.weddingPackage};
      requestAnimationFrame(patchPanel);
    }
  }

  document.addEventListener('click',captureOffer,true);
  $('#tierDetailSelect')?.addEventListener('click',()=>{
    if(!state.panel)return;
    state.selected=state.panel.type==='tier'?{type:'tier',index:state.panel.index}:{type:'wedding',id:state.panel.id};
    patchOrderSummary();
  });
  $('#fieldUrgent')?.addEventListener('change',patchOrderSummary);
  $('#fieldWeddingPackage')?.addEventListener('change',event=>{
    if(weddingById(event.target.value)){state.selected={type:'wedding',id:event.target.value};patchOrderSummary();}
  });
  $('#btnGenerate')?.addEventListener('click',()=>{patchOrderSummary();patchPreview();});

  // No global MutationObserver: the core owns opening/closing.
  document.addEventListener('tunewrap:languagechange',()=>setTimeout(schedule,0));
  document.addEventListener('DOMContentLoaded',schedule);
  window.addEventListener('pageshow',schedule);
  schedule();

  window.__tuneWrapPricing={
    config,
    refresh:schedule,
    getSelected:()=>state.selected,
    getSelectedOffer:selectedOffer,
    getTotal:()=>totalFor(selectedOffer()),
    selectTier:index=>{
      const numeric=Number(index);
      const offer=tierByIndex(numeric);
      if(!offer || offer.enabled===false)return false;
      state.selected={type:'tier',index:numeric};
      patchOrderSummary();
      return true;
    },
    selectWedding:id=>{
      const value=String(id||'');
      const offer=weddingById(value);
      if(!offer || offer.enabled===false)return false;
      state.selected={type:'wedding',id:value};
      patchOrderSummary();
      return true;
    }
  };
})();
