// Stage 10: one persistent playback engine for the complete TuneWrap catalog.
(function(){
  'use strict';

  const PLAYER_UI = Object.freeze({
    ru:{
      play:'Воспроизвести', pause:'Пауза', previous:'Предыдущий трек', next:'Следующий трек',
      expand:'Развернуть плеер', stop:'Остановить музыку', seek:'Перемотка песни',
      empty:'Текст песни пока не добавлен в проект.'
    },
    uk:{
      play:'Відтворити', pause:'Пауза', previous:'Попередній трек', next:'Наступний трек',
      expand:'Розгорнути плеєр', stop:'Зупинити музику', seek:'Перемотування пісні',
      empty:'Текст пісні поки не додано до проєкту.'
    },
    ka:{
      play:'დაკვრა', pause:'პაუზა', previous:'წინა სიმღერა', next:'შემდეგი სიმღერა',
      expand:'პლეერის გაშლა', stop:'მუსიკის შეჩერება', seek:'სიმღერის გადახვევა',
      empty:'სიმღერის ტექსტი პროექტში ჯერ არ არის დამატებული.'
    },
    en:{
      play:'Play', pause:'Pause', previous:'Previous track', next:'Next track',
      expand:'Expand player', stop:'Stop music', seek:'Seek through song',
      empty:'The lyrics have not been added to the project yet.'
    },
    de:{
      play:'Abspielen', pause:'Pause', previous:'Vorheriger Titel', next:'Nächster Titel',
      expand:'Player öffnen', stop:'Musik stoppen', seek:'Im Song spulen',
      empty:'Der Songtext wurde dem Projekt noch nicht hinzugefügt.'
    }
  });

  document.addEventListener('DOMContentLoaded',function(){
    const audio = document.getElementById('tuneWrapAudioEngine');
    if(!audio) return;

    const mobileViewport = window.matchMedia('(max-width:620px)');
    const screen = document.getElementById('songPlayerScreen');
    const appScroll = document.getElementById('appScroll');
    const bottomNav = document.querySelector('.mobile-bottom-nav');
    const playerScroll = screen?.querySelector('.song-player-scroll');
    const backButton = document.getElementById('songPlayerBack');
    const minimizeButton = document.getElementById('songPlayerMinimize');
    const coverWrap = document.getElementById('songPlayerCoverWrap');
    const cover = document.getElementById('songPlayerCover');
    const title = document.getElementById('songPlayerTitle');
    const description = document.getElementById('songPlayerDescription');
    const languageLabel = document.getElementById('songPlayerLanguage');
    const descriptionToggle = document.getElementById('songPlayerDescriptionToggle');
    const descriptionSheet = document.getElementById('songPlayerDescriptionSheet');
    const descriptionCollapse = document.getElementById('songPlayerDescriptionCollapse');
    const descriptionFull = document.getElementById('songPlayerDescriptionFull');
    const lyrics = document.getElementById('songPlayerLyrics');
    const translation = document.getElementById('songPlayerTranslation');
    const translationBlock = document.getElementById('songPlayerTranslationBlock');
    const orderButton = document.getElementById('songPlayerOrder');
    const seek = document.getElementById('songPlayerSeek');
    const currentTimeLabel = document.getElementById('songPlayerCurrentTime');
    const durationLabel = document.getElementById('songPlayerDuration');
    const previousButton = document.getElementById('songPlayerPrevious');
    const toggleButton = document.getElementById('songPlayerToggle');
    const nextButton = document.getElementById('songPlayerNext');
    const miniPlayer = document.getElementById('topMiniPlayer');
    const miniExpand = document.getElementById('topMiniExpand');
    const miniCover = document.getElementById('topMiniCover');
    const miniTitle = document.getElementById('topMiniTitle');
    const miniPrevious = document.getElementById('topMiniPrevious');
    const miniToggle = document.getElementById('topMiniToggle');
    const miniNext = document.getElementById('topMiniNext');
    const miniStop = document.getElementById('topMiniStop');
    const legacyPlayer = document.getElementById('mobilePlayer');
    const legacyTitle = document.getElementById('mobilePlayerTitle');
    const legacyArtist = document.getElementById('mobilePlayerArtist');
    const legacyCoverWrap = document.getElementById('mobilePlayerCoverWrap');
    const legacyCover = document.getElementById('mobilePlayerCover');
    const legacyProgress = document.getElementById('mobilePlayerProgress');
    const legacyPrevious = document.getElementById('mobilePrev');
    const legacyToggle = document.getElementById('mobilePlay');
    const legacyNext = document.getElementById('mobileNext');

    if(
      !screen || !playerScroll || !backButton || !minimizeButton || !coverWrap || !cover ||
      !title || !description || !languageLabel || !descriptionToggle || !descriptionSheet ||
      !descriptionCollapse || !descriptionFull || !lyrics || !translation || !translationBlock ||
      !orderButton || !seek || !currentTimeLabel || !durationLabel || !previousButton ||
      !toggleButton || !nextButton || !miniPlayer || !miniExpand || !miniCover || !miniTitle ||
      !miniPrevious || !miniToggle || !miniNext || !miniStop
    ) return;

    const catalog = window.TuneWrapCatalog;
    if(!catalog?.enabled) return;
    const queue = catalog.queue().map(track => Object.freeze({
      ...track,
      name:track.id,
      source:track.audio
    }));
    if(!queue.length) return;
    const itemsByName = new Map(queue.map(item => [item.name,item]));

    let currentItem = null;
    let currentIndex = -1;
    let restoreFocus = null;
    let wantsPlayback = false;
    let sourceToken = 0;
    let seekToken = 0;
    let userSeeking = false;
    let pendingSeekTime = null;
    let resumeAfterSeek = false;
    let portableSource = null;
    let prefetchLink = null;
    let failedTracks = new Set();
    let lastMediaPositionUpdate = 0;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeAllowed = false;
    let descriptionFrame = 0;
    let waveformResizeFrame = 0;

    audio.preload = 'metadata';
    audio.playsInline = true;

    function interfaceLanguage(){
      const code = document.documentElement.getAttribute('lang') || 'ru';
      return PLAYER_UI[code] ? code : 'ru';
    }

    function ui(){
      return PLAYER_UI[interfaceLanguage()];
    }

    function localizedTitle(name){
      return catalog.title(itemsByName.get(name),interfaceLanguage());
    }

    function formatTime(value){
      const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
      return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2,'0');
    }

    function mediaDuration(){
      if(Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
      if(audio.seekable?.length){
        const end = audio.seekable.end(audio.seekable.length - 1);
        if(Number.isFinite(end) && end > 0) return end;
      }
      return 0;
    }

    function itemLanguage(item){
      return item?.language || 'TuneWrap';
    }

    function itemCover(item){
      return item?.cover || 'assets/covers/tunewrap-placeholder.svg';
    }

    function isAuthorItem(item){
      return item?.section === 'author';
    }

    function songText(item,field){
      const value = item?.[field];
      if(!value || typeof value !== 'object') return '';
      const code = interfaceLanguage();
      return value[code] || value.original || value.ru || value.en || value.uk || value.ka || value.de || Object.values(value)[0] || '';
    }

    function cardFor(item){
      if(!item) return null;
      const escaped = window.CSS?.escape ? window.CSS.escape(item.name) : item.name.replace(/[^a-z0-9_-]/gi,'\\$&');
      return document.querySelector('[data-track-id="' + escaped + '"]');
    }

    function setSeekVisual(value,total){
      const ratio = total > 0 ? Math.max(0,Math.min(100,(value / total) * 100)) : 0;
      seek.style.setProperty('--seek-progress',ratio + '%');
      if(legacyProgress) legacyProgress.style.width = ratio + '%';
    }

    function updateTimeline(forceMediaSession = false){
      const total = mediaDuration();
      const actual = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const display = userSeeking && pendingSeekTime !== null ? pendingSeekTime : actual;
      seek.max = total || 0;
      seek.disabled = total <= 0;
      if(!userSeeking) seek.value = Math.min(actual,total || 0);
      currentTimeLabel.textContent = formatTime(display);
      durationLabel.textContent = formatTime(total);
      setSeekVisual(Number(seek.value) || 0,total);
      updateMediaPosition(forceMediaSession);
    }

    function updateMediaPosition(force = false){
      if(!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
      const now = performance.now();
      if(!force && now - lastMediaPositionUpdate < 900) return;
      const total = mediaDuration();
      if(!Number.isFinite(total) || total <= 0) return;
      const position = Math.max(0,Math.min(total,Number(audio.currentTime) || 0));
      try{
        navigator.mediaSession.setPositionState({
          duration:total,
          playbackRate:audio.playbackRate || 1,
          position
        });
        lastMediaPositionUpdate = now;
      } catch(error){}
    }

    function ensureOverlay(host,name,variant){
      if(!host) return null;
      let overlay = host.querySelector(':scope > .tunewrap-playing-overlay');
      if(!overlay){
        overlay = document.createElement('span');
        overlay.className = 'tunewrap-playing-overlay tunewrap-playing-overlay-' + variant;
        overlay.setAttribute('aria-hidden','true');
        overlay.hidden = true;
        for(let index = 0; index < 7; index += 1){
          overlay.append(document.createElement('i'));
        }
        host.append(overlay);
      }
      overlay.dataset.playingTrack = name;
      return overlay;
    }

    function installPlayingOverlays(){
      document.querySelectorAll('.track[data-track-id],.author-card[data-track-id]').forEach(card => {
        ensureOverlay(card,card.dataset.trackId,'card');
      });
      document.querySelectorAll('[data-featured-track]').forEach(featured => {
        ensureOverlay(featured.querySelector('.library-featured-cover'),featured.dataset.featuredTrack,'artwork');
      });
      document.querySelectorAll('[data-start-track]').forEach(ribbon => {
        ensureOverlay(ribbon,ribbon.dataset.startTrack,'artwork');
      });
      ensureOverlay(coverWrap,'','artwork');
      ensureOverlay(legacyCoverWrap,'','artwork');
    }

    function syncPlayingOverlays(){
      const isPlaying = Boolean(currentItem && !audio.paused && !audio.ended);
      document.querySelectorAll('.tunewrap-playing-overlay').forEach(overlay => {
        const isCurrent = isPlaying && overlay.dataset.playingTrack === currentItem?.name;
        overlay.hidden = !isCurrent;
        overlay.classList.toggle('is-playing',isCurrent);
      });
    }

    function drawIdleWave(canvas){
      const context = canvas.getContext('2d');
      if(!context) return;
      const ratio = Math.min(window.devicePixelRatio || 1,2);
      canvas.width = Math.max(1,Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1,Math.round(canvas.clientHeight * ratio));
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0,0,width,height);
      const bars = 64;
      const gap = width / bars;
      for(let index = 0; index < bars; index += 1){
        const barHeight = 2 * ratio + Math.abs(Math.sin(index * .53)) * height * .31;
        context.fillStyle = 'rgba(243,239,230,.14)';
        context.fillRect(index * gap + gap * .2,height / 2 - barHeight / 2,gap * .6,barHeight);
      }
    }

    function drawIdleWaves(){
      document.querySelectorAll('canvas[data-canvas]').forEach(drawIdleWave);
    }

    function syncCardStates(){
      const playing = Boolean(currentItem && !audio.paused && !audio.ended);
      document.querySelectorAll('.play-btn[data-track]').forEach(button => {
        const current = button.dataset.track === currentItem?.name;
        button.classList.toggle('playing',current && playing);
        button.classList.toggle('is-current-track',current);
        button.setAttribute('aria-pressed',String(current && playing));
      });
      document.querySelectorAll('.track[data-track-id],.author-card[data-track-id]').forEach(card => {
        card.classList.toggle('is-active-track',card.dataset.trackId === currentItem?.name && playing);
      });
      document.querySelectorAll('[data-featured-track]').forEach(featured => {
        featured.classList.toggle('is-active-track',featured.dataset.featuredTrack === currentItem?.name && playing);
      });
      toggleButton.classList.toggle('playing',playing);
      toggleButton.setAttribute('aria-label',playing ? ui().pause : ui().play);
      miniToggle.classList.toggle('playing',playing);
      miniToggle.setAttribute('aria-label',playing ? ui().pause : ui().play);
      legacyToggle?.classList.toggle('playing',playing);
      legacyToggle?.setAttribute('aria-label',playing ? ui().pause : ui().play);
      syncPlayingOverlays();
      if('mediaSession' in navigator){
        try{
          navigator.mediaSession.playbackState = currentItem
            ? (playing ? 'playing' : 'paused')
            : 'none';
        } catch(error){}
      }
    }

    function syncMiniPlayer(){
      if(!currentItem || !mobileViewport.matches){
        if(!currentItem) hideMiniPlayer();
        return;
      }
      const currentTitle = localizedTitle(currentItem.name);
      miniTitle.textContent = currentTitle;
      catalog.syncCoverImage(miniCover,currentItem,{alt:'',loading:'eager'});
      miniPlayer.dataset.trackId = currentItem.name;
      miniPlayer.dataset.trackLanguage = itemLanguage(currentItem);
      miniPlayer.classList.add('is-active');
      miniPlayer.setAttribute('aria-hidden','false');
      miniPlayer.removeAttribute('inert');
      document.body.classList.add('mini-player-active');
      if(legacyPlayer){
        legacyTitle.textContent = currentTitle;
        legacyArtist.textContent = isAuthorItem(currentItem) ? 'Kosta Trufakin' : 'TuneWrap';
        catalog.syncCoverImage(legacyCover,currentItem,{alt:'',loading:'eager'});
        legacyCoverWrap.classList.remove('is-wave');
      }
    }

    function hideMiniPlayer(){
      miniPlayer.classList.remove('is-active');
      miniPlayer.setAttribute('aria-hidden','true');
      miniPlayer.setAttribute('inert','');
      document.body.classList.remove('mini-player-active');
    }

    function updateDescriptionAvailability(){
      descriptionFrame = 0;
      const hasText = Boolean(description.textContent.trim());
      description.parentElement.hidden = !hasText;
      const overflows = hasText && description.scrollHeight > description.clientHeight + 1;
      descriptionToggle.hidden = !overflows;
      if(!overflows) closeDescriptionSheet(false);
    }

    function scheduleDescriptionMeasurement(){
      cancelAnimationFrame(descriptionFrame);
      descriptionFrame = requestAnimationFrame(updateDescriptionAvailability);
    }

    function closeDescriptionSheet(restoreToggleFocus){
      if(!descriptionSheet.classList.contains('is-open')) return;
      descriptionSheet.classList.remove('is-open');
      descriptionSheet.setAttribute('aria-hidden','true');
      descriptionSheet.setAttribute('inert','');
      descriptionToggle.setAttribute('aria-expanded','false');
      screen.classList.remove('is-description-open');
      if(restoreToggleFocus && !descriptionToggle.hidden){
        requestAnimationFrame(() => descriptionToggle.focus({preventScroll:true}));
      }
    }

    function openDescriptionSheet(){
      if(descriptionToggle.hidden || !description.textContent.trim()) return;
      descriptionFull.textContent = description.textContent.trim();
      descriptionSheet.removeAttribute('inert');
      descriptionSheet.classList.add('is-open');
      descriptionSheet.setAttribute('aria-hidden','false');
      descriptionToggle.setAttribute('aria-expanded','true');
      screen.classList.add('is-description-open');
      descriptionFull.scrollTop = 0;
      requestAnimationFrame(() => descriptionCollapse.focus({preventScroll:true}));
    }

    function fillPlayer(item){
      if(!item) return;
      closeDescriptionSheet(false);
      const currentTitle = localizedTitle(item.name);
      const currentDescription = catalog.description(item,interfaceLanguage());
      title.textContent = currentTitle;
      description.textContent = currentDescription;
      languageLabel.textContent = itemLanguage(item);
      catalog.syncCoverImage(cover,item,{alt:currentTitle,loading:'eager'});
      coverWrap.classList.remove('is-wave');
      const playerOverlay = coverWrap.querySelector(':scope > .tunewrap-playing-overlay');
      if(playerOverlay) playerOverlay.dataset.playingTrack = item.name;
      const legacyOverlay = legacyCoverWrap?.querySelector(':scope > .tunewrap-playing-overlay');
      if(legacyOverlay) legacyOverlay.dataset.playingTrack = item.name;

      const lyricText = songText(item,'lyrics');
      lyrics.textContent = lyricText || ui().empty;
      lyrics.classList.toggle('is-empty',!lyricText);
      const translationText = songText(item,'translation');
      translation.textContent = translationText;
      translationBlock.hidden = !translationText;
      syncMiniPlayer();
      scheduleDescriptionMeasurement();
      syncPlayingOverlays();
    }

    function syncLocalizedPlayer(){
      const labels = ui();
      seek.setAttribute('aria-label',labels.seek);
      previousButton.setAttribute('aria-label',labels.previous);
      nextButton.setAttribute('aria-label',labels.next);
      miniExpand.setAttribute('aria-label',labels.expand);
      miniPrevious.setAttribute('aria-label',labels.previous);
      miniNext.setAttribute('aria-label',labels.next);
      miniStop.setAttribute('aria-label',labels.stop);
      if(currentItem) fillPlayer(currentItem);
      syncCardStates();
      updateMediaMetadata();
    }

    function openPlayer(item,origin,autoplay){
      if(!item) return;
      restoreFocus = origin || cardFor(item);
      if(currentItem !== item){
        selectTrack(item.name,{autoplay:autoplay !== false,reason:'open-player'});
      } else if(autoplay !== false && audio.paused){
        playCurrent('open-player');
      } else {
        fillPlayer(item);
      }
      if(!mobileViewport.matches) return;
      screen.removeAttribute('inert');
      screen.classList.add('is-open');
      screen.setAttribute('aria-hidden','false');
      document.body.classList.add('song-player-open');
      appScroll?.setAttribute('inert','');
      bottomNav?.setAttribute('inert','');
      miniPlayer.setAttribute('inert','');
      requestAnimationFrame(() => backButton.focus({preventScroll:true}));
    }

    function closePlayer(showMini = true){
      if(!screen.classList.contains('is-open')) return;
      closeDescriptionSheet(false);
      screen.classList.remove('is-open');
      screen.setAttribute('aria-hidden','true');
      screen.setAttribute('inert','');
      document.body.classList.remove('song-player-open');
      const libraryOpen = Boolean(document.querySelector('.music-library-panel.is-open'));
      if(!libraryOpen){
        appScroll?.removeAttribute('inert');
        bottomNav?.removeAttribute('inert');
      }
      miniPlayer.removeAttribute('inert');
      if(showMini && currentItem) syncMiniPlayer();
      else hideMiniPlayer();
      if(restoreFocus && typeof restoreFocus.focus === 'function'){
        requestAnimationFrame(() => restoreFocus.focus({preventScroll:true}));
      }
    }

    function releasePortableSource(){
      if(!portableSource) return;
      if(portableSource.url) URL.revokeObjectURL(portableSource.url);
      portableSource = null;
    }

    function setDirectSource(item){
      const absolute = new URL(item.source,document.baseURI).href;
      if(audio.currentSrc === absolute || audio.src === absolute) return;
      const previousPortable = portableSource;
      portableSource = null;
      audio.src = absolute;
      audio.preload = 'auto';
      audio.load();
      if(previousPortable?.url) URL.revokeObjectURL(previousPortable.url);
    }

    function preloadNext(){
      if(!queue.length || currentIndex < 0) return;
      const nextItem = queue[(currentIndex + 1) % queue.length];
      if(!nextItem) return;
      if(prefetchLink) prefetchLink.remove();
      prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.as = 'audio';
      prefetchLink.href = nextItem.source;
      prefetchLink.dataset.tunewrapAudioPrefetch = nextItem.name;
      document.head.append(prefetchLink);
    }

    function selectTrack(name,options = {}){
      const item = itemsByName.get(name);
      if(!item) return false;
      const changing = currentItem !== item;
      const autoplay = options.autoplay !== false;
      sourceToken += 1;
      seekToken += 1;
      userSeeking = false;
      pendingSeekTime = null;
      resumeAfterSeek = false;
      audio.volume = 1;
      currentItem = item;
      currentIndex = queue.indexOf(item);
      wantsPlayback = autoplay;
      if(changing){
        setDirectSource(item);
        try{ audio.currentTime = 0; } catch(error){}
      }
      fillPlayer(item);
      updateMediaMetadata();
      updateTimeline(true);
      syncMiniPlayer();
      syncCardStates();
      preloadNext();
      if(autoplay) playCurrent(options.reason || 'selection');
      return true;
    }

    function dispatchPlaybackError(error,reason){
      document.dispatchEvent(new CustomEvent('tunewrap:playbackerror',{
        detail:{track:currentItem?.name || '',reason,error}
      }));
    }

    function playCurrent(reason = 'control'){
      if(!currentItem) return;
      wantsPlayback = true;
      const token = sourceToken;
      const request = audio.play();
      if(request && typeof request.catch === 'function'){
        request.catch(error => {
          if(token !== sourceToken || error?.name === 'AbortError') return;
          wantsPlayback = false;
          syncCardStates();
          dispatchPlaybackError(error,reason);
        });
      }
    }

    function pauseCurrent(){
      wantsPlayback = false;
      audio.pause();
      syncCardStates();
      updateMediaPosition(true);
    }

    function toggleCurrent(){
      if(!currentItem){
        if(queue[0]) selectTrack(queue[0].name,{autoplay:true,reason:'initial-control'});
        return;
      }
      if(audio.paused || audio.ended) playCurrent('control');
      else pauseCurrent();
    }

    function advance(direction,reason = 'control'){
      if(!queue.length) return;
      const base = currentIndex >= 0 ? currentIndex : (direction > 0 ? -1 : 0);
      const nextIndex = (base + direction + queue.length) % queue.length;
      selectTrack(queue[nextIndex].name,{autoplay:true,reason});
    }

    function stopPlayback(){
      wantsPlayback = false;
      sourceToken += 1;
      audio.pause();
      try{ audio.currentTime = 0; } catch(error){}
      currentItem = null;
      currentIndex = -1;
      seek.value = 0;
      currentTimeLabel.textContent = '0:00';
      durationLabel.textContent = '0:00';
      setSeekVisual(0,0);
      miniTitle.textContent = 'TuneWrap';
      releasePortableSource();
      hideMiniPlayer();
      syncCardStates();
      if('mediaSession' in navigator){
        try{
          navigator.mediaSession.metadata = null;
          navigator.mediaSession.playbackState = 'none';
        } catch(error){}
      }
    }

    function canSeekTo(time){
      if(time <= 0) return true;
      const tolerance = .45;
      for(let index = 0; index < audio.seekable.length; index += 1){
        if(
          time >= audio.seekable.start(index) - tolerance &&
          time <= audio.seekable.end(index) + tolerance
        ) return true;
      }
      return false;
    }

    function waitForEvent(type,timeout = 12000){
      return new Promise((resolve,reject) => {
        let timer = 0;
        const cleanup = () => {
          clearTimeout(timer);
          audio.removeEventListener(type,onSuccess);
          audio.removeEventListener('error',onError);
        };
        const onSuccess = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Audio media error')); };
        timer = window.setTimeout(() => {
          cleanup();
          reject(new Error(type + ' timed out'));
        },timeout);
        audio.addEventListener(type,onSuccess,{once:true});
        audio.addEventListener('error',onError,{once:true});
      });
    }

    async function portableUrlForCurrent(token){
      if(portableSource?.track === currentItem?.name){
        return portableSource.promise;
      }
      releasePortableSource();
      const item = currentItem;
      const record = {track:item.name,url:'',promise:null};
      record.promise = fetch(new URL(item.source,document.baseURI).href,{cache:'force-cache'})
        .then(response => {
          if(!response.ok) throw new Error('Audio fallback request failed');
          return response.blob();
        })
        .then(blob => {
          if(token !== sourceToken || currentItem !== item) throw new Error('Audio source changed');
          if(!blob.size) throw new Error('Audio fallback response was empty');
          record.url = URL.createObjectURL(blob.type ? blob : new Blob([blob],{type:'audio/mpeg'}));
          return record.url;
        })
        .catch(error => {
          if(portableSource === record) portableSource = null;
          if(record.url) URL.revokeObjectURL(record.url);
          throw error;
        });
      portableSource = record;
      return record.promise;
    }

    function waitForConfirmedSeek(target,timeout = 2200){
      return new Promise((resolve,reject) => {
        let timer = 0;
        const closeEnough = () => {
          const total = mediaDuration();
          return Math.abs(audio.currentTime - target) <= .8 ||
            (target >= total - .6 && audio.currentTime >= total - 1.1);
        };
        const cleanup = () => {
          clearTimeout(timer);
          audio.removeEventListener('seeked',onSeeked);
          audio.removeEventListener('error',onError);
        };
        const onSeeked = () => {
          if(!closeEnough()) return;
          cleanup();
          resolve();
        };
        const onError = () => { cleanup(); reject(new Error('Audio seek error')); };
        timer = window.setTimeout(() => {
          cleanup();
          closeEnough() ? resolve() : reject(new Error('Audio seek timed out'));
        },timeout);
        audio.addEventListener('seeked',onSeeked);
        audio.addEventListener('error',onError,{once:true});
      });
    }

    async function fadeVolume(target,duration = 28){
      const start = audio.volume;
      if(Math.abs(start - target) < .01){
        audio.volume = target;
        return;
      }
      const steps = 4;
      for(let step = 1; step <= steps; step += 1){
        audio.volume = start + (target - start) * (step / steps);
        if(step < steps){
          await new Promise(resolve => window.setTimeout(resolve,duration / steps));
        }
      }
    }

    async function commitSeek(target,operation,shouldResume){
      if(!currentItem || operation !== seekToken) return;
      const total = mediaDuration();
      const requested = Math.max(0,Math.min(total,target));
      const sourceAtStart = sourceToken;
      try{
        await fadeVolume(0,24);
        if(operation !== seekToken || sourceAtStart !== sourceToken) return;

        if(!canSeekTo(requested)){
          const portableUrl = await portableUrlForCurrent(sourceAtStart);
          if(operation !== seekToken || sourceAtStart !== sourceToken) return;
          if(audio.currentSrc !== portableUrl){
            const ready = waitForEvent('loadedmetadata');
            audio.src = portableUrl;
            audio.preload = 'auto';
            audio.load();
            await ready;
          }
        }
        if(operation !== seekToken || sourceAtStart !== sourceToken) return;

        const seeked = waitForConfirmedSeek(requested);
        audio.currentTime = requested;
        await seeked;
        if(operation !== seekToken || sourceAtStart !== sourceToken) return;

        if(shouldResume && audio.paused){
          const request = audio.play();
          if(request && typeof request.then === 'function') await request;
        }
        await fadeVolume(1,32);
      } catch(error){
        audio.volume = 1;
        dispatchPlaybackError(error,'seek');
      } finally {
        if(operation === seekToken){
          userSeeking = false;
          pendingSeekTime = null;
          resumeAfterSeek = false;
          updateTimeline(true);
          syncCardStates();
        }
      }
    }

    function seekFromClientX(clientX){
      const total = mediaDuration();
      const bounds = seek.getBoundingClientRect();
      if(!total || bounds.width <= 0) return;
      const ratio = Math.max(0,Math.min(1,(clientX - bounds.left) / bounds.width));
      seek.value = ratio * total;
    }

    function beginSeek(event){
      if(!currentItem) return;
      event?.stopImmediatePropagation?.();
      seekToken += 1;
      userSeeking = true;
      resumeAfterSeek = !audio.paused && !audio.ended;
      const point = event?.touches?.[0] || event;
      if(Number.isFinite(point?.clientX)) seekFromClientX(point.clientX);
      pendingSeekTime = Number(seek.value) || 0;
      updateTimeline();
      if(event?.pointerId !== undefined && typeof seek.setPointerCapture === 'function'){
        try{ seek.setPointerCapture(event.pointerId); } catch(error){}
      }
    }

    function previewSeek(event){
      event?.stopImmediatePropagation?.();
      if(!userSeeking) beginSeek(event);
      const point = event?.touches?.[0] || event;
      if(Number.isFinite(point?.clientX)) seekFromClientX(point.clientX);
      pendingSeekTime = Number(seek.value) || 0;
      updateTimeline();
    }

    function releaseSeek(event){
      event?.stopImmediatePropagation?.();
      if(!userSeeking || !currentItem) return;
      pendingSeekTime = Number(seek.value) || 0;
      commitSeek(pendingSeekTime,seekToken,resumeAfterSeek);
    }

    function updateMediaMetadata(){
      if(!currentItem || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
      const source = itemCover(currentItem) || 'assets/covers/tunewrap-placeholder.svg';
      const artworkUrl = new URL(source,document.baseURI).href;
      const type = source.endsWith('.svg') ? 'image/svg+xml' : source.endsWith('.png') ? 'image/png' : 'image/jpeg';
      try{
        navigator.mediaSession.metadata = new MediaMetadata({
          title:localizedTitle(currentItem.name),
          artist:currentItem.artist || (isAuthorItem(currentItem) ? 'Kosta Trufakin' : 'TuneWrap'),
          album:currentItem.album || (isAuthorItem(currentItem) ? 'TuneWrap · Author Songs' : 'TuneWrap · Musical Stories'),
          artwork:[
            {src:artworkUrl,sizes:'192x192',type},
            {src:artworkUrl,sizes:'512x512',type}
          ]
        });
      } catch(error){}
    }

    function installMediaSession(){
      if(!('mediaSession' in navigator)) return;
      const handlers = {
        play:() => playCurrent('media-session'),
        pause:pauseCurrent,
        previoustrack:() => advance(-1,'media-session'),
        nexttrack:() => advance(1,'media-session'),
        seekbackward:details => {
          if(!currentItem) return;
          const target = Math.max(0,audio.currentTime - (details.seekOffset || 10));
          seekToken += 1;
          commitSeek(target,seekToken,!audio.paused);
        },
        seekforward:details => {
          if(!currentItem) return;
          const target = Math.min(mediaDuration(),audio.currentTime + (details.seekOffset || 10));
          seekToken += 1;
          commitSeek(target,seekToken,!audio.paused);
        },
        seekto:details => {
          if(!currentItem || !Number.isFinite(details.seekTime)) return;
          seekToken += 1;
          commitSeek(details.seekTime,seekToken,!audio.paused);
        },
        stop:stopPlayback
      };
      Object.entries(handlers).forEach(([action,handler]) => {
        try{ navigator.mediaSession.setActionHandler(action,handler); } catch(error){}
      });
    }

    function captureClick(element,handler){
      element?.addEventListener('click',event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        handler(event);
      },{capture:true});
    }

    document.addEventListener('click',event => {
      const button = event.target.closest('.play-btn[data-track]');
      if(button){
        const item = itemsByName.get(button.dataset.track);
        if(!item) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if(currentItem === item) toggleCurrent();
        else selectTrack(item.name,{autoplay:true,reason:'library-play'});
        syncMiniPlayer();
        return;
      }
      const featured = event.target.closest('[data-featured-track]');
      if(featured){
        const item = itemsByName.get(featured.dataset.featuredTrack);
        if(!item) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openPlayer(item,featured,true);
        return;
      }
      const ribbon = event.target.closest('[data-start-track]');
      if(ribbon){
        const item = itemsByName.get(ribbon.dataset.startTrack);
        if(!item) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openPlayer(item,ribbon,true);
        return;
      }
      const card = event.target.closest('.track[data-track-id],.author-card[data-track-id]');
      if(!card) return;
      const item = itemsByName.get(card.dataset.trackId);
      if(!item) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openPlayer(item,card,true);
    },{capture:true});

    document.addEventListener('keydown',event => {
      const card = event.target.closest?.('.track[data-track-id],.author-card[data-track-id]');
      if(!card || event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return;
      const item = itemsByName.get(card.dataset.trackId);
      if(!item) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openPlayer(item,card,true);
    },{capture:true});

    captureClick(backButton,() => closePlayer(true));
    captureClick(minimizeButton,() => closePlayer(true));
    captureClick(previousButton,() => advance(-1,'full-player'));
    captureClick(toggleButton,toggleCurrent);
    captureClick(nextButton,() => advance(1,'full-player'));
    captureClick(descriptionToggle,openDescriptionSheet);
    captureClick(descriptionCollapse,() => closeDescriptionSheet(true));
    captureClick(miniPrevious,() => advance(-1,'mini-player'));
    captureClick(miniToggle,toggleCurrent);
    captureClick(miniNext,() => advance(1,'mini-player'));
    captureClick(miniStop,stopPlayback);
    captureClick(miniExpand,() => {
      if(currentItem) openPlayer(currentItem,miniExpand,false);
    });
    captureClick(legacyPrevious,() => advance(-1,'legacy-mini-player'));
    captureClick(legacyToggle,toggleCurrent);
    captureClick(legacyNext,() => advance(1,'legacy-mini-player'));
    captureClick(orderButton,() => {
      closePlayer(true);
      const contact = document.getElementById('contact');
      if(contact) window.setTimeout(() => contact.scrollIntoView({behavior:'smooth',block:'start'}),80);
    });

    miniPlayer.addEventListener('click',event => {
      if(event.target.closest('.top-mini-controls,.top-mini-stop')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(currentItem) openPlayer(currentItem,miniExpand,false);
    },{capture:true});

    seek.addEventListener('input',previewSeek,{capture:true});
    seek.addEventListener('change',releaseSeek,{capture:true});
    if('PointerEvent' in window){
      seek.addEventListener('pointerdown',beginSeek,{capture:true});
      seek.addEventListener('pointermove',event => {
        if(userSeeking) previewSeek(event);
      },{capture:true});
      seek.addEventListener('pointerup',releaseSeek,{capture:true});
      seek.addEventListener('pointercancel',releaseSeek,{capture:true});
    } else {
      seek.addEventListener('touchstart',beginSeek,{capture:true,passive:true});
      seek.addEventListener('touchmove',previewSeek,{capture:true,passive:true});
      seek.addEventListener('touchend',releaseSeek,{capture:true,passive:true});
      seek.addEventListener('mousedown',beginSeek,{capture:true});
      document.addEventListener('mousemove',event => {
        if(userSeeking) previewSeek(event);
      },{capture:true});
      document.addEventListener('mouseup',releaseSeek,{capture:true});
    }

    playerScroll.addEventListener('pointerdown',event => {
      swipeAllowed = Boolean(
        screen.classList.contains('is-open') &&
        event.pointerType !== 'mouse' &&
        !event.target.closest('button,a,input,select,textarea,[contenteditable="true"]')
      );
      if(!swipeAllowed) return;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
    },{passive:true});
    playerScroll.addEventListener('pointerup',event => {
      if(!swipeAllowed) return;
      swipeAllowed = false;
      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      if(Math.abs(deltaX) >= 60 && Math.abs(deltaX) > Math.abs(deltaY)){
        advance(deltaX < 0 ? 1 : -1,'player-swipe');
      }
    },{passive:true});
    playerScroll.addEventListener('pointercancel',() => { swipeAllowed = false; },{passive:true});

    cover.addEventListener('load',() => cover.classList.add('is-loaded'));
    cover.addEventListener('error',() => cover.classList.add('is-loaded'));

    audio.addEventListener('loadedmetadata',() => {
      failedTracks.delete(currentItem?.name);
      updateTimeline(true);
      preloadNext();
    });
    audio.addEventListener('durationchange',() => updateTimeline(true));
    audio.addEventListener('canplay',() => {
      failedTracks.delete(currentItem?.name);
      updateTimeline(true);
    });
    audio.addEventListener('timeupdate',() => {
      if(!userSeeking) updateTimeline(false);
    });
    audio.addEventListener('seeked',() => {
      if(!userSeeking) updateTimeline(true);
    });
    audio.addEventListener('play',() => {
      wantsPlayback = true;
      syncCardStates();
      syncMiniPlayer();
      updateMediaPosition(true);
    });
    audio.addEventListener('pause',() => {
      syncCardStates();
      updateMediaPosition(true);
    });
    audio.addEventListener('ended',() => {
      if(!currentItem) return;
      wantsPlayback = true;
      // Keep the transition synchronous and on the same media element so it survives
      // Android background timer throttling and remains one continuous media session.
      advance(1,'ended');
    });
    audio.addEventListener('error',() => {
      if(!currentItem) return;
      const expectedSource = portableSource?.track === currentItem.name && portableSource.url
        ? portableSource.url
        : new URL(currentItem.source,document.baseURI).href;
      if(audio.currentSrc && audio.currentSrc !== expectedSource) return;
      const failedName = currentItem.name;
      failedTracks.add(failedName);
      dispatchPlaybackError(audio.error || new Error('Audio network error'),'media-error');
      if(!wantsPlayback || failedTracks.size >= queue.length){
        wantsPlayback = false;
        syncCardStates();
        return;
      }
      advance(1,'network-recovery');
    });

    document.addEventListener('tunewrap:languagechange',syncLocalizedPlayer);
    document.addEventListener('tunewrap:catalogrendered',() => {
      installPlayingOverlays();
      drawIdleWaves();
      syncCardStates();
    });
    document.addEventListener('visibilitychange',() => {
      // Playback state is deliberately preserved. Only refresh UI/metadata on return.
      if(!document.hidden){
        syncLocalizedPlayer();
        updateTimeline(true);
      }
    });
    window.addEventListener('pagehide',releasePortableSource,{once:true});
    window.addEventListener('resize',() => {
      if(waveformResizeFrame) return;
      waveformResizeFrame = requestAnimationFrame(() => {
        waveformResizeFrame = 0;
        drawIdleWaves();
      });
    },{passive:true});

    document.addEventListener('keydown',event => {
      if(!screen.classList.contains('is-open')) return;
      if(event.key === 'Escape'){
        if(descriptionSheet.classList.contains('is-open')) closeDescriptionSheet(true);
        else closePlayer(true);
      } else if(event.key === 'ArrowLeft' && event.target !== seek){
        advance(-1,'keyboard');
      } else if(event.key === 'ArrowRight' && event.target !== seek){
        advance(1,'keyboard');
      }
    },{capture:true});

    if(typeof mobileViewport.addEventListener === 'function'){
      mobileViewport.addEventListener('change',event => {
        if(!event.matches){
          closePlayer(false);
          hideMiniPlayer();
        } else if(currentItem && !screen.classList.contains('is-open')){
          syncMiniPlayer();
        }
      });
    }

    installPlayingOverlays();
    drawIdleWaves();
    installMediaSession();
    syncLocalizedPlayer();
    hideMiniPlayer();
    screen.setAttribute('inert','');

    window.__tuneWrapPlayerBridge = {
      adoptLibraryPlayback(card,origin){
        const button = card?.querySelector('.play-btn[data-track]');
        const item = button ? itemsByName.get(button.dataset.track) : null;
        if(!item) return false;
        restoreFocus = origin || card;
        if(currentItem !== item) selectTrack(item.name,{autoplay:true,reason:'library-bridge'});
        else if(audio.paused) playCurrent('library-bridge');
        syncMiniPlayer();
        return true;
      }
    };

    window.__tuneWrapPlayback = Object.freeze({
      engine:audio,
      getQueue:() => queue.map(item => item.name),
      getCurrent:() => currentItem?.name || '',
      select:name => selectTrack(name,{autoplay:false,reason:'diagnostic'}),
      play:playCurrent,
      pause:pauseCurrent,
      next:() => advance(1,'diagnostic'),
      previous:() => advance(-1,'diagnostic'),
      seekTo:time => {
        const target=Number(time);
        const total=mediaDuration();
        if(!currentItem || !Number.isFinite(target) || !(total>0))return false;
        const requested=Math.max(0,Math.min(total,target));
        seekToken += 1;
        userSeeking=false;
        pendingSeekTime=null;
        resumeAfterSeek=false;
        try{
          if(typeof audio.fastSeek==='function') audio.fastSeek(requested);
          else audio.currentTime=requested;
          updateTimeline(true);
          return true;
        }catch(error){
          const operation=seekToken;
          commitSeek(requested,operation,!audio.paused && !audio.ended);
          return true;
        }
      },
      getDuration:mediaDuration,
      getCurrentTime:() => Number(audio.currentTime) || 0
    });
  });
})();
