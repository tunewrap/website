// Stage 10.1: one catalog drives libraries, featured tracks, search and counters.
(function(){
  'use strict';

  const Core = window.TuneWrapCatalogCore;
  const rawTracks = window.TUNEWRAP_TRACK_CATALOG;
  if(!Core || !Array.isArray(rawTracks)) return;

  const tracks = Core.createCatalog(rawTracks);
  const byId = new Map(tracks.map(track => [track.id,track]));
  const PAGE_SIZE = 24;
  const FALLBACK_COVER = 'assets/covers/tunewrap-placeholder.svg';
  const LISTEN_LABELS = {ru:'Слушать',uk:'Слухати',ka:'მოსმენა',en:'Listen to',de:'Anhören'};
  const COUNT_COPY = {
    ru(count){
      const mod10 = count % 10;
      const mod100 = count % 100;
      const word = mod10 === 1 && mod100 !== 11 ? 'песня' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'песни' : 'песен';
      return count + ' ' + word;
    },
    uk(count){
      const mod10 = count % 10;
      const mod100 = count % 100;
      const word = mod10 === 1 && mod100 !== 11 ? 'пісня' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'пісні' : 'пісень';
      return count + ' ' + word;
    },
    ka:count => count + ' სიმღერა',
    en:count => count + (count === 1 ? ' song' : ' songs'),
    de:count => count + (count === 1 ? ' Song' : ' Songs')
  };
  const FILTER_LABELS = {ru:'Язык песен',uk:'Мова пісень',ka:'სიმღერის ენა',en:'Song language',de:'Sprache der Songs'};
  const CATEGORY_COPY={ru:{label:'Категории',all:'Все истории'},uk:{label:'Категорії',all:'Усі історії'},ka:{label:'კატეგორიები',all:'ყველა ისტორია'},en:{label:'Categories',all:'All stories'},de:{label:'Kategorien',all:'Alle Geschichten'}};
  const DEFAULT_STORY_CATEGORIES=[{"id":"birthday","enabled":true,"order":1,"labels":{"ru":"День рождения","uk":"День народження","ka":"დაბადების დღე","en":"Birthday","de":"Geburtstag"}},{"id":"anniversary","enabled":true,"order":2,"labels":{"ru":"Юбилей","uk":"Ювілей","ka":"იუბილე","en":"Anniversary","de":"Jubiläum"}},{"id":"wedding","enabled":true,"order":3,"labels":{"ru":"Свадьба","uk":"Весілля","ka":"ქორწილი","en":"Wedding","de":"Hochzeit"}},{"id":"love","enabled":true,"order":4,"labels":{"ru":"Любовь","uk":"Кохання","ka":"სიყვარული","en":"Love","de":"Liebe"}},{"id":"family","enabled":true,"order":5,"labels":{"ru":"Семья","uk":"Родина","ka":"ოჯახი","en":"Family","de":"Familie"}},{"id":"children","enabled":true,"order":6,"labels":{"ru":"Для детей","uk":"Для дітей","ka":"ბავშვებისთვის","en":"For children","de":"Für Kinder"}},{"id":"congratulations","enabled":true,"order":7,"labels":{"ru":"Поздравления","uk":"Привітання","ka":"მილოცვები","en":"Congratulations","de":"Glückwünsche"}},{"id":"life","enabled":true,"order":8,"labels":{"ru":"О жизни","uk":"Про життя","ka":"ცხოვრებაზე","en":"Life","de":"Über das Leben"}}];
  const storyCategories=((window.TUNEWRAP_STORY_CATEGORIES?.categories||DEFAULT_STORY_CATEGORIES).filter(item=>item?.enabled!==false).slice().sort((a,b)=>(a.order||99)-(b.order||99)||a.id.localeCompare(b.id)));

  function interfaceLanguage(){
    const language = String(
      window.TUNEWRAP_CURRENT_LANGUAGE ||
      window.TUNEWRAP_INITIAL_LANGUAGE ||
      document.documentElement.getAttribute('lang') ||
      'en'
    ).toLowerCase();
    return Core.UI_LANGUAGES.includes(language) ? language : 'en';
  }

  function localizedTitle(track,language = interfaceLanguage()){
    return Core.title(track,language);
  }

  function localizedDescription(track,language = interfaceLanguage()){
    return Core.description(track,language);
  }

  function storyCategoryLabel(id,language = interfaceLanguage()){const item=storyCategories.find(category=>category.id===id);return item?.labels?.[language]||item?.labels?.ru||item?.labels?.en||id||'';}

  function localizedCategory(track,language = interfaceLanguage()){const first=Array.isArray(track?.categoryIds)?track.categoryIds[0]:'';return first?storyCategoryLabel(first,language):Core.category(track,language);}

  function durationLabel(track){
    if(track.durationLabel) return track.durationLabel;
    const seconds = Math.max(0,Math.round(Number(track.duration) || 0));
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0');
  }

  function element(tag,className,text){
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text !== undefined) node.textContent = text;
    return node;
  }

  function coverSource(track){
    return typeof track?.cover === 'string' && track.cover.trim() ? track.cover : FALLBACK_COVER;
  }

  function syncCoverImage(image,track,options = {}){
    if(!image) return image;
    const requestedSource = coverSource(track);
    const alt = options.alt === undefined ? localizedTitle(track) : options.alt;
    image.alt = alt;
    if(options.loading) image.loading = options.loading;
    image.decoding = 'async';
    if(track?.artwork?.width > 0 && track?.artwork?.height > 0){
      image.width = track.artwork.width;
      image.height = track.artwork.height;
    }

    let token = Number(image.__tuneWrapCoverToken || 0) + 1;
    image.__tuneWrapCoverToken = token;
    image.__tuneWrapCoverCleanup?.();
    image.classList.remove('is-loaded');
    image.dataset.coverState = 'loading';

    function assign(source,isFallback){
      const operation = token;
      let settled = false;
      const cleanup = () => {
        image.removeEventListener('load',onLoad);
        image.removeEventListener('error',onError);
        if(image.__tuneWrapCoverCleanup === cleanup) image.__tuneWrapCoverCleanup = null;
      };
      const reveal = state => {
        if(settled || image.__tuneWrapCoverToken !== operation) return;
        settled = true;
        cleanup();
        image.dataset.coverState = state;
        requestAnimationFrame(() => {
          if(image.__tuneWrapCoverToken === operation) image.classList.add('is-loaded');
        });
      };
      const onLoad = () => reveal(isFallback ? 'fallback' : 'ready');
      const onError = () => {
        if(settled || image.__tuneWrapCoverToken !== operation) return;
        cleanup();
        if(!isFallback){
          image.dataset.coverFallbackFor = requestedSource;
          assign(FALLBACK_COVER,true);
        } else {
          reveal('error');
        }
      };
      image.__tuneWrapCoverCleanup = cleanup;
      image.addEventListener('load',onLoad,{once:true});
      image.addEventListener('error',onError,{once:true});
      image.src = source;
      if(image.complete){
        queueMicrotask(() => {
          if(image.__tuneWrapCoverToken !== operation || settled) return;
          if(image.naturalWidth > 0) onLoad();
          else onError();
        });
      }
    }

    assign(requestedSource,requestedSource === FALLBACK_COVER);
    return image;
  }

  function coverImage(track,className){
    const image = element('img',className);
    return syncCoverImage(image,track,{loading:'lazy'});
  }

  function renderStoryCard(track){
    const card = element('article','track');
    card.tabIndex = 0;
    card.dataset.trackId = track.id;
    card.dataset.songLanguage = track.language;
    card.dataset.libraryLanguage = track.language;
    card.dataset.libraryCategory = localizedCategory(track);
    card.dataset.libraryOriginalTitle = track.originalTitle || track.title;
    card.append(coverImage(track,'story-cover'));

    const body = element('div','track-body');
    body.append(element('div','track-title',localizedTitle(track)));
    const description = localizedDescription(track);
    if(description) body.append(element('div','track-desc',description));
    const button = element('button','play-btn');
    button.type = 'button';
    button.dataset.track = track.id;
    button.setAttribute('aria-label',(LISTEN_LABELS[interfaceLanguage()] || LISTEN_LABELS.ru) + ' ' + localizedTitle(track));
    body.append(button);
    body.append(element('div','listen-label',LISTEN_LABELS[interfaceLanguage()] || LISTEN_LABELS.ru));
    const canvas = element('canvas');
    canvas.dataset.canvas = track.id;
    canvas.setAttribute('aria-hidden','true');
    body.append(canvas);
    body.append(element('div','track-time','0:00 / ' + durationLabel(track)));
    const meta = element('div','story-meta');
    const category = localizedCategory(track);
    if(category) meta.append(element('span','',category));
    meta.append(element('span','',track.language));
    if(durationLabel(track)) meta.append(element('span','',durationLabel(track)));
    body.append(meta);
    body.append(element('div','music-library-card-meta',[category,track.language,durationLabel(track)].filter(Boolean).join(' · ')));
    card.append(body);
    return card;
  }

  function renderAuthorCard(track){
    const card = element('article','author-card author-card-with-cover');
    card.tabIndex = 0;
    card.dataset.trackId = track.id;
    card.dataset.libraryLanguage = track.language;
    card.dataset.libraryCategory = localizedCategory(track);
    card.dataset.libraryOriginalTitle = track.originalTitle || track.title;
    card.append(coverImage(track,'author-cover'));
    const button = element('button','play-btn');
    button.type = 'button';
    button.dataset.track = track.id;
    button.setAttribute('aria-label',(LISTEN_LABELS[interfaceLanguage()] || LISTEN_LABELS.ru) + ' ' + localizedTitle(track));
    card.append(button);
    const body = element('div','track-body');
    body.append(element('div','track-title',localizedTitle(track)));
    const description = localizedDescription(track);
    if(description) body.append(element('div','track-desc',description));
    const authorMeta = element('div','author-track-meta');
    authorMeta.append(element('span','',track.language));
    if(durationLabel(track)) authorMeta.append(element('span','',durationLabel(track)));
    body.append(authorMeta);
    const canvas = element('canvas');
    canvas.dataset.canvas = track.id;
    canvas.setAttribute('aria-hidden','true');
    body.append(canvas);
    body.append(element('div','track-time','0:00 / ' + durationLabel(track)));
    body.append(element('div','music-library-card-meta',[track.language,durationLabel(track)].filter(Boolean).join(' · ')));
    card.append(body);
    return card;
  }

  function renderCard(track){
    return track.section === 'author' ? renderAuthorCard(track) : renderStoryCard(track);
  }

  const api = Object.freeze({
    enabled:true,
    all:() => tracks.slice(),
    published:() => Core.published(tracks),
    queue:() => Core.queue(tracks),
    get:id => byId.get(id) || null,
    bySection:section => Core.filter(tracks,{section}),
    featured:section => Core.featured(tracks,section),
    search:(query,options = {}) => Core.filter(tracks,{...options,query}),
    title:localizedTitle,
    description:localizedDescription,
    category:localizedCategory,
    categoryLabel:storyCategoryLabel,
    cover:coverSource,
    syncCoverImage,
    titleMaps:Core.titleMaps(tracks),
    originalTitles:Object.freeze(Object.fromEntries(tracks.map(track => [track.id,track.originalTitle || track.title]))),
    renderCard
  });
  window.TuneWrapCatalog = api;

  function initialize(){
    const appScroll = document.getElementById('appScroll');
    const bottomNav = document.querySelector('.mobile-bottom-nav');
    const playerScreen = document.getElementById('songPlayerScreen');
    const panels = [
      document.getElementById('storiesLibraryScreen'),
      document.getElementById('authorLibraryScreen')
    ].filter(Boolean);
    const panelState = new Map();

    function syncFeatured(section){
      const track = api.featured(section);
      const featured = document.querySelector('[data-library-showcase="' + section + '"] [data-featured-track]');
      if(!track || !featured) return;
      featured.dataset.featuredTrack = track.id;
      featured.dataset.trackId = track.id;
      featured.setAttribute('aria-label',localizedTitle(track));
      const image = featured.querySelector('img');
      if(image) syncCoverImage(image,track,{alt:localizedTitle(track),loading:'eager'});
      const title = featured.querySelector('[data-featured-title]');
      if(title) title.textContent = localizedTitle(track);
      const language = featured.querySelector('[data-featured-language]');
      if(language) language.textContent = track.language;
    }

    function syncCounts(){
      const stories = document.getElementById('storiesCatalogCount');
      const author = document.getElementById('authorCatalogCount');
      if(stories) stories.textContent = String(api.bySection('stories').length);
      if(author) author.textContent = String(api.bySection('author').length);
    }

    function syncUnderlyingInert(){
      const libraryOpen = panels.some(panel => panel.classList.contains('is-open'));
      const playerOpen = playerScreen?.classList.contains('is-open');
      if(libraryOpen || playerOpen){
        appScroll?.setAttribute('inert','');
        bottomNav?.setAttribute('inert','');
      } else {
        appScroll?.removeAttribute('inert');
        bottomNav?.removeAttribute('inert');
      }
    }

    function panelSection(panel){
      return panel.dataset.libraryKind === 'author' ? 'author' : 'stories';
    }

    function dispatchRendered(panel){
      document.dispatchEvent(new CustomEvent('tunewrap:catalogrendered',{
        detail:{section:panelSection(panel),rendered:panelState.get(panel)?.rendered || 0}
      }));
    }

    function usedStoryCategories(){const used=new Set(api.bySection('stories').flatMap(track=>Array.isArray(track.categoryIds)?track.categoryIds:[]));return storyCategories.filter(item=>used.has(item.id));}
    function renderCategoryFilters(panel){
      if(panelSection(panel)!=='stories')return;const state=panelState.get(panel);if(!state)return;let row=panel.querySelector('[data-library-categories]');const categories=usedStoryCategories();if(!categories.length){row?.remove();state.category='ALL';return;}if(!row){row=element('div','music-library-category-row');row.dataset.libraryCategories='';panel.querySelector('.music-library-sticky')?.append(row);}const language=interfaceLanguage();const copy=CATEGORY_COPY[language]||CATEGORY_COPY.ru;const label=element('span','music-library-category-label',copy.label);const chips=element('div','music-library-category-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label',copy.label);const all=element('button','music-library-category-chip'+(state.category==='ALL'?' is-active':''),copy.all);all.type='button';all.dataset.libraryCategory='ALL';all.setAttribute('aria-pressed',String(state.category==='ALL'));chips.append(all);categories.forEach(item=>{const active=state.category===item.id;const button=element('button','music-library-category-chip'+(active?' is-active':''),storyCategoryLabel(item.id,language));button.type='button';button.dataset.libraryCategory=item.id;button.setAttribute('aria-pressed',String(active));chips.append(button);});row.replaceChildren(label,chips);row.querySelectorAll('[data-library-category]').forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.libraryCategory||'ALL';renderPanel(panel,{reset:true});}));
    }
    function renderPanel(panel,{reset = false} = {}){
      const state = panelState.get(panel);if(!state) return;const section = panelSection(panel);
      state.results = api.search(state.query,{section,language:state.language,categoryId:section==='stories'&&state.category!=='ALL'?state.category:''});
      if(reset) state.rendered = Math.min(PAGE_SIZE,state.results.length);
      else state.rendered = Math.min(Math.max(state.rendered,PAGE_SIZE),state.results.length);
      const desired = state.results.slice(0,state.rendered);
      state.list.replaceChildren(...desired.map(renderCard));
      renderCategoryFilters(panel);

      panel.querySelectorAll('[data-library-language]').forEach(tab => {
        const active = tab.dataset.libraryLanguage === state.language;
        tab.classList.toggle('is-active',active);
        tab.setAttribute('aria-selected',String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      const count = panel.querySelector('[data-library-result-count]');
      if(count) count.textContent = COUNT_COPY[interfaceLanguage()](state.results.length);
      const empty = panel.querySelector('[data-library-empty]');
      if(empty) empty.hidden = state.results.length !== 0;
      dispatchRendered(panel);
    }

    function appendNextPage(panel){
      const state = panelState.get(panel);
      if(!state || state.rendered >= state.results.length) return;
      const next = state.results.slice(state.rendered,state.rendered + PAGE_SIZE);
      const fragment = document.createDocumentFragment();
      next.forEach(track => fragment.append(renderCard(track)));
      state.list.append(fragment);
      state.rendered += next.length;
      dispatchRendered(panel);
    }

    function openLibrary(panel,trigger){
      panels.forEach(other => {
        if(other !== panel && other.classList.contains('is-open')) closeLibrary(other,false);
      });
      const state = panelState.get(panel);
      state.trigger = trigger;
      renderPanel(panel,{reset:!state.list.childElementCount});
      panel.removeAttribute('inert');
      panel.setAttribute('aria-hidden','false');
      panel.classList.add('is-open');
      document.body.classList.add('music-library-open');
      syncUnderlyingInert();
      requestAnimationFrame(() => {
        state.scroller.scrollTop = state.scrollTop;
        panel.querySelector('[data-library-close]')?.focus({preventScroll:true});
      });
    }

    function closeLibrary(panel,restoreFocus = true){
      if(!panel.classList.contains('is-open')) return;
      const state = panelState.get(panel);
      state.scrollTop = state.scroller.scrollTop;
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden','true');
      panel.setAttribute('inert','');
      if(!panels.some(item => item.classList.contains('is-open'))) document.body.classList.remove('music-library-open');
      syncUnderlyingInert();
      if(restoreFocus && state.trigger) requestAnimationFrame(() => state.trigger.focus({preventScroll:true}));
    }

    panels.forEach(panel => {
      const section = panelSection(panel);
      const resultHost = panel.querySelector('.music-library-results');
      const list = element('div',section === 'author' ? 'author-grid music-library-card-list music-library-author-list' : 'tracks music-library-card-list music-library-story-list');
      resultHost.replaceChildren(list);
      const authorSignature = section === 'author' ? document.querySelector('#author .author-signature') : null;
      if(authorSignature) resultHost.append(authorSignature);
      const scroller = panel.querySelector('.music-library-scroll');
      const input = panel.querySelector('[data-library-search]');
      panelState.set(panel,{language:'ALL',category:'ALL',query:'',results:[],rendered:0,scrollTop:0,trigger:null,list,scroller});

      panel.querySelectorAll('[data-library-language]').forEach(tab => {
        tab.addEventListener('click',() => {
          panelState.get(panel).language = tab.dataset.libraryLanguage;
          renderPanel(panel,{reset:true});
        });
        tab.addEventListener('keydown',event => {
          if(event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const tabs = Array.from(panel.querySelectorAll('[data-library-language]'));
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          const next = tabs[(tabs.indexOf(tab) + direction + tabs.length) % tabs.length];
          next.focus();
          panelState.get(panel).language = next.dataset.libraryLanguage;
          renderPanel(panel,{reset:true});
        });
      });
      input?.addEventListener('input',() => {
        panelState.get(panel).query = input.value;
        renderPanel(panel,{reset:true});
      });
      panel.querySelector('[data-library-reset-search]')?.addEventListener('click',() => {
        const state = panelState.get(panel);
        state.query = '';
        state.language = 'ALL';
        state.category = 'ALL';
        if(input) input.value = '';
        renderPanel(panel,{reset:true});
        input?.focus({preventScroll:true});
      });
      panel.querySelector('[data-library-close]')?.addEventListener('click',() => closeLibrary(panel));
      scroller.addEventListener('scroll',() => {
        if(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 480) appendNextPage(panel);
      },{passive:true});
      const filters = panel.querySelector('[data-library-filters]');
      if(filters) filters.setAttribute('aria-label',FILTER_LABELS[interfaceLanguage()]);
      renderPanel(panel,{reset:true});
    });

    document.getElementById('openStoriesLibrary')?.addEventListener('click',event => openLibrary(document.getElementById('storiesLibraryScreen'),event.currentTarget));
    document.getElementById('openAuthorLibrary')?.addEventListener('click',event => openLibrary(document.getElementById('authorLibraryScreen'),event.currentTarget));
    document.addEventListener('keydown',event => {
      if(event.key !== 'Escape' || playerScreen?.classList.contains('is-open')) return;
      const openPanel = panels.find(panel => panel.classList.contains('is-open'));
      if(openPanel) closeLibrary(openPanel);
    });

    document.addEventListener('tunewrap:languagechange',() => {
      syncFeatured('stories');
      syncFeatured('author');
      panels.forEach(panel => {
        const filters = panel.querySelector('[data-library-filters]');
        if(filters) filters.setAttribute('aria-label',FILTER_LABELS[interfaceLanguage()]);
        renderPanel(panel);
      });
    });

    syncCounts();
    syncFeatured('stories');
    syncFeatured('author');
    window.__tuneWrapCatalogDiagnostics = Object.freeze({
      total:tracks.length,
      published:api.published().length,
      queue:api.queue().map(track => track.id),
      rendered:() => panels.reduce((count,panel) => count + panel.querySelectorAll('[data-track-id]').length,0)
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
