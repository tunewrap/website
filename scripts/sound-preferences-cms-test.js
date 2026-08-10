#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const shared=read('functions/_shared/sound-preferences.js');
const publicApi=read('functions/api/sound-preferences.js');
const adminApi=read('functions/api/admin/sound-preferences.js');
const runtime=read('js/sound-preferences-runtime.js');
const icons=read('js/sound-icons.js');
const migration=read('migrations/0006_sound_preferences_cms.sql');
const bootstrap=read('js/app-bootstrap.js');
const ordersSubmit=read('js/orders-submit.js');
const orders=read('functions/_shared/orders.js');
const ux=read('js/ux-critical-fixes.js');
const adminSound=read('admin/sound.js');
const adminOrders=read('admin/orders.js');
const adminOrdersHtml=read('admin/orders.html');
const pkg=JSON.parse(read('package.json'));

assert.match(shared,/normalizeSoundPreferencesConfig/);
assert.match(shared,/maxStyles:5/);
assert.match(publicApi,/readSoundPreferencesConfig/);
assert.match(adminApi,/requireAdmin/);
assert.match(adminApi,/requireSameOrigin/);
assert.match(runtime,/getSelectedInstrumentLabels/);
assert.match(runtime,/getSoundPrompt/);
assert.match(runtime,/exclusive/);
assert.match(shared,/maxInstruments:null/);
assert.doesNotMatch(runtime,/maxFor\('instruments'\)/);
assert.match(icons,/soundIconSvg/);
assert.match(migration,/CREATE TABLE IF NOT EXISTS sound_preferences_config/);
assert.match(migration,/ADD COLUMN instruments_json/);
assert.match(migration,/ADD COLUMN sound_prompt/);
assert.match(bootstrap,/soundPreferencesPromise/);
assert.match(bootstrap,/sound-preferences-runtime\.js/);
assert.match(ordersSubmit,/instruments:window\.__tuneWrapSoundPreferences/);
assert.match(ordersSubmit,/soundPrompt:/);
assert.match(orders,/instruments:parseJson/);
assert.match(orders,/soundPrompt:row\.sound_prompt/);
assert.match(orders,/instruments_json,sound_prompt/);
assert.match(ux,/instrumentCount/);
assert.match(ux,/c\.errors\.instrument/);
assert.match(adminSound,/api\/admin\/sound-preferences/);
assert.match(adminSound,/api\/admin\/translate/);
assert.match(adminOrders,/detailInstruments/);
assert.match(adminOrders,/detailSoundPrompt/);
assert.match(adminOrdersHtml,/id="detailInstruments"/);
assert.match(adminOrdersHtml,/id="detailSoundPrompt"/);
assert.equal(pkg.scripts['sound:test'],'node scripts/sound-preferences-cms-test.js');
assert.match(pkg.scripts.test,/sound:test/);
assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/MutationObserver/);

for(const rel of ['admin/index.html','admin/orders.html','admin/pricing.html','admin/site.html']){
  assert.match(read(rel),/href="\/admin\/sound\.html"/);
}

console.log('PASS: Stage 12.5 Sound Preferences CMS — live styles/instruments, unlimited instrument selection, Admin editor, multilingual labels, required instrument choice, Orders/Suno snapshot and safe fallback.');
