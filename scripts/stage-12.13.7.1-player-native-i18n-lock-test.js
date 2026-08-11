#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const html=read('index.html');
const player=read('js/playback-engine.js');
const pkg=JSON.parse(read('package.json'));

const syntax=spawnSync(process.execPath,['--check',path.join(root,'js/playback-engine.js')],{encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.stdout);

assert.ok(html.includes('class="song-player-screen notranslate"'));
assert.ok(html.includes('id="songPlayerScreen"'));
assert.ok(html.includes('translate="no"'));
assert.ok(html.includes('class="top-mini-player notranslate"'));
assert.ok(html.includes('<span data-player-i18n="back">Back</span>'));
assert.ok(html.includes('data-player-i18n="minimize">Minimize</button>'));
assert.ok(html.includes('<h2 data-player-i18n="lyrics">Lyrics</h2>'));
assert.ok(html.includes('data-player-i18n="order">Order a similar story</a>'));

assert.ok(player.includes('function syncVisiblePlayerLabels()'));
assert.ok(player.includes("screen.querySelectorAll('[data-player-i18n]')"));
assert.ok(player.includes('function fillPlayer(item){\n      if(!item) return;\n      syncVisiblePlayerLabels();'));
assert.ok(player.includes('function openPlayer(item,origin,autoplay){\n      if(!item) return;\n      syncVisiblePlayerLabels();'));
assert.ok(player.includes('function syncLocalizedPlayer(){\n      const labels = ui();\n      syncVisiblePlayerLabels();'));

assert.equal(pkg.scripts['playeri18nlock:test'],'node scripts/stage-12.13.7.1-player-native-i18n-lock-test.js');
assert.ok(pkg.scripts.test.includes('playeri18nlock:test'));
console.log('PASS: Stage 12.13.7.1 — player UI is native-i18n controlled and browser-translate locked.');
