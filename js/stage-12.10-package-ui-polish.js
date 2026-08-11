// TuneWrap Stage 12.10 — Pricing / Gift / Package UX Polish.
(function(){
'use strict';

const $=selector=>document.querySelector(selector);
const TIER_INDEX=Object.freeze({simple:0,advanced:1,hit:2});
const COPY=Object.freeze({
  ru:{chooserTitle:'Выберите пакет',regular:'Песни',wedding:'Свадебные форматы',close:'Закрыть',choose:'Выбрать пакет',selected:'Выбрано'},
  uk:{chooserTitle:'Оберіть пакет',regular:'Пісні',wedding:'Весільні формати',close:'Закрити',choose:'Обрати пакет',selected:'Обрано'},
  ka:{chooserTitle:'აირჩიეთ პაკეტი',regular:'სიმღერები',wedding:'საქორწილო ფორმატები',close:'დახურვა',choose:'პაკეტის არჩევა',selected:'არჩეულია'},
  en:{chooserTitle:'Choose a package',regular:'Songs',wedding:'Wedding formats',close:'Close',choose:'Choose package',selected:'Selected'},
  de:{chooserTitle:'Paket auswählen',regular:'Songs',wedding:'Hochzeitsformate',close:'Schließen',choose:'Paket auswählen',selected:'Ausgewählt'}
});

const state={
  lastPanel:{type:'',id:'',index:null},
  chooserOpen:false,
  chooserRestoreFocus:null
};

function lang(){
  const value=(document.documentElement.lang||'ru').toLowerCase();
  if(value.startsWith('uk'))return'uk';
  if(value.startsWith('ka'))return'ka';
  if(value.startsWith('en'))return'en';
  if(value.startsWith('de'))return'de';
  return'ru';
}
function copy(){return COPY[lang()]||COPY.ru}
function config(){return window.__tuneWrapPricing?.config||window.TUNEWRAP_PRICING_CMS||null}
function localesOf(offer){return offer?.locales?.[lang()]||offer?.locales?.ru||offer?.locales?.en||{}}
function settings(){
  const cfg=config();
  return cfg?.settings?.locales?.[lang()]||cfg?.settings?.locales?.ru||cfg?.settings?.locales?.en||{};
}
function money(value){return'$'+(Number(value)||0)}
function tierIndex(offer){return Number.isInteger(TIER_INDEX[offer?.id])?TIER_INDEX[offer.id]:-1}
function enabledTiers(){
  const list=config()?.tiers;
  return (Array.isArray(list)?list:[])
    .filter(offer=>offer&&offer.enabled!==false&&tierIndex(offer)>=0)
    .sort((a,b)=>(Number(a.order)||99)-(Number(b.order)||99));
}
function enabledWeddings(){
  const list=config()?.weddings;
  return (Array.isArray(list)?list:[])
    .filter(offer=>offer&&offer.enabled!==false)
    .sort((a,b)=>(Number(a.order)||99)-(Number(b.order)||99));
}
function selectedValue(){
  const selected=window.__tuneWrapPricing?.getSelected?.();
  if(selected?.type==='tier'&&Number.isInteger(Number(selected.index)))return'tier:'+Number(selected.index);
  if(selected?.type==='wedding'&&selected.id)return'wedding:'+selected.id;
  return $('#fieldTier')?.value||'';
}
function offerByValue(value){
  const [kind,key]=String(value||'').split(':');
  if(kind==='tier'){
    const index=Number(key);
    return enabledTiers().find(offer=>tierIndex(offer)===index)||null;
  }
  if(kind==='wedding')return enabledWeddings().find(offer=>offer.id===key)||null;
  return null;
}

/* ---------------------------------------------------------
   1. Pricing detail cards
   All six packages share the same compact detail geometry.
   Existing close button is physically moved INTO the card.
   --------------------------------------------------------- */
function rememberPanelTarget(event){
  const wedding=event.target.closest?.('#weddingPackagesGrid .wedding-offer-card');
  if(wedding){
    state.lastPanel={type:'wedding',id:String(wedding.dataset.weddingPackage||''),index:null};
    return;
  }
  const tier=event.target.closest?.('#tiersGrid .tier-card');
  if(tier){
    state.lastPanel={type:'tier',id:'',index:Number(tier.dataset.tierIndex)};
  }
}

function moveTierCloseIntoCard(){
  const panel=$('#tierDetailPanel');
  const card=panel?.querySelector('.tier-detail-card');
  const close=$('#tierDetailClose');
  if(!panel||!card||!close)return;
  close.classList.add('tw-tier-card-close');
  close.setAttribute('data-close-location','card-right');
  if(close.parentElement!==card)card.insertBefore(close,card.firstChild);
}

function weddingOfferForOpenPanel(){
  const weddings=enabledWeddings();
  if(state.lastPanel.type==='wedding'&&state.lastPanel.id){
    const direct=weddings.find(offer=>offer.id===state.lastPanel.id);
    if(direct)return direct;
  }
  const title=$('#tierDetailTitle')?.textContent?.trim()||'';
  return weddings.find(offer=>{
    const local=localesOf(offer);
    return local.name===title||offer.id===title;
  })||null;
}

function replaceFeatures(items){
  const list=$('#tierDetailFeatures');
  if(!list)return;
  const fragment=document.createDocumentFragment();
  (Array.isArray(items)?items:[]).filter(Boolean).slice(0,4).forEach(text=>{
    const li=document.createElement('li');
    li.textContent=text;
    fragment.appendChild(li);
  });
  list.replaceChildren(fragment);
}

function normalizeOpenTierPanel(){
  const panel=$('#tierDetailPanel');
  if(!panel?.classList.contains('is-open'))return;

  moveTierCloseIntoCard();

  const isWedding=panel.classList.contains('is-wedding');
  panel.classList.toggle('tw-unified-package-card',true);

  if(!isWedding)return;

  const offer=weddingOfferForOpenPanel();
  if(!offer)return;
  const local=localesOf(offer);
  const s=settings();

  const visual=$('#tierDetailVisual');
  const description=$('#tierDetailDescription');
  const weddingContent=$('#tierDetailWeddingContent');
  const priceWrap=$('#tierDetailPriceWrap');
  const until=$('#tierDetailUntil');
  const features=$('#tierDetailFeatures');
  const badge=$('#tierDetailBadge');

  if(visual)visual.hidden=true;
  if(description)description.hidden=true;
  if(weddingContent)weddingContent.hidden=true;
  if(priceWrap)priceWrap.hidden=false;
  if(until)until.hidden=false;
  if(features)features.hidden=false;
  if(badge)badge.hidden=true;

  if($('#tierDetailTitle'))$('#tierDetailTitle').textContent=local.name||offer.id||'';
  if($('#tierDetailKicker'))$('#tierDetailKicker').textContent=s.weddingTitle||$('#pricing .wedding-packages-eyebrow')?.textContent?.trim()||copy().wedding;
  if($('#tierDetailOldPrice'))$('#tierDetailOldPrice').textContent=money(offer.oldPrice);
  if($('#tierDetailPrice'))$('#tierDetailPrice').textContent=money(offer.price);
  if($('#tierDetailUntil')&&s.promoUntil)$('#tierDetailUntil').textContent=s.promoUntil;
  if($('#tierDetailSelect'))$('#tierDetailSelect').textContent=local.button||((copy().choose||'')+' '+(local.name||offer.id||'')).trim();

  replaceFeatures(local.includes||local.features||[]);
  panel.dataset.twPackageKind='wedding';
}

function schedulePanelNormalize(){
  window.setTimeout(normalizeOpenTierPanel,0);
  requestAnimationFrame(()=>requestAnimationFrame(normalizeOpenTierPanel));
  window.setTimeout(normalizeOpenTierPanel,80);
}

/* ---------------------------------------------------------
   2. Custom package chooser inside the questionnaire
   Keep #fieldTier as the hidden compatibility owner.
   Existing change handler remains the only selection owner.
   --------------------------------------------------------- */
function ensureChooserOverlay(){
  let overlay=$('#twPackageChooserOverlay');
  if(overlay)return overlay;

  overlay=document.createElement('section');
  overlay.id='twPackageChooserOverlay';
  overlay.className='tw-package-chooser-overlay';
  overlay.hidden=true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('aria-labelledby','twPackageChooserTitle');

  overlay.innerHTML=`
    <button class="tw-package-chooser-backdrop" type="button" data-package-chooser-close aria-label="Close"></button>
    <div class="tw-package-chooser-shell">
      <header class="tw-package-chooser-head">
        <div>
          <span class="tw-package-chooser-kicker">TuneWrap</span>
          <h2 id="twPackageChooserTitle"></h2>
        </div>
        <button class="tw-package-chooser-close" type="button" data-package-chooser-close>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          <span data-package-chooser-close-label></span>
        </button>
      </header>
      <div class="tw-package-chooser-scroll">
        <section class="tw-package-choice-group">
          <h3 data-package-regular-title></h3>
          <div class="tw-package-choice-grid" data-package-regular-grid></div>
        </section>
        <section class="tw-package-choice-group">
          <h3 data-package-wedding-title></h3>
          <div class="tw-package-choice-grid" data-package-wedding-grid></div>
        </section>
      </div>
    </div>
  `;

  overlay.addEventListener('click',event=>{
    if(event.target.closest('[data-package-chooser-close]')){
      closeChooser();
      return;
    }
    const button=event.target.closest('button[data-package-choice]');
    if(!button)return;
    const select=$('#fieldTier');
    if(!select)return;
    const value=String(button.dataset.packageChoice||'');
    select.value=value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    window.setTimeout(()=>{
      syncPackageTrigger();
      renderChooser();
      closeChooser();
    },0);
  });

  document.body.appendChild(overlay);
  return overlay;
}

function makeChoiceButton(value,offer){
  const active=selectedValue()===value;
  const local=localesOf(offer);
  const button=document.createElement('button');
  button.type='button';
  button.className='tw-package-choice'+(active?' is-selected':'');
  button.dataset.packageChoice=value;
  button.setAttribute('aria-pressed',active?'true':'false');

  const old=Number(offer?.oldPrice)||0;
  const price=Number(offer?.price)||0;

  const main=document.createElement('span');
  main.className='tw-package-choice-main';

  const name=document.createElement('strong');
  name.textContent=local.name||offer?.id||'';
  main.appendChild(name);

  const status=document.createElement('small');
  status.textContent=active?copy().selected:copy().choose;
  main.appendChild(status);

  const priceNode=document.createElement('span');
  priceNode.className='tw-package-choice-price';
  if(old>price){
    const oldNode=document.createElement('s');
    oldNode.textContent=money(old);
    priceNode.appendChild(oldNode);
  }
  const current=document.createElement('b');
  current.textContent=money(price);
  priceNode.appendChild(current);
  const currency=document.createElement('em');
  currency.textContent='USD';
  priceNode.appendChild(currency);

  const check=document.createElement('span');
  check.className='tw-package-choice-check';
  check.setAttribute('aria-hidden','true');
  check.textContent=active?'✓':'›';

  button.append(main,priceNode,check);
  return button;
}

function renderChooser(){
  const overlay=ensureChooserOverlay();
  const x=copy();
  $('#twPackageChooserTitle').textContent=x.chooserTitle;
  overlay.querySelector('[data-package-chooser-close-label]').textContent=x.close;
  overlay.querySelector('[data-package-regular-title]').textContent=x.regular;
  overlay.querySelector('[data-package-wedding-title]').textContent=x.wedding;

  const regular=enabledTiers().map(offer=>makeChoiceButton('tier:'+tierIndex(offer),offer));
  const weddings=enabledWeddings().map(offer=>makeChoiceButton('wedding:'+offer.id,offer));
  overlay.querySelector('[data-package-regular-grid]').replaceChildren(...regular);
  overlay.querySelector('[data-package-wedding-grid]').replaceChildren(...weddings);
}

function openChooser(trigger){
  const overlay=ensureChooserOverlay();
  state.chooserRestoreFocus=trigger||document.activeElement||null;
  renderChooser();
  overlay.hidden=false;
  overlay.setAttribute('aria-hidden','false');
  overlay.classList.add('is-open');
  document.body.classList.add('tw-package-chooser-open');
  state.chooserOpen=true;
  requestAnimationFrame(()=>overlay.querySelector('.tw-package-chooser-close')?.focus({preventScroll:true}));
}

function closeChooser(){
  const overlay=$('#twPackageChooserOverlay');
  if(!overlay||!state.chooserOpen)return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden','true');
  overlay.hidden=true;
  document.body.classList.remove('tw-package-chooser-open');
  state.chooserOpen=false;
  const focus=state.chooserRestoreFocus;
  state.chooserRestoreFocus=null;
  if(focus?.focus)requestAnimationFrame(()=>focus.focus({preventScroll:true}));
}

function syncPackageTrigger(){
  const group=$('#regularPackageField');
  const select=$('#fieldTier');
  const trigger=$('#twPackageChooserTrigger');
  if(!group||!select||!trigger)return;

  const value=selectedValue();
  const offer=offerByValue(value);
  const local=localesOf(offer);

  const name=trigger.querySelector('[data-package-trigger-name]');
  const price=trigger.querySelector('[data-package-trigger-price]');
  const hint=trigger.querySelector('[data-package-trigger-hint]');

  if(offer){
    trigger.classList.add('has-selection');
    name.textContent=local.name||offer.id||copy().chooserTitle;
    price.textContent=money(offer.price)+' USD';
    hint.textContent=copy().selected;
  }else{
    trigger.classList.remove('has-selection');
    name.textContent=copy().chooserTitle;
    price.textContent='';
    hint.textContent=copy().choose;
  }
}

function ensurePackageChooserField(){
  const group=$('#regularPackageField');
  const select=$('#fieldTier');
  if(!group||!select)return false;

  select.classList.add('tw-package-native-select');
  select.setAttribute('tabindex','-1');
  select.setAttribute('aria-hidden','true');

  let trigger=$('#twPackageChooserTrigger');
  if(!trigger){
    trigger=document.createElement('button');
    trigger.id='twPackageChooserTrigger';
    trigger.type='button';
    trigger.className='tw-package-trigger';
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-controls','twPackageChooserOverlay');
    trigger.innerHTML=`
      <span class="tw-package-trigger-copy">
        <small data-package-trigger-hint></small>
        <strong data-package-trigger-name></strong>
      </span>
      <span class="tw-package-trigger-price" data-package-trigger-price></span>
      <span class="tw-package-trigger-arrow" aria-hidden="true">›</span>
    `;
    select.insertAdjacentElement('beforebegin',trigger);
    trigger.addEventListener('click',()=>openChooser(trigger));
  }

  const label=group.querySelector('label');
  if(label)label.htmlFor='twPackageChooserTrigger';

  syncPackageTrigger();
  return true;
}

function initPackageChooser(){
  if(ensurePackageChooserField())return;
  let attempts=0;
  const retry=window.setInterval(()=>{
    attempts+=1;
    if(ensurePackageChooserField()||attempts>40)window.clearInterval(retry);
  },100);
}

/* ---------------------------------------------------------
   Events / lifecycle
   --------------------------------------------------------- */
document.addEventListener('click',event=>{
  rememberPanelTarget(event);
  if(event.target.closest?.('#tiersGrid .tier-card,#weddingPackagesGrid .wedding-offer-card,#tierDetailSelect')){
    schedulePanelNormalize();
    window.setTimeout(syncPackageTrigger,80);
  }
},true);

document.addEventListener('tunewrap:set-order-tier',()=>window.setTimeout(syncPackageTrigger,0));
document.addEventListener('tunewrap:set-order-wedding',()=>window.setTimeout(syncPackageTrigger,0));
document.addEventListener('tunewrap:languagechange',()=>{
  window.setTimeout(()=>{
    syncPackageTrigger();
    if(state.chooserOpen)renderChooser();
    schedulePanelNormalize();
  },0);
});

document.addEventListener('click',event=>{
  if(event.target.closest?.('.lang-btn')){
    window.setTimeout(()=>{
      syncPackageTrigger();
      if(state.chooserOpen)renderChooser();
      schedulePanelNormalize();
    },40);
  }
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&state.chooserOpen){
    event.preventDefault();
    closeChooser();
  }
});

const panel=$('#tierDetailPanel');
if(panel&&'MutationObserver'in window){
  const observer=new MutationObserver(()=>schedulePanelNormalize());
  observer.observe(panel,{attributes:true,attributeFilter:['class','aria-hidden']});
}

function init(){
  moveTierCloseIntoCard();
  initPackageChooser();
  ensureChooserOverlay();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

})();
