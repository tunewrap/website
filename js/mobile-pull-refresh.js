// TuneWrap Stage 12.14.15 — controlled pull-to-refresh with deterministic Home restore.
(function(){
  'use strict';

  const media=window.matchMedia('(max-width:620px) and (pointer:coarse)');
  const appScroll=document.getElementById('appScroll');
  if(!media.matches||!appScroll)return;

  const START_DISTANCE=10;
  const REFRESH_THRESHOLD=66;
  const MAX_DISTANCE=94;
  let gesture=null;
  let refreshing=false;
  let settleTimer=0;

  const copy={
    en:{pull:'Pull down to refresh',release:'Release to refresh',loading:'Refreshing…'},
    ru:{pull:'Потяните вниз для обновления',release:'Отпустите для обновления',loading:'Обновляем…'},
    uk:{pull:'Потягніть вниз для оновлення',release:'Відпустіть для оновлення',loading:'Оновлюємо…'},
    ka:{pull:'ჩამოსწიეთ განახლებისთვის',release:'გაუშვით განახლებისთვის',loading:'ახლდება…'},
    de:{pull:'Zum Aktualisieren nach unten ziehen',release:'Zum Aktualisieren loslassen',loading:'Wird aktualisiert…'}
  };

  function language(){
    const value=String(window.TuneWrapLanguage?.get?.()||document.documentElement.lang||'en').toLowerCase();
    if(value.startsWith('ru'))return'ru';
    if(value.startsWith('uk'))return'uk';
    if(value.startsWith('ka'))return'ka';
    if(value.startsWith('de'))return'de';
    return'en';
  }

  const indicator=document.createElement('div');
  indicator.id='tuneWrapPullRefresh';
  indicator.className='tune-wrap-pull-refresh';
  indicator.setAttribute('role','status');
  indicator.setAttribute('aria-live','polite');
  indicator.innerHTML='<span aria-hidden="true"></span><strong></strong>';
  document.body.append(indicator);

  function words(){return copy[language()]||copy.en;}
  function label(value){indicator.querySelector('strong').textContent=value;}

  function overlaysAreOpen(){
    return document.documentElement.classList.contains('overlay-open')||[
      'song-player-open','music-library-open','corporate-panel-open',
      'gift-certificate-overlay-open','tw-package-chooser-open'
    ].some(name=>document.body.classList.contains(name));
  }

  function scrollChainIsAtTop(target){
    let node=target?.nodeType===1?target:null;
    while(node&&node!==appScroll){
      if(node.scrollHeight>node.clientHeight+2&&node.scrollTop>1)return false;
      node=node.parentElement;
    }
    return true;
  }

  function setDistance(distance){
    const safe=Math.max(0,Math.min(MAX_DISTANCE,distance));
    appScroll.style.setProperty('--tw-pull-distance',`${safe}px`);
    indicator.style.setProperty('--tw-pull-progress',String(Math.min(1,safe/REFRESH_THRESHOLD)));
    return safe;
  }

  function show(){
    window.clearTimeout(settleTimer);
    appScroll.classList.add('is-pull-refreshing');
    appScroll.classList.remove('is-pull-settling');
    indicator.classList.add('is-visible');
  }

  function reset(immediate=false){
    gesture=null;
    appScroll.classList.remove('is-pull-refreshing');
    appScroll.classList.add('is-pull-settling');
    setDistance(0);
    indicator.classList.remove('is-ready','is-loading');
    if(immediate){
      indicator.classList.remove('is-visible');
      appScroll.classList.remove('is-pull-settling');
      return;
    }
    settleTimer=window.setTimeout(()=>{
      indicator.classList.remove('is-visible');
      appScroll.classList.remove('is-pull-settling');
    },240);
  }

  function reloadFresh(){
    const url=new URL(location.href);
    // Bottom navigation intentionally writes #pricing/#contactHub. A refresh
    // is a new visit to TuneWrap Home, not a request to reopen that old screen.
    url.hash='';
    url.searchParams.set('tw-refresh',Date.now().toString(36));
    if('scrollRestoration' in history)history.scrollRestoration='manual';
    appScroll.scrollTop=0;
    location.replace(url.href);
  }

  appScroll.addEventListener('touchstart',event=>{
    if(refreshing||event.touches.length!==1||appScroll.scrollTop>1||overlaysAreOpen())return;
    const touch=event.touches[0];
    gesture={
      startX:touch.clientX,
      startY:touch.clientY,
      target:event.target,
      active:false,
      ready:false,
      distance:0
    };
  },{capture:true,passive:true});

  appScroll.addEventListener('touchmove',event=>{
    if(!gesture||refreshing||event.touches.length!==1)return;
    const touch=event.touches[0];
    const deltaX=touch.clientX-gesture.startX;
    const deltaY=touch.clientY-gesture.startY;

    if(!gesture.active){
      if(Math.abs(deltaX)>Math.abs(deltaY)&&Math.abs(deltaX)>START_DISTANCE){gesture=null;return;}
      if(deltaY<=START_DISTANCE)return;
      if(appScroll.scrollTop>1||!scrollChainIsAtTop(gesture.target)){gesture=null;return;}
      gesture.active=true;
      label(words().pull);
      show();
    }

    if(deltaY<=0){reset();return;}
    event.preventDefault();
    event.stopPropagation();
    gesture.distance=setDistance((deltaY-START_DISTANCE)*0.52);
    gesture.ready=gesture.distance>=REFRESH_THRESHOLD;
    indicator.classList.toggle('is-ready',gesture.ready);
    label(gesture.ready?words().release:words().pull);
  },{capture:true,passive:false});

  appScroll.addEventListener('touchend',event=>{
    if(!gesture?.active)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const shouldRefresh=gesture.ready;
    gesture=null;
    if(!shouldRefresh){reset();return;}

    refreshing=true;
    indicator.classList.remove('is-ready');
    indicator.classList.add('is-loading');
    label(words().loading);
    setDistance(48);
    window.setTimeout(reloadFresh,180);
  },{capture:true,passive:false});

  appScroll.addEventListener('touchcancel',()=>{
    if(gesture?.active)reset();
    else gesture=null;
  },{capture:true,passive:true});

  window.TuneWrapPullRefresh=Object.freeze({enabled:true,threshold:REFRESH_THRESHOLD});
})();
