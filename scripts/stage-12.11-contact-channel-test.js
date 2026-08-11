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

/* Stage 12.11 contact selector UI */
assert.ok(runtime.includes("{id:'whatsapp',label:'WhatsApp',prefix:'WhatsApp'}"));
assert.ok(runtime.includes("{id:'telegram',label:'Telegram',prefix:'Telegram'}"));
assert.ok(runtime.includes("{id:'email',label:'Email',prefix:'Email'}"));
assert.ok(runtime.includes("owner.value=selected&&value?selected.prefix+': '+value:''"));
assert.ok(runtime.includes("input.disabled=!selected"));
assert.ok(runtime.includes("role','radiogroup"));
assert.ok(runtime.includes("aria-checked"));

/*
  Current safe contact validation contract.
  Stage 12.12.2 deliberately replaced the old fragile
  v.match(/^(WhatsApp|Telegram|Email):...) regex with parsing by the first ":".
*/
assert.ok(ux.includes("const split=v.indexOf(':');"));
assert.ok(ux.includes("const method=v.slice(0,split).trim().toLowerCase();"));
assert.ok(ux.includes("if(method==='email')"));
assert.ok(ux.includes("if(method==='whatsapp')"));
assert.ok(ux.includes("if(method==='telegram')"));
assert.ok(ux.includes("const prefixes=['https://www.t.me/'"));
assert.ok(ux.includes("'https://t.me/'"));
assert.ok(ux.includes("if(username.startsWith('@'))username=username.slice(1);"));
assert.ok(ux.includes("Выберите WhatsApp, Telegram или Email"));

/* CSS contract */
assert.ok(css.includes('.tw-contact-methods'));
assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
assert.ok(css.includes('.tw-contact-method.is-selected'));

/* Bootstrap contract; cache-version query is allowed. */
assert.ok(bootstrap.includes('stage-12.11-contact-channel-selector.css'));
assert.ok(
  /import\('\.\/stage-12\.11-contact-channel-selector\.js(?:\?v=[^']+)?'\)/.test(bootstrap),
  'Contact selector module must remain imported, with or without a cache-version query'
);

/* Existing CRM remains the data owner. */
assert.ok(orders.includes("contact:text('fieldContact')"));
assert.ok(shared.includes('contact:row.contact'));
assert.ok(shared.includes('order.name,order.contact'));
assert.ok(admin.includes("order.contact||'—'"));

assert.equal(
  pkg.scripts['contactchannel:test'],
  'node scripts/stage-12.11-contact-channel-test.js'
);
assert.ok(pkg.scripts.test.includes('contactchannel:test'));

console.log(
  'PASS: Stage 12.11/12.12.2 contact channel contract — explicit WhatsApp / Telegram / Email selector, safe parser validation, CRM storage.'
);
