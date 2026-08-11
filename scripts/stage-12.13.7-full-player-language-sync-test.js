#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

for(const rel of ['js/script.js','js/catalog-runtime.js','js/catalog-core.js','js/playback-engine.js']){
  const syntax=spawnSync(process.execPath,['--check',path.join(root,rel)],{encoding:'utf8'});
  assert.equal(syntax.status,0,`${rel}\n${syntax.stderr||syntax.stdout}`);
}

const script=read('js/script.js');
const runtime=read('js/catalog-runtime.js');
const coreSource=read('js/catalog-core.js');
const player=read('js/playback-engine.js');
const pkg=JSON.parse(read('package.json'));

assert.ok(script.includes('window.TUNEWRAP_CURRENT_LANGUAGE = lang;'));
assert.ok(runtime.includes('window.TUNEWRAP_CURRENT_LANGUAGE ||'));
assert.ok(runtime.includes("return Core.UI_LANGUAGES.includes(language) ? language : 'en';"));

assert.ok(player.includes('const PLAYER_VISIBLE_UI'));
assert.ok(player.includes("en:{back:'Back'"));
assert.ok(player.includes("ru:{back:'Назад'"));
assert.ok(player.includes("uk:{back:'Назад'"));
assert.ok(player.includes("ka:{back:'უკან'"));
assert.ok(player.includes("de:{back:'Zurück'"));
assert.ok(player.includes("document.querySelectorAll('[data-player-i18n]')"));
assert.ok(player.includes('window.TUNEWRAP_CURRENT_LANGUAGE ||'));
assert.ok(player.includes('function itemLocale(item)'));
assert.ok(player.includes('if(code===original) return value.original ||')); 

/* Verify the actual catalog-core behavior with Node. */
const Core=require(path.join(root,'js/catalog-core.js'));

const oldEnglishTrack={
  id:'just-five-more-minutes-en',
  language:'EN',
  title:'Just Five More Minutes',
  titles:{ru:'Осталось всего пять минут.'},
  descriptions:{ru:'Русское описание'}
};
assert.equal(Core.title(oldEnglishTrack,'en'),'Just Five More Minutes');
assert.equal(Core.description(oldEnglishTrack,'en'),'');

const uaTrack={
  id:'grow-old-together-ua',
  language:'UA',
  title:'Ми будемо старіти разом',
  titles:{uk:'Ми будемо старіти разом',en:"We'll Grow Old Together",ru:'Мы будем стареть вместе'},
  descriptions:{uk:'Опис українською',en:'English description',ru:'Русское описание'}
};
assert.equal(Core.title(uaTrack,'en'),"We'll Grow Old Together");
assert.equal(Core.description(uaTrack,'en'),'English description');
assert.equal(Core.title(uaTrack,'uk'),'Ми будемо старіти разом');

const enWithoutRu={
  id:'en-track',language:'EN',title:'English Original',titles:{en:'English Original'}
};
assert.equal(Core.title(enWithoutRu,'ru'),'English Original');

assert.equal(pkg.scripts['playerlang:test'],'node scripts/stage-12.13.7-full-player-language-sync-test.js');
assert.ok(pkg.scripts.test.includes('playerlang:test'));

console.log('PASS: Stage 12.13.7 — Full Player language labels + stable native language state + safe track fallback.');
