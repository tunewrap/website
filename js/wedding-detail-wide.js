// TuneWrap Stage 12.2.1 — wedding detail wide presentation.
(function(){
  'use strict';
  const wide=window.matchMedia('(min-width:621px)');
  const panel=document.getElementById('tierDetailPanel');
  const visual=document.getElementById('tierDetailVisual');
  if(!panel||!visual)return;

  function sync(){
    if(wide.matches&&panel.classList.contains('is-wedding')&&!visual.hidden)visual.hidden=true;
  }

  document.addEventListener('click',event=>{
    if(wide.matches&&event.target.closest?.('#weddingPackagesGrid .wedding-offer-card')){
      requestAnimationFrame(sync);
    }
  },true);
  document.addEventListener('tunewrap:languagechange',()=>requestAnimationFrame(sync));
  wide.addEventListener?.('change',()=>requestAnimationFrame(sync));
})();
