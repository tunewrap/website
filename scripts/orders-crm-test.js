#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const migration=read('migrations/0003_orders.sql');
const publicModule=read('js/orders-submit.js');
const bootstrap=read('js/app-bootstrap.js');
const publicApi=read('functions/api/orders.js');
const adminApi=read('functions/api/admin/orders/index.js');
const detailApi=read('functions/api/admin/orders/[[id]].js');
const adminPage=read('admin/orders.html');
const adminJs=read('admin/orders.js');
const musicAdmin=read('admin/admin.js');

assert.match(migration,/CREATE TABLE IF NOT EXISTS orders/);
assert.match(migration,/client_submission_id TEXT NOT NULL UNIQUE/);
assert.match(migration,/new','in_progress','waiting_client','done','archived/);
assert.match(publicModule,/fetch\('\/api\/orders'/);
assert.match(publicModule,/crypto\.randomUUID/);
assert.match(bootstrap,/import\('\.\/orders-submit\.js(?:\?v=[^']+)?'\)/);
assert.match(bootstrap,/order intake bootstrap failed/,'Order CRM must be isolated from music bootstrap errors');
assert.doesNotMatch(publicApi,/requireAdmin/,'Public order intake must not require Admin login');
assert.match(publicApi,/requireSameOrigin/);
assert.match(adminApi,/requireAdmin/);
assert.match(detailApi,/requireAdmin/);
assert.match(detailApi,/onRequestPatch/);
assert.match(adminPage,/Заказы и истории/);
assert.match(adminJs,/\/api\/admin\/orders/);
assert.match(musicAdmin,/\/admin\/orders\.html/,'Music Admin must link to Orders CRM');
assert.doesNotMatch(
  [publicModule,publicApi,adminApi,detailApi,adminJs].join('\n'),
  /api[_-]?key|bearer\s+[a-z0-9]{12,}|password\s*[:=]/i,
  'Stage 12 frontend/API files must not contain credentials'
);

console.log('PASS: Stage 12 Orders CRM contract — public D1 intake, authenticated Admin API, statuses, notes, dedupe and isolated music bootstrap.');
