#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');

function patch(rel, replacements){
  const p=path.join(root,rel);
  if(!fs.existsSync(p))throw new Error(`Missing test file: ${rel}`);
  let text=fs.readFileSync(p,'utf8');

  for(const [from,to,label] of replacements){
    if(text.includes(to))continue;
    if(!text.includes(from)){
      throw new Error(`Anchor not found in ${rel}: ${label}`);
    }
    text=text.replace(from,to);
  }

  fs.writeFileSync(p,text,'utf8');
  console.log(`PASS: ${rel}`);
}

patch('scripts/admin-catalog-test.js',[
  [
    'assert.match(index,/type="module" src="js\\/app-bootstrap\\.js"/);',
    'assert.match(index,/type="module" src="js\\/app-bootstrap\\.js(?:\\?v=[^"]+)?"/);',
    'versioned app-bootstrap src'
  ]
]);

patch('scripts/orders-crm-test.js',[
  [
    "assert.match(bootstrap,/import\\('\\.\\/orders-submit\\.js'\\)/);",
    "assert.match(bootstrap,/import\\('\\.\\/orders-submit\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned orders-submit import'
  ]
]);

patch('scripts/gift-certificate-overlay-test.js',[
  [
    "assert.match(bootstrap,/import\\('\\.\\/gift-certificate-overlay\\.js'\\)/);",
    "assert.match(bootstrap,/import\\('\\.\\/gift-certificate-overlay\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned gift certificate import'
  ]
]);

patch('scripts/pricing-cms-test.js',[
  [
    'const scriptImport=bootstrap.indexOf("import(\'./script.js\')");',
    "const scriptImport=bootstrap.search(/import\\('\\.\\/script\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned script import'
  ],
  [
    'const pricingImport=bootstrap.indexOf("import(\'./pricing-cms-runtime.js\')");',
    "const pricingImport=bootstrap.search(/import\\('\\.\\/pricing-cms-runtime\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned pricing import'
  ],
  [
    'const ordersImport=bootstrap.indexOf("import(\'./orders-submit.js\')");',
    "const ordersImport=bootstrap.search(/import\\('\\.\\/orders-submit\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned orders import'
  ]
]);

patch('scripts/site-cms-test.js',[
  [
    'const core=bootstrap.indexOf("import(\'./script.js\')");',
    "const core=bootstrap.search(/import\\('\\.\\/script\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned script import'
  ],
  [
    'const site=bootstrap.indexOf("import(\'./site-cms-runtime.js\')");',
    "const site=bootstrap.search(/import\\('\\.\\/site-cms-runtime\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned site import'
  ],
  [
    'const orders=bootstrap.indexOf("import(\'./orders-submit.js\')");',
    "const orders=bootstrap.search(/import\\('\\.\\/orders-submit\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned orders import'
  ]
]);

patch('scripts/responsive-wide-test.js',[
  [
    'const engineLoad=bootstrap.indexOf("import(\'./playback-engine.js\')");',
    "const engineLoad=bootstrap.search(/import\\('\\.\\/playback-engine\\.js(?:\\?v=[^']+)?'\\)/);",
    'versioned playback-engine import'
  ]
]);

console.log('PASS: Stage 12.13.8 legacy tests now accept cache-versioned imports.');
console.log('No production/runtime files were changed.');
