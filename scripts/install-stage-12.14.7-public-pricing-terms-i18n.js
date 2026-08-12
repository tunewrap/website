#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const required=[
  'index.html','js/app-bootstrap.js','js/script.js','js/pricing-cms-runtime.js',
  'js/site-cms-runtime.js','js/stage-12.10-package-ui-polish.js',
  'js/gift-certificate-overlay.js','js/ux-critical-fixes.js','js/orders-submit.js',
  'scripts/stage-12.13.8-global-i18n-audit.js',
  'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js','package.json'
];
const sources=new Map();
for(const relative of required){
  const target=path.join(root,...relative.split('/'));
  if(!fs.existsSync(target))throw new Error(`${relative} не найден. Распакуйте ZIP прямо в корень website.`);
  sources.set(relative,fs.readFileSync(target,'utf8'));
}
if(!sources.get('admin/admin.js')&&!fs.existsSync(path.join(root,'admin','admin.js'))){
  throw new Error('admin/admin.js не найден. Запустите установщик из папки website.');
}
const admin=fs.readFileSync(path.join(root,'admin','admin.js'),'utf8');
if(!admin.includes('missingTranslationTargets(track).length')){
  throw new Error('Сначала требуется установленный Stage 12.14.6. Файлы не изменены.');
}

function replaceOnce(source,before,after,label){
  if(source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${label}: ожидаемый Stage 12.14.6 не найден. Файлы не изменены.`);
  return source.replace(before,after);
}
function replaceAll(source,before,after,minimum,label){
  if(!source.includes(before)&&source.includes(after))return source;
  const count=source.split(before).length-1;
  if(count<minimum)throw new Error(`${label}: найдено ${count}, ожидалось минимум ${minimum}. Файлы не изменены.`);
  return source.split(before).join(after);
}

let script=sources.get('js/script.js');
const styleMarker='  const STYLE_IDS = ["pop","disco","funk","rock","trap","industrial","symphonic","indie","jazz","rnb","synthwave","balkan"];';
const fallbackBlock=`  // Stage 12.14.7: one same-language fallback source for every live Pricing
  // CMS consumer. A missing CMS locale must use the built-in copy for the
  // requested interface language, never English/Russian from another locale.
  const PRICING_FALLBACK_SETTINGS = Object.freeze({
    pricingEyebrow:'pricing_eyebrow',
    pricingTitle:'pricing_h2',
    pricingIntro:'pricing_p',
    promoTitle:'pricing_promo_title',
    promoUntil:'pricing_promo_until',
    weddingTitle:'wedding_eyebrow',
    weddingSubtitle:'wedding_subtitle',
    detailsLabel:'tier_open_btn',
    weddingPanelLabel:'wedding_panel_label',
    whatIncluded:'wedding_what_included',
    idealFor:'wedding_ideal_for',
    tierSelect:'tier_detail_select',
    urgentLabel:'urgent_label'
  });
  function builtInPricingSettings(locale){
    const source=I18N[locale]||I18N.en;
    return Object.fromEntries(Object.entries(PRICING_FALLBACK_SETTINGS).map(([field,key])=>[field,source[key]||'']));
  }
  function builtInPricingOffer(locale,id){
    const language=I18N[locale]?locale:'en';
    const tierIndex={simple:0,advanced:1,hit:2}[id];
    if(Number.isInteger(tierIndex))return TIERS[language]?.[tierIndex]||null;
    return WEDDING_PACKAGES[language]?.find(item=>item.id===id)||null;
  }
  window.__tuneWrapPricingFallback=Object.freeze({
    settings:builtInPricingSettings,
    offer:builtInPricingOffer
  });

`;
script=replaceOnce(script,styleMarker,fallbackBlock+styleMarker,'Built-in Pricing locale fallback');

let pricing=sources.get('js/pricing-cms-runtime.js');
pricing=replaceOnce(pricing,
  "  const locale=map=>map?.[lang()]||map?.en||map?.ru||null;\n  const settings=()=>locale(config.settings?.locales);",
  "  // Never let a CMS value from another language overwrite core i18n. If the\n  // exact CMS locale is absent, use the built-in copy of that same language.\n  const locale=map=>map?.[lang()]||null;\n  const fallback=()=>window.__tuneWrapPricingFallback;\n  const settings=()=>locale(config.settings?.locales)||fallback()?.settings?.(lang())||null;",
  'Pricing settings resolver');
pricing=replaceOnce(pricing,
  '  const offerLocale=offer=>locale(offer?.locales);',
  '  const offerLocale=offer=>locale(offer?.locales)||fallback()?.offer?.(lang(),offer?.id)||null;',
  'Pricing offer resolver');

let polish=sources.get('js/stage-12.10-package-ui-polish.js');
polish=replaceOnce(polish,
  "function localesOf(offer){return offer?.locales?.[lang()]||offer?.locales?.en||offer?.locales?.ru||{}}",
  "function localesOf(offer){return offer?.locales?.[lang()]||window.__tuneWrapPricingFallback?.offer?.(lang(),offer?.id)||{}}",
  'Package chooser offer resolver');
polish=replaceOnce(polish,
  "  return cfg?.settings?.locales?.[lang()]||cfg?.settings?.locales?.en||cfg?.settings?.locales?.ru||{};",
  "  return cfg?.settings?.locales?.[lang()]||window.__tuneWrapPricingFallback?.settings?.(lang())||{};",
  'Package chooser settings resolver');

let gift=sources.get('js/gift-certificate-overlay.js');
gift=replaceOnce(gift,
  "function loc(map){return map?.[lang()]||map?.en||map?.ru||null}",
  "function loc(o){return o?.offer?.locales?.[lang()]||window.__tuneWrapPricingFallback?.offer?.(lang(),o?.id)||null}",
  'Gift offer resolver');
gift=replaceOnce(gift,
  "function name(o){return loc(o?.offer?.locales)?.name||o?.id||''}\nfunction desc(o){const l=loc(o?.offer?.locales)||{};return o?.type==='wedding'?(l.description||l.short||''):((l.features||[]).filter(Boolean).slice(0,2).join(' · '))}",
  "function name(o){return loc(o)?.name||o?.id||''}\nfunction desc(o){const l=loc(o)||{};return o?.type==='wedding'?(l.description||l.short||''):((l.features||[]).filter(Boolean).slice(0,2).join(' · '))}",
  'Gift localized copy');
gift=replaceOnce(gift,
  " const l=loc(o.offer.locales)||{},active=state.selection===key(o),b=document.createElement('button');",
  " const l=loc(o)||{},active=state.selection===key(o),b=document.createElement('button');",
  'Gift card localized copy');
if(!gift.endsWith('\n'))gift+='\n';

let ux=sources.get('js/ux-critical-fixes.js');
ux=replaceOnce(ux,
  "    return locales[lang()]?.name||locales.en?.name||locales.ru?.name||offer.id||'';",
  "    return locales[lang()]?.name||window.__tuneWrapPricingFallback?.offer?.(lang(),offer.id)?.name||offer.id||'';",
  'Order chooser offer name');

let orders=sources.get('js/orders-submit.js');
orders=replaceOnce(orders,
  "  return locales[lang()]?.name||locales.en?.name||locales.ru?.name||offer?.id||'';",
  "  return locales[lang()]?.name||window.__tuneWrapPricingFallback?.offer?.(lang(),offer?.id)?.name||offer?.id||'';",
  'Order submit offer name');

let site=sources.get('js/site-cms-runtime.js');
site=replaceOnce(site,
  "    return bucket?.locales?.[language()]||bucket?.locales?.en||bucket?.locales?.ru||null;",
  "    // Core already contains complete EN/RU/UA/GE/DE copy. Missing CMS text\n    // must leave that same-language core copy intact, not inject EN or RU.\n    return bucket?.locales?.[language()]||null;",
  'Site CMS locale resolver');
site=replaceOnce(site,
  "    return item?.locales?.[language()]||item?.locales?.en||item?.locales?.ru||null;",
  "    return item?.locales?.[language()]||null;",
  'Payment locale resolver');
site=replaceOnce(site,
  "    setTextContent(panel.querySelector('[data-site-terms-title]'),texts.terms_title||siteFallbackCopy().terms);",
  "    setTextContent(panel.querySelector('[data-site-terms-title]'),siteFallbackCopy().terms);",
  'Terms title locale');
site=replaceOnce(site,
  "    node.removeAttribute('aria-disabled');",
  "    node.removeAttribute('aria-disabled');\n    // Legal navigation has a fixed native label in every supported locale.\n    // Do this after CMS patching so a stale Russian CMS value cannot win.\n    setTextContent(node,siteFallbackCopy().terms);",
  'Terms navigation locale');

let index=sources.get('index.html');
index=replaceOnce(index,'js/app-bootstrap.js?v=12.13.8','js/app-bootstrap.js?v=12.14.7','Public cache version');
let bootstrap=sources.get('js/app-bootstrap.js');
bootstrap=replaceAll(bootstrap,'?v=12.13.8','?v=12.14.7',12,'Module cache versions');

let audit=sources.get('scripts/stage-12.13.8-global-i18n-audit.js');
audit=replaceOnce(audit,
  "assert.ok(html.includes('js/app-bootstrap.js?v=12.13.8'));",
  "const cacheVersion=html.match(/js\\/app-bootstrap\\.js\\?v=([\\d.]+)/)?.[1];\nassert.ok(cacheVersion,'versioned app bootstrap is required');",
  'I18N audit cache owner');
audit=replaceOnce(audit,
  "  assert.ok(bootstrap.includes(`./${name}?v=12.13.8`),`bootstrap cache version missing for ${name}`);",
  "  assert.ok(bootstrap.includes(`./${name}?v=${cacheVersion}`),`bootstrap cache version mismatch for ${name}`);",
  'I18N audit module versions');

const pkg=JSON.parse(sources.get('package.json'));
pkg.scripts||={};
pkg.scripts['publici18n:test']='node scripts/stage-12.14.7-public-pricing-terms-i18n-test.js';
if(typeof pkg.scripts.test!=='string')throw new Error('package scripts.test отсутствует. Файлы не изменены.');
if(!pkg.scripts.test.includes('publici18n:test'))pkg.scripts.test+=' && npm run publici18n:test';

const updates=new Map([
  ['index.html',index],['js/app-bootstrap.js',bootstrap],['js/script.js',script],
  ['js/pricing-cms-runtime.js',pricing],['js/site-cms-runtime.js',site],
  ['js/stage-12.10-package-ui-polish.js',polish],['js/gift-certificate-overlay.js',gift],
  ['js/ux-critical-fixes.js',ux],['js/orders-submit.js',orders],
  ['scripts/stage-12.13.8-global-i18n-audit.js',audit],
  ['package.json',JSON.stringify(pkg,null,2)+'\n']
]);
const rollback=new Map();
for(const [relative,content] of updates){
  const target=path.join(root,...relative.split('/'));
  rollback.set(target,fs.readFileSync(target));
}

try{
  for(const [relative,content] of updates){
    fs.writeFileSync(path.join(root,...relative.split('/')),content,'utf8');
  }
  const tests=[
    'scripts/pricing-cms-test.js','scripts/site-cms-test.js','scripts/terms-overlay-test.js',
    'scripts/stage-12.10-package-ui-test.js','scripts/gift-certificate-overlay-test.js',
    'scripts/ux-critical-fixes-test.js','scripts/stage-12.13.8-global-i18n-audit.js',
    'scripts/stage-12.14.6-complete-locale-matrix-test.js',
    'scripts/stage-12.14.7-public-pricing-terms-i18n-test.js'
  ];
  for(const relative of tests){
    const result=spawnSync(process.execPath,[path.join(root,...relative.split('/'))],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw new Error(`${relative} failed\n${result.stderr||result.stdout}`);
  }
}catch(error){
  for(const [target,content] of rollback)fs.writeFileSync(target,content);
  throw error;
}

console.log('PASS: Stage 12.14.7 Public Pricing and Terms I18N installed.');
console.log('PASS: Pricing, wedding packages and detail cards keep the selected EN/RU/UA/GE/DE language.');
console.log('PASS: RU-only CMS data can no longer overwrite another interface language.');
console.log('PASS: Terms of use has a native label and title in every supported language.');
console.log('PASS: live prices, orders, songs, Admin and media behavior are unchanged.');
console.log('D1 migration: not required.');
