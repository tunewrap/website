// TuneWrap Stage 12.1 — tablet/desktop presentation adapter.
// The verified mobile experience remains owned by the existing <=620px code.
(function(){
  'use strict';

  const wideViewport=window.matchMedia('(min-width:621px)');

  function initialize(){
    const audio=document.getElementById('tuneWrapAudioEngine');
    const screen=document.getElementById('songPlayerScreen');
    const appScroll=document.getElementById('appScroll');
    const back=document.getElementById('songPlayerBack');
    const mini=document.getElementById('topMiniPlayer');
    const miniTitle=document.getElementById('topMiniTitle');
    const miniCover=document.getElementById('topMiniCover');
    const fullTitle=document.getElementById('songPlayerTitle');
    const fullCover=document.getElementById('songPlayerCover');

    if(!audio||!screen||!mini||!miniTitle||!miniCover)return;

    function isWide(){
      return wideViewport.matches;
    }

    function currentTrackId(){
      return window.__tuneWrapPlayback?.getCurrent?.()||'';
    }

    function hideWideMini(){
      mini.classList.remove('is-wide-active');
      document.body.classList.remove('wide-mini-active');
      if(!mini.classList.contains('is-active')){
        mini.setAttribute('aria-hidden','true');
        mini.setAttribute('inert','');
      }
    }

    function syncWideMini(){
      if(!isWide()){
        hideWideMini();
        return;
      }

      const trackId=currentTrackId();
      if(!trackId){
        hideWideMini();
        return;
      }

      const currentTitle=fullTitle?.textContent?.trim();
      if(currentTitle)miniTitle.textContent=currentTitle;

      const currentCover=fullCover?.currentSrc||fullCover?.src||'';
      if(currentCover){
        miniCover.src=currentCover;
        miniCover.alt='';
      }

      mini.dataset.trackId=trackId;
      mini.classList.add('is-wide-active');
      mini.setAttribute('aria-hidden','false');
      mini.removeAttribute('inert');
      document.body.classList.add('wide-mini-active');
    }

    function openWidePlayer(){
      if(!isWide()||!currentTrackId())return;
      screen.removeAttribute('inert');
      screen.classList.add('is-open');
      screen.setAttribute('aria-hidden','false');
      document.body.classList.add('song-player-open','wide-player-open');
      appScroll?.setAttribute('inert','');
      window.requestAnimationFrame(()=>back?.focus({preventScroll:true}));
    }

    function afterEngine(callback){
      window.setTimeout(callback,0);
    }

    // Register before playback-engine.js. The engine still owns playback;
    // this adapter only reveals its already-filled player UI on wider screens.
    document.addEventListener('click',event=>{
      if(!isWide())return;

      const miniOpen=event.target.closest('#topMiniExpand,.top-mini-player');
      if(miniOpen&&!event.target.closest('.top-mini-controls,.top-mini-stop')){
        afterEngine(()=>{
          syncWideMini();
          openWidePlayer();
        });
        return;
      }

      const origin=event.target.closest(
        '[data-featured-track],[data-start-track],.track[data-track-id],.author-card[data-track-id]'
      );
      if(!origin)return;

      // The small play button stays a quick play/pause control.
      // Clicking the artwork/card opens the complete story player.
      if(event.target.closest('.play-btn[data-track]')){
        afterEngine(syncWideMini);
        return;
      }

      afterEngine(()=>{
        syncWideMini();
        openWidePlayer();
      });
    },{capture:true});

    audio.addEventListener('play',()=>afterEngine(syncWideMini));
    audio.addEventListener('pause',()=>afterEngine(syncWideMini));
    audio.addEventListener('loadedmetadata',()=>afterEngine(syncWideMini));
    audio.addEventListener('ended',()=>afterEngine(syncWideMini));

    document.addEventListener('tunewrap:languagechange',()=>afterEngine(syncWideMini));
    document.addEventListener('tunewrap:catalogrendered',()=>afterEngine(syncWideMini));

    document.getElementById('topMiniStop')?.addEventListener('click',()=>afterEngine(syncWideMini),{capture:true});
    document.getElementById('songPlayerBack')?.addEventListener('click',()=>afterEngine(syncWideMini),{capture:true});
    document.getElementById('songPlayerMinimize')?.addEventListener('click',()=>afterEngine(syncWideMini),{capture:true});

    wideViewport.addEventListener?.('change',()=>{
      // Let the existing mobile viewport listener finish first, then adopt the
      // current playback state on the destination layout.
      window.setTimeout(()=>{
        if(isWide()){
          document.body.classList.remove('wide-player-open');
          syncWideMini();
        }else{
          hideWideMini();
          document.body.classList.remove('wide-player-open');
        }
      },0);
    });

    syncWideMini();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialize,{once:true});
  }else{
    initialize();
  }
})();
