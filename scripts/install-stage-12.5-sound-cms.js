#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');

function file(rel){return path.join(root,rel);}
function read(rel){
  const target=file(rel);
  if(!fs.existsSync(target))throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(target,'utf8');
}
function write(rel,text){fs.writeFileSync(file(rel),text,'utf8');}
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 patch target, found ${count}`);
  return text.replace(needle,replacement);
}

// A) app-bootstrap: public Sound CMS fetch + runtime before Orders CRM.
let bootstrap=read('js/app-bootstrap.js');

const bootstrapFetchNeedle="try{\n  const response = await fetch('/api/tracks'";
const bootstrapFetchBlock=`const soundPreferencesPromise=(async()=>{\n  try{\n    const response=await fetch('/api/sound-preferences',{headers:{accept:'application/json'},cache:'no-store'});\n    if(!response.ok)return null;\n    const payload=await response.json();\n    return payload?.ok&&payload?.config?payload.config:null;\n  }catch(error){\n    console.error('TuneWrap Sound Preferences bootstrap failed',error);\n    return null;\n  }\n})();\n\ntry{\n  const response = await fetch('/api/tracks'`;
bootstrap=replaceOnce(
  bootstrap,
  bootstrapFetchNeedle,
  bootstrapFetchBlock,
  'app-bootstrap sound fetch'
);

const ordersComment="  // Orders CRM is loaded after Pricing + Site CMS so it sees final price/contact state.";
const soundRuntimeBlock=`  // Sound Preferences CMS owns the public style/instrument choices.\n  // API failure keeps the built-in style form as a safe fallback.\n  window.TUNEWRAP_SOUND_PREFERENCES=await soundPreferencesPromise;\n  if(window.TUNEWRAP_SOUND_PREFERENCES){\n    try{\n      await import('./sound-preferences-runtime.js');\n    }catch(error){\n      console.error('TuneWrap Sound Preferences runtime failed',error);\n    }\n  }\n\n  // Orders CRM is loaded after Pricing + Site CMS so it sees final price/contact state.`;
bootstrap=replaceOnce(
  bootstrap,
  ordersComment,
  soundRuntimeBlock,
  'app-bootstrap sound runtime'
);
write('js/app-bootstrap.js',bootstrap);

// B) Orders client payload: final dynamic styles + instruments + Suno-ready snapshot.
let orderSubmit=read('js/orders-submit.js');
const stylesNeedle="    styles:content('sumStyle')&&content('sumStyle')!=='—'?content('sumStyle').split(',').map(v=>v.trim()).filter(Boolean):[],\n    urgent:";
const stylesReplacement=`    styles:window.__tuneWrapSoundPreferences?.getSelectedStyleLabels?.()\n      ||(content('sumStyle')&&content('sumStyle')!=='—'?content('sumStyle').split(',').map(v=>v.trim()).filter(Boolean):[]),\n    instruments:window.__tuneWrapSoundPreferences?.getSelectedInstrumentLabels?.()||[],\n    soundPrompt:window.__tuneWrapSoundPreferences?.getSoundPrompt?.()||'',\n    urgent:`;
orderSubmit=replaceOnce(orderSubmit,stylesNeedle,stylesReplacement,'orders-submit sound payload');
write('js/orders-submit.js',orderSubmit);

// C) Stage 12.4 validation: instruments are mandatory for real song orders.
let ux=read('js/ux-critical-fixes.js');

const errorPatches=[
  ["        style:'Выберите хотя бы один стиль песни.',\n        name:",
   "        style:'Выберите хотя бы один стиль песни.',\n        instrument:'Выберите инструменты/звучание или «На усмотрение TuneWrap».',\n        name:"],
  ["        style:'Оберіть хоча б один стиль пісні.',\n        name:",
   "        style:'Оберіть хоча б один стиль пісні.',\n        instrument:'Оберіть інструменти/звучання або «На розсуд TuneWrap».',\n        name:"],
  ["        style:'აირჩიეთ მინიმუმ ერთი მუსიკალური სტილი.',\n        name:",
   "        style:'აირჩიეთ მინიმუმ ერთი მუსიკალური სტილი.',\n        instrument:'აირჩიეთ ინსტრუმენტები/ჟღერადობა ან „TuneWrap-ის არჩევანი“.',\n        name:"],
  ["        style:'Choose at least one music style.',\n        name:",
   "        style:'Choose at least one music style.',\n        instrument:'Choose instruments/sound or “TuneWrap choice”.',\n        name:"],
  ["        style:'Bitte mindestens einen Musikstil auswählen.',\n        name:",
   "        style:'Bitte mindestens einen Musikstil auswählen.',\n        instrument:'Bitte Instrumente/Klang oder „TuneWrap-Auswahl“ wählen.',\n        name:"]
];
for(const [needle,replacement] of errorPatches){
  ux=replaceOnce(ux,needle,replacement,'ux instrument validation copy');
}

ux=replaceOnce(
  ux,
  "      style:$('#styleChips')?.closest('.field-group'),\n      name:",
  "      style:$('#styleChips')?.closest('.field-group'),\n      instrument:$('#instrumentChips')?.closest('.field-group'),\n      name:",
  'ux required target'
);

ux=replaceOnce(
  ux,
  "    ['style','name','occasion','story','description','contact'].forEach(key=>{",
  "    ['style','instrument','name','occasion','story','description','contact'].forEach(key=>{",
  'ux required marker list'
);

ux=replaceOnce(
  ux,
  "    $('#styleChips')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');\n    $('#fieldName')",
  "    $('#styleChips')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');\n    $('#instrumentChips')?.closest('.field-group')?.querySelector('.field-label')?.classList.add('ux-required-label');\n    $('#fieldName')",
  'ux required label'
);

ux=replaceOnce(
  ux,
  "  function styleCount(){\n    return Array.from(document.querySelectorAll('#styleChips .chip.selected')).length;\n  }\n\n  function updateStyleHint(){",
  "  function styleCount(){\n    return Array.from(document.querySelectorAll('#styleChips .chip.selected')).length;\n  }\n\n  function instrumentCount(){\n    return Array.from(document.querySelectorAll('#instrumentChips .chip.selected')).length;\n  }\n\n  function updateStyleHint(){",
  'ux instrument count'
);

ux=replaceOnce(
  ux,
  "      if(styleCount()<1)errors.push([groups.style,c.errors.style]);\n      if(!text('fieldOccasion'))",
  "      if(styleCount()<1)errors.push([groups.style,c.errors.style]);\n      if($('#instrumentChips')&&instrumentCount()<1)errors.push([groups.instrument,c.errors.instrument]);\n      if(!text('fieldOccasion'))",
  'ux required instrument rule'
);
write('js/ux-critical-fixes.js',ux);

// D) Server Orders schema mapping.
let orders=read('functions/_shared/orders.js');

orders=replaceOnce(
  orders,
  "    styles:parseJson(row.styles_json,[]),\n    urgent:",
  "    styles:parseJson(row.styles_json,[]),\n    instruments:parseJson(row.instruments_json,[]),\n    soundPrompt:row.sound_prompt||'',\n    urgent:",
  'orders row mapping'
);

orders=replaceOnce(
  orders,
  "    styles:listStrings(input?.styles,4,120),\n    urgent:",
  "    styles:listStrings(input?.styles,5,160),\n    instruments:listStrings(input?.instruments,5,160),\n    soundPrompt:clean(input?.soundPrompt,1600,{label:'Sound prompt'}),\n    urgent:",
  'orders normalize sound'
);

orders=replaceOnce(
  orders,
  "      tier_label,wedding_package_id,wedding_package_label,styles_json,urgent,\n      quoted_price,raw_message,source,source_url,internal_notes,schema_version,",
  "      tier_label,wedding_package_id,wedding_package_label,styles_json,instruments_json,sound_prompt,urgent,\n      quoted_price,raw_message,source,source_url,internal_notes,schema_version,",
  'orders insert columns'
);

orders=replaceOnce(
  orders,
  "    order.tierLabel,order.weddingPackageId,order.weddingPackageLabel,JSON.stringify(order.styles),order.urgent?1:0,\n    order.quotedPrice,",
  "    order.tierLabel,order.weddingPackageId,order.weddingPackageLabel,JSON.stringify(order.styles),JSON.stringify(order.instruments),order.soundPrompt,order.urgent?1:0,\n    order.quotedPrice,",
  'orders insert bindings'
);

orders=orders.replace("    schemaVersion:1\n  };","    schemaVersion:2\n  };");
write('functions/_shared/orders.js',orders);

// E) Admin Orders details.
let ordersHtml=read('admin/orders.html');
ordersHtml=replaceOnce(
  ordersHtml,
  '        <article><span>Стиль</span><strong id="detailStyles">—</strong></article>\n        <article><span>Стоимость</span><strong id="detailPrice">—</strong></article>',
  '        <article><span>Стиль</span><strong id="detailStyles">—</strong></article>\n        <article><span>Инструменты</span><strong id="detailInstruments">—</strong></article>\n        <article><span>Suno-основа</span><strong id="detailSoundPrompt">—</strong></article>\n        <article><span>Стоимость</span><strong id="detailPrice">—</strong></article>',
  'admin orders detail cards'
);
write('admin/orders.html',ordersHtml);

let ordersAdmin=read('admin/orders.js');
ordersAdmin=replaceOnce(
  ordersAdmin,
  "    order.description,order.tierLabel,order.weddingPackageLabel,...(order.styles||[])\n",
  "    order.description,order.tierLabel,order.weddingPackageLabel,...(order.styles||[]),\n    ...(order.instruments||[]),order.soundPrompt\n",
  'admin orders search'
);
ordersAdmin=replaceOnce(
  ordersAdmin,
  "  $('#detailStyles').textContent=(order.styles||[]).join(', ')||'—';\n  $('#detailPrice')",
  "  $('#detailStyles').textContent=(order.styles||[]).join(', ')||'—';\n  $('#detailInstruments').textContent=(order.instruments||[]).join(', ')||'—';\n  $('#detailSoundPrompt').textContent=order.soundPrompt||'—';\n  $('#detailPrice')",
  'admin orders sound details'
);
ordersAdmin=replaceOnce(
  ordersAdmin,
  "    `Пакет: ${order.weddingPackageLabel||order.tierLabel||'—'}`,\n    `Событие:",
  "    `Пакет: ${order.weddingPackageLabel||order.tierLabel||'—'}`,\n    `Стиль: ${(order.styles||[]).join(', ')||'—'}`,\n    `Инструменты: ${(order.instruments||[]).join(', ')||'—'}`,\n    `Suno: ${order.soundPrompt||'—'}`,\n    `Событие:",
  'admin orders copy text'
);
write('admin/orders.js',ordersAdmin);

// F) Admin navigation: add Звучание to all existing primary pages.
for(const rel of ['admin/index.html','admin/orders.html','admin/pricing.html','admin/site.html']){
  let html=read(rel);
  if(html.includes('href="/admin/sound.html"'))continue;
  const marker='</nav>';
  const navStart=html.indexOf('<nav class="admin-section-nav"');
  const navEnd=html.indexOf(marker,navStart);
  if(navStart<0||navEnd<0)throw new Error(`${rel}: Admin nav not found`);
  html=html.slice(0,navEnd)+'      <a href="/admin/sound.html">Звучание</a>\n    '+html.slice(navEnd);
  write(rel,html);
}

// G) package.json test chain.
const packagePath=file('package.json');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
pkg.scripts ||= {};
pkg.scripts['sound:test']='node scripts/sound-preferences-cms-test.js';
if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('sound:test')){
  pkg.scripts.test += ' && npm run sound:test';
}
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n','utf8');

console.log('PASS: Stage 12.5 Sound Preferences CMS installer applied.');
console.log('Modified: app-bootstrap, order intake, required validation, Orders schema adapter/Admin UI, Admin navigation and package.json.');
console.log('New CMS/API/runtime/migration files are supplied by the ZIP.');
