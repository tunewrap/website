const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
const robots=read('robots.txt');
const sitemap=read('sitemap.xml');
const headers=read('_headers');

assert.ok(html.includes('<meta name="tunewrap-build" content="12.14.16">'),'build version is not 12.14.16');
assert.ok(html.includes('name="robots" content="index, follow'),'public page must be indexable');
assert.ok(html.includes('rel="canonical" href="https://tunewrap.studio/"'),'canonical URL is missing');
assert.ok(html.includes('type="application/ld+json"'),'structured data is missing');
assert.ok(html.includes('"@type": "Organization"'),'Organization schema is missing');
assert.ok(html.includes('"@type": "WebSite"'),'WebSite schema is missing');
const structuredData=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(structuredData,'structured data block cannot be read');
assert.doesNotThrow(()=>JSON.parse(structuredData[1]),'structured data must be valid JSON');
assert.ok(html.includes('id="tunewrapSeoLocale"'),'localized SEO metadata is missing');
assert.ok(html.includes('href="/favicon.svg"'),'favicon is missing');

const languages=['en','ru','uk','ka','de'];
for(const language of languages){
  assert.ok(html.includes(`hreflang="${language}"`),`HTML hreflang ${language} is missing`);
  assert.ok(sitemap.includes(`hreflang="${language}"`),`sitemap hreflang ${language} is missing`);
}
assert.ok(html.includes('hreflang="x-default"'),'x-default alternate is missing');
assert.ok(sitemap.includes('hreflang="x-default"'),'sitemap x-default is missing');

const expectedUrls=[
  'https://tunewrap.studio/',
  'https://tunewrap.studio/?lang=ru',
  'https://tunewrap.studio/?lang=uk',
  'https://tunewrap.studio/?lang=ka',
  'https://tunewrap.studio/?lang=de'
];
for(const url of expectedUrls){
  assert.ok(sitemap.includes(`<loc>${url}</loc>`),`sitemap URL is missing: ${url}`);
}

assert.ok(robots.includes('User-agent: *'),'robots.txt user agent is missing');
assert.ok(robots.includes('Allow: /'),'public crawl permission is missing');
assert.ok(robots.includes('Disallow: /admin/'),'admin crawl block is missing');
assert.ok(robots.includes('Sitemap: https://tunewrap.studio/sitemap.xml'),'sitemap declaration is missing');
assert.ok(headers.includes('/api/*'),'API noindex headers are missing');
assert.ok(headers.includes('/sitemap.xml'),'sitemap cache headers are missing');

console.log('Stage 12.14.16 search indexing SEO test: PASS');
