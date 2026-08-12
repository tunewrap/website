#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html');
const core=read('js/script.js');
const pricing=read('js/pricing-cms-runtime.js');
const site=read('js/site-cms-runtime.js');
const polish=read('js/stage-12.10-package-ui-polish.js');
const gift=read('js/gift-certificate-overlay.js');
const ux=read('js/ux-critical-fixes.js');
const orders=read('js/orders-submit.js');
const bootstrap=read('js/app-bootstrap.js');
const pkg=JSON.parse(read('package.json'));

for(const relative of [
  'js/script.js','js/pricing-cms-runtime.js','js/site-cms-runtime.js',
  'js/stage-12.10-package-ui-polish.js','js/gift-certificate-overlay.js',
  'js/ux-critical-fixes.js','js/orders-submit.js','js/app-bootstrap.js'
]){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,relative)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${relative}\n${syntax.stderr||syntax.stdout}`);
}

// Execute the real built-in pricing dictionaries and their shared fallback API.
const coreStart=core.indexOf('const I18N =');
const coreEnd=core.indexOf('\n  const STYLE_IDS',coreStart);
assert.ok(coreStart>=0&&coreEnd>coreStart,'built-in pricing fallback source missing');
const coreSandbox={window:{},result:null};
vm.runInNewContext(`${core.slice(coreStart,coreEnd)}\nresult=window.__tuneWrapPricingFallback;`,coreSandbox);
const fallback=coreSandbox.result;
const languages=['en','ru','uk','ka','de'];
const tierIds=['simple','advanced','hit'];
const weddingIds=['first-dance','love-story','wedding-collection'];

for(const language of languages){
  const settings=fallback.settings(language);
  for(const field of [
    'pricingEyebrow','pricingTitle','pricingIntro','promoTitle','promoUntil',
    'weddingTitle','weddingSubtitle','detailsLabel','weddingPanelLabel',
    'whatIncluded','idealFor','tierSelect','urgentLabel'
  ])assert.ok(String(settings[field]||'').trim(),`${language} missing ${field}`);

  for(const id of tierIds){
    const offer=fallback.offer(language,id);
    assert.ok(offer?.name,`${language} missing ${id} name`);
    assert.ok(Array.isArray(offer.features)&&offer.features.length>=4,`${language} missing ${id} features`);
  }
  for(const id of weddingIds){
    const offer=fallback.offer(language,id);
    assert.ok(offer?.name&&offer?.description&&offer?.button,`${language} missing ${id} copy`);
    assert.ok(Array.isArray(offer.includes)&&offer.includes.length>=6,`${language} missing ${id} includes`);
  }
}

// A RU-only live CMS must resolve to the requested built-in language, while an
// exact live locale remains authoritative (including live prices elsewhere).
const pricingStart=pricing.indexOf('function lang()');
const pricingEnd=pricing.indexOf('\n  function setTextNode',pricingStart);
assert.ok(pricingStart>=0&&pricingEnd>pricingStart,'pricing locale resolver missing');
const pricingConfig={
  settings:{locales:{ru:{pricingTitle:'РУССКИЙ CMS'}}},
  tiers:[{id:'simple',locales:{ru:{name:'РУССКИЙ ТАРИФ'}}}],
  weddings:[]
};
const pricingSandbox={
  window:{TuneWrapLanguage:{get:()=> 'ka'},__tuneWrapPricingFallback:fallback},
  TIER_INDEX:{simple:0,advanced:1,hit:2},
  result:null
};
vm.runInNewContext(
  `const config=${JSON.stringify(pricingConfig)};${pricing.slice(pricingStart,pricingEnd)}\n`+
  'result={settings,offerLocale,tierByIndex};',
  pricingSandbox
);
assert.equal(pricingSandbox.result.settings().pricingTitle,fallback.settings('ka').pricingTitle);
assert.equal(pricingSandbox.result.offerLocale(pricingSandbox.result.tierByIndex(0)).name,fallback.offer('ka','simple').name);

// Site CMS has the same invariant: no foreign-language CMS fallback. Terms
// link/title are canonical native labels, even if an old CMS value is Russian.
const siteStart=site.indexOf('function language()');
const siteEnd=site.indexOf('\n  function normalize',siteStart);
assert.ok(siteStart>=0&&siteEnd>siteStart,'site locale resolver missing');
const siteSandbox={window:{TuneWrapLanguage:{get:()=> 'de'}},result:null};
vm.runInNewContext(`${site.slice(siteStart,siteEnd)}\nresult={localized};`,siteSandbox);
assert.equal(siteSandbox.result.localized({locales:{ru:{title:'Русский'}}}),null);
assert.equal(siteSandbox.result.localized({locales:{de:{title:'Deutsch'}}}).title,'Deutsch');
assert.ok(site.includes("setTextContent(node,siteFallbackCopy().terms)"));
assert.ok(site.includes("setTextContent(panel.querySelector('[data-site-terms-title]'),siteFallbackCopy().terms)"));
for(const expected of ['Terms of use','Условия использования','Умови користування','გამოყენების პირობები','Nutzungsbedingungen']){
  assert.ok(site.includes(expected),`terms label missing: ${expected}`);
}

// Every later package/pricing consumer must use the shared same-language
// fallback rather than reaching into EN/RU CMS locales itself.
for(const [relative,source] of [
  ['pricing runtime',pricing],['package chooser',polish],['gift certificate',gift],
  ['order validation',ux],['order submit',orders]
]){
  assert.ok(source.includes('__tuneWrapPricingFallback'),`${relative} does not use the shared fallback`);
  assert.doesNotMatch(source,/locales(?:\?|)\.?(?:en|ru).*\|\|.*locales(?:\?|)\.?(?:ru|en)/,`${relative} still cross-falls between CMS languages`);
}

assert.match(html,/js\/app-bootstrap\.js\?v=12\.14\.(?:7|8|9|15)/);
for(const name of [
  'script.js','pricing-cms-runtime.js','gift-certificate-overlay.js',
  'site-cms-runtime.js','orders-submit.js','ux-critical-fixes.js',
  'stage-12.10-package-ui-polish.js'
])assert.match(bootstrap,new RegExp(`\\./${name.replace(/\./g,'\\.')}\\?v=12\\.14\\.(?:7|8|9|15)`),`cache version missing for ${name}`);

assert.equal(pkg.scripts['publici18n:test'],'node scripts/stage-12.14.7-public-pricing-terms-i18n-test.js');
assert.ok(pkg.scripts.test.includes('publici18n:test'));

console.log('PASS: Stage 12.14.7 — Pricing, wedding packages, detail cards and Terms keep native EN/RU/UA/GE/DE copy when CMS locales are missing.');
