// TuneWrap Stage 12.14.15 — mobile-safe freshness with deterministic Home restore.
(function(){
  'use strict';

  const BUILD=String(document.querySelector('meta[name="tunewrap-build"]')?.content||'').trim();
  const MIN_CHECK_INTERVAL=30000;
  const BACKGROUND_POLL_INTERVAL=180000;
  const API_ENDPOINTS=Object.freeze([
    ['/api/tracks','tracks'],
    ['/api/pricing','config'],
    ['/api/site-content','config'],
    ['/api/story-categories','config'],
    ['/api/sound-preferences','config']
  ]);

  let baseline='';
  let checking=false;
  let lastCheckAt=0;
  let pendingToken='';
  let formDirty=false;
  let notice=null;

  function stableHash(value){
    const source=JSON.stringify(value??null);
    let hash=2166136261;
    for(let index=0;index<source.length;index+=1){
      hash^=source.charCodeAt(index);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36);
  }

  function snapshot(value){
    return stableHash({
      tracks:value?.tracks||[],
      pricing:value?.pricing||null,
      site:value?.site||null,
      categories:value?.categories||null,
      sound:value?.sound||null
    });
  }

  function currentLanguage(){
    const value=String(window.TuneWrapLanguage?.get?.()||document.documentElement.lang||'en').toLowerCase();
    if(value.startsWith('ru'))return'ru';
    if(value.startsWith('uk'))return'uk';
    if(value.startsWith('ka'))return'ka';
    if(value.startsWith('de'))return'de';
    return'en';
  }

  function copy(){
    const map={
      en:{message:'A newer TuneWrap version is ready.',detail:'Refresh when convenient to see the latest site and songs.',button:'Refresh now'},
      ru:{message:'Готова новая версия TuneWrap.',detail:'Обновите страницу, чтобы увидеть актуальный сайт и новые песни.',button:'Обновить сейчас'},
      uk:{message:'Готова нова версія TuneWrap.',detail:'Оновіть сторінку, щоб побачити актуальний сайт і нові пісні.',button:'Оновити зараз'},
      ka:{message:'TuneWrap-ის ახალი ვერსია მზადაა.',detail:'განაახლეთ გვერდი, რომ ნახოთ განახლებული საიტი და ახალი სიმღერები.',button:'ახლავე განახლება'},
      de:{message:'Eine neue TuneWrap-Version ist verfügbar.',detail:'Aktualisieren Sie die Seite, um die neuesten Inhalte und Songs zu sehen.',button:'Jetzt aktualisieren'}
    };
    return map[currentLanguage()]||map.en;
  }

  function audioIsPlaying(){
    const audio=document.getElementById('tuneWrapAudioEngine');
    return Boolean(audio&&!audio.paused&&!audio.ended);
  }

  function canReloadAutomatically(){
    return !audioIsPlaying()&&!formDirty;
  }

  function reloadFresh(token){
    const url=new URL(location.href);
    url.hash='';
    url.searchParams.set('tw-update',String(token||Date.now()));
    if('scrollRestoration' in history)history.scrollRestoration='manual';
    const appScroll=document.getElementById('appScroll');
    if(appScroll)appScroll.scrollTop=0;
    location.replace(url.href);
  }

  function ensureNotice(){
    if(notice?.isConnected)return notice;
    const words=copy();
    notice=document.createElement('aside');
    notice.id='tuneWrapUpdateNotice';
    notice.setAttribute('role','status');
    notice.innerHTML=`<div><strong></strong><span></span></div><button type="button"></button>`;
    notice.querySelector('strong').textContent=words.message;
    notice.querySelector('span').textContent=words.detail;
    notice.querySelector('button').textContent=words.button;
    notice.querySelector('button').addEventListener('click',()=>reloadFresh(pendingToken));

    const style=document.createElement('style');
    style.id='tuneWrapUpdateNoticeStyle';
    style.textContent=`
      #tuneWrapUpdateNotice{position:fixed;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 14px;border:1px solid rgba(224,171,60,.46);border-radius:16px;background:rgba(14,13,13,.97);box-shadow:0 18px 52px rgba(0,0,0,.55);color:#f6f0e7;font-family:Manrope,Arial,sans-serif}
      #tuneWrapUpdateNotice div{display:grid;gap:3px;min-width:0}#tuneWrapUpdateNotice strong{font-size:13px}#tuneWrapUpdateNotice span{color:#aaa3a1;font-size:11px;line-height:1.35}#tuneWrapUpdateNotice button{flex:0 0 auto;min-height:40px;padding:0 15px;border:0;border-radius:12px;background:#e0ab3c;color:#100e0b;font:800 12px Manrope,Arial,sans-serif;cursor:pointer}@media(max-width:560px){#tuneWrapUpdateNotice{align-items:stretch;flex-direction:column}#tuneWrapUpdateNotice button{width:100%}}`;
    if(!document.getElementById(style.id))document.head.append(style);
    document.body.append(notice);
    return notice;
  }

  function requestRefresh(token){
    if(pendingToken)return;
    pendingToken=String(token||Date.now());
    if(canReloadAutomatically())reloadFresh(pendingToken);
    else ensureNotice();
  }

  async function fetchJson(url){
    const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function remoteBuild(){
    const url=new URL('/',location.origin);
    url.searchParams.set('tw-probe',Date.now().toString(36));
    const response=await fetch(url.href,{headers:{accept:'text/html'},cache:'no-store'});
    if(!response.ok)throw new Error(`build probe: HTTP ${response.status}`);
    const html=await response.text();
    return html.match(/<meta\s+name=["']tunewrap-build["']\s+content=["']([^"']+)["']/i)?.[1]||'';
  }

  async function remoteSnapshot(){
    const payloads=await Promise.all(API_ENDPOINTS.map(([url])=>fetchJson(url)));
    return snapshot({
      tracks:payloads[0]?.tracks||[],
      pricing:payloads[1]?.config||null,
      site:payloads[2]?.config||null,
      categories:payloads[3]?.config||null,
      sound:payloads[4]?.config||null
    });
  }

  async function check(force=false){
    if(checking||document.hidden||pendingToken||!navigator.onLine)return;
    const now=Date.now();
    if(!force&&now-lastCheckAt<MIN_CHECK_INTERVAL)return;
    checking=true;
    lastCheckAt=now;
    try{
      const deployedBuild=await remoteBuild();
      if(BUILD&&deployedBuild&&deployedBuild!==BUILD){
        requestRefresh(deployedBuild);
        return;
      }
      if(baseline){
        const deployedSnapshot=await remoteSnapshot();
        if(deployedSnapshot&&deployedSnapshot!==baseline)requestRefresh(deployedBuild||BUILD||now);
      }
    }catch(error){
      // Offline and transient API failures must never interrupt the current page.
      console.debug('TuneWrap freshness check postponed',error);
    }finally{
      checking=false;
    }
  }

  function schedule(force=false,delay=350){
    window.setTimeout(()=>check(force),delay);
  }

  document.addEventListener('input',event=>{
    if(event.target?.matches?.('input,textarea,select'))formDirty=true;
  },{capture:true});
  document.addEventListener('change',event=>{
    if(event.target?.matches?.('input,textarea,select'))formDirty=true;
  },{capture:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)schedule(false,250);
  });
  window.addEventListener('pageshow',event=>schedule(Boolean(event.persisted),250));
  window.addEventListener('focus',()=>schedule(false,250));
  window.addEventListener('online',()=>schedule(true,250));
  document.addEventListener('pause',()=>{
    if(pendingToken&&!formDirty&&!audioIsPlaying())reloadFresh(pendingToken);
  },true);

  window.setInterval(()=>{
    if(!document.hidden)check(false);
  },BACKGROUND_POLL_INTERVAL);

  window.TuneWrapAutoUpdate=Object.freeze({
    build:BUILD,
    setSnapshot(value){baseline=snapshot(value);},
    checkNow(){return check(true);}
  });

  // Covers an unusually fast cached module execution where app-bootstrap
  // completed before this deferred guard became available.
  if(Array.isArray(window.TUNEWRAP_TRACK_CATALOG)){
    baseline=snapshot({
      tracks:window.TUNEWRAP_TRACK_CATALOG,
      pricing:window.TUNEWRAP_PRICING_CMS,
      site:window.TUNEWRAP_SITE_CMS,
      categories:window.TUNEWRAP_STORY_CATEGORIES,
      sound:window.TUNEWRAP_SOUND_PREFERENCES
    });
  }
})();
