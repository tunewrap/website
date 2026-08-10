#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');

function patchMusic(){
  const file=path.join(root,'admin','index.html');
  if(!fs.existsSync(file))throw new Error('admin/index.html not found');
  let html=fs.readFileSync(file,'utf8');
  if(html.includes('/admin/pricing.html'))return false;
  const needle='    </a>\n    <button class="icon-button" id="refreshButton"';
  const replacement=`    </a>
    <nav class="admin-section-nav" aria-label="Разделы Admin Studio">
      <a class="is-active" href="/admin/" aria-current="page">Музыка</a>
      <a href="/admin/orders.html">Заказы</a>
      <a href="/admin/pricing.html">Стоимость</a>
    </nav>
    <button class="icon-button" id="refreshButton"`;
  if(!html.includes(needle))throw new Error('Music admin header pattern not found');
  html=html.replace(needle,replacement);
  fs.writeFileSync(file,html,'utf8');
  return true;
}

function patchOrders(){
  const file=path.join(root,'admin','orders.html');
  if(!fs.existsSync(file))throw new Error('admin/orders.html not found');
  let html=fs.readFileSync(file,'utf8');
  if(html.includes('/admin/pricing.html'))return false;
  const needle=`      <a href="/admin/">Музыка</a>
      <a class="is-active" href="/admin/orders.html" aria-current="page">Заказы</a>`;
  const replacement=`      <a href="/admin/">Музыка</a>
      <a class="is-active" href="/admin/orders.html" aria-current="page">Заказы</a>
      <a href="/admin/pricing.html">Стоимость</a>`;
  if(!html.includes(needle))throw new Error('Orders admin nav pattern not found');
  html=html.replace(needle,replacement);
  fs.writeFileSync(file,html,'utf8');
  return true;
}

const changed=[patchMusic(),patchOrders()].filter(Boolean).length;
console.log(`PASS: Admin navigation ready. ${changed} file(s) updated.`);
