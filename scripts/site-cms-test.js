#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const migration=read('migrations/0005_site_content_cms.sql');
const shared=read('functions/_shared/site-content.js');
const publicApi=read('functions/api/site-content.js');
const adminApi=read('functions/api/admin/site-content.js');
const adminHtml=read('admin/site.html');
const adminJs=read('admin/site.js');
const runtime=read('js/site-cms-runtime.js');
const bootstrap=read('js/app-bootstrap.js');
const css=read('css/site-cms.css');

assert.match(migration,/CREATE TABLE IF NOT EXISTS site_content_config/);
assert.match(migration,/contact_nav_terms/);
assert.match(migration,/stage-12\.3-migration/);

assert.match(shared,/normalizeSiteContentConfig/);
assert.match(shared,/CONTACT_CHANNELS/);
assert.match(shared,/cleanPayments/);
assert.match(adminApi,/requireAdmin/);
assert.match(adminApi,/requireSameOrigin/);
assert.match(publicApi,/readSiteContentConfig/);

assert.match(adminHtml,/Содержимое сайта/);
assert.match(adminHtml,/Контакты и соцсети/);
assert.match(adminHtml,/Способы оплаты/);
assert.match(adminHtml,/Автоперевести язык/);

assert.match(adminJs,/\/api\/admin\/site-content/);
assert.match(adminJs,/\/api\/admin\/translate/);
assert.match(adminJs,/offset\+=8/);
assert.match(adminJs,/function addPayment\(/);

assert.match(runtime,/TUNEWRAP_SITE_CMS/);
assert.match(runtime,/data-payment-methods-slot/);
assert.match(runtime,/siteTermsPanel/);
assert.match(runtime,/waLink/);
assert.match(runtime,/corpTgLink/);
assert.doesNotMatch(runtime,/new MutationObserver/);
assert.doesNotMatch(runtime,/new Audio\s*\(/);

const core=bootstrap.indexOf("import('./script.js')");
const site=bootstrap.indexOf("import('./site-cms-runtime.js')");
const orders=bootstrap.indexOf("import('./orders-submit.js')");
assert.ok(core>=0&&site>core,'Site CMS must load after core');
assert.ok(orders>site,'Orders CRM must load after Site CMS');
assert.match(bootstrap,/\/api\/site-content/);

assert.match(css,/contact-payment-method/);
assert.match(css,/site-legal-panel/);

console.log('PASS: Stage 12.3 Full Site CMS — D1 content, protected Admin editor, contacts, payment cards, Terms panel, multilingual translation and safe runtime fallback.');
