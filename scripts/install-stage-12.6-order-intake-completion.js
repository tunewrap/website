#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const target=file(rel);
  if(!fs.existsSync(target))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(target,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);
  return text.replace(needle,()=>replacement);
}
function regexReplaceOnce(text,regex,replacement,label){
  if(typeof replacement==='string'&&text.includes(replacement))return text;
  const matches=[...text.matchAll(new RegExp(regex.source,regex.flags.includes('g')?regex.flags:regex.flags+'g'))];
  if(matches.length!==1)throw new Error(`${label}: expected exactly 1 target, found ${matches.length}`);
  return text.replace(regex,()=>replacement);
}

// -----------------------------------------------------------------------------
// A) APP BOOTSTRAP — load Stage 12.6 vocal runtime before Orders CRM.
// -----------------------------------------------------------------------------
let bootstrap=read('js/app-bootstrap.js');

bootstrap=replaceOnce(
  bootstrap,
  "if(!document.getElementById('tunewrapSiteCmsStyles')){",
  `if(!document.getElementById('tunewrapOrderCompletionStyles')){
  const orderCompletionStyles=document.createElement('link');
  orderCompletionStyles.id='tunewrapOrderCompletionStyles';
  orderCompletionStyles.rel='stylesheet';
  orderCompletionStyles.href='/css/order-intake-completion.css?v=12.6';
  document.head.append(orderCompletionStyles);
}

if(!document.getElementById('tunewrapSiteCmsStyles')){`,
  'bootstrap Stage 12.6 stylesheet'
);

bootstrap=replaceOnce(
  bootstrap,
  "  // Orders CRM is loaded after Pricing + Site CMS so it sees final price/contact state.\n  try{\n    await import('./orders-submit.js');",
  `  // Stage 12.6: vocal preference is part of the structured order payload.
  try{
    await import('./order-intake-completion.js');
  }catch(error){
    console.error('TuneWrap Stage 12.6 order completion runtime failed',error);
  }

  // Orders CRM is loaded after Pricing + Site CMS so it sees final price/contact state.
  try{
    await import('./orders-submit.js');`,
  'bootstrap Stage 12.6 runtime'
);
write('js/app-bootstrap.js',bootstrap);

// -----------------------------------------------------------------------------
// B) CORE SCRIPT — expose a safe event for selecting a wedding package.
// -----------------------------------------------------------------------------
let script=read('js/script.js');
script=replaceOnce(
  script,
  `  document.addEventListener('tunewrap:set-order-tier',event => {
    const index=Number(event.detail?.index);
    if(Number.isInteger(index) && index >= 0 && index < TIERS[currentLang].length){
      applySelectedTier(index);
    }
  });`,
  `  document.addEventListener('tunewrap:set-order-tier',event => {
    const index=Number(event.detail?.index);
    if(Number.isInteger(index) && index >= 0 && index < TIERS[currentLang].length){
      applySelectedTier(index);
    }
  });
  document.addEventListener('tunewrap:set-order-wedding',event => {
    const id=String(event.detail?.id||'');
    const index=WEDDING_PACKAGE_IDS.indexOf(id);
    if(index>=0)applySelectedWeddingPackage(index);
  });`,
  'core wedding package event'
);
write('js/script.js',script);

// -----------------------------------------------------------------------------
// C) PRICING RUNTIME — wedding selection API + name beside price everywhere.
// -----------------------------------------------------------------------------
let pricing=read('js/pricing-cms-runtime.js');

pricing=replaceOnce(
  pricing,
  "      const value=state.selected.type==='tier'?`${loc.name} (${money(offer.price)})`:loc.name;",
  "      const value=`${loc.name} (${money(offer.price)})`;",
  'pricing wedding summary name + price'
);

pricing=replaceOnce(
  pricing,
  `    selectTier:index=>{
      const numeric=Number(index);
      const offer=tierByIndex(numeric);
      if(!offer || offer.enabled===false)return false;
      state.selected={type:'tier',index:numeric};
      patchOrderSummary();
      return true;
    }
  };`,
  `    selectTier:index=>{
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
  };`,
  'pricing selectWedding API'
);
write('js/pricing-cms-runtime.js',pricing);

// -----------------------------------------------------------------------------
// D) UX CRITICAL — one package selector containing all six offers + vocal required.
// -----------------------------------------------------------------------------
let ux=read('js/ux-critical-fixes.js');

// Add vocal error copy in all 5 languages.
const vocalErrorPatches=[
  ["        instrument:'Выберите инструменты/звучание или «На усмотрение TuneWrap».',\n        name:",
   "        instrument:'Выберите инструменты/звучание или «На усмотрение TuneWrap».',\n        vocal:'Выберите, кто должен петь.',\n        name:"],
  ["        instrument:'Оберіть інструменти/звучання або «На розсуд TuneWrap».',\n        name:",
   "        instrument:'Оберіть інструменти/звучання або «На розсуд TuneWrap».',\n        vocal:'Оберіть, хто має співати.',\n        name:"],
  ["        instrument:'აირჩიეთ ინსტრუმენტები/ჟღერადობა ან „TuneWrap-ის არჩევანი“.',\n        name:",
   "        instrument:'აირჩიეთ ინსტრუმენტები/ჟღერადობა ან „TuneWrap-ის არჩევანი“.',\n        vocal:'აირჩიეთ, ვინ უნდა იმღეროს.',\n        name:"],
  ["        instrument:'Choose instruments/sound or “TuneWrap choice”.',\n        name:",
   "        instrument:'Choose instruments/sound or “TuneWrap choice”.',\n        vocal:'Choose who should sing.',\n        name:"],
  ["        instrument:'Bitte Instrumente/Klang oder „TuneWrap-Auswahl“ wählen.',\n        name:",
   "        instrument:'Bitte Instrumente/Klang oder „TuneWrap-Auswahl“ wählen.',\n        vocal:'Bitte auswählen, wer singen soll.',\n        name:"]
];
for(const [needle,replacement] of vocalErrorPatches){
  ux=replaceOnce(ux,needle,replacement,'UX vocal validation copy');
}

// Enabled wedding packages + unified package helpers.
ux=replaceOnce(
  ux,
  `  function enabledTiers(){
    const list=pricing()?.config?.tiers;
    return (Array.isArray(list)?list:[])
      .filter(offer=>offer&&offer.enabled!==false&&tierIndex(offer)>=0)
      .sort((a,b)=>(a.order||99)-(b.order||99));
  }

  function selectedTierIndex(){`,
  `  function enabledTiers(){
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

  function selectedTierIndex(){`,
  'UX unified package helpers'
);

// Replace select change handler.
ux=regexReplaceOnce(
  ux,
  /    select\.addEventListener\('change',\(\)=>\{[\s\S]*?      window\.setTimeout\(syncRegularPackageField,0\);\n    \}\);/,
  `    select.addEventListener('change',()=>{
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
    });`,
  'UX unified package change'
);

// Replace complete syncRegularPackageField function.
ux=regexReplaceOnce(
  ux,
  /  function syncRegularPackageField\(\)\{[\s\S]*?\n  \}\n\n  function requiredTargets\(\)\{/,
  `  function syncRegularPackageField(){
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

  function requiredTargets(){`,
  'UX sync unified package field'
);

// Vocal required target.
ux=replaceOnce(
  ux,
  "      instrument:$('#instrumentChips')?.closest('.field-group'),\n      name:",
  "      instrument:$('#instrumentChips')?.closest('.field-group'),\n      vocal:$('#orderVocalField'),\n      name:",
  'UX vocal target'
);

ux=replaceOnce(
  ux,
  "    ['style','instrument','name','occasion','story','description','contact'].forEach(key=>{",
  "    ['style','instrument','vocal','name','occasion','story','description','contact'].forEach(key=>{",
  'UX vocal required marker'
);

ux=replaceOnce(
  ux,
  "    $('#instrumentChips')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');\n    $('#fieldName')",
  "    $('#instrumentChips')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');\n    $('#orderVocalField')?.querySelector('.field-label')?.classList.add('ux-required-label');\n    $('#fieldName')",
  'UX vocal required label'
);

// Any pricing selection counts as package selected, including wedding.
ux=regexReplaceOnce(
  ux,
  /  function packageSelected\(\)\{\n    return weddingSelected\(\)\|\|selectedTierIndex\(\)!==null;\n  \}/,
  `  function packageSelected(){
    return Boolean(pricing()?.getSelected?.())||weddingSelected()||selectedTierIndex()!==null;
  }`,
  'UX package selected all 6'
);

// Vocal validation inside non-certificate block.
ux=replaceOnce(
  ux,
  "      if($('#instrumentChips')&&instrumentCount()<1)errors.push([groups.instrument,c.errors.instrument]);\n      if(!text('fieldOccasion'))",
  "      if($('#instrumentChips')&&instrumentCount()<1)errors.push([groups.instrument,c.errors.instrument]);\n      if($('#orderVocalField')&&!window.__tuneWrapOrderCompletion?.hasVocalChoice?.())errors.push([groups.vocal,c.errors.vocal]);\n      if(!text('fieldOccasion'))",
  'UX vocal validation rule'
);
write('js/ux-critical-fixes.js',ux);

// -----------------------------------------------------------------------------
// E) ORDERS SUBMIT — vocal + correct wedding package from unified selector.
// -----------------------------------------------------------------------------
let submit=read('js/orders-submit.js');

// Helpers before collect.
submit=replaceOnce(
  submit,
  "function parsePrice(){\n  const raw=content('sumTotal');",
  `function selectedPricing(){
  const api=window.__tuneWrapPricing;
  return {
    selected:api?.getSelected?.()||null,
    offer:api?.getSelectedOffer?.()||null
  };
}

function localizedPricingName(offer){
  const locales=offer?.locales||{};
  return locales[lang()]?.name||locales.ru?.name||offer?.id||'';
}

function parsePrice(){
  const raw=content('sumTotal');`,
  'orders submit pricing helpers'
);

// Replace beginning of collect through wedding declaration.
submit=replaceOnce(
  submit,
  `  const mode=activeMode();
  const weddingField=document.getElementById('weddingPackageField');
  const wedding=visible(weddingField);
  const orderType=wedding?'wedding':mode==='certificate'?'certificate':'order';
  const weddingSelect=document.getElementById('fieldWeddingPackage');`,
  `  const mode=activeMode();
  const weddingField=document.getElementById('weddingPackageField');
  const weddingSelect=document.getElementById('fieldWeddingPackage');
  const pricingState=selectedPricing();
  const weddingFromPricing=mode!=='certificate'&&pricingState.selected?.type==='wedding';
  const wedding=mode!=='certificate'&&(weddingFromPricing||visible(weddingField));
  const orderType=wedding?'wedding':mode==='certificate'?'certificate':'order';
  const vocalChoice=window.__tuneWrapOrderCompletion?.getVocalChoice?.()||'';
  const vocalLabel=window.__tuneWrapOrderCompletion?.getVocalLabel?.()||'';
  const vocalPrompt=window.__tuneWrapOrderCompletion?.getVocalPrompt?.()||'';`,
  'orders submit unified wedding selection'
);

submit=replaceOnce(
  submit,
  `    tierLabel:content('sumTier'),
    weddingPackageId:wedding?weddingSelect?.value||'':'',
    weddingPackageLabel:wedding?weddingSelect?.selectedOptions?.[0]?.textContent?.trim()||'':'',
    styles:`,
  `    tierLabel:content('sumTier'),
    weddingPackageId:wedding?(weddingFromPricing?pricingState.selected.id:weddingSelect?.value||''):'',
    weddingPackageLabel:wedding?(weddingFromPricing?localizedPricingName(pricingState.offer):weddingSelect?.selectedOptions?.[0]?.textContent?.trim()||''):'',
    styles:`,
  'orders submit wedding id/label'
);

submit=replaceOnce(
  submit,
  `    instruments:window.__tuneWrapSoundPreferences?.getSelectedInstrumentLabels?.()||[],
    soundPrompt:window.__tuneWrapSoundPreferences?.getSoundPrompt?.()||'',
    urgent:`,
  `    instruments:window.__tuneWrapSoundPreferences?.getSelectedInstrumentLabels?.()||[],
    vocalChoice,
    soundPrompt:[
      window.__tuneWrapSoundPreferences?.getSoundPrompt?.()||'',
      vocalPrompt
    ].filter(Boolean).join('; '),
    urgent:`,
  'orders submit vocal payload'
);

submit=replaceOnce(
  submit,
  `    rawMessage:content('previewText'),`,
  `    rawMessage:[
      content('previewText'),
      vocalLabel?(COPY[lang()]?.vocalLabel||'Vocal')+': '+vocalLabel:''
    ].filter(Boolean).join('\\n'),`,
  'orders submit raw vocal line'
);

// Add vocalLabel copy key in all locales by patching saving key.
const submitCopyPatches=[
  ["ru:{\n    saving:", "ru:{\n    vocalLabel:'Вокал',\n    saving:"],
  ["uk:{\n    saving:", "uk:{\n    vocalLabel:'Вокал',\n    saving:"],
  ["ka:{\n    saving:", "ka:{\n    vocalLabel:'ვოკალი',\n    saving:"],
  ["en:{\n    saving:", "en:{\n    vocalLabel:'Vocal',\n    saving:"],
  ["de:{\n    saving:", "de:{\n    vocalLabel:'Gesang',\n    saving:"]
];
for(const [needle,replacement] of submitCopyPatches){
  submit=replaceOnce(submit,needle,replacement,'orders submit vocal copy');
}
write('js/orders-submit.js',submit);

// -----------------------------------------------------------------------------
// F) ORDERS SERVER — persist vocal + cached RU translation.
// -----------------------------------------------------------------------------
let orders=read('functions/_shared/orders.js');

orders=replaceOnce(
  orders,
  "export const ORDER_LANGUAGES=Object.freeze(['ru','uk','ka','en','de']);",
  "export const ORDER_LANGUAGES=Object.freeze(['ru','uk','ka','en','de']);\nexport const ORDER_VOCALS=Object.freeze(['male','female','duet','any']);",
  'orders vocal enum'
);

orders=replaceOnce(
  orders,
  `function goldenAnswers(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,12).map(item=>({
    question:clean(item?.question,320),
    answer:clean(item?.answer,3200)
  })).filter(item=>item.question&&item.answer);
}`,
  `function goldenAnswers(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,12).map(item=>({
    question:clean(item?.question,320),
    answer:clean(item?.answer,3200)
  })).filter(item=>item.question&&item.answer);
}

function cleanTranslationRu(value){
  if(!value||typeof value!=='object')return null;
  return {
    occasion:clean(value.occasion,1200),
    occasionDetail:clean(value.occasionDetail,2400),
    storyCore:clean(value.storyCore,12000),
    description:clean(value.description,30000),
    goldenAnswers:goldenAnswers(value.goldenAnswers)
  };
}`,
  'orders translation sanitizer'
);

orders=replaceOnce(
  orders,
  "    soundPrompt:row.sound_prompt||'',\n    urgent:",
  "    soundPrompt:row.sound_prompt||'',\n    vocalChoice:row.vocal_choice||'',\n    translationRu:parseJson(row.translation_ru_json,null),\n    translationRuAt:row.translation_ru_at||'',\n    urgent:",
  'orders row vocal/translation'
);

orders=replaceOnce(
  orders,
  "    soundPrompt:clean(input?.soundPrompt,12000,{label:'Sound prompt'}),\n    urgent:",
  `    soundPrompt:clean(input?.soundPrompt,12000,{label:'Sound prompt'}),
    vocalChoice:(()=>{
      const value=clean(input?.vocalChoice,40);
      if((orderType==='order'||orderType==='wedding')&&!ORDER_VOCALS.includes(value)){
        throw new HttpError(422,'Выберите вокал');
      }
      return ORDER_VOCALS.includes(value)?value:'';
    })(),
    urgent:`,
  'orders normalize vocal'
);

orders=orders.replace("    schemaVersion:2\n  };","    schemaVersion:3\n  };");

orders=replaceOnce(
  orders,
  "      tier_label,wedding_package_id,wedding_package_label,styles_json,instruments_json,sound_prompt,urgent,\n      quoted_price",
  "      tier_label,wedding_package_id,wedding_package_label,styles_json,instruments_json,sound_prompt,vocal_choice,urgent,\n      quoted_price",
  'orders insert vocal column'
);

orders=replaceOnce(
  orders,
  "    order.tierLabel,order.weddingPackageId,order.weddingPackageLabel,JSON.stringify(order.styles),JSON.stringify(order.instruments),order.soundPrompt,order.urgent?1:0,\n    order.quotedPrice",
  "    order.tierLabel,order.weddingPackageId,order.weddingPackageLabel,JSON.stringify(order.styles),JSON.stringify(order.instruments),order.soundPrompt,order.vocalChoice,order.urgent?1:0,\n    order.quotedPrice",
  'orders insert vocal bind'
);

// Recalculate INSERT placeholders from column count robustly.
orders=orders.replace(
  /\) VALUES \([\?,]+\)\n  `\)\.bind\(/,
  match=>match
);
const insertMatch=orders.match(/INSERT INTO orders \(([\s\S]*?)\)\s*VALUES \(([\?,\s]+)\)/);
if(!insertMatch)throw new Error('orders INSERT block not found after vocal patch');
const insertColumns=insertMatch[1].split(',').map(v=>v.trim()).filter(Boolean);
const values=Array(insertColumns.length).fill('?').join(',');
orders=orders.replace(insertMatch[0],`INSERT INTO orders (${insertMatch[1]}) VALUES (${values})`);

// Translation cache in Admin PATCH.
orders=replaceOnce(
  orders,
  `  const internalNotes=input?.internalNotes===undefined
    ? current.internalNotes
    : clean(input.internalNotes,16000,{label:'Внутренние заметки'});

  const now=new Date().toISOString();
  await db.prepare(\`
    UPDATE orders
    SET status=?,internal_notes=?,updated_at=?,last_edited_by=?
    WHERE id=?
  \`).bind(status,internalNotes,now,editor,id).run();`,
  `  const internalNotes=input?.internalNotes===undefined
    ? current.internalNotes
    : clean(input.internalNotes,16000,{label:'Внутренние заметки'});

  const translationRu=input?.translationRu===undefined
    ? current.translationRu
    : cleanTranslationRu(input.translationRu);
  const translationChanged=input?.translationRu!==undefined;
  const now=new Date().toISOString();
  const translationRuAt=translationChanged?now:(current.translationRuAt||'');

  await db.prepare(\`
    UPDATE orders
    SET status=?,internal_notes=?,translation_ru_json=?,translation_ru_at=?,updated_at=?,last_edited_by=?
    WHERE id=?
  \`).bind(
    status,
    internalNotes,
    translationRu?JSON.stringify(translationRu):'',
    translationRuAt,
    now,
    editor,
    id
  ).run();`,
  'orders admin translation cache'
);
write('functions/_shared/orders.js',orders);

// -----------------------------------------------------------------------------
// G) ADMIN ORDERS HTML — vocal card + automatic RU translation panel.
// -----------------------------------------------------------------------------
let ordersHtml=read('admin/orders.html');

ordersHtml=replaceOnce(
  ordersHtml,
  '        <article><span>Suno-основа</span><strong id="detailSoundPrompt">—</strong></article>\n        <article><span>Стоимость</span>',
  '        <article><span>Suno-основа</span><strong id="detailSoundPrompt">—</strong></article>\n        <article><span>Вокал</span><strong id="detailVocal">—</strong></article>\n        <article><span>Стоимость</span>',
  'admin vocal card'
);

ordersHtml=replaceOnce(
  ordersHtml,
  `      <section class="form-section order-copy-section">
        <div class="section-heading"><span>01</span><div><h2>История клиента</h2><p>Исходные данные из формы TuneWrap.</p></div></div>`,
  `      <section class="form-section order-translation-section" id="orderTranslationSection" hidden>
        <div class="section-heading">
          <span>RU</span>
          <div>
            <h2>Перевод на русский</h2>
            <p id="detailTranslationStatus">Переводим заявку автоматически…</p>
          </div>
          <button class="secondary-button order-translation-retry" id="retryOrderTranslation" type="button" hidden>Повторить перевод</button>
        </div>
        <div class="story-block" id="translationOccasionBlock"><small>Событие</small><p id="translationOccasion"></p></div>
        <div class="story-block" id="translationCoreBlock"><small>Главное</small><p id="translationCore"></p></div>
        <div class="story-block" id="translationDescriptionBlock"><small>Описание</small><p id="translationDescription"></p></div>
        <div class="story-block" id="translationGoldenBlock"><small>Дополнительные ответы</small><div id="translationGolden"></div></div>
      </section>

      <section class="form-section order-copy-section">
        <div class="section-heading"><span>01</span><div><h2>История клиента</h2><p id="detailOriginalLanguageNote">Исходные данные из формы TuneWrap.</p></div></div>`,
  'admin translation panel'
);
write('admin/orders.html',ordersHtml);

// -----------------------------------------------------------------------------
// H) ADMIN ORDERS CSS — translation panel polish.
// -----------------------------------------------------------------------------
let ordersCss=read('admin/orders.css');
if(!ordersCss.includes('/* Stage 12.6 translation */')){
  ordersCss += `

/* Stage 12.6 translation */
.order-translation-section{
  border-color:rgba(217,164,65,.34)!important;
  background:linear-gradient(180deg,rgba(217,164,65,.045),rgba(255,255,255,.012));
}
.order-translation-section .section-heading{
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:start;
}
.order-translation-retry{align-self:center}
.order-translation-section.is-loading .story-block{opacity:.38}
.order-translation-section.is-error{
  border-color:rgba(218,118,99,.34)!important;
}
#detailTranslationStatus{max-width:720px}
@media(max-width:720px){
  .order-translation-section .section-heading{grid-template-columns:auto 1fr}
  .order-translation-retry{grid-column:1/-1;width:100%}
}
`;
}
write('admin/orders.css',ordersCss);

// -----------------------------------------------------------------------------
// I) ADMIN ORDERS JS — vocal labels + automatic GE/UA/EN/DE → RU translation.
// -----------------------------------------------------------------------------
let adminOrders=read('admin/orders.js');

adminOrders=replaceOnce(
  adminOrders,
  `const TYPE_LABELS={
  order:'Обычный заказ',
  certificate:'Сертификат',
  wedding:'Свадебный пакет',
  corporate:'Корпоративный'
};`,
  `const TYPE_LABELS={
  order:'Обычный заказ',
  certificate:'Сертификат',
  wedding:'Свадебный пакет',
  corporate:'Корпоративный'
};

const VOCAL_LABELS={
  male:'Мужской голос',
  female:'Женский голос',
  duet:'Мужчина + женщина',
  any:'Неважно / на усмотрение TuneWrap'
};

const TRANSLATE_SOURCE={uk:'UA',ka:'GE',en:'EN',de:'DE'};`,
  'admin vocal/translation constants'
);

adminOrders=replaceOnce(
  adminOrders,
  "    ...(order.instruments||[]),order.soundPrompt\n",
  "    ...(order.instruments||[]),order.soundPrompt,VOCAL_LABELS[order.vocalChoice]||order.vocalChoice,\n    order.translationRu?.occasion,order.translationRu?.storyCore,order.translationRu?.description\n",
  'admin search translation/vocal'
);

adminOrders=replaceOnce(
  adminOrders,
  "  $('#detailSoundPrompt').textContent=order.soundPrompt||'—';\n  $('#detailPrice')",
  "  $('#detailSoundPrompt').textContent=order.soundPrompt||'—';\n  $('#detailVocal').textContent=VOCAL_LABELS[order.vocalChoice]||order.vocalChoice||'—';\n  $('#detailPrice')",
  'admin vocal detail'
);

// Add translation helpers before openEditor.
adminOrders=replaceOnce(
  adminOrders,
  "function openEditor(order){",
  `function splitForTranslation(text,max=1800){
  const value=String(text||'').trim();
  if(!value)return [];
  if(value.length<=max)return [value];
  const parts=[];
  let rest=value;
  while(rest.length>max){
    let cut=rest.lastIndexOf('\\n',max);
    if(cut<Math.floor(max*.55))cut=rest.lastIndexOf(' ',max);
    if(cut<Math.floor(max*.55))cut=max;
    parts.push(rest.slice(0,cut).trim());
    rest=rest.slice(cut).trim();
  }
  if(rest)parts.push(rest);
  return parts.filter(Boolean);
}

function translationEntries(order){
  const entries=[];
  const add=(key,text,set)=>{
    splitForTranslation(text).forEach((chunk,index)=>{
      entries.push({id:\`\${key}:\${index}\`,text:chunk,key,index,set});
    });
  };

  add('occasion',order.occasion,value=>value);
  add('occasionDetail',order.occasionDetail,value=>value);
  add('storyCore',order.storyCore,value=>value);
  add('description',order.description,value=>value);

  (order.goldenAnswers||[]).forEach((answer,index)=>{
    add(\`gq-\${index}\`,answer.question,value=>value);
    add(\`ga-\${index}\`,answer.answer,value=>value);
  });
  return entries;
}

async function translateBatch(sourceLanguage,items){
  return api('/api/admin/translate',{
    method:'POST',
    body:{
      sourceLanguage,
      target:'ru',
      items:items.map(item=>({id:item.id,text:item.text,kind:'text'}))
    }
  });
}

function assembleTranslation(order,entries,translations){
  const grouped=new Map();
  entries.forEach(entry=>{
    if(!grouped.has(entry.key))grouped.set(entry.key,[]);
    grouped.get(entry.key).push({
      index:entry.index,
      value:String(translations[entry.id]||'').trim()
    });
  });
  const value=key=>(grouped.get(key)||[])
    .sort((a,b)=>a.index-b.index)
    .map(item=>item.value)
    .filter(Boolean)
    .join(' ');

  return {
    occasion:value('occasion'),
    occasionDetail:value('occasionDetail'),
    storyCore:value('storyCore'),
    description:value('description'),
    goldenAnswers:(order.goldenAnswers||[]).map((answer,index)=>({
      question:value(\`gq-\${index}\`)||answer.question,
      answer:value(\`ga-\${index}\`)||answer.answer
    })).filter(answer=>answer.question&&answer.answer)
  };
}

function renderTranslation(order){
  const section=$('#orderTranslationSection');
  if(!section)return;
  const language=String(order.language||'ru').toLowerCase();
  if(language==='ru'){
    section.hidden=true;
    $('#detailOriginalLanguageNote').textContent='Исходные данные из формы TuneWrap.';
    return;
  }

  section.hidden=false;
  $('#detailOriginalLanguageNote').textContent=\`Оригинал заявки · \${language.toUpperCase()}\`;

  const translation=order.translationRu;
  const hasTranslation=translation&&(
    translation.occasion||translation.storyCore||translation.description||(translation.goldenAnswers||[]).length
  );

  if(!hasTranslation){
    section.classList.add('is-loading');
    section.classList.remove('is-error');
    $('#detailTranslationStatus').textContent='Переводим заявку автоматически…';
    $('#retryOrderTranslation').hidden=true;
    ['#translationOccasionBlock','#translationCoreBlock','#translationDescriptionBlock','#translationGoldenBlock']
      .forEach(selector=>{$(selector).hidden=true;});
    return;
  }

  section.classList.remove('is-loading','is-error');
  $('#detailTranslationStatus').textContent=order.translationRuAt
    ?\`Автоперевод · \${formatDate(order.translationRuAt)}\`
    :'Автоперевод на русский';
  $('#retryOrderTranslation').hidden=true;

  const occasion=[translation.occasion,translation.occasionDetail].filter(Boolean).join(' · ');
  setStoryBlock('#translationOccasionBlock',occasion);
  setStoryBlock('#translationCoreBlock',translation.storyCore);
  setStoryBlock('#translationDescriptionBlock',translation.description);

  const golden=$('#translationGolden');
  golden.replaceChildren();
  (translation.goldenAnswers||[]).forEach(answer=>{
    const item=el('div','golden-answer');
    item.append(el('strong','',answer.question),el('p','',answer.answer));
    golden.append(item);
  });
  $('#translationGoldenBlock').hidden=!golden.children.length;
}

async function ensureRussianTranslation(order,{force=false}={}){
  const language=String(order.language||'ru').toLowerCase();
  const sourceLanguage=TRANSLATE_SOURCE[language];
  if(!sourceLanguage||language==='ru')return;

  if(order.translationRu&&!force){
    renderTranslation(order);
    return;
  }

  renderTranslation({...order,translationRu:null});
  const section=$('#orderTranslationSection');
  try{
    const entries=translationEntries(order);
    if(!entries.length){
      section?.classList.remove('is-loading','is-error');
      $('#detailTranslationStatus').textContent='В заявке нет текстовых полей для перевода.';
      $('#retryOrderTranslation').hidden=true;
      return;
    }
    const translations={};
    for(let offset=0;offset<entries.length;offset+=8){
      const chunk=entries.slice(offset,offset+8);
      const result=await translateBatch(sourceLanguage,chunk);
      Object.assign(translations,result.translations||{});
    }
    const translationRu=assembleTranslation(order,entries,translations);
    const result=await api(\`/api/admin/orders/\${encodeURIComponent(order.id)}\`,{
      method:'PATCH',
      body:{translationRu}
    });

    const index=state.orders.findIndex(item=>item.id===order.id);
    if(index>=0)state.orders[index]=result.order;
    if(state.current?.id===order.id){
      state.current=result.order;
      renderTranslation(result.order);
    }
  }catch(error){
    if(state.current?.id!==order.id)return;
    section?.classList.remove('is-loading');
    section?.classList.add('is-error');
    $('#detailTranslationStatus').textContent=\`Автоперевод не выполнен: \${error.message}\`;
    $('#retryOrderTranslation').hidden=false;
  }
}

function openEditor(order){`,
  'admin translation helpers'
);

// Call render + automatic translate near end of openEditor.
adminOrders=replaceOnce(
  adminOrders,
  "  $('#orderEditor').hidden=false;\n  document.body.style.overflow='hidden';\n  $('#orderEditor').scrollTop=0;\n}",
  `  renderTranslation(order);
  void ensureRussianTranslation(order);

  $('#orderEditor').hidden=false;
  document.body.style.overflow='hidden';
  $('#orderEditor').scrollTop=0;
}`,
  'admin open automatic translation'
);

adminOrders=replaceOnce(
  adminOrders,
  "    `Suno: ${order.soundPrompt||'—'}`,\n    `Событие:",
  "    `Suno: ${order.soundPrompt||'—'}`,\n    `Вокал: ${VOCAL_LABELS[order.vocalChoice]||order.vocalChoice||'—'}`,\n    `Событие:",
  'admin copy vocal'
);

// Append translated version to copied order if cached.
adminOrders=replaceOnce(
  adminOrders,
  `function orderAsText(order){
  if(order.rawMessage)return \`\${order.id}\\n\${order.rawMessage}\`;
  return [`,
  `function orderAsText(order){
  const translated=order.translationRu;
  if(order.rawMessage){
    const ru=translated?[
      '',
      '--- Перевод RU ---',
      translated.occasion,
      translated.occasionDetail,
      translated.storyCore,
      translated.description
    ].filter(Boolean).join('\\n'):'';
    return \`\${order.id}\\n\${order.rawMessage}\${ru?'\\n'+ru:''}\`;
  }
  return [`,
  'admin copy translated order'
);

// Retry button binding.
adminOrders=replaceOnce(
  adminOrders,
  "$('#copyContactButton').addEventListener('click',()=>{\n  if(state.current)copyText(state.current.contact,'Контакт скопирован');\n});",
  `$('#copyContactButton').addEventListener('click',()=>{
  if(state.current)copyText(state.current.contact,'Контакт скопирован');
});
$('#retryOrderTranslation').addEventListener('click',()=>{
  if(state.current)void ensureRussianTranslation(state.current,{force:true});
});`,
  'admin retry translation'
);
write('admin/orders.js',adminOrders);

// -----------------------------------------------------------------------------
// J) SITE CMS RUNTIME — reliable footer navigation.
// -----------------------------------------------------------------------------
let site=read('js/site-cms-runtime.js');

site=replaceOnce(
  site,
  "  function currentPreviewMessage(){",
  `  function scrollMainTo(id){
    const target=document.getElementById(id);
    if(!target)return false;
    const app=document.getElementById('appScroll');
    const behavior=window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';

    const inner=target.querySelector(':scope > .wrap');
    if(inner&&inner.scrollHeight>inner.clientHeight)inner.scrollTop=0;

    if(app&&app.scrollHeight>app.clientHeight+2){
      app.scrollTo({top:target.offsetTop,behavior});
    }else{
      target.scrollIntoView({behavior,block:'start'});
    }

    try{history.replaceState(null,'',\`#\${id}\`);}catch(error){}
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

  function currentPreviewMessage(){`,
  'site footer navigation helpers'
);

site=replaceOnce(
  site,
  "    patchTermsLink();\n    patchOrderContactLinks();",
  "    patchTermsLink();\n    installFooterNavigation();\n    patchOrderContactLinks();",
  'site footer navigation apply'
);
write('js/site-cms-runtime.js',site);

// -----------------------------------------------------------------------------
// K) PACKAGE.JSON — Stage 12.6 test in main npm test chain.
// -----------------------------------------------------------------------------
const packagePath=file('package.json');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
pkg.scripts ||= {};
pkg.scripts['intake:test']='node scripts/order-intake-completion-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('intake:test')){
  pkg.scripts.test += ' && npm run intake:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n','utf8');

console.log('PASS: Stage 12.6 Order Intake Completion installer applied.');
console.log('Added: automatic RU Admin translation, vocal choice, all 6 packages in the form, package name + price, and reliable footer navigation.');
console.log('D1 migration 0007 is required before deployment.');
