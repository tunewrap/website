// TuneWrap Stage 12.13.3 — logo always returns to the Home/Hero.
(function(){
  'use strict';

  function goHome(event){
    if(event)event.preventDefault();

    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior=reduced?'auto':'smooth';
    const appScroll=document.getElementById('appScroll');

    document.querySelectorAll('.mobile-menu[open], .mobile-lang[open]').forEach(node=>{
      node.removeAttribute('open');
    });

    if(appScroll){
      appScroll.scrollTo({top:0,left:0,behavior});
    }

    window.scrollTo({top:0,left:0,behavior});

    try{
      const url=new URL(window.location.href);
      url.hash='';
      history.replaceState(history.state,'',url.pathname+url.search);
    }catch(error){}
  }

  function install(){
    const link=document.getElementById('homeLogoLink');
    if(!link || link.dataset.homeLinkReady==='1')return;
    link.dataset.homeLinkReady='1';
    link.addEventListener('click',goHome);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
