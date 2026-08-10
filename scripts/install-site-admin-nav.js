#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const files=[
  ['admin/index.html','music'],
  ['admin/orders.html','orders'],
  ['admin/pricing.html','pricing']
];

const labels=[
  ['music','/admin/','Музыка'],
  ['orders','/admin/orders.html','Заказы'],
  ['pricing','/admin/pricing.html','Стоимость'],
  ['site','/admin/site.html','Сайт']
];

function nav(active){
  return `<nav class="admin-section-nav" aria-label="Разделы Admin Studio">
${labels.map(([id,href,label])=>`      <a${id===active?' class="is-active" aria-current="page"':''} href="${href}">${label}</a>`).join('\n')}
    </nav>`;
}

let changed=0;
for(const [relative,active] of files){
  const file=path.join(root,relative);
  if(!fs.existsSync(file))throw new Error(`${relative} not found`);
  let html=fs.readFileSync(file,'utf8');
  const next=html.replace(/<nav class="admin-section-nav"[\s\S]*?<\/nav>/,nav(active));
  if(next===html){
    throw new Error(`Admin navigation block not found in ${relative}`);
  }
  fs.writeFileSync(file,next,'utf8');
  changed++;
}

console.log(`PASS: Full Admin navigation installed in ${changed} existing page(s).`);
