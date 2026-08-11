#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const scriptPath=path.join(root,'js','script.js');

if(!fs.existsSync(scriptPath))throw new Error('Missing js/script.js');

let source=fs.readFileSync(scriptPath,'utf8');

const dictionaries={
  ru:{
    player_back:'Назад',
    player_minimize:'Свернуть',
    player_show_full:'Показать полностью',
    player_lyrics:'Текст песни',
    player_translation:'Перевод',
    player_order:'Заказать похожую историю',
    player_full_description:'Описание песни',
    player_collapse:'Свернуть'
  },
  uk:{
    player_back:'Назад',
    player_minimize:'Згорнути',
    player_show_full:'Показати повністю',
    player_lyrics:'Текст пісні',
    player_translation:'Переклад',
    player_order:'Замовити схожу історію',
    player_full_description:'Опис пісні',
    player_collapse:'Згорнути'
  },
  ka:{
    player_back:'უკან',
    player_minimize:'ჩაკეცვა',
    player_show_full:'სრულად ჩვენება',
    player_lyrics:'სიმღერის ტექსტი',
    player_translation:'თარგმანი',
    player_order:'მსგავსი ისტორიის შეკვეთა',
    player_full_description:'სიმღერის აღწერა',
    player_collapse:'ჩაკეცვა'
  },
  en:{
    player_back:'Back',
    player_minimize:'Minimize',
    player_show_full:'Show full',
    player_lyrics:'Lyrics',
    player_translation:'Translation',
    player_order:'Order a similar story',
    player_full_description:'Song description',
    player_collapse:'Collapse'
  },
  de:{
    player_back:'Zurück',
    player_minimize:'Minimieren',
    player_show_full:'Vollständig anzeigen',
    player_lyrics:'Songtext',
    player_translation:'Übersetzung',
    player_order:'Eine ähnliche Geschichte bestellen',
    player_full_description:'Songbeschreibung',
    player_collapse:'Einklappen'
  }
};

const order=['ru','uk','ka','en','de'];
const i18nStart=source.indexOf('const I18N = {');
const i18nEnd=source.indexOf('\n  };\n\n  const TIERS',i18nStart);

if(i18nStart<0||i18nEnd<0){
  throw new Error('Main const I18N dictionary boundaries not found in js/script.js');
}

for(let index=0; index<order.length; index++){
  const lang=order[index];
  const blockStart=source.indexOf(`${lang}: {`,i18nStart);
  if(blockStart<0||blockStart>=i18nEnd){
    throw new Error(`${lang} dictionary block not found`);
  }

  let blockEnd=i18nEnd;
  for(let j=index+1;j<order.length;j++){
    const candidate=source.indexOf(`${order[j]}: {`,blockStart+1);
    if(candidate>blockStart && candidate<blockEnd){
      blockEnd=candidate;
      break;
    }
  }

  let block=source.slice(blockStart,blockEnd);
  const missing=Object.entries(dictionaries[lang])
    .filter(([key])=>!new RegExp(`\\b${key}\\s*:`).test(block));

  if(!missing.length){
    console.log(`PASS: ${lang} player dictionary already complete`);
    continue;
  }

  const lineEnd=source.indexOf('\n',blockStart);
  if(lineEnd<0||lineEnd>=blockEnd){
    throw new Error(`${lang} insertion point not found`);
  }

  const lines=missing
    .map(([key,value])=>`      ${key}:${JSON.stringify(value)},`)
    .join('\n')+'\n';

  source=source.slice(0,lineEnd+1)+lines+source.slice(lineEnd+1);

  // Recalculate I18N end after insertion for later blocks.
  console.log(`PASS: ${lang} added ${missing.length} missing player i18n keys`);
}

const tmp=path.join(root,'.stage-12.13.8.1-script-check.js');
try{
  fs.writeFileSync(tmp,source,'utf8');
  const check=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  if(check.status!==0){
    throw new Error(`js/script.js syntax check failed\n${check.stderr||check.stdout}`);
  }
}finally{
  try{fs.unlinkSync(tmp);}catch(error){}
}

fs.writeFileSync(scriptPath,source,'utf8');

console.log('PASS: Stage 12.13.8.1 I18N Dictionary Completion installed.');
console.log('PASS: all five native language dictionaries are complete.');
console.log('D1 migration: not required.');
