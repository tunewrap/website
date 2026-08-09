#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const js=fs.readFileSync(path.resolve(__dirname,'../js/wide-copy-polish.js'),'utf8');

assert.match(js,/line\('Расскажите нам самое важное —'\)\+/);
assert.match(js,/line\('и мы создадим для вас персональную песню,'\)\+/);
assert.match(js,/line\('к которой захочется возвращаться спустя годы\.'\)/);
assert.doesNotMatch(js,/Расскажите нам самое важное — и мы создадим для вас персональную песню, к которой/);

console.log('PASS: Stage 12.1.5 hero copy hotfix — desktop hero closing sentence is split into 3 balanced lines.');
