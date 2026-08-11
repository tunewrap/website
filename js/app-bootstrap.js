const loading = document.createElement('div');
loading.className = 'catalog-bootstrap';
loading.innerHTML = '<span class="catalog-bootstrap-mark" aria-hidden="true"></span><span>Загружаем музыкальную библиотеку…</span>';
document.body.append(loading);

if(!document.getElementById('tunewrapResponsiveWide')){
  const responsiveWide=document.createElement('link');
  responsiveWide.id='tunewrapResponsiveWide';
  responsiveWide.rel='stylesheet';
  responsiveWide.href='/css/responsive-wide.css?v=12.2';
  document.head.append(responsiveWide);
}

if(!document.getElementById('tunewrapGiftCertificateStyles')){
  const giftCertificateStyles=document.createElement('link');
  giftCertificateStyles.id='tunewrapGiftCertificateStyles';
  giftCertificateStyles.rel='stylesheet';
  giftCertificateStyles.href='/css/gift-certificate-overlay.css?v=12.8';
  document.head.append(giftCertificateStyles);
}

if(!document.getElementById('tunewrapStage1281UX')){
  const stage1281=document.createElement('link');
  stage1281.id='tunewrapStage1281UX';
  stage1281.rel='stylesheet';
  stage1281.href='/css/stage-12.8.1-ux-hotfix.css?v=12.8.1';
  document.head.append(stage1281);
}

if(!document.getElementById('tunewrapStage1282CertificateFit')){
  const stage1282=document.createElement('link');
  stage1282.id='tunewrapStage1282CertificateFit';
  stage1282.rel='stylesheet';
  stage1282.href='/css/stage-12.8.2-certificate-fit.css?v=12.8.2';
  document.head.append(stage1282);
}

if(!document.getElementById('tunewrapStage1283RightClose')){
  const stage1283=document.createElement('link');
  stage1283.id='tunewrapStage1283RightClose';
  stage1283.rel='stylesheet';
  stage1283.href='/css/stage-12.8.3-right-close-ux.css?v=12.8.3';
  document.head.append(stage1283);
}

if(!document.getElementById('tunewrapStoryCategoryStyles')){
  const storyCategoryStyles=document.createElement('link');storyCategoryStyles.id='tunewrapStoryCategoryStyles';storyCategoryStyles.rel='stylesheet';storyCategoryStyles.href='/css/story-categories.css?v=12.7';document.head.append(storyCategoryStyles);
}

if(!document.getElementById('tunewrapOrderCompletionStyles')){
  const orderCompletionStyles=document.createElement('link');
  orderCompletionStyles.id='tunewrapOrderCompletionStyles';
  orderCompletionStyles.rel='stylesheet';
  orderCompletionStyles.href='/css/order-intake-completion.css?v=12.6';
  document.head.append(orderCompletionStyles);
}

if(!document.getElementById('tunewrapSiteCmsStyles')){
  const siteCmsStyles=document.createElement('link');
  siteCmsStyles.id='tunewrapSiteCmsStyles';
  siteCmsStyles.rel='stylesheet';
  siteCmsStyles.href='/css/site-cms.css?v=12.3';
  document.head.append(siteCmsStyles);
}

// CMS APIs are independent from Track Catalog.
// A CMS API failure must never break music or the rest of the site.
const pricingPromise=(async()=>{
  try{
    const response=await fetch('/api/pricing',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return null;
    const payload=await response.json();
    return payload?.ok&&payload?.config?payload.config:null;
  }catch(error){
    console.error('TuneWrap pricing bootstrap failed',error);
    return null;
  }
})();

const siteContentPromise=(async()=>{
  try{
    const response=await fetch('/api/site-content',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return null;
    const payload=await response.json();
    return payload?.ok&&payload?.config?payload.config:null;
  }catch(error){
    console.error('TuneWrap site content bootstrap failed',error);
    return null;
  }
})();

const storyCategoriesPromise=(async()=>{
  try{const response=await fetch('/api/story-categories',{headers:{accept:'application/json'},cache:'no-store'});if(!response.ok)return null;const payload=await response.json();return payload?.ok&&payload?.config?payload.config:null;}catch(error){console.error('TuneWrap Story Categories bootstrap failed',error);return null;}
})();

const soundPreferencesPromise=(async()=>{
  try{
    const response=await fetch('/api/sound-preferences',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return null;
    const payload=await response.json();
    return payload?.ok&&payload?.config?payload.config:null;
  }catch(error){
    console.error('TuneWrap Sound Preferences bootstrap failed',error);
    return null;
  }
})();

try{
  const response = await fetch('/api/tracks',{headers:{accept:'application/json'},cache:'no-store'});
  if(!response.ok) throw new Error(`Track Catalog API: HTTP ${response.status}`);
  const payload = await response.json();
  if(!payload || !Array.isArray(payload.tracks)) throw new Error('Track Catalog API returned invalid data');
  window.TUNEWRAP_TRACK_CATALOG = payload.tracks;
  window.TUNEWRAP_STORY_CATEGORIES = await storyCategoriesPromise;

  await import('./catalog-runtime.js');
  await import('./script.js');

  await import('./wide-copy-polish.js');
  await import('./wedding-detail-wide.js');

  window.TUNEWRAP_PRICING_CMS=await pricingPromise;
  try{
    await import('./pricing-cms-runtime.js');
  }catch(error){
    console.error('TuneWrap Pricing CMS runtime failed',error);
  }

  // Gift Certificate uses live Pricing CMS and the existing certificate CRM flow.
  try{
    await import('./gift-certificate-overlay.js');
  }catch(error){
    console.error('TuneWrap Stage 12.8 gift certificate overlay failed',error);
  }

  // Site CMS is the final content layer for non-pricing marketing text,
  // contact channels, payment cards and Terms.
  window.TUNEWRAP_SITE_CMS=await siteContentPromise;
  if(window.TUNEWRAP_SITE_CMS){
    try{
      await import('./site-cms-runtime.js');
    }catch(error){
      console.error('TuneWrap Site CMS runtime failed',error);
    }
  }

  // Sound Preferences CMS owns the public style/instrument choices.
  // API failure keeps the built-in style form as a safe fallback.
  window.TUNEWRAP_SOUND_PREFERENCES=await soundPreferencesPromise;
  if(window.TUNEWRAP_SOUND_PREFERENCES){
    try{
      await import('./sound-preferences-runtime.js');
    }catch(error){
      console.error('TuneWrap Sound Preferences runtime failed',error);
    }
  }

  // Stage 12.6: vocal preference is part of the structured order payload.
  try{
    await import('./order-intake-completion.js');
  }catch(error){
    console.error('TuneWrap Stage 12.6 order completion runtime failed',error);
  }

  // Orders CRM is loaded after Pricing + Site CMS so it sees final price/contact state.
  try{
    await import('./orders-submit.js');
  }catch(error){
    console.error('TuneWrap order intake bootstrap failed',error);
  }

  await import('./responsive-wide.js');
  await import('./playback-engine.js');

  try{
    await import('./ux-critical-fixes.js');
  }catch(error){
    console.error('TuneWrap Stage 12.4 UX runtime failed',error);
  }

  try{
    await import('./stage-12.8.1-ux-hotfix.js');
  }catch(error){
    console.error('TuneWrap Stage 12.8.1 UX hotfix failed',error);
  }

  try{
    await import('./stage-12.8.3-right-close-ux.js');
  }catch(error){
    console.error('TuneWrap Stage 12.8.3 right-side close UX failed',error);
  }

  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();
}catch(error){
  console.error('TuneWrap catalog bootstrap failed',error);
  loading.classList.add('is-error');
  loading.innerHTML = '<strong>Библиотека временно недоступна</strong><span>Обновите страницу через несколько секунд.</span><button type="button">Обновить</button>';
  loading.querySelector('button').addEventListener('click',() => location.reload());
}
