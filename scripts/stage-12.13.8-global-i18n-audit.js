#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const jsFiles=[
  'js/app-bootstrap.js',
  'js/script.js',
  'js/catalog-core.js',
  'js/catalog-runtime.js',
  'js/playback-engine.js',
  'js/site-cms-runtime.js',
  'js/pricing-cms-runtime.js',
  'js/sound-preferences-runtime.js',
  'js/gift-certificate-overlay.js',
  'js/order-intake-completion.js',
  'js/orders-submit.js',
  'js/stage-12.10-package-ui-polish.js',
  'js/stage-12.11-contact-channel-selector.js',
  'js/ux-critical-fixes.js',
  'js/wide-copy-polish.js'
];

for(const rel of jsFiles){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,rel)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${rel}\n${syntax.stderr||syntax.stdout}`);
}

const html=read('index.html');
const script=read('js/script.js');
const player=read('js/playback-engine.js');
const core=read('js/catalog-core.js');
const runtime=read('js/catalog-runtime.js');
const bootstrap=read('js/app-bootstrap.js');
const pkg=JSON.parse(read('package.json'));

/* One stable application language owner. */
assert.ok(html.includes('id="tunewrapLanguageRuntime"'));
assert.ok(html.includes('document.documentElement.dataset.tunewrapLang=initial'));
assert.ok(html.includes('window.TUNEWRAP_CURRENT_LANGUAGE=initial'));
assert.ok(script.includes('document.documentElement.dataset.tunewrapLang = lang;'));

/* Full Player must be browser-translatable, but brand/codes protected. */
assert.ok(html.includes('<section class="song-player-screen" id="songPlayerScreen"'));
assert.equal(html.includes('class="song-player-screen notranslate"'),false);
assert.ok(html.includes('song-player-brand notranslate'));
assert.ok(html.includes('song-player-language notranslate'));
assert.ok(html.includes('top-mini-wordmark notranslate'));

/* Main site i18n owns visible player labels. */
const playerKeys=[
  'player_back','player_minimize','player_show_full','player_lyrics',
  'player_translation','player_order','player_full_description','player_collapse'
];
for(const key of playerKeys){
  assert.ok(html.includes(`data-i18n="${key}"`),`index missing ${key}`);
  const occurrences=(script.match(new RegExp(`${key}:`,'g'))||[]).length;
  assert.ok(occurrences>=5,`script.js needs ${key} in all five language dictionaries; found ${occurrences}`);
}

/* No second visible player i18n owner. */
assert.equal(player.includes('PLAYER_VISIBLE_UI'),false);
assert.equal(player.includes('syncVisiblePlayerLabels'),false);
assert.ok(player.includes("window.TuneWrapLanguage?.get?.()||'en'"));

/* Catalog public fallback must not prefer Russian over English. */
assert.ok(core.includes('value[language] || value.en || value.original || value.ru'));
assert.ok(runtime.includes('window.TuneWrapLanguage?.get?.()'));

/* Dynamic public modules use stable native language state. */
const stableModules=[
  'js/site-cms-runtime.js',
  'js/pricing-cms-runtime.js',
  'js/sound-preferences-runtime.js',
  'js/gift-certificate-overlay.js',
  'js/order-intake-completion.js',
  'js/orders-submit.js',
  'js/stage-12.10-package-ui-polish.js',
  'js/stage-12.11-contact-channel-selector.js',
  'js/ux-critical-fixes.js',
  'js/wide-copy-polish.js'
];
for(const rel of stableModules){
  const source=read(rel);
  assert.ok(source.includes('TuneWrapLanguage?.get?.()'),`${rel} is not using stable TuneWrap language state`);
}

/* Known RU-first public fallback signatures must be gone. */
const allPublic=stableModules.map(read).join('\n');
const forbidden=[
  'locales?.ru||offer?.locales?.en',
  'locales.ru?.name||locales.en?.name',
  'map?.ru||map?.en',
  'labels?.ru||value?.labels?.en'
];
for(const token of forbidden){
  assert.equal(allPublic.includes(token),false,`RU-first fallback remains: ${token}`);
}

/* One deploy must not mix stale i18n generations. */
const cacheVersion=html.match(/js\/app-bootstrap\.js\?v=([\d.]+)/)?.[1];
assert.ok(cacheVersion,'versioned app bootstrap is required');
for(const name of [
  'catalog-runtime.js','script.js','pricing-cms-runtime.js','gift-certificate-overlay.js',
  'site-cms-runtime.js','sound-preferences-runtime.js','order-intake-completion.js',
  'orders-submit.js','playback-engine.js','ux-critical-fixes.js',
  'stage-12.10-package-ui-polish.js','stage-12.11-contact-channel-selector.js'
]){
  assert.ok(bootstrap.includes(`./${name}?v=${cacheVersion}`),`bootstrap cache version mismatch for ${name}`);
}

assert.equal(pkg.scripts['i18n:audit'],'node scripts/stage-12.13.8-global-i18n-audit.js');
assert.ok(pkg.scripts.test.includes('i18n:audit'));

console.log('PASS: Stage 12.13.8 Global I18N Audit');
console.log('PASS: native EN/RU/UA/GE/DE + browser translation compatibility invariants are satisfied.');
