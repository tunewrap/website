// TuneWrap Stage 12.8 — Gift Certificate Overlay.
(function(){
'use strict';
const pricingConfig=window.TUNEWRAP_PRICING_CMS;
const $=s=>document.querySelector(s);
const COPY={
ru:{label:'ПОДАРОЧНЫЙ СЕРТИФИКАТ',title:'Подарите личную песню',intro:'Выберите пакет сертификата. Получатель расскажет свою историю и детали песни позже.',regular:'Персональная песня',wedding:'Свадебный формат',choose:'Выбрать',selected:'Выбрано',continue:'Продолжить с сертификатом',close:'Закрыть',current:'Стоимость сертификата',checkoutTitle:'Подарочный сертификат',checkoutButton:'Сформировать сертификат',change:'Изменить пакет',noOffers:'Сейчас нет доступных пакетов.'},
uk:{label:'ПОДАРУНКОВИЙ СЕРТИФІКАТ',title:'Подаруйте особисту пісню',intro:'Оберіть пакет сертифіката. Одержувач розповість свою історію та деталі пісні пізніше.',regular:'Персональна пісня',wedding:'Весільний формат',choose:'Обрати',selected:'Обрано',continue:'Продовжити з сертифікатом',close:'Закрити',current:'Вартість сертифіката',checkoutTitle:'Подарунковий сертифікат',checkoutButton:'Сформувати сертифікат',change:'Змінити пакет',noOffers:'Зараз немає доступних пакетів.'},
ka:{label:'სასაჩუქრე სერტიფიკატი',title:'აჩუქეთ პერსონალური სიმღერა',intro:'აირჩიეთ სერტიფიკატის პაკეტი. მიმღები მოგვიანებით მოგვიყვება თავის ისტორიასა და სიმღერის დეტალებს.',regular:'პერსონალური სიმღერა',wedding:'საქორწილო ფორმატი',choose:'არჩევა',selected:'არჩეულია',continue:'გაგრძელება სერტიფიკატით',close:'დახურვა',current:'სერტიფიკატის ღირებულება',checkoutTitle:'სასაჩუქრე სერტიფიკატი',checkoutButton:'სერტიფიკატის ფორმირება',change:'პაკეტის შეცვლა',noOffers:'ამჟამად ხელმისაწვდომი პაკეტები არ არის.'},
en:{label:'GIFT CERTIFICATE',title:'Give a personal song',intro:'Choose a certificate package. The recipient can share their story and song details later.',regular:'Personal song',wedding:'Wedding format',choose:'Choose',selected:'Selected',continue:'Continue with certificate',close:'Close',current:'Certificate value',checkoutTitle:'Gift certificate',checkoutButton:'Create certificate request',change:'Change package',noOffers:'There are no available packages right now.'},
de:{label:'GESCHENKGUTSCHEIN',title:'Einen persönlichen Song verschenken',intro:'Wähle ein Gutscheinpaket. Die beschenkte Person kann ihre Geschichte und Songdetails später mitteilen.',regular:'Persönlicher Song',wedding:'Hochzeitsformat',choose:'Auswählen',selected:'Ausgewählt',continue:'Mit Gutschein fortfahren',close:'Schließen',current:'Gutscheinwert',checkoutTitle:'Geschenkgutschein',checkoutButton:'Gutschein-Anfrage erstellen',change:'Paket ändern',noOffers:'Zurzeit sind keine Pakete verfügbar.'}
};
const state={open:false,selection:null,restoreFocus:null,bypass:false};
function lang(){const v=String(window.TuneWrapLanguage?.get?.()||'en').toLowerCase();if(v.startsWith('uk'))return'uk';if(v.startsWith('ka'))return'ka';if(v.startsWith('en'))return'en';if(v.startsWith('de'))return'de';return'ru';}
function c(){return COPY[lang()]||COPY.ru}
function money(v){return`$${Number(v)||0}`}
function loc(o){return o?.offer?.locales?.[lang()]||window.__tuneWrapPricingFallback?.offer?.(lang(),o?.id)||null}
function offers(){
 if(!pricingConfig)return[];
 const tiers=(pricingConfig.tiers||[]).filter(x=>x&&x.enabled!==false).map(x=>({type:'tier',id:x.id,offer:x})).sort((a,b)=>(+a.offer.order||99)-(+b.offer.order||99));
 const weddings=(pricingConfig.weddings||[]).filter(x=>x&&x.enabled!==false).map(x=>({type:'wedding',id:x.id,offer:x})).sort((a,b)=>(+a.offer.order||99)-(+b.offer.order||99));
 return[...tiers,...weddings];
}
const key=o=>`${o.type}:${o.id}`;
function selected(){return offers().find(o=>key(o)===state.selection)||null}
function name(o){return loc(o)?.name||o?.id||''}
function desc(o){const l=loc(o)||{};return o?.type==='wedding'?(l.description||l.short||''):((l.features||[]).filter(Boolean).slice(0,2).join(' · '))}
function makeCard(o){
 const l=loc(o)||{},active=state.selection===key(o),b=document.createElement('button');
 b.type='button';b.className='gift-certificate-card'+(active?' is-selected':'');b.dataset.certificateOffer=key(o);b.setAttribute('aria-pressed',String(active));
 const old=Number(o.offer.oldPrice)||0,price=Number(o.offer.price)||0;
 b.innerHTML=`<span class="gift-certificate-card-type">${c()[o.type==='wedding'?'wedding':'regular']}</span><strong class="gift-certificate-card-name"></strong><span class="gift-certificate-card-description"></span><span class="gift-certificate-card-price">${old>price?`<s>${money(old)}</s>`:''}<b>${money(price)}</b><small>USD</small></span><span class="gift-certificate-card-action">${active?c().selected:c().choose}</span>`;
 b.querySelector('.gift-certificate-card-name').textContent=l.name||o.id;b.querySelector('.gift-certificate-card-description').textContent=desc(o);return b;
}
function ensure(){
 let el=$('#giftCertificateOverlay');if(el)return el;
 el=document.createElement('section');el.id='giftCertificateOverlay';el.className='gift-certificate-overlay';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-hidden','true');el.setAttribute('aria-labelledby','giftCertificateTitle');el.setAttribute('inert','');
 el.innerHTML=`<div class="gift-certificate-backdrop" data-certificate-close></div><div class="gift-certificate-shell"><header class="gift-certificate-topbar"><div class="gift-certificate-brand">Tune<span>Wrap</span></div><button class="gift-certificate-close" type="button" data-certificate-close><span aria-hidden="true">×</span><span data-certificate-close-label></span></button></header><div class="gift-certificate-scroll"><div class="gift-certificate-hero"><span class="gift-certificate-eyebrow" data-certificate-label></span><h2 id="giftCertificateTitle" data-certificate-title></h2><p data-certificate-intro></p></div><div class="gift-certificate-groups"><section class="gift-certificate-group" data-certificate-regular-group><div class="gift-certificate-group-title" data-certificate-regular-title></div><div class="gift-certificate-grid" data-certificate-regular></div></section><section class="gift-certificate-group" data-certificate-wedding-group><div class="gift-certificate-group-title" data-certificate-wedding-title></div><div class="gift-certificate-grid" data-certificate-wedding></div></section></div><p class="gift-certificate-empty" data-certificate-empty hidden></p></div><footer class="gift-certificate-footer"><div class="gift-certificate-selected"><small data-certificate-current-label></small><strong data-certificate-current>—</strong></div><button class="gift-certificate-continue" type="button" data-certificate-continue disabled></button></footer></div>`;
 document.body.append(el);
 el.addEventListener('click',e=>{if(e.target.closest('[data-certificate-close]'))return close();const card=e.target.closest('[data-certificate-offer]');if(card){state.selection=card.dataset.certificateOffer;render()}});
 el.querySelector('[data-certificate-continue]').addEventListener('click',proceed);render();return el;
}
function render(){
 const el=ensure(),x=c(),all=offers(),reg=all.filter(o=>o.type==='tier'),wed=all.filter(o=>o.type==='wedding');
 el.querySelector('[data-certificate-label]').textContent=x.label;el.querySelector('[data-certificate-title]').textContent=x.title;el.querySelector('[data-certificate-intro]').textContent=x.intro;el.querySelector('[data-certificate-close-label]').textContent=x.close;el.querySelector('[data-certificate-regular-title]').textContent=x.regular;el.querySelector('[data-certificate-wedding-title]').textContent=x.wedding;el.querySelector('[data-certificate-current-label]').textContent=x.current;el.querySelector('[data-certificate-continue]').textContent=x.continue;el.querySelector('[data-certificate-empty]').textContent=x.noOffers;
 el.querySelector('[data-certificate-regular]').replaceChildren(...reg.map(makeCard));el.querySelector('[data-certificate-wedding]').replaceChildren(...wed.map(makeCard));el.querySelector('[data-certificate-regular-group]').hidden=!reg.length;el.querySelector('[data-certificate-wedding-group]').hidden=!wed.length;el.querySelector('[data-certificate-empty]').hidden=all.length>0;
 const s=selected();el.querySelector('[data-certificate-current]').textContent=s?`${name(s)} · ${money(s.offer.price)}`:'—';el.querySelector('[data-certificate-continue]').disabled=!s;
}
function backgroundInert(on){[$('#appScroll'),document.querySelector('body > nav'),document.querySelector('.mobile-bottom-nav')].filter(Boolean).forEach(n=>on?n.setAttribute('inert',''):n.removeAttribute('inert'))}
function open(trigger){const el=ensure();state.restoreFocus=trigger||document.activeElement||null;state.selection=null;render();el.hidden=false;el.removeAttribute('inert');el.setAttribute('aria-hidden','false');el.classList.add('is-open');document.body.classList.add('gift-certificate-overlay-open');backgroundInert(true);state.open=true;requestAnimationFrame(()=>el.querySelector('.gift-certificate-close')?.focus({preventScroll:true}))}
function close(opts={}){const el=$('#giftCertificateOverlay');if(!el||!state.open)return;el.classList.remove('is-open');el.setAttribute('aria-hidden','true');el.setAttribute('inert','');el.hidden=true;document.body.classList.remove('gift-certificate-overlay-open');backgroundInert(false);state.open=false;if(opts.restore!==false&&state.restoreFocus?.focus)requestAnimationFrame(()=>state.restoreFocus.focus({preventScroll:true}))}
function applyOffer(o){
 if(o.type==='tier'){const map={simple:0,advanced:1,hit:2},i=map[o.id];if(!Number.isInteger(i))return false;document.dispatchEvent(new CustomEvent('tunewrap:set-order-tier',{detail:{index:i}}));window.__tuneWrapPricing?.selectTier?.(i);return true}
 document.dispatchEvent(new CustomEvent('tunewrap:set-order-wedding',{detail:{id:o.id}}));window.__tuneWrapPricing?.selectWedding?.(o.id);return true;
}
function hide(n,on=true){n?.classList.toggle('certificate-checkout-hidden',on)}
function heading(){
 let h=$('#certificateCheckoutHeading');if(h)return h;const form=$('#storyOrderForm');if(!form)return null;
 h=document.createElement('div');h.id='certificateCheckoutHeading';h.className='certificate-checkout-heading';h.innerHTML=`<div><span data-certificate-checkout-label></span><strong data-certificate-checkout-package>—</strong></div><button type="button" data-certificate-change></button>`;$('#modeHint')?.insertAdjacentElement('afterend',h);h.querySelector('[data-certificate-change]').addEventListener('click',()=>open(h.querySelector('[data-certificate-change]')));return h;
}
function checkout(){
 const form=$('#storyOrderForm');if(!form)return;const cert=document.querySelector('.mode-btn.active')?.dataset.mode==='certificate';form.classList.toggle('is-certificate-checkout',cert);
 const nodes=[$('#styleChips')?.closest('.field-group'),$('#soundInstrumentField')||$('#instrumentChips')?.closest('.field-group'),$('#orderVocalField'),$('#fieldUrgent')?.closest('.field-group'),$('#fieldTier')?.closest('.field-group'),$('#occasionGroup'),$('#otherOccasionGroup'),$('#storyCore'),$('#orderOnlyFields'),$('#weddingPackageField'),$('#sumStyle')?.closest('.order-pill'),$('#soundInstrumentSummaryPill'),$('#orderVocalSummaryPill'),$('#weddingOrderTypePill'),$('#modeSwitch')];
 nodes.forEach(n=>hide(n,cert));const h=heading();hide(h,!cert);
 if(cert){const urgent=$('#fieldUrgent');if(urgent?.checked){urgent.checked=false;urgent.dispatchEvent(new Event('change',{bubbles:true}))}const o=selected(),x=c();h.querySelector('[data-certificate-checkout-label]').textContent=x.checkoutTitle;h.querySelector('[data-certificate-checkout-package]').textContent=o?`${name(o)} · ${money(o.offer.price)}`:'—';h.querySelector('[data-certificate-change]').textContent=x.change;if($('#btnGenerate'))$('#btnGenerate').textContent=x.checkoutButton}
}
function proceed(){const o=selected();if(!o)return;applyOffer(o);close({restore:false});const b=document.querySelector('[data-story-path="certificate"]');if(!b)return;state.bypass=true;b.click();setTimeout(()=>{checkout();const contact=$('#contact'),inner=contact?.querySelector(':scope > .wrap');if(inner)inner.scrollTop=0;if(window.matchMedia('(min-width:621px)').matches)contact?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})},0)}
function rewrite(){
 const cert=document.querySelector('.mode-btn.active')?.dataset.mode==='certificate',o=selected(),p=$('#previewText');if(!cert||!o||!p)return;
 const L=lang(),headers={ru:'Подарочный сертификат TuneWrap',uk:'Подарунковий сертифікат TuneWrap',ka:'TuneWrap-ის სასაჩუქრე სერტიფიკატი',en:'TuneWrap Gift Certificate',de:'TuneWrap Geschenkgutschein'},pack={ru:'Пакет',uk:'Пакет',ka:'პაკეტი',en:'Package',de:'Paket'},val={ru:'Стоимость',uk:'Вартість',ka:'ღირებულება',en:'Value',de:'Wert'},nm={ru:'Имя',uk:"Ім'я",ka:'სახელი',en:'Name',de:'Name'},ct={ru:'Контакт',uk:'Контакт',ka:'კონტაქტი',en:'Contact',de:'Kontakt'},note={ru:'Получатель расскажет историю и детали песни позже.',uk:'Одержувач розповість історію та деталі пісні пізніше.',ka:'მიმღები მოგვიანებით მოგვიყვება ისტორიასა და სიმღერის დეტალებს.',en:'The recipient will share the story and song details later.',de:'Die beschenkte Person teilt Geschichte und Songdetails später mit.'};
 p.textContent=[headers[L], '—',`${pack[L]}: ${name(o)}`,`${val[L]}: ${money(o.offer.price)}`,`${nm[L]}: ${$('#fieldName')?.value?.trim()||'—'}`,`${ct[L]}: ${$('#fieldContact')?.value?.trim()||'—'}`,note[L]].join('\n');
}
function bind(){
 ensure();
 document.addEventListener('click',e=>{const t=e.target.closest?.('[data-story-path="certificate"]');if(!t)return;if(state.bypass){state.bypass=false;return}e.preventDefault();e.stopImmediatePropagation();open(t)},true);
 document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>setTimeout(checkout,0)));
 $('#btnGenerate')?.addEventListener('click',rewrite);
 document.addEventListener('tunewrap:languagechange',()=>{if(state.open)render();setTimeout(checkout,0)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open){e.preventDefault();close()}});
 checkout();
 window.__tuneWrapGiftCertificate={open,close,getSelection:selected};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
