// TuneWrap Stage 12.1.6 — wedding detail wide adapter.
// On tablet/desktop wedding package details use the same compact price card
// language as regular TuneWrap tiers. Mobile <=620px stays owned by core code.
(function(){
  'use strict';

  const wide=window.matchMedia('(min-width:621px)');
  const panel=document.getElementById('tierDetailPanel');
  const title=document.getElementById('tierDetailTitle');
  const oldPrice=document.getElementById('tierDetailOldPrice');
  const price=document.getElementById('tierDetailPrice');
  const priceWrap=document.getElementById('tierDetailPriceWrap');
  const until=document.getElementById('tierDetailUntil');
  const visual=document.getElementById('tierDetailVisual');

  if(!panel||!title||!oldPrice||!price||!priceWrap||!until)return;

  const PRICES={
    'First Dance':{old:'99',current:'49'},
    'Love Story':{old:'199',current:'99'},
    'Wedding Collection':{old:'299',current:'149'}
  };

  function sync(){
    if(!wide.matches || !panel.classList.contains('is-wedding')) return;

    const packagePrice=PRICES[title.textContent.trim()];
    if(packagePrice){
      oldPrice.textContent='$'+packagePrice.old;
      price.textContent='$'+packagePrice.current;
      priceWrap.hidden=false;
      until.hidden=false;
    }

    // Core can re-open the visual after language/render updates.
    // Keep it suppressed only on the wide wedding presentation.
    if(visual) visual.hidden=true;
  }

  let frame=0;
  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      sync();
    });
  }

  const observer=new MutationObserver(schedule);
  observer.observe(panel,{
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeFilter:['class','hidden','aria-hidden']
  });

  document.addEventListener('tunewrap:languagechange',schedule);
  wide.addEventListener?.('change',schedule);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  }else{
    schedule();
  }
})();
