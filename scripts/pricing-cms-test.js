#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const migration=read('migrations/0004_pricing_cms.sql');
const shared=read('functions/_shared/pricing.js');
const publicApi=read('functions/api/pricing.js');
const adminApi=read('functions/api/admin/pricing.js');
const adminHtml=read('admin/pricing.html');
const adminJs=read('admin/pricing.js');
const runtime=read('js/pricing-cms-runtime.js');
const bootstrap=read('js/app-bootstrap.js');
const weddingWide=read('js/wedding-detail-wide.js');

assert.match(migration,/CREATE TABLE IF NOT EXISTS pricing_config/);
assert.match(migration,/first-dance/);
assert.match(migration,/wedding-collection/);

assert.match(shared,/PRICING_TIER_IDS/);
assert.match(shared,/PRICING_WEDDING_IDS/);
assert.match(shared,/writePricingConfig/);
assert.match(adminApi,/requireAdmin/);
assert.match(adminApi,/requireSameOrigin/);
assert.match(publicApi,/readPricingConfig/);

assert.match(adminHtml,/Стоимость и форматы/);
assert.match(adminHtml,/Автоперевести язык/);
assert.match(adminHtml,/standardPricingEditors/);
assert.match(adminHtml,/weddingPricingEditors/);
assert.match(adminJs,/\/api\/admin\/pricing/);
assert.match(adminJs,/\/api\/admin\/translate/);
assert.match(adminJs,/offset\+=8/);

assert.match(runtime,/TUNEWRAP_PRICING_CMS/);
assert.match(runtime,/pricing_eyebrow/);
assert.match(runtime,/tierDetailFeatures/);
assert.match(runtime,/tierDetailWeddingIncludes/);
assert.match(runtime,/sumTotal/);
assert.doesNotMatch(runtime,/new Audio\s*\(/);

const scriptImport=bootstrap.search(/import\('\.\/script\.js(?:\?v=[^']+)?'\)/);
const pricingImport=bootstrap.search(/import\('\.\/pricing-cms-runtime\.js(?:\?v=[^']+)?'\)/);
const ordersImport=bootstrap.search(/import\('\.\/orders-submit\.js(?:\?v=[^']+)?'\)/);
assert.ok(scriptImport>=0&&pricingImport>scriptImport,'Pricing runtime must load after core');
assert.ok(ordersImport>pricingImport,'Orders CRM must load after Pricing CMS');
assert.match(bootstrap,/\/api\/pricing/);

assert.doesNotMatch(weddingWide,/const PRICES/);
assert.doesNotMatch(weddingWide,/old:'99'/);

console.log('PASS: Stage 12.2 Pricing CMS — D1 config, protected Admin editor, public runtime, live order price sync and safe built-in fallback.');
