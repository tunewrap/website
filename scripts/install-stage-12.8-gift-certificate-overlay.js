#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=rel=>path.join(root,rel);
function read(rel){const p=file(rel);if(!fs.existsSync(p))throw new Error(`Missing required file: ${rel}`);return fs.readFileSync(p,'utf8');}
function replaceOnce(text,needle,replacement,label){if(text.includes(replacement))return text;const count=text.split(needle).length-1;if(count!==1)throw new Error(`${label}: expected exactly 1 target, found ${count}`);return text.replace(needle,replacement);}
let bootstrap=read('js/app-bootstrap.js');
bootstrap=replaceOnce(bootstrap,
"if(!document.getElementById('tunewrapStoryCategoryStyles')){",
`if(!document.getElementById('tunewrapGiftCertificateStyles')){
  const giftCertificateStyles=document.createElement('link');
  giftCertificateStyles.id='tunewrapGiftCertificateStyles';
  giftCertificateStyles.rel='stylesheet';
  giftCertificateStyles.href='/css/gift-certificate-overlay.css?v=12.8';
  document.head.append(giftCertificateStyles);
}

if(!document.getElementById('tunewrapStoryCategoryStyles')){`,
'gift certificate stylesheet');
bootstrap=replaceOnce(bootstrap,
`  // Site CMS is the final content layer for non-pricing marketing text,`,
`  // Gift Certificate uses live Pricing CMS and the existing certificate CRM flow.
  try{
    await import('./gift-certificate-overlay.js');
  }catch(error){
    console.error('TuneWrap Stage 12.8 gift certificate overlay failed',error);
  }

  // Site CMS is the final content layer for non-pricing marketing text,`,
'gift certificate runtime import');
fs.writeFileSync(file('js/app-bootstrap.js'),bootstrap,'utf8');
const pkg=JSON.parse(read('package.json'));pkg.scripts||={};pkg.scripts['certificate:test']='node scripts/gift-certificate-overlay-test.js';if(typeof pkg.scripts.test==='string'&&!pkg.scripts.test.includes('certificate:test'))pkg.scripts.test+=' && npm run certificate:test';fs.writeFileSync(file('package.json'),JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('PASS: Stage 12.8 Gift Certificate Overlay installer applied.');
console.log('Gift certificate now opens as a floating overlay with all live Pricing CMS offers.');
console.log('The existing certificate CRM order flow is reused after package selection.');
console.log('D1 migration is not required.');
