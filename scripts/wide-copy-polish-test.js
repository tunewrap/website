#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css/responsive-wide.css'),'utf8');
const js=fs.readFileSync(path.join(root,'js/wide-copy-polish.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'js/app-bootstrap.js'),'utf8');

assert.match(css,/STAGE 12\.1\.4 · WIDE COPY \+ PRICING ALIGNMENT/);
assert.match(css,/#pricing \.tier-card,[\s\S]*#pricing \.tier-card\.featured[\s\S]*min-height:238px !important/);
assert.match(css,/#pricing \.wedding-packages-eyebrow[\s\S]*font-family:'Fraunces'/);
assert.match(css,/#contact \.sec-head p[\s\S]*white-space:nowrap/);

assert.match(js,/Сначала — ваша история\./);
assert.doesNotMatch(js,/«Сначала|музыка\.»/);
assert.match(js,/Число на обручальном кольце\./);
assert.match(js,/Потом — текст, музыка и момент, в котором близкие узнают себя\./);
assert.match(js,/Авторские песни из путешествий, встреч, свободы выбора и любви к жизни\./);
assert.match(js,/до полного создания истории и текста\./);
assert.match(js,/Свадебный формат/);
assert.match(js,/Музыка для моментов,/);
assert.match(js,/Выберите пакет и стиль, расскажите о человеке — и мы отправим готовую заявку в один клик\./);

const copyImport=bootstrap.indexOf("import('./wide-copy-polish.js')");
const responsiveImport=bootstrap.indexOf("import('./responsive-wide.js')");
assert.ok(copyImport>=0 && responsiveImport>=0 && copyImport<responsiveImport);

assert.doesNotMatch(css.slice(css.indexOf('STAGE 12.1.4')),/@media\s*\([^)]*max-width\s*:\s*620px/i);

console.log('PASS: Stage 12.1.4 wide copy polish — reviewed RU line breaks, quote marks removed, wedding heading promoted, pricing cards equalized, phone <=620px untouched.');
