#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const shared=read('functions/_shared/site-content.js');
const adminHtml=read('admin/site.html');
const adminJs=read('admin/site.js');
const runtime=read('js/site-cms-runtime.js');
const adminCss=read('admin/site-stage-12.12.1.css');
const pkg=JSON.parse(read('package.json'));

assert.ok(shared.includes('function cleanPaymentSection(value)'));
assert.ok(shared.includes('enabled:source.enabled!==false'));
assert.ok(shared.includes('paymentSection:cleanPaymentSection(value.paymentSection)'));

assert.ok(adminHtml.includes('/admin/site-stage-12.12.1.css?v=12.12.1'));
assert.ok(adminJs.includes('function ensurePaymentSectionToggle(){'));
assert.ok(adminJs.includes("text.textContent='Показывать весь блок оплаты на сайте'"));
assert.ok(adminJs.includes('state.config.paymentSection.enabled=check.checked'));
assert.ok(adminJs.includes('ensurePaymentSectionToggle();'));
assert.ok(adminJs.includes("document.createTextNode('Показывать карточку')"));

assert.ok(runtime.includes("const section=$('#contactHubPayment')"));
assert.ok(runtime.includes("const navPayment=$('[data-contact-action=\"payment\"]')"));
assert.ok(runtime.includes('const sectionEnabled=config.paymentSection?.enabled!==false'));
assert.ok(runtime.includes('const showSection=sectionEnabled&&items.length>0'));
assert.ok(runtime.includes('if(section)section.hidden=!showSection'));
assert.ok(runtime.includes('if(navPayment)navPayment.hidden=!showSection'));
assert.ok(runtime.includes('slot.replaceChildren()'));

assert.ok(adminCss.includes('.site-payment-master-toggle'));

assert.equal(pkg.scripts['paymentsection:test'],'node scripts/stage-12.12.1-payment-section-test.js');
assert.ok(pkg.scripts.test.includes('paymentsection:test'));

console.log('PASS: Stage 12.12.1 — whole public payment section can be toggled from Admin and empty payment UI auto-hides.');
