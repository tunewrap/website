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
const bootstrap=read('js/app-bootstrap.js');
const publicCss=read('css/stage-12.12-site-polish.css');
const adminCss=read('admin/site-stage-12.12.css');
const pkg=JSON.parse(read('package.json'));

assert.ok(shared.includes('function cleanAnnouncement(value)'));
assert.ok(shared.includes('announcement:cleanAnnouncement(value.announcement)'));

assert.ok(adminHtml.includes('/admin/site-stage-12.12.css?v=12.12'));
assert.ok(adminJs.includes('function renderAnnouncement(){'));
assert.ok(adminJs.includes("document.createTextNode('Показывать на сайте')"));
assert.ok(adminJs.includes('announcement_label'));
assert.ok(adminJs.includes('announcement_title'));
assert.ok(adminJs.includes('announcement_text'));
assert.ok(adminJs.includes("input.type='date'"));
assert.ok(adminJs.includes('renderAnnouncement();'));

assert.ok(runtime.includes('function patchAnnouncement(){'));
assert.ok(runtime.includes('announcementIsActive'));
assert.ok(runtime.includes('announcementTodayKey'));
assert.ok(runtime.includes("node.id='heroAnnouncement'"));
assert.ok(runtime.includes('patchAnnouncement();'));
assert.ok(runtime.includes('.filter(item=>item?.enabled!==false)'));

assert.ok(publicCss.includes('justify-content:center!important'));
assert.ok(publicCss.includes('.contact-hub-socials > .contact-hub-channel[hidden]'));
assert.ok(publicCss.includes('.hero-announcement'));
assert.ok(adminCss.includes('.site-announcement-admin'));

assert.ok(bootstrap.includes('stage-12.12-site-polish.css'));
assert.equal(pkg.scripts['sitepolish:test'],'node scripts/stage-12.12-site-polish-test.js');
assert.ok(pkg.scripts.test.includes('sitepolish:test'));

console.log('PASS: Stage 12.12 — centered contacts, payment visibility control, and scheduled multilingual homepage news are installed.');
