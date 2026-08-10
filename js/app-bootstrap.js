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

// Pricing CMS is independent from Track Catalog.
// A pricing API failure must never break music or the rest of the site.
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

try{
  const response = await fetch('/api/tracks',{headers:{accept:'application/json'},cache:'no-store'});
  if(!response.ok) throw new Error(`Track Catalog API: HTTP ${response.status}`);
  const payload = await response.json();
  if(!payload || !Array.isArray(payload.tracks)) throw new Error('Track Catalog API returned invalid data');
  window.TUNEWRAP_TRACK_CATALOG = payload.tracks;

  await import('./catalog-runtime.js');
  await import('./script.js');

  // Existing wide copy runs first. Pricing CMS runs afterwards and therefore
  // remains the final source of truth for the Pricing screen.
  await import('./wide-copy-polish.js');
  await import('./wedding-detail-wide.js');

  window.TUNEWRAP_PRICING_CMS=await pricingPromise;
  try{
    await import('./pricing-cms-runtime.js');
  }catch(error){
    console.error('TuneWrap Pricing CMS runtime failed',error);
  }

  // Orders CRM is loaded AFTER Pricing CMS so it stores the final CMS price.
  try{
    await import('./orders-submit.js');
  }catch(error){
    console.error('TuneWrap order intake bootstrap failed',error);
  }

  await import('./responsive-wide.js');
  await import('./playback-engine.js');

  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();
}catch(error){
  console.error('TuneWrap catalog bootstrap failed',error);
  loading.classList.add('is-error');
  loading.innerHTML = '<strong>Библиотека временно недоступна</strong><span>Обновите страницу через несколько секунд.</span><button type="button">Обновить</button>';
  loading.querySelector('button').addEventListener('click',() => location.reload());
}
