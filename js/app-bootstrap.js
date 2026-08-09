const loading = document.createElement('div');
loading.className = 'catalog-bootstrap';
loading.innerHTML = '<span class="catalog-bootstrap-mark" aria-hidden="true"></span><span>Загружаем музыкальную библиотеку…</span>';
document.body.append(loading);

// Stage 12.1: wide layout is an additive layer. Its CSS starts at 621px,
// therefore the verified phone UI is byte-for-byte governed by the old stylesheet.
if(!document.getElementById('tunewrapResponsiveWide')){
  const responsiveWide=document.createElement('link');
  responsiveWide.id='tunewrapResponsiveWide';
  responsiveWide.rel='stylesheet';
  responsiveWide.href='/css/responsive-wide.css?v=12.1';
  document.head.append(responsiveWide);
}

try{
  const response = await fetch('/api/tracks',{headers:{accept:'application/json'},cache:'no-store'});
  if(!response.ok) throw new Error(`Track Catalog API: HTTP ${response.status}`);
  const payload = await response.json();
  if(!payload || !Array.isArray(payload.tracks)) throw new Error('Track Catalog API returned invalid data');
  window.TUNEWRAP_TRACK_CATALOG = payload.tracks;
  await import('./catalog-runtime.js');
  await import('./script.js');

  // Stage 12 order intake is deliberately isolated from the music/player bootstrap.
  // A CRM/API problem must never make the music library unavailable.
  try{
    await import('./orders-submit.js');
  }catch(error){
    console.error('TuneWrap order intake bootstrap failed',error);
  }

  // Register the tablet/desktop presentation adapter before the playback engine.
  // It never owns audio; it only reveals the existing player UI on wider screens.
  await import('./wide-copy-polish.js');
  await import('./responsive-wide.js');
  await import('./playback-engine.js');

  // Dynamic imports may finish after the browser's native DOMContentLoaded.
  // Stage 10 modules register on that event, so replay it only when it has
  // already passed. When the document is still loading, the native event is
  // allowed to initialize everything exactly once.
  if(document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
  loading.remove();
}catch(error){
  console.error('TuneWrap catalog bootstrap failed',error);
  loading.classList.add('is-error');
  loading.innerHTML = '<strong>Библиотека временно недоступна</strong><span>Обновите страницу через несколько секунд.</span><button type="button">Обновить</button>';
  loading.querySelector('button').addEventListener('click',() => location.reload());
}
