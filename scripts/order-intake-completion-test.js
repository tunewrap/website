#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const bootstrap=read('js/app-bootstrap.js');
const runtime=read('js/order-intake-completion.js');
const ux=read('js/ux-critical-fixes.js');
const pricing=read('js/pricing-cms-runtime.js');
const core=read('js/script.js');
const submit=read('js/orders-submit.js');
const orders=read('functions/_shared/orders.js');
const adminJs=read('admin/orders.js');
const adminHtml=read('admin/orders.html');
const site=read('js/site-cms-runtime.js');
const migration=read('migrations/0007_order_translation_vocal.sql');
const pkg=JSON.parse(read('package.json'));

assert.match(bootstrap,/order-intake-completion\.js/);
assert.match(runtime,/getVocalChoice/);
assert.match(runtime,/male and female duet/);
assert.match(runtime,/orderVocalField/);

assert.match(ux,/function enabledWeddings/);
assert.match(ux,/option\.value='wedding:'\+offer\.id/);
assert.match(ux,/option\.textContent=localizedOfferName\(offer\)\+' — \$'\+\(Number\(offer\.price\)\|\|0\)/);
assert.match(ux,/orderVocalField/);
assert.match(ux,/hasVocalChoice/);

assert.match(pricing,/selectWedding:id/);
assert.match(pricing,/const value=`\$\{loc\.name\} \(\$\{money\(offer\.price\)\}\)`/);
assert.match(core,/tunewrap:set-order-wedding/);

assert.match(submit,/vocalChoice/);
assert.match(submit,/weddingFromPricing/);
assert.match(submit,/vocalPrompt/);

assert.match(orders,/ORDER_VOCALS/);
assert.match(orders,/vocalChoice:row\.vocal_choice/);
assert.match(orders,/translationRu:parseJson/);
assert.match(orders,/translation_ru_json/);
assert.match(orders,/translation_ru_at/);

const insert=orders.match(/INSERT INTO orders \(([\s\S]*?)\)\s*VALUES \(([\?,\s]+)\)/);
assert.ok(insert,'orders INSERT not found');
const columns=insert[1].split(',').map(v=>v.trim()).filter(Boolean);
const placeholders=(insert[2].match(/\?/g)||[]).length;
assert.equal(columns.length,placeholders,'orders INSERT columns/placeholders mismatch');
assert.ok(columns.includes('vocal_choice'),'orders INSERT missing vocal_choice');

assert.match(adminHtml,/id="detailVocal"/);
assert.match(adminHtml,/id="orderTranslationSection"/);
assert.match(adminJs,/TRANSLATE_SOURCE/);
assert.match(adminJs,/target:'ru'/);
assert.match(adminJs,/ensureRussianTranslation/);
assert.match(adminJs,/translationRu/);

assert.match(site,/installFooterNavigation/);
assert.match(site,/data-contact-target/);
assert.match(site,/action==='wedding'/);
assert.match(site,/action==='contacts'/);
assert.match(site,/action==='payment'/);

assert.match(migration,/ADD COLUMN vocal_choice/);
assert.match(migration,/ADD COLUMN translation_ru_json/);
assert.match(migration,/ADD COLUMN translation_ru_at/);

assert.equal(pkg.scripts['intake:test'],'node scripts/order-intake-completion-test.js');
assert.match(pkg.scripts.test,/intake:test/);

assert.doesNotMatch(runtime,/new\s+Audio\s*\(/);
assert.doesNotMatch(runtime,/MutationObserver/);

console.log('PASS: Stage 12.6 Order Intake Completion — auto RU translation, required vocal, six-package selector with names/prices, and reliable footer navigation.');
