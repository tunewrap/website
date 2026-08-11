#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const runtime=read('js/stage-12.11-contact-channel-selector.js');
const css=read('css/stage-12.11-contact-channel-selector.css');
const ux=read('js/ux-critical-fixes.js');
const bootstrap=read('js/app-bootstrap.js');
const orders=read('js/orders-submit.js');
const shared=read('functions/_shared/orders.js');
const admin=read('admin/orders.js');
const pkg=JSON.parse(read('package.json'));

assert.ok(runtime.includes("{id:'whatsapp',label:'WhatsApp',prefix:'WhatsApp'}"));
assert.ok(runtime.includes("{id:'telegram',label:'Telegram',prefix:'Telegram'}"));
assert.ok(runtime.includes("{id:'email',label:'Email',prefix:'Email'}"));
assert.ok(runtime.includes("owner.value=selected&&value?selected.prefix+': '+value:''"));
assert.ok(runtime.includes("input.disabled=!selected"));
assert.ok(runtime.includes("role','radiogroup"));
assert.ok(runtime.includes("aria-checked"));

assert.ok(ux.includes("v.match(/^(WhatsApp|Telegram|Email):"));
assert.ok(ux.includes("method==='telegram'"));
assert.ok(ux.includes("t\\\\.me"));
assert.ok(ux.includes("Выберите WhatsApp, Telegram или Email"));

assert.ok(css.includes('.tw-contact-methods'));
assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
assert.ok(css.includes('.tw-contact-method.is-selected'));

assert.ok(bootstrap.includes('stage-12.11-contact-channel-selector.css'));
assert.ok(bootstrap.includes('stage-12.11-contact-channel-selector.js'));

// Existing CRM remains the data owner: it submits fieldContact into the existing contact column.
assert.ok(orders.includes("contact:text('fieldContact')"));
assert.ok(shared.includes('contact:row.contact'));
assert.ok(shared.includes('order.name,order.contact'));
assert.ok(admin.includes("order.contact||'—'"));

assert.equal(pkg.scripts['contactchannel:test'],'node scripts/stage-12.11-contact-channel-test.js');
assert.ok(pkg.scripts.test.includes('contactchannel:test'));

console.log('PASS: Stage 12.11 — explicit WhatsApp / Telegram / Email selection is required and stored visibly in the existing Admin contact field.');
