// TuneWrap Stage 12.2 — wedding detail wide presentation.
// Pricing/content is owned by Pricing CMS. This adapter only keeps the
// tablet/desktop wedding panel visually compact.
(function(){
  'use strict';
  const wide=window.matchMedia('(min-width:621px)');
  const panel=document.getElementById('tierDetailPanel');
  const visual=document.getElementById('tierDetailVisual');
  if(!panel||!visual)return;

  function sync(){
    if(wide.matches&&panel.classList.contains('is-wedding'))visual.hidden=true;
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(panel,{subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
  wide.addEventListener?.('change',sync);
  sync();
})();
