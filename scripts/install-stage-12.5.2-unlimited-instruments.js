#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function read(rel){
  const file=path.join(root,rel);
  if(!fs.existsSync(file))throw new Error(`Missing file: ${rel}`);
  return fs.readFileSync(file,'utf8');
}
function write(rel,text){fs.writeFileSync(path.join(root,rel),text,'utf8');}
function replaceOnce(text,needle,replacement,label){
  if(text.includes(replacement))return text;
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);
  return text.replace(needle,replacement);
}

let runtime=read('js/sound-preferences-runtime.js');

const copyPatches=[
  [
    "instrumentsHint:'Выберите от 1 до 5 вариантов. «На усмотрение TuneWrap» заменяет остальные.'",
    "instrumentsHint:'Выберите нужные инструменты — количество не ограничено. «На усмотрение TuneWrap» заменяет остальные.'"
  ],
  [
    "instrumentsHint:'Оберіть від 1 до 5 варіантів. «На розсуд TuneWrap» замінює решту.'",
    "instrumentsHint:'Оберіть потрібні інструменти — кількість не обмежена. «На розсуд TuneWrap» замінює решту.'"
  ],
  [
    "instrumentsHint:'აირჩიეთ 1-დან 5-მდე ვარიანტი. „TuneWrap-ის არჩევანი“ დანარჩენებს ცვლის.'",
    "instrumentsHint:'აირჩიეთ სასურველი ინსტრუმენტები — რაოდენობა შეზღუდული არ არის. „TuneWrap-ის არჩევანი“ დანარჩენებს ცვლის.'"
  ],
  [
    "instrumentsHint:'Choose 1–5 options. “TuneWrap choice” replaces the other selections.'",
    "instrumentsHint:'Choose any instruments you want — there is no selection limit. “TuneWrap choice” replaces the other selections.'"
  ],
  [
    "instrumentsHint:'Wählen Sie 1–5 Optionen. „TuneWrap-Auswahl“ ersetzt die anderen.'",
    "instrumentsHint:'Wählen Sie beliebig viele gewünschte Instrumente. „TuneWrap-Auswahl“ ersetzt die anderen.'"
  ]
];
for(const [needle,replacement] of copyPatches){
  runtime=replaceOnce(runtime,needle,replacement,'instrument hint copy');
}

runtime=replaceOnce(
  runtime,
  `function maxFor(kind){
  const raw=kind==='styles'?CONFIG?.settings?.maxStyles:CONFIG?.settings?.maxInstruments;
  return Math.max(1,Math.min(5,Number(raw)||5));
}`,
  `function maxStyles(){
  const raw=CONFIG?.settings?.maxStyles;
  return Math.max(1,Math.min(5,Number(raw)||5));
}`,
  'runtime max styles'
);

runtime=replaceOnce(
  runtime,
  "  const max=maxFor('styles');",
  "  const max=maxStyles();",
  'runtime style max call'
);

runtime=replaceOnce(
  runtime,
  `function toggleInstrument(id){
  const item=itemById('instruments',id);
  if(!item)return;
  const max=maxFor('instruments');
  if(item.exclusive){
    state.selectedInstruments=state.selectedInstruments.includes(id)?[]:[id];
  }else{
    state.selectedInstruments=state.selectedInstruments.filter(value=>!itemById('instruments',value)?.exclusive);
    if(state.selectedInstruments.includes(id)){
      state.selectedInstruments=state.selectedInstruments.filter(value=>value!==id);
    }else if(state.selectedInstruments.length<max){
      state.selectedInstruments=[...state.selectedInstruments,id];
    }else{
      setHint($('#soundInstrumentField'),copy().instrumentLimit,true);
      return;
    }
  }
  renderInstruments();
  clearFieldError($('#soundInstrumentField'));
}`,
  `function toggleInstrument(id){
  const item=itemById('instruments',id);
  if(!item)return;
  if(item.exclusive){
    state.selectedInstruments=state.selectedInstruments.includes(id)?[]:[id];
  }else{
    state.selectedInstruments=state.selectedInstruments.filter(value=>!itemById('instruments',value)?.exclusive);
    if(state.selectedInstruments.includes(id)){
      state.selectedInstruments=state.selectedInstruments.filter(value=>value!==id);
    }else{
      state.selectedInstruments=[...state.selectedInstruments,id];
    }
  }
  renderInstruments();
  clearFieldError($('#soundInstrumentField'));
}`,
  'runtime unlimited instruments'
);

write('js/sound-preferences-runtime.js',runtime);

let shared=read('functions/_shared/sound-preferences.js');
shared=replaceOnce(
  shared,
  `    settings:{
      maxStyles:5,
      maxInstruments:5
    },`,
  `    settings:{
      maxStyles:5,
      maxInstruments:null
    },`,
  'sound config unlimited instruments'
);
write('functions/_shared/sound-preferences.js',shared);

let orders=read('functions/_shared/orders.js');
orders=replaceOnce(
  orders,
  "    instruments:listStrings(input?.instruments,5,160),\n    soundPrompt:clean(input?.soundPrompt,1600,{label:'Sound prompt'}),",
  "    instruments:listStrings(input?.instruments,80,160),\n    soundPrompt:clean(input?.soundPrompt,12000,{label:'Sound prompt'}),",
  'orders unlimited instrument intake'
);
write('functions/_shared/orders.js',orders);

let adminHtml=read('admin/sound.html');
adminHtml=replaceOnce(
  adminHtml,
  '<p>Клиент выбирает 1–5 вариантов. «На усмотрение TuneWrap» работает как отдельный эксклюзивный выбор.</p>',
  '<p>Клиент может выбрать любое количество инструментов. «На усмотрение TuneWrap» работает как отдельный эксклюзивный выбор.</p>',
  'admin sound wording'
);
write('admin/sound.html',adminHtml);

let test=read('scripts/sound-preferences-cms-test.js');
test=replaceOnce(
  test,
  "assert.match(runtime,/maxInstruments/);",
  "assert.match(shared,/maxInstruments:null/);\nassert.doesNotMatch(runtime,/maxFor\\('instruments'\\)/);",
  'sound cms test unlimited instruments'
);
test=replaceOnce(
  test,
  "console.log('PASS: Stage 12.5 Sound Preferences CMS — live styles/instruments, Admin editor, multilingual labels, required instrument choice, Orders/Suno snapshot and safe fallback.');",
  "console.log('PASS: Stage 12.5 Sound Preferences CMS — live styles/instruments, unlimited instrument selection, Admin editor, multilingual labels, required instrument choice, Orders/Suno snapshot and safe fallback.');",
  'sound cms test message'
);
write('scripts/sound-preferences-cms-test.js',test);

console.log('PASS: Stage 12.5.2 Unlimited Instruments installed.');
console.log('Styles remain limited to 5.');
console.log('Instruments can now be selected without a UI limit; all selections are preserved in Orders/Suno data.');
console.log('D1 migration is not required.');
