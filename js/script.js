
// ---------- shared TuneWrap brand waveform ----------
(function(){
  const canvases = Array.from(document.querySelectorAll('[data-brand-wave]'));
  if(!canvases.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  const waves = canvases.map(canvas => ({
    canvas,
    ctx:canvas.getContext('2d'),
    isVisible:true
  })).filter(wave => wave.ctx);
  if(!waves.length) return;

  let animationFrame = 0;
  let t = 0;

  function resize(wave){
    const {canvas} = wave;
    const ratio = Math.min(window.devicePixelRatio || 1,2);
    const width = Math.max(1,Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1,Math.round(canvas.clientHeight * ratio));
    if(canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
  }

  function drawWave(wave){
    const {canvas,ctx} = wave;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const bars = 64;
    const gap = w / bars;
    for(let i=0;i<bars;i++){
      const amp = (Math.sin(i*0.35 + t) * 0.5 + 0.5) * (0.4 + 0.6*Math.sin(i*0.12+t*0.7)*Math.sin(i*0.12+t*0.7));
      const bh = Math.max(6, amp * h * 0.85);
      const x = i*gap + gap*0.25;
      const bw = gap*0.5;
      const grad = ctx.createLinearGradient(0, h/2-bh/2, 0, h/2+bh/2);
      grad.addColorStop(0, 'rgba(217,164,65,0.9)');
      grad.addColorStop(1, 'rgba(217,164,65,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, h/2 - bh/2, bw, bh);
    }
  }

  function hasVisibleWave(){
    return waves.some(wave => wave.isVisible);
  }

  function draw(){
    animationFrame = 0;
    t += 0.02;
    waves.forEach(wave => {
      if(wave.isVisible) drawWave(wave);
    });
    if(hasVisibleWave() && !document.hidden && !reducedMotion.matches){
      animationFrame = requestAnimationFrame(draw);
    }
  }

  function start(){
    if(animationFrame || !hasVisibleWave() || document.hidden || reducedMotion.matches) return;
    animationFrame = requestAnimationFrame(draw);
  }

  function stop(){
    if(animationFrame){
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  waves.forEach(wave => {
    resize(wave);
    drawWave(wave);
  });
  start();

  if('ResizeObserver' in window){
    const waveByCanvas = new Map(waves.map(wave => [wave.canvas,wave]));
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const wave = waveByCanvas.get(entry.target);
        if(!wave) return;
        resize(wave);
        drawWave(wave);
      });
    });
    waves.forEach(wave => resizeObserver.observe(wave.canvas));
  } else {
    window.addEventListener('resize', () => {
      waves.forEach(wave => {
        resize(wave);
        drawWave(wave);
      });
    },{passive:true});
  }

  if('IntersectionObserver' in window){
    const visibilityObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const wave = waves.find(item => item.canvas === entry.target);
        if(wave) wave.isVisible = entry.isIntersecting;
      });
      if(hasVisibleWave()) start();
      else stop();
    },{rootMargin:'120px 0px'});
    waves.forEach(wave => visibilityObserver.observe(wave.canvas));
  }

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) stop();
    else start();
  });

  if(typeof reducedMotion.addEventListener === 'function'){
    reducedMotion.addEventListener('change', () => {
      if(reducedMotion.matches){
        stop();
        waves.forEach(drawWave);
      } else {
        start();
      }
    });
  }
})();

// ---------- track players with live analyser waveform ----------
(function(){
  const tracks = Array.from(new Set(
    Array.from(document.querySelectorAll('.play-btn[data-track]'))
      .map(button => button.dataset.track)
      .filter(Boolean)
  ));
  let audioCtx = null;
  const nodes = {};
  let currentPlaying = null;
  const resizeHandlers = [];

  function getCtx(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function nodeFor(audio){
    const name = audio && audio.id ? audio.id.replace(/^audio-/,'') : '';
    return name ? nodes[name] : null;
  }

  function holdGain(parameter,time){
    if(typeof parameter.cancelAndHoldAtTime === 'function'){
      parameter.cancelAndHoldAtTime(time);
      return;
    }
    const value = parameter.value;
    parameter.cancelScheduledValues(time);
    parameter.setValueAtTime(value,time);
  }

  window.__tuneWrapAudioTransitions = {
    async ramp(audio,target,durationMs){
      const node = nodeFor(audio);
      if(!node) return false;
      const {context,gain} = node;
      if(context.state === 'suspended'){
        try{
          await context.resume();
        } catch(error){}
      }
      const duration = Math.max(0,durationMs || 0) / 1000;
      const now = context.currentTime;
      holdGain(gain.gain,now);
      gain.gain.linearRampToValueAtTime(
        Math.max(0,Math.min(1,target)),
        now + duration
      );
      if(durationMs > 0){
        await new Promise(resolve => window.setTimeout(resolve,durationMs + 4));
      }
      return true;
    },
    reset(audio){
      const node = nodeFor(audio);
      if(!node) return false;
      const now = node.context.currentTime;
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setValueAtTime(1,now);
      return true;
    }
  };

  tracks.forEach(name=>{
    const audio = document.getElementById('audio-'+name);
    const canvas = document.querySelector('canvas[data-canvas="'+name+'"]');
    const btn = document.querySelector('.play-btn[data-track="'+name+'"]');
    const timeEl = document.querySelector('[data-time="'+name+'"]');
    if(!audio || !canvas || !btn || !timeEl) return;
    const ctx2d = canvas.getContext('2d');

    function resizeCanvas(){
      const ratio = Math.min(window.devicePixelRatio || 1,2);
      canvas.width = Math.max(1,Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1,Math.round(canvas.clientHeight * ratio));
    }
    resizeCanvas();

    // static idle bars until played
    function drawIdle(){
      const w = canvas.width, h = canvas.height;
      ctx2d.clearRect(0,0,w,h);
      const bars = 80;
      const gap = w/bars;
      for(let i=0;i<bars;i++){
        const bh = (2 + Math.abs(Math.sin(i*0.5))*h*0.35);
        ctx2d.fillStyle = 'rgba(243,239,230,0.14)';
        ctx2d.fillRect(i*gap+gap*0.2, h/2-bh/2, gap*0.6, bh);
      }
    }
    drawIdle();
    resizeHandlers.push(() => {
      resizeCanvas();
      if(audio.paused) drawIdle();
    });

    let analyser, source, gain, dataArray, rafId;

    function setupAnalyser(){
      if(analyser) return;
      const ac = getCtx();
      source = ac.createMediaElementSource(audio);
      analyser = ac.createAnalyser();
      gain = ac.createGain();
      analyser.fftSize = 128;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ac.destination);
      nodes[name] = {context:ac,gain};
    }

    function drawLive(){
      analyser.getByteFrequencyData(dataArray);
      const w = canvas.width, h = canvas.height;
      ctx2d.clearRect(0,0,w,h);
      const bars = dataArray.length;
      const gap = w/bars;
      for(let i=0;i<bars;i++){
        const v = dataArray[i]/255;
        const bh = Math.max(3, v*h*0.95);
        const grad = ctx2d.createLinearGradient(0,h/2-bh/2,0,h/2+bh/2);
        grad.addColorStop(0,'rgba(217,164,65,0.95)');
        grad.addColorStop(1,'rgba(217,164,65,0.16)');
        ctx2d.fillStyle = grad;
        ctx2d.fillRect(i*gap+gap*0.15, h/2-bh/2, gap*0.7, bh);
      }
      rafId = requestAnimationFrame(drawLive);
    }

    function fmt(s){
      s = Math.floor(s||0);
      return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
    }

    function syncCardTimeline(){
      const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      timeEl.textContent = fmt(audio.currentTime)+' / '+fmt(total);
    }

    audio.addEventListener('timeupdate', ()=>{
      syncCardTimeline();
    });
    audio.addEventListener('loadedmetadata',syncCardTimeline);
    audio.addEventListener('durationchange',syncCardTimeline);
    audio.addEventListener('canplay',syncCardTimeline);
    audio.addEventListener('seeked',syncCardTimeline);
    audio.addEventListener('ended', ()=>{
      btn.classList.remove('playing');
      cancelAnimationFrame(rafId);
      drawIdle();
      currentPlaying = null;
    });

    btn.addEventListener('click', ()=>{
      setupAnalyser();
      const ac = getCtx();
      if(ac.state === 'suspended') ac.resume();

      // pause any other track
      if(currentPlaying && currentPlaying !== name){
        const other = document.getElementById('audio-'+currentPlaying);
        other.pause();
        document.querySelector('.play-btn[data-track="'+currentPlaying+'"]').classList.remove('playing');
      }

      if(audio.paused){
        const playRequest = audio.play();
        const confirmPlayback = () => {
          if(audio.paused) return;
          btn.classList.add('playing');
          currentPlaying = name;
          drawLive();
        };
        const rejectPlayback = () => {
          btn.classList.remove('playing');
          cancelAnimationFrame(rafId);
          drawIdle();
          if(currentPlaying === name) currentPlaying = null;
          audio.dispatchEvent(new CustomEvent('tunewrap:playblocked'));
        };

        if(playRequest && typeof playRequest.then === 'function'){
          playRequest.then(confirmPlayback).catch(rejectPlayback);
        } else {
          confirmPlayback();
        }
      } else {
        audio.pause();
        btn.classList.remove('playing');
        cancelAnimationFrame(rafId);
        drawIdle();
        currentPlaying = null;
      }
    });
  });

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    if(resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resizeHandlers.forEach(resizeTrack => resizeTrack());
    });
  },{passive:true});
})();

// ---------- Stage 8.8: localized track titles ----------
const TUNEWRAP_TRACK_TITLES = {
  ru:{
    days127:"127",
    mainroad:"Главный путь",
    natalia65:"Наталья — 65 лет",
    growold:"Мы будем стареть вместе",
    justfive:"Ещё пять минут",
    diana:"Диана!",
    bestdad:"Лучший муж и папа",
    allbegins:"Всё только начинается!",
    fiveua:"Ещё пять минут",
    growolden:"Мы будем стареть вместе",
    neuesleben:"Новая жизнь",
    growoldge:"Мы будем стареть вместе",
    fivege:"Ещё пять минут",
    amsterdam:"Амстердам",
    mychoice:"Мой выбор",
    tbilisiua:"Тбилиси (UA)",
    tbilisige:"Тбилиси (GE)",
    goodvibe:"Хорошее настроение",
    pulse:"Пульс ночи",
    amsterdamen:"Амстердам — английская версия",
    mychoiceen:"Я делаю что хочу!",
    yayaya:"Ya Ya Ya",
    iwant:"Я делаю что хочу",
    yayayaalt:"YA YA YA (альтернативная версия)",
    dayspass:"Проходят дни",
    ashes:"На пепелище",
    newflight:"Новый полёт",
    noretreat:"Пути назад нет",
    "53":"53"
  },
  uk:{
    days127:"127",
    mainroad:"Головний шлях",
    natalia65:"Наталія — 65 років",
    growold:"Ми будемо старіти разом",
    justfive:"Ще п'ять хвилин",
    diana:"Діана!",
    bestdad:"Найкращий чоловік і тато",
    allbegins:"Все тільки починається!",
    fiveua:"Ще п'ять хвилин",
    growolden:"Ми будемо старіти разом",
    neuesleben:"Нове життя",
    growoldge:"Ми будемо старіти разом",
    fivege:"Ще п'ять хвилин",
    amsterdam:"Амстердам",
    mychoice:"Мій вибір",
    tbilisiua:"Тбілісі (UA)",
    tbilisige:"Тбілісі (GE)",
    goodvibe:"Гарний настрій",
    pulse:"Пульс ночі",
    amsterdamen:"Амстердам — англійська версія",
    mychoiceen:"Я роблю що хочу!",
    yayaya:"Ya Ya Ya",
    iwant:"Я роблю що хочу",
    yayayaalt:"YA YA YA (альтернативна версія)",
    dayspass:"Минають дні",
    ashes:"На попелі",
    newflight:"Новий політ",
    noretreat:"Шляху назад нема",
    "53":"53"
  },
  ka:{
    days127:"127",
    mainroad:"მთავარი გზა",
    natalia65:"ნატალია — 65 წელი",
    growold:"ჩვენ ერთად დავბერდებით",
    justfive:"კიდევ ხუთი წუთი",
    diana:"დიანა!",
    bestdad:"საუკეთესო ქმარი და მამა",
    allbegins:"ყველაფერი მხოლოდ იწყება!",
    fiveua:"კიდევ ხუთი წუთი",
    growolden:"ჩვენ ერთად დავბერდებით",
    neuesleben:"ახალი ცხოვრება",
    growoldge:"ჩვენ ერთად დავბერდებით",
    fivege:"კიდევ ხუთი წუთი",
    amsterdam:"ამსტერდამი",
    mychoice:"ჩემი არჩევანი",
    tbilisiua:"თბილისი (UA)",
    tbilisige:"თბილისი (GE)",
    goodvibe:"კარგი განწყობა",
    pulse:"ღამის პულსი",
    amsterdamen:"ამსტერდამი — ინგლისური ვერსია",
    mychoiceen:"ვაკეთებ იმას, რაც მინდა!",
    yayaya:"Ya Ya Ya",
    iwant:"ვაკეთებ იმას, რაც მინდა",
    yayayaalt:"YA YA YA (ალტერნატიული ვერსია)",
    dayspass:"დღეები გადის",
    ashes:"ფერფლზე",
    newflight:"ახალი ფრენა",
    noretreat:"უკან დასახევი გზა არ არის",
    "53":"53"
  },
  en:{
    days127:"127",
    mainroad:"The Main Path",
    natalia65:"Natalia — 65",
    growold:"We'll Grow Old Together",
    justfive:"Just Five More Minutes",
    diana:"Diana!",
    bestdad:"The Best Husband and Dad",
    allbegins:"Everything Is Just Beginning!",
    fiveua:"Five More Minutes",
    growolden:"We'll Grow Old Together",
    neuesleben:"New Life",
    growoldge:"We'll Grow Old Together",
    fivege:"Five More Minutes",
    amsterdam:"Amsterdam",
    mychoice:"My Choice",
    tbilisiua:"Tbilisi (UA)",
    tbilisige:"Tbilisi (GE)",
    goodvibe:"Good Vibe",
    pulse:"Pulse of the Night",
    amsterdamen:"Amsterdam — English Version",
    mychoiceen:"I Do Whatever I Want!",
    yayaya:"Ya Ya Ya",
    iwant:"I Do Whatever I Want",
    yayayaalt:"YA YA YA (Alternative Version)",
    dayspass:"Days Go By",
    ashes:"On the Ashes",
    newflight:"New Flight",
    noretreat:"No Way Back",
    "53":"53"
  },
  de:{
    days127:"127",
    mainroad:"Der wichtigste Weg",
    natalia65:"Natalia — 65 Jahre",
    growold:"Wir werden gemeinsam alt",
    justfive:"Noch fünf Minuten",
    diana:"Diana!",
    bestdad:"Der beste Ehemann und Papa",
    allbegins:"Alles fängt gerade erst an!",
    fiveua:"Noch fünf Minuten",
    growolden:"Wir werden gemeinsam alt",
    neuesleben:"Neues Leben",
    growoldge:"Wir werden gemeinsam alt",
    fivege:"Noch fünf Minuten",
    amsterdam:"Amsterdam",
    mychoice:"Meine Wahl",
    tbilisiua:"Tbilisi (UA)",
    tbilisige:"Tbilisi (GE)",
    goodvibe:"Gute Stimmung",
    pulse:"Puls der Nacht",
    amsterdamen:"Amsterdam — englische Version",
    mychoiceen:"Ich mache, was ich will!",
    yayaya:"Ya Ya Ya",
    iwant:"Ich mache, was ich will",
    yayayaalt:"YA YA YA (Alternative Version)",
    dayspass:"Die Tage vergehen",
    ashes:"Auf der Asche",
    newflight:"Neuer Flug",
    noretreat:"Kein Weg zurück",
    "53":"53"
  }
};

const TUNEWRAP_LISTEN_LABELS = {
  ru:"Слушать",
  uk:"Слухати",
  ka:"მოსმენა",
  en:"Listen to",
  de:"Anhören"
};

const TUNEWRAP_TRACK_ORIGINAL_TITLES = Object.freeze(
  Array.from(document.querySelectorAll('.play-btn[data-track]')).reduce((titles,button) => {
    const card = button.closest('.track, .author-card');
    const title = card?.querySelector('.track-title')?.textContent.trim();
    if(button.dataset.track && title && !titles[button.dataset.track]){
      titles[button.dataset.track] = title;
    }
    return titles;
  },{})
);

function applyTuneWrapTrackTitles(language){
  const titles = TUNEWRAP_TRACK_TITLES[language] || TUNEWRAP_TRACK_TITLES.ru;
  const listen = TUNEWRAP_LISTEN_LABELS[language] || TUNEWRAP_LISTEN_LABELS.ru;

  document.querySelectorAll('.play-btn[data-track]').forEach(button => {
    const track = button.dataset.track;
    const localizedTitle = titles[track];
    const card = button.closest('.track, .author-card');
    if(!localizedTitle || !card) return;
    const title = card.querySelector('.track-title');
    const image = card.querySelector('.story-cover, .author-cover');
    if(title) title.textContent = localizedTitle;
    if(image) image.alt = localizedTitle;
    button.setAttribute('aria-label',listen + ' ' + localizedTitle);
  });

  document.querySelectorAll('.story-ribbon-card[data-start-track]').forEach(card => {
    const localizedTitle = titles[card.dataset.startTrack];
    if(!localizedTitle) return;
    const label = card.querySelector('.story-ribbon-label, span');
    const image = card.querySelector('img');
    if(label) label.textContent = localizedTitle;
    if(image) image.alt = localizedTitle;
    card.setAttribute('aria-label',listen + ' ' + localizedTitle);
  });

  document.dispatchEvent(new CustomEvent('tunewrap:languagechange',{
    detail:{language}
  }));
}

// ---------- i18n ----------
(function(){
  const I18N = {
    ru: {
      mobile_hero_h1:"История становится <em>песней</em>",
      mobile_menu_philosophy:"Философия",
      mobile_nav_home:"Главная",
      mobile_nav_stories:"Истории",
      mobile_nav_author:"Авторские",
      mobile_nav_packages:"Пакеты",
      mobile_nav_contacts:"Контакты",
      mobile_story_label:"Музыкальная история",
      philosophy_kicker:"Философия TuneWrap",
      philosophy_quote:"«Сначала рождается история. Потом текст. Потом музыка.»",
      philosophy_credit:"— Философия TuneWrap",
      philosophy_text:"Для нас история всегда важнее музыки. Мы начинаем не с аккордов и не с мелодии, а с человека — его воспоминаний, переживаний и самых дорогих моментов. Только после этого появляются слова, а затем музыка, которая усиливает историю, а не заменяет её. Именно поэтому каждая песня TuneWrap становится личной музыкальной историей, к которой хочется возвращаться снова и снова.",
      track_justfive_title:"Just Five More Minutes",
      track_justfive_desc:"Иногда самые важные слова звучат в просьбе остаться ещё на пять минут. Личная история о времени, близости и мгновениях, которые хочется удержать.",
      track_justfive_type:"Личная история",
      author_amsterdamen_desc:"Та же ночь, те же каналы и красные огни — история, рассказанная на английском языке.",
      author_mychoiceen_desc:"Английская версия личной истории о свободе, новом пути и праве жить по собственному выбору.",
      track_growold_title:"Мы будем стареть вместе",
      track_growold_type:"История любви",
      track_growold_desc:"Любовь — это не обещание на один день. Это тысячи рассветов, чашка утреннего кофе, детский смех и тепло ладоней спустя много лет. Самое большое счастье — не считать годы, а проживать каждый день вместе.",
      tagline:"Ваша история — в песне",
      nav_cta:"Оставить заявку",
      hero_eyebrow:"ВАША ИСТОРИЯ",
      track_65_type:"История благодарности",
      track_main_type:"История нового начала",
      listen_story:"▶ Слушать историю",
      track_127_duration:"Фрагмент: 1:00",
      track_127_lang:"Язык: русский",
      track_127_type:"История любви",
      brand_manifesto:"Мы сохраняем самые важные моменты вашей жизни языком музыки.",
      hero_h1:"У каждой истории есть <em>своя мелодия</em>",
      hero_lead:"Первая встреча. Любимая фраза мамы. Семейная шутка. Число на обручальном кольце. Расскажите нам самое важное — и мы превратим вашу историю в песню, которую захочется включить спустя годы.",
      hero_btn_order:"Рассказать свою историю",
      hero_btn_listen:"Послушать истории",
      hero_btn_author:"Автор проекта и его песни",
      tracks_eyebrow:"Музыкальные истории",
      tracks_h2:"Истории, которые можно услышать",
      tracks_p:"Сначала — человек и важные детали его жизни. Потом — текст, музыка и момент, в котором близкие узнают себя.",
      library_featured_story:"Выбранная история",
      stories_count_label:"музыкальных историй",
      stories_open_all:"Открыть все истории",
      stories_library_title:"Все музыкальные истории",
      stories_library_subtitle:"Выберите язык или откройте любую историю из полного каталога.",
      library_close:"Назад",
      library_empty:"В этом языковом разделе пока нет песен.",
      library_search_label:"Поиск песен",
      library_search_placeholder:"Поиск песен",
      library_filter_all:"Все",
      library_no_results:"Песни не найдены",
      library_reset_search:"Сбросить поиск",
      track_127_title:"127",
      track_127_desc:"Она заплатила за его кофе. Через неделю он написал: «Верну кофе?» Через 127 дней понял, что хочет прожить с ней всю жизнь. Теперь это число — на их кольцах.",
      track_main_title:"Главный путь",
      track_main_desc:"35 лет на железной дороге. Он всегда ставил семью на первое место, откладывая свои мечты на потом. Последняя смена стала не прощанием, а первым билетом в новую главу его жизни.",
      track_65_title:"Наталья — 65 лет",
      track_65_desc:"Белый халат после смены. Любимый дождь за окном, кофе на веранде, цветущие пионы и слова, которые знает вся семья: «Главное — чтобы все были здоровы». Эта история о женщине, которая всю жизнь дарит любовь и заботу другим.",
      how_eyebrow:"Как это работает",
      how_h2:"Три шага от истории до готовой песни",
      step1_title:"Расскажите историю",
      step1_desc:"Имена, места, смешные и трогательные детали, желаемый стиль — можно голосовым сообщением, можно текстом.",
      step2_title:"Создаём вашу песню",
      step2_desc:"Находим сердце истории, превращаем важные детали в текст и подбираем музыкальное решение под человека, событие и нужную эмоцию.",
      step3_title:"Доставка",
      step3_desc:"Вы получаете готовую песню в высоком качестве. Срок и количество правок зависят от выбранного пакета.",
      pricing_eyebrow:"Стоимость и форматы",
      pricing_h2:"Выберите свой формат",
      pricing_p:"Выберите глубину работы: от песни по готовому тексту до полного создания истории и текста.",
      pricing_promo_title:"Ограниченная стартовая акция",
      pricing_promo_until:"Только до 31 августа",
      tier_open_btn:"Подробнее",
      tier_detail_close:"Закрыть",
      tier_detail_label:"Формат песни",
      tier_detail_select:"Выбрать тариф и продолжить",
      tier_select_btn:"Выбрать",
      wedding_eyebrow:"ДЛЯ ВАШЕЙ СВАДЬБЫ",
      wedding_subtitle:"Музыка для моментов,<br>которые останутся с вами навсегда.",
      wedding_panel_label:"Для вашей свадьбы",
      wedding_what_included:"Что входит",
      wedding_ideal_for:"Идеально подходит для",
      wedding_order_type_label:"Тип заказа:",
      wedding_order_type_value:"Свадебный пакет",
      wedding_selected_package_label:"Выбранный свадебный пакет",
      wedding_change_hint:"Вы можете изменить пакет перед отправкой заявки.",
      msg_order_type:"Тип заказа",
      contact_eyebrow:"Начать свою историю",
      contact_h2:"Расскажите нам свою историю",
      contact_p:"Выберите пакет и стиль, расскажите о человеке — и мы отправим готовую заявку в один клик.",
      path_order_title:"Заказать песню",
      path_order_desc:"Расскажите историю человека — мы превратим её в личную песню.",
      path_order_action:"Начать заказ",
      path_certificate_title:"Подарочный сертификат",
      path_certificate_desc:"Подарите возможность сохранить важную историю в собственной песне.",
      path_certificate_action:"Выбрать сертификат",
      path_corporate_title:"Корпоративная песня",
      path_corporate_desc:"Песни для команды, компании, партнёров и важных корпоративных событий.",
      path_corporate_action:"Перейти к форме",
      path_back:"Назад к выбору",
      contact_tg:"Написать в Telegram",
      contact_wa:"WhatsApp",
      contact_alternatives:"Или свяжитесь с нами любым удобным способом.",
      summary_tier:"Пакет:",
      summary_style:"Стиль:",
      label_style:"Стиль песни",
      style_hint:"Можно выбрать до двух",
      label_name:"Ваше имя",
      placeholder_name:"Как вас зовут?",
      label_occasion:"Повод",
      occasion_placeholder:"Выберите повод",
      label_description:"О человеке или готовый текст песни",
      placeholder_description:"Расскажите историю, факты, шутки — или вставьте свой текст песни, если он уже готов",
      golden_toggle:"Ответить на несколько вопросов, чтобы текст получился живее (2 минуты, необязательно)",

      label_other_occasion:"Какое это событие?",
      placeholder_other_occasion:"Напишите своими словами",
      story_core_title:"Каким вы хотите запомнить этот день через 20 лет?",
      story_core_hint:"Одним или несколькими предложениями расскажите, что самое важное в вашей истории. Нажмите на пример или выберите «Своя история».",
      placeholder_story_core:"Напишите главное своими словами",
      story_core_note:"Не переживайте, если не умеете красиво писать. Иногда одной простой фразы достаточно, чтобы родилась песня.",
      label_contact:"Как с вами связаться",
      placeholder_contact:"Telegram, WhatsApp или телефон",
      btn_generate:"Сформировать заявку",
      preview_title:"Ваша заявка:",
      btn_copy:"Скопировать текст",
      copied_msg:"Скопировано",
      msg_header:"Заказ с сайта TuneWrap",
      msg_package:"Пакет",
      msg_style:"Стиль",
      msg_name:"Имя",
      msg_occasion:"Повод",
      msg_description:"Описание",
      msg_contact:"Контакт",
      dash:"—",
      mode_order:"Заказать песню",
      mode_certificate:"Подарить сертификат",
      mode_order_hint:"Заполните детали — и мы напишем песню под конкретного человека.",
      mode_certificate_hint:"Получатель сам пришлёт детали позже — вы просто дарите сертификат на песню.",
      summary_total:"Итого:",
      urgent_label:"Срочная доставка за 24 часа (+$25)",
      msg_urgent:"Срочная доставка (24 часа)",
      msg_certificate_note:"Это подарочный сертификат — получатель сам пришлёт детали для песни.",
      reviews_eyebrow:"Отзывы",
      reviews_h2:"Реакции, ради которых это стоит делать",
      review1_quote:"«Она разрыдалась, когда узнала свою историю в тексте — говорит, никто ещё не дарил ей ничего похожего.»",
      review1_author:"Марина — подарок мужу на юбилей",
      review2_quote:"«Включили трек на дне рождения на полную громкость — все гости подпевали уже со второго куплета.»",
      review2_author:"Гиорги — Тбилиси",
      review3_quote:"«Заказал в подарок родителям на годовщину свадьбы — мама сказала, что это лучший подарок за 30 лет.»",
      review3_author:"Алекс — Киев",
      corp_close:"Закрыть",
      corp_panel_label:"Для компаний",
      corp_eyebrow:"Для компаний",
      corp_h2:"Нужно несколько песен?",
      corp_p:"Поздравления сотрудникам, подарки партнёрам, корпоративный гимн — при заказе от 5 песен действует скидка.",
      corp_qty_label:"Количество песен",
      corp_tier_label:"Базовый пакет",
      corp_total_label:"Итого",
      corp_discount_label:"скидка",
      corp_btn:"Обсудить в Telegram",
      corp_msg:"Здравствуйте! Интересует корпоративный заказ: {qty} песен, пакет «{tier}». Расчётная сумма: ${total} (скидка {discount}%).",
      footer_location:"Тбилиси · Киев · онлайн",

      author_eyebrow:"Авторские песни",
      author_h2:"Автор проекта и его песни",
      author_p:"Это песни, написанные не на заказ. Они рождались вместе с путешествиями, встречами, потерями, надеждой, свободой выбора и любовью к жизни. Каждая из них — глава одной большой истории, которая продолжается и сегодня.",
      author_showcase_p:"Авторские песни из путешествий, встреч, свободы выбора и любви к жизни.",
      library_featured_author:"Выбранная авторская песня",
      author_count_label:"авторских треков",
      author_open_library:"Открыть авторскую библиотеку",
      author_library_title:"Авторская библиотека",
      author_library_subtitle:"Полный каталог песен автора TuneWrap.",
      author_amsterdam_desc:"Эта история началась глубокой ночью в Амстердаме. Мы с сыном просто шли вперёд по пустому городу, не зная, что запомним эту ночь навсегда. Красные огни, каналы и ощущение абсолютной свободы однажды стали песней.",
      author_ukraine_desc:"Эта песня посвящается миллионам украинцев, которые сегодня находятся вдали от дома. Тем, кто продолжает любить свою страну, молиться за неё и верить, что однажды скажет самые важные слова: «Я дома».",
      author_mychoice_desc:"Иногда нужно потерять привычную жизнь, чтобы обрести свою собственную. Эта песня появилась в день, когда я понял, что свобода — это право выбирать свой путь и оставаться верным самому себе.",
      author_tbilisi_desc:"Иногда чужой город становится родным. Тбилиси подарил мне новую главу жизни, новых людей и веру в то, что никогда не поздно начать всё сначала.",
      author_goodvibe_desc:"Иногда несколько месяцев поддержки, улыбок и тёплых разговоров превращаются в хорошую музыку. Эта песня — благодарность жизни и одному человеку за её светлые моменты.",
      author_pulse_desc:"Музыка была рядом со мной всю жизнь. Бас-гитара, сцена, свет софитов и тысячи сердец, бьющихся в одном ритме. Есть моменты, которые невозможно описать словами — их можно только почувствовать. Это история о свободе, энергии музыки и пульсе ночи, частью которого я являюсь.",
      author_yayaya_desc:"Иногда песня рождается не из боли, а из чистой энергии. Ya Ya Ya — про момент, когда перестаёшь оглядываться на чужое мнение и просто идёшь своим ритмом. Гитарный драйв, дорога и припев, который хочется петь всей компанией.",
      author_iwant_desc:"После долгих лет жизни по чужому расписанию однажды наступает тишина — и впервые никто не говорит, что ты должен делать. Эта песня родилась из простого, почти дерзкого ощущения свободы: сегодня я сам выбираю свой день, свой путь и свою жизнь. «Я роблю що хочу» — не про каприз, а про возвращение к себе.",
      author_53_desc:"53 — число двух молодых людей, которые идут по жизни своим путём, не обращая внимания на чужие правила и мнения. Это история о свободе выбора, верности друг другу и силе настоящей любви. Главный посыл истории — Our Way. Our Choice.",
      author_signature:"Автор песен, продюсер и основатель TuneWrap.",
    },
    uk: {
      mobile_hero_h1:"Історія стає <em>піснею</em>",
      mobile_menu_philosophy:"Філософія",
      mobile_nav_home:"Головна",
      mobile_nav_stories:"Історії",
      mobile_nav_author:"Авторські",
      mobile_nav_packages:"Пакети",
      mobile_nav_contacts:"Контакти",
      mobile_story_label:"Музична історія",
      philosophy_kicker:"Філософія TuneWrap",
      philosophy_quote:"«Спочатку народжується історія. Потім текст. Потім музика.»",
      philosophy_credit:"— Філософія TuneWrap",
      philosophy_text:"Для нас історія завжди важливіша за музику. Ми починаємо не з акордів і не з мелодії, а з людини — її спогадів, переживань і найдорожчих моментів. Лише після цього з’являються слова, а потім музика, яка підсилює історію, а не замінює її. Саме тому кожна пісня TuneWrap стає особистою музичною історією, до якої хочеться повертатися знову і знову.",
      track_justfive_title:"Just Five More Minutes",
      track_justfive_desc:"Іноді найважливіші слова звучать у проханні залишитися ще на п’ять хвилин. Особиста історія про час, близькість і миті, які хочеться втримати.",
      track_justfive_type:"Особиста історія",
      author_amsterdamen_desc:"Та сама ніч, ті самі канали й червоні вогні — історія, розказана англійською мовою.",
      author_mychoiceen_desc:"Англійська версія особистої історії про свободу, новий шлях і право жити за власним вибором.",
      track_growold_title:"Ми будемо старіти разом",
      track_growold_type:"Історія кохання",
      track_growold_desc:"Любов — це не обіцянка на один день. Це тисячі світанків, чашка ранкової кави, дитячий сміх і тепло долонь через багато років. Найбільше щастя — не рахувати роки, а проживати кожен день разом.",
      tagline:"Ваша історія — у пісні",
      nav_cta:"Залишити заявку",
      hero_eyebrow:"ВАША ІСТОРІЯ",
      track_65_type:"Історія вдячності",
      track_main_type:"Історія нового початку",
      listen_story:"▶ Слухати історію",
      track_127_duration:"Фрагмент: 1:00",
      track_127_lang:"Мова: російська",
      track_127_type:"Історія кохання",
      brand_manifesto:"Ми зберігаємо найважливіші моменти вашого життя мовою музики.",
      hero_h1:"У кожної історії є <em>своя мелодія</em>",
      hero_lead:"Перша зустріч. Улюблена мамина фраза. Сімейний жарт. Число на обручці. Розкажіть нам найважливіше — і ми перетворимо вашу історію на пісню, яку захочеться ввімкнути через роки.",
      hero_btn_order:"Розповісти свою історію",
      hero_btn_listen:"Послухати історії",
      hero_btn_author:"Автор проєкту та його пісні",
      tracks_eyebrow:"Музичні історії",
      tracks_h2:"Історії, які можна почути",
      tracks_p:"Спочатку — людина й важливі деталі її життя. Потім — текст, музика та мить, у якій близькі впізнають себе.",
      library_featured_story:"Обрана історія",
      stories_count_label:"музичних історій",
      stories_open_all:"Відкрити всі історії",
      stories_library_title:"Усі музичні історії",
      stories_library_subtitle:"Оберіть мову або відкрийте будь-яку історію з повного каталогу.",
      library_close:"Назад",
      library_empty:"У цьому мовному розділі поки немає пісень.",
      library_search_label:"Пошук пісень",
      library_search_placeholder:"Пошук пісень",
      library_filter_all:"Усі",
      library_no_results:"Пісень не знайдено",
      library_reset_search:"Скинути пошук",
      track_127_title:"127",
      track_127_desc:"Вона заплатила за його каву. Через тиждень він написав: «Повернути каву?» Через 127 днів зрозумів, що хоче прожити з нею все життя. Тепер це число — на їхніх обручках.",
      track_main_title:"Головний шлях",
      track_main_desc:"35 років на залізниці. Він завжди ставив родину на перше місце, відкладаючи свої мрії на потім. Остання зміна стала не прощанням, а першим квитком у новий розділ його життя.",
      track_65_title:"Наталія — 65 років",
      track_65_desc:"Білий халат після зміни. Улюблений дощ за вікном, кава на веранді, квітучі півонії та слова, які знає вся родина: «Головне — щоб усі були здорові». Це історія жінки, яка все життя дарує іншим любов і турботу.",
      how_eyebrow:"Як це працює",
      how_h2:"Три кроки від історії до готової пісні",
      step1_title:"Розкажіть історію",
      step1_desc:"Імена, місця, смішні й зворушливі деталі, бажаний стиль — можна голосовим повідомленням, можна текстом.",
      step2_title:"Створюємо вашу пісню",
      step2_desc:"Знаходимо серце історії, перетворюємо важливі деталі на текст і добираємо музичне рішення під людину, подію та потрібну емоцію.",
      step3_title:"Доставка",
      step3_desc:"Ви отримуєте готову пісню у високій якості. Термін і кількість правок залежать від обраного пакета.",
      pricing_eyebrow:"Вартість і формати",
      pricing_h2:"Оберіть свій формат",
      pricing_p:"Оберіть глибину роботи: від пісні за готовим текстом до повного створення історії та тексту.",
      pricing_promo_title:"Обмежена стартова акція",
      pricing_promo_until:"Лише до 31 серпня",
      tier_open_btn:"Докладніше",
      tier_detail_close:"Закрити",
      tier_detail_label:"Формат пісні",
      tier_detail_select:"Обрати тариф і продовжити",
      tier_select_btn:"Обрати",
      wedding_eyebrow:"ДЛЯ ВАШОГО ВЕСІЛЛЯ",
      wedding_subtitle:"Музика для моментів,<br>які назавжди залишаться з вами.",
      wedding_panel_label:"Для вашого весілля",
      wedding_what_included:"Що входить",
      wedding_ideal_for:"Ідеально підходить для",
      wedding_order_type_label:"Тип замовлення:",
      wedding_order_type_value:"Весільний пакет",
      wedding_selected_package_label:"Обраний весільний пакет",
      wedding_change_hint:"Ви можете змінити пакет перед надсиланням заявки.",
      msg_order_type:"Тип замовлення",
      contact_eyebrow:"Почати свою історію",
      contact_h2:"Розкажіть нам свою історію",
      contact_p:"Оберіть пакет і стиль, розкажіть про людину — і ми надішлемо готову заявку в один клік.",
      path_order_title:"Замовити пісню",
      path_order_desc:"Розкажіть історію людини — ми перетворимо її на особисту пісню.",
      path_order_action:"Почати замовлення",
      path_certificate_title:"Подарунковий сертифікат",
      path_certificate_desc:"Подаруйте можливість зберегти важливу історію у власній пісні.",
      path_certificate_action:"Обрати сертифікат",
      path_corporate_title:"Корпоративна пісня",
      path_corporate_desc:"Пісні для команди, компанії, партнерів і важливих корпоративних подій.",
      path_corporate_action:"Перейти до форми",
      path_back:"Назад до вибору",
      contact_tg:"Написати в Telegram",
      contact_wa:"WhatsApp",
      contact_alternatives:"Або зв’яжіться з нами будь-яким зручним способом.",
      summary_tier:"Пакет:",
      summary_style:"Стиль:",
      label_style:"Стиль пісні",
      style_hint:"Можна обрати до двох",
      label_name:"Ваше ім'я",
      placeholder_name:"Як вас звати?",
      label_occasion:"Привід",
      occasion_placeholder:"Оберіть привід",
      label_description:"Про людину або готовий текст пісні",
      placeholder_description:"Розкажіть історію, факти, жарти — або вставте свій текст пісні, якщо він уже готовий",
      golden_toggle:"Відповісти на кілька запитань, щоб текст вийшов живішим (2 хвилини, не обов'язково)",

      label_other_occasion:"Що це за подія?",
      placeholder_other_occasion:"Напишіть своїми словами",
      story_core_title:"Яким ви хочете запам’ятати цей день через 20 років?",
      story_core_hint:"Одним або кількома реченнями розкажіть, що найважливіше у вашій історії. Натисніть приклад або оберіть «Своя історія».",
      placeholder_story_core:"Напишіть головне своїми словами",
      story_core_note:"Не хвилюйтеся, якщо не вмієте красиво писати. Іноді однієї простої фрази достатньо, щоб народилася пісня.",
      label_contact:"Як з вами зв'язатися",
      placeholder_contact:"Telegram, WhatsApp або телефон",
      btn_generate:"Сформувати заявку",
      preview_title:"Ваша заявка:",
      btn_copy:"Скопіювати текст",
      copied_msg:"Скопійовано",
      msg_header:"Замовлення з сайту TuneWrap",
      msg_package:"Пакет",
      msg_style:"Стиль",
      msg_name:"Ім'я",
      msg_occasion:"Привід",
      msg_description:"Опис",
      msg_contact:"Контакт",
      dash:"—",
      mode_order:"Замовити пісню",
      mode_certificate:"Подарувати сертифікат",
      mode_order_hint:"Заповніть деталі — і ми напишемо пісню під конкретну людину.",
      mode_certificate_hint:"Отримувач сам надішле деталі пізніше — ви просто даруєте сертифікат на пісню.",
      summary_total:"Разом:",
      urgent_label:"Термінова доставка за 24 години (+$25)",
      msg_urgent:"Термінова доставка (24 години)",
      msg_certificate_note:"Це подарунковий сертифікат — отримувач сам надішле деталі для пісні.",
      reviews_eyebrow:"Відгуки",
      reviews_h2:"Реакції, заради яких варто це робити",
      review1_quote:"«Вона розплакалась, коли впізнала свою історію в тексті — каже, ніхто ще не дарував їй нічого подібного.»",
      review1_author:"Марина — подарунок чоловіку на ювілей",
      review2_quote:"«Увімкнули трек на дні народження на повну гучність — усі гості підспівували вже з другого куплету.»",
      review2_author:"Гіоргі — Тбілісі",
      review3_quote:"«Замовив у подарунок батькам на річницю весілля — мама сказала, що це найкращий подарунок за 30 років.»",
      review3_author:"Алекс — Київ",
      corp_close:"Закрити",
      corp_panel_label:"Для компаній",
      corp_eyebrow:"Для компаній",
      corp_h2:"Потрібно кілька пісень?",
      corp_p:"Привітання співробітникам, подарунки партнерам, корпоративний гімн — від 5 пісень діє знижка.",
      corp_qty_label:"Кількість пісень",
      corp_tier_label:"Базовий пакет",
      corp_total_label:"Разом",
      corp_discount_label:"знижка",
      corp_btn:"Обговорити в Telegram",
      corp_msg:"Вітаю! Цікавить корпоративне замовлення: {qty} пісень, пакет «{tier}». Орієнтовна сума: ${total} (знижка {discount}%).",
      footer_location:"Тбілісі · Київ · онлайн",

      author_eyebrow:"Авторські пісні",
      author_h2:"Автор проєкту та його пісні",
      author_p:"Це пісні, написані не на замовлення. Вони народжувалися разом із подорожами, зустрічами, втратами, надією, свободою вибору та любов’ю до життя. Кожна з них — розділ однієї великої історії, що триває й сьогодні.",
      author_showcase_p:"Авторські пісні з подорожей, зустрічей, свободи вибору та любові до життя.",
      library_featured_author:"Обрана авторська пісня",
      author_count_label:"авторських треків",
      author_open_library:"Відкрити авторську бібліотеку",
      author_library_title:"Авторська бібліотека",
      author_library_subtitle:"Повний каталог пісень автора TuneWrap.",
      author_amsterdam_desc:"Ця історія почалася глибокої ночі в Амстердамі. Ми із сином просто йшли вперед порожнім містом, не знаючи, що запам’ятаємо цю ніч назавжди. Червоні вогні, канали й відчуття абсолютної свободи одного дня стали піснею.",
      author_ukraine_desc:"Ця пісня присвячена мільйонам українців, які сьогодні далеко від дому. Тим, хто продовжує любити свою країну, молитися за неї й вірити, що одного дня скаже найважливіші слова: «Я вдома».",
      author_mychoice_desc:"Іноді потрібно втратити звичне життя, щоб знайти власне. Ця пісня з’явилася в день, коли я зрозумів: свобода — це право обирати свій шлях і залишатися вірним самому собі.",
      author_tbilisi_desc:"Іноді чуже місто стає рідним. Тбілісі подарував мені новий розділ життя, нових людей і віру в те, що ніколи не пізно почати все спочатку.",
      author_goodvibe_desc:"Іноді кілька місяців підтримки, усмішок і теплих розмов перетворюються на хорошу музику. Ця пісня — подяка життю й одній людині за його світлі миті.",
      author_pulse_desc:"Музика була поруч зі мною все життя. Бас-гітара, сцена, світло софітів і тисячі сердець, що б'ються в одному ритмі. Є моменти, які неможливо описати словами — їх можна лише відчути. Це історія про свободу, енергію музики та пульс ночі, частиною якого я є.",
      author_yayaya_desc:"Іноді пісня народжується не з болю, а з чистої енергії. Ya Ya Ya — про мить, коли перестаєш озиратися на чужу думку й просто йдеш у власному ритмі. Гітарний драйв, дорога та приспів, який хочеться співати всією компанією.",
      author_iwant_desc:"Після довгих років життя за чужим розкладом одного дня настає тиша — і вперше ніхто не говорить, що ти повинен робити. Ця пісня народилася з простого, майже зухвалого відчуття свободи: сьогодні я сам обираю свій день, свій шлях і своє життя. «Я роблю що хочу» — не про примху, а про повернення до себе.",
      author_53_desc:"53 — число двох молодих людей, які йдуть життям власним шляхом, не зважаючи на чужі правила та думки. Це історія про свободу вибору, вірність одне одному та силу справжнього кохання. Головний сенс історії — Our Way. Our Choice.",
      author_signature:"Автор пісень, продюсер і засновник TuneWrap.",
    },
    ka: {
      mobile_hero_h1:"ისტორია <em>სიმღერად იქცევა</em>",
      mobile_menu_philosophy:"ფილოსოფია",
      mobile_nav_home:"მთავარი",
      mobile_nav_stories:"ისტორიები",
      mobile_nav_author:"საავტორო",
      mobile_nav_packages:"პაკეტები",
      mobile_nav_contacts:"კონტაქტი",
      mobile_story_label:"მუსიკალური ისტორია",
      philosophy_kicker:"TuneWrap-ის ფილოსოფია",
      philosophy_quote:"„ჯერ იბადება ისტორია. შემდეგ ტექსტი. შემდეგ მუსიკა.“",
      philosophy_credit:"— TuneWrap-ის ფილოსოფია",
      philosophy_text:"ჩვენთვის ისტორია ყოველთვის უფრო მნიშვნელოვანია, ვიდრე მუსიკა. ჩვენ ვიწყებთ არა აკორდებით ან მელოდიით, არამედ ადამიანით — მისი მოგონებებით, განცდებითა და ყველაზე ძვირფასი წუთებით. მხოლოდ ამის შემდეგ ჩნდება სიტყვები, შემდეგ კი მუსიკა, რომელიც ისტორიას აძლიერებს და არ ანაცვლებს. სწორედ ამიტომ TuneWrap-ის თითოეული სიმღერა პირად მუსიკალურ ისტორიად იქცევა, რომლის მოსმენაც კვლავ და კვლავ გვინდება.",
      track_justfive_title:"Just Five More Minutes",
      track_justfive_desc:"ზოგჯერ ყველაზე მნიშვნელოვანი სიტყვები მხოლოდ თხოვნაში ჟღერს — დარჩი კიდევ ხუთი წუთით. პირადი ისტორია დროზე, სიახლოვესა და იმ წამებზე, რომელთა შენარჩუნებაც გვინდა.",
      track_justfive_type:"პირადი ისტორია",
      author_amsterdamen_desc:"იგივე ღამე, იგივე არხები და წითელი შუქები — ისტორია, რომელიც ინგლისურად არის მოთხრობილი.",
      author_mychoiceen_desc:"პირადი ისტორიის ინგლისური ვერსია თავისუფლებაზე, ახალ გზასა და საკუთარი არჩევანით ცხოვრების უფლებაზე.",
      track_growold_title:"ჩვენ ერთად დავბერდებით",
      track_growold_type:"სიყვარულის ისტორია",
      track_growold_desc:"სიყვარული ერთი დღის დაპირება არ არის. ეს არის ათასობით განთიადი, დილის ყავა, ბავშვების სიცილი და ხელების სითბო მრავალი წლის შემდეგ. ყველაზე დიდი ბედნიერებაა არა წლების დათვლა, არამედ ყოველი დღის ერთად ცხოვრება.",
      tagline:"თქვენი ისტორია — სიმღერაში",
      nav_cta:"განაცხადის გაგზავნა",
      hero_eyebrow:"თქვენი ისტორია",
      track_65_type:"მადლიერების ისტორია",
      track_main_type:"ახალი დასაწყისის ისტორია",
      listen_story:"▶ მოუსმინეთ ისტორიას",
      track_127_duration:"ფრაგმენტი: 1:00",
      track_127_lang:"ენა: რუსული",
      track_127_type:"სიყვარულის ისტორია",
      brand_manifesto:"ჩვენ მუსიკის ენით ვინახავთ თქვენი ცხოვრების ყველაზე მნიშვნელოვან მომენტებს.",
      hero_h1:"ყველა ისტორიას თავისი <em>მელოდია</em> აქვს",
      hero_lead:"პირველი შეხვედრა. დედის საყვარელი ფრაზა. ოჯახური ხუმრობა. რიცხვი საქორწინო ბეჭედზე. მოგვიყევით ყველაზე მნიშვნელოვანი — და თქვენს ისტორიას ვაქცევთ სიმღერად, რომლის მოსმენაც წლების შემდეგაც მოგინდებათ.",
      hero_btn_order:"მოგვიყევით თქვენი ისტორია",
      hero_btn_listen:"ისტორიების მოსმენა",
      hero_btn_author:"პროექტის ავტორი და მისი სიმღერები",
      tracks_eyebrow:"ისტორიები, რომლებიც სიმღერებად იქცა",
      tracks_h2:"ისტორიები, რომელთა მოსმენაც შეიძლება",
      tracks_p:"ჯერ — ადამიანი და მისი ცხოვრების მნიშვნელოვანი დეტალები. შემდეგ — ტექსტი, მუსიკა და წამი, როცა ახლობლები საკუთარ თავს ცნობენ.",
      library_featured_story:"შერჩეული ისტორია",
      stories_count_label:"მუსიკალური ისტორია",
      stories_open_all:"ყველა ისტორიის გახსნა",
      stories_library_title:"ყველა მუსიკალური ისტორია",
      stories_library_subtitle:"აირჩიეთ ენა ან გახსენით ნებისმიერი ისტორია სრული კატალოგიდან.",
      library_close:"უკან",
      library_empty:"ამ ენის განყოფილებაში სიმღერები ჯერ არ არის.",
      library_search_label:"სიმღერების ძიება",
      library_search_placeholder:"სიმღერების ძიება",
      library_filter_all:"ყველა",
      library_no_results:"სიმღერები ვერ მოიძებნა",
      library_reset_search:"ძიების გასუფთავება",
      track_127_title:"127",
      track_127_desc:"მან მისი ყავა გადაიხადა. ერთი კვირის შემდეგ მან მისწერა: „ყავა დაგიბრუნო?“ 127 დღეში მიხვდა, რომ მასთან მთელი ცხოვრების გატარება სურდა. ახლა ეს რიცხვი მათ ბეჭდებზეა.",
      track_main_title:"მთავარი გზა",
      track_main_desc:"35 წელი რკინიგზაზე. ის ყოველთვის ოჯახს აყენებდა პირველ ადგილზე და საკუთარ ოცნებებს შემდეგისთვის ტოვებდა. ბოლო ცვლა დამშვიდობება კი არა, მისი ცხოვრების ახალი თავის პირველი ბილეთი გახდა.",
      track_65_title:"ნატალია — 65 წელი",
      track_65_desc:"თეთრი ხალათი სამუშაო ცვლის შემდეგ. საყვარელი წვიმა ფანჯრის მიღმა, ყავა ვერანდაზე, აყვავებული პიონები და სიტყვები, რომლებიც მთელმა ოჯახმა იცის: „მთავარია, ყველა ჯანმრთელი იყოს“. ეს არის ქალის ისტორია, რომელიც მთელი ცხოვრება სხვებს სიყვარულსა და ზრუნვას ჩუქნის.",
      how_eyebrow:"როგორ მუშაობს",
      how_h2:"სამი ნაბიჯი ისტორიიდან მზა სიმღერამდე",
      step1_title:"მოგვიყევით ისტორია",
      step1_desc:"სახელები, ადგილები, სასაცილო და ამაღელვებელი დეტალები, სასურველი სტილი — ხმოვანი შეტყობინებით ან ტექსტით, როგორც გირჩევნიათ.",
      step2_title:"ვქმნით თქვენს სიმღერას",
      step2_desc:"ვპოულობთ ისტორიის გულს, მნიშვნელოვან დეტალებს ტექსტად ვაქცევთ და მუსიკალურ გადაწყვეტას ვარჩევთ ადამიანის, მოვლენისა და ემოციის მიხედვით.",
      step3_title:"მიწოდება",
      step3_desc:"იღებთ მზა სიმღერას მაღალ ხარისხში. ვადა და შესწორებების რაოდენობა არჩეულ პაკეტზეა დამოკიდებული.",
      pricing_eyebrow:"ფასი და ფორმატები",
      pricing_h2:"აირჩიეთ თქვენი ფორმატი",
      pricing_p:"აირჩიეთ მუშაობის სიღრმე: მზა ტექსტის მიხედვით სიმღერიდან ისტორიისა და ტექსტის სრულ შექმნამდე.",
      pricing_promo_title:"შეზღუდული საწყისი აქცია",
      pricing_promo_until:"მხოლოდ 31 აგვისტომდე",
      tier_open_btn:"დეტალურად",
      tier_detail_close:"დახურვა",
      tier_detail_label:"სიმღერის ფორმატი",
      tier_detail_select:"ტარიფის არჩევა და გაგრძელება",
      tier_select_btn:"არჩევა",
      wedding_eyebrow:"თქვენი ქორწილისთვის",
      wedding_subtitle:"მუსიკა იმ მომენტებისთვის,<br>რომლებიც სამუდამოდ დაგრჩებათ.",
      wedding_panel_label:"თქვენი ქორწილისთვის",
      wedding_what_included:"რას მოიცავს",
      wedding_ideal_for:"იდეალურია",
      wedding_order_type_label:"შეკვეთის ტიპი:",
      wedding_order_type_value:"საქორწილო პაკეტი",
      wedding_selected_package_label:"არჩეული საქორწილო პაკეტი",
      wedding_change_hint:"პაკეტის შეცვლა შეგიძლიათ განაცხადის გაგზავნამდე.",
      msg_order_type:"შეკვეთის ტიპი",
      contact_eyebrow:"დაიწყეთ თქვენი ისტორია",
      contact_h2:"მოგვიყევით თქვენი ისტორია",
      contact_p:"აირჩიეთ პაკეტი და სტილი, მოგვიყევით ადამიანის შესახებ — და ერთი დაწკაპუნებით გამზადებულ განაცხადს გამოგიგზავნით.",
      path_order_title:"სიმღერის შეკვეთა",
      path_order_desc:"მოგვიყევით ადამიანის ისტორია — ჩვენ მას პირად სიმღერად ვაქცევთ.",
      path_order_action:"შეკვეთის დაწყება",
      path_certificate_title:"სასაჩუქრე სერტიფიკატი",
      path_certificate_desc:"აჩუქეთ შესაძლებლობა, მნიშვნელოვანი ისტორია საკუთარ სიმღერაში შეინახონ.",
      path_certificate_action:"სერტიფიკატის არჩევა",
      path_corporate_title:"კორპორაციული სიმღერა",
      path_corporate_desc:"სიმღერები გუნდისთვის, კომპანიისთვის, პარტნიორებისა და მნიშვნელოვანი ღონისძიებებისთვის.",
      path_corporate_action:"ფორმაზე გადასვლა",
      path_back:"არჩევანზე დაბრუნება",
      contact_tg:"დაწერეთ Telegram-ში",
      contact_wa:"WhatsApp",
      contact_alternatives:"ან დაგვიკავშირდით თქვენთვის მოსახერხებელი ნებისმიერი გზით.",
      summary_tier:"პაკეტი:",
      summary_style:"სტილი:",
      label_style:"სიმღერის სტილი",
      style_hint:"შეგიძლიათ აირჩიოთ ორამდე",
      label_name:"თქვენი სახელი",
      placeholder_name:"როგორ გქვიათ?",
      label_occasion:"შემთხვევა",
      occasion_placeholder:"აირჩიეთ შემთხვევა",
      label_description:"ადამიანის შესახებ ან მზა ტექსტი",
      placeholder_description:"მოგვიყევით ისტორია, ფაქტები, ხუმრობები — ან ჩასვით თქვენი მზა ტექსტი, თუ უკვე გაქვთ",
      golden_toggle:"უპასუხეთ რამდენიმე კითხვას, რომ ტექსტი უფრო ცოცხალი გამოვიდეს (2 წუთი, არასავალდებულო)",

      label_other_occasion:"რა მოვლენაა ეს?",
      placeholder_other_occasion:"დაწერეთ თქვენი სიტყვებით",
      story_core_title:"როგორ გინდათ გახსოვდეთ ეს დღე 20 წლის შემდეგ?",
      story_core_hint:"ერთი ან რამდენიმე წინადადებით დაწერეთ, რა არის თქვენს ისტორიაში ყველაზე მნიშვნელოვანი. აირჩიეთ მაგალითი ან „ჩემი ისტორია“.",
      placeholder_story_core:"დაწერეთ მთავარი თქვენი სიტყვებით",
      story_core_note:"არ ინერვიულოთ, თუ ლამაზად წერა არ შეგიძლიათ. ზოგჯერ ერთი უბრალო ფრაზაც საკმარისია სიმღერის დასაბადებლად.",
      label_contact:"როგორ დაგიკავშირდეთ",
      placeholder_contact:"Telegram, WhatsApp ან ტელეფონი",
      btn_generate:"განაცხადის ფორმირება",
      preview_title:"თქვენი განაცხადი:",
      btn_copy:"ტექსტის კოპირება",
      copied_msg:"დაკოპირდა",
      msg_header:"შეკვეთა TuneWrap-ის საიტიდან",
      msg_package:"პაკეტი",
      msg_style:"სტილი",
      msg_name:"სახელი",
      msg_occasion:"შემთხვევა",
      msg_description:"აღწერა",
      msg_contact:"კონტაქტი",
      dash:"—",
      mode_order:"სიმღერის შეკვეთა",
      mode_certificate:"სერტიფიკატის ჩუქება",
      mode_order_hint:"შეავსეთ დეტალები — და დავწერთ სიმღერას კონკრეტული ადამიანისთვის.",
      mode_certificate_hint:"მიმღები თავად გამოაგზავნის დეტალებს მოგვიანებით — თქვენ უბრალოდ სერტიფიკატს აჩუქებთ.",
      summary_total:"სულ:",
      urgent_label:"სასწრაფო მიწოდება 24 საათში (+$25)",
      msg_urgent:"სასწრაფო მიწოდება (24 საათი)",
      msg_certificate_note:"ეს არის სასაჩუქრე სერტიფიკატი — მიმღები თავად გამოაგზავნის დეტალებს სიმღერისთვის.",
      reviews_eyebrow:"შეფასებები",
      reviews_h2:"რეაქციები, რომლებისთვისაც ღირს ამის კეთება",
      review1_quote:"„მან ატირდა, როცა თავისი ისტორია ტექსტში იცნო — ამბობს, არავის უჩუქებია მისთვის მსგავსი რამ.“",
      review1_author:"მარინა — საჩუქარი მეუღლისთვის იუბილეზე",
      review2_quote:"„დაბადების დღეზე ტრეკი ხმამაღლა ჩართეს — სტუმრები უკვე მეორე კუპლეტიდან თან მღეროდნენ.“",
      review2_author:"გიორგი — თბილისი",
      review3_quote:"„მშობლებს ქორწილის წლისთავზე შევუკვეთე — დედამ თქვა, ეს 30 წლის საუკეთესო საჩუქარია.“",
      review3_author:"ალექსი — კიევი",
      corp_close:"დახურვა",
      corp_panel_label:"კომპანიებისთვის",
      corp_eyebrow:"კომპანიებისთვის",
      corp_h2:"რამდენიმე სიმღერა გჭირდებათ?",
      corp_p:"მილოცვები თანამშრომლებისთვის, საჩუქრები პარტნიორებისთვის, კორპორატიული ჰიმნი — 5 სიმღერიდან მოქმედებს ფასდაკლება.",
      corp_qty_label:"სიმღერების რაოდენობა",
      corp_tier_label:"საბაზისო პაკეტი",
      corp_total_label:"სულ",
      corp_discount_label:"ფასდაკლება",
      corp_btn:"განვიხილოთ Telegram-ში",
      corp_msg:"გამარჯობა! მაინტერესებს კორპორატიული შეკვეთა: {qty} სიმღერა, პაკეტი «{tier}». სავარაუდო თანხა: ${total} (ფასდაკლება {discount}%).",
      footer_location:"თბილისი · კიევი · ონლაინ",

      author_eyebrow:"საავტორო სიმღერები",
      author_h2:"პროექტის ავტორი და მისი სიმღერები",
      author_p:"ეს სიმღერები შეკვეთით არ დაწერილა. ისინი მოგზაურობებთან, შეხვედრებთან, დანაკარგებთან, იმედთან, არჩევანის თავისუფლებასთან და სიცოცხლის სიყვარულთან ერთად დაიბადა. თითოეული მათგანი ერთი დიდი ისტორიის თავია, რომელიც დღესაც გრძელდება.",
      author_showcase_p:"საავტორო სიმღერები მოგზაურობებზე, შეხვედრებზე, არჩევანის თავისუფლებასა და სიცოცხლის სიყვარულზე.",
      library_featured_author:"შერჩეული საავტორო სიმღერა",
      author_count_label:"საავტორო ტრეკი",
      author_open_library:"საავტორო ბიბლიოთეკის გახსნა",
      author_library_title:"საავტორო ბიბლიოთეკა",
      author_library_subtitle:"TuneWrap-ის ავტორის სიმღერების სრული კატალოგი.",
      author_amsterdam_desc:"ეს ისტორია ამსტერდამში, ღრმა ღამით დაიწყო. მე და ჩემი შვილი ცარიელ ქალაქში უბრალოდ წინ მივდიოდით და არ ვიცოდით, რომ ამ ღამეს სამუდამოდ დავიმახსოვრებდით. წითელი შუქები, არხები და სრული თავისუფლების განცდა ერთ დღეს სიმღერად იქცა.",
      author_ukraine_desc:"ეს სიმღერა ეძღვნება მილიონობით უკრაინელს, რომლებიც დღეს სახლიდან შორს არიან. მათ, ვინც კვლავ უყვარს თავისი ქვეყანა, ლოცულობს მისთვის და სჯერა, რომ ერთ დღეს ყველაზე მნიშვნელოვან სიტყვებს იტყვის: „მე სახლში ვარ“.",
      author_mychoice_desc:"ხანდახან ჩვეული ცხოვრება უნდა დაკარგო, რათა საკუთარი იპოვო. ეს სიმღერა იმ დღეს გაჩნდა, როცა გავიგე: თავისუფლება არის უფლება, აირჩიო შენი გზა და საკუთარ თავს ერთგული დარჩე.",
      author_tbilisi_desc:"ხანდახან უცხო ქალაქი მშობლიური ხდება. თბილისმა მაჩუქა ცხოვრების ახალი თავი, ახალი ადამიანები და რწმენა, რომ ყველაფრის თავიდან დაწყება არასოდეს არის გვიანი.",
      author_goodvibe_desc:"ხანდახან მხარდაჭერის, ღიმილისა და თბილი საუბრების რამდენიმე თვე კარგ მუსიკად იქცევა. ეს სიმღერა მადლობაა ცხოვრებისადმი და ერთი ადამიანისადმი მისი ნათელი წუთებისთვის.",
      author_pulse_desc:"მუსიკა მთელი ცხოვრება ჩემ გვერდით იყო. ბას-გიტარა, სცენა, პროჟექტორების შუქი და ათასობით გული, რომლებიც ერთ რიტმში ცემენ. არის მომენტები, რომელთა სიტყვებით აღწერა შეუძლებელია — ისინი მხოლოდ უნდა იგრძნო. ეს არის ისტორია თავისუფლებაზე, მუსიკის ენერგიასა და ღამის პულსზე, რომლის ნაწილიც დღესაც ვარ.",
      author_yayaya_desc:"ზოგჯერ სიმღერა ტკივილისგან კი არა, სუფთა ენერგიისგან იბადება. Ya Ya Ya იმ წამზეა, როცა სხვების აზრს აღარ უყურებ და საკუთარ რიტმში მიდიხარ. გიტარის დრაივი, გზა და მისამღერი, რომლის ერთად სიმღერაც ყველას მოუნდება.",
      author_iwant_desc:"სხვისი განრიგით ცხოვრების მრავალი წლის შემდეგ ერთხელ სიჩუმე დგება — და პირველად აღარავინ გეუბნება, რა უნდა გააკეთო. ეს სიმღერა თავისუფლების უბრალო, თითქმის თამამმა განცდამ დაბადა: დღეს მე თავად ვირჩევ ჩემს დღეს, გზას და ცხოვრებას. „Я роблю що хочу“ ახირება კი არა, საკუთარ თავთან დაბრუნებაა.",
      author_53_desc:"53 — ორი ახალგაზრდა ადამიანის რიცხვია, რომლებიც ცხოვრებაში საკუთარ გზას მიჰყვებიან და სხვის წესებსა თუ აზრებს არ ემორჩილებიან. ეს არის ისტორია არჩევანის თავისუფლებაზე, ერთმანეთის ერთგულებასა და ნამდვილი სიყვარულის ძალაზე. მთავარი გზავნილია — Our Way. Our Choice.",
      author_signature:"სიმღერების ავტორი, პროდიუსერი და TuneWrap-ის დამფუძნებელი.",
    },
    en: {
      mobile_hero_h1:"A story becomes <em>a song</em>",
      mobile_menu_philosophy:"Philosophy",
      mobile_nav_home:"Home",
      mobile_nav_stories:"Stories",
      mobile_nav_author:"Originals",
      mobile_nav_packages:"Packages",
      mobile_nav_contacts:"Contact",
      mobile_story_label:"Musical story",
      philosophy_kicker:"TuneWrap Philosophy",
      philosophy_quote:"“First comes the story. Then the words. Then the music.”",
      philosophy_credit:"— TuneWrap Philosophy",
      philosophy_text:"For us, the story always matters more than the music. We begin not with chords or melody, but with a person — their memories, emotions, and most precious moments. Only then do the words appear, followed by music that strengthens the story rather than replacing it. That is why every TuneWrap song becomes a personal musical story worth returning to again and again.",
      track_justfive_title:"Just Five More Minutes",
      track_justfive_desc:"Sometimes the most important words are simply a request to stay for five more minutes. A personal story about time, closeness, and moments we wish we could hold onto.",
      track_justfive_type:"Personal story",
      author_amsterdamen_desc:"The same night, the same canals and red lights — a story told in English.",
      author_mychoiceen_desc:"The English version of a personal story about freedom, a new path and the right to live by your own choice.",
      track_growold_title:"We Will Grow Old Together",
      track_growold_type:"Love story",
      track_growold_desc:"Love is not a promise for one day. It is thousands of sunrises, morning coffee, children's laughter and the warmth of holding hands many years later. The greatest happiness is not counting the years, but living every day together.",
      tagline:"Your story — in a song",
      nav_cta:"Get a quote",
      hero_eyebrow:"YOUR STORY",
      track_65_type:"A story of gratitude",
      track_main_type:"A story of a new beginning",
      listen_story:"▶ Listen to the story",
      track_127_duration:"Preview: 1:00",
      track_127_lang:"Language: Russian",
      track_127_type:"Love story",
      brand_manifesto:"We preserve the most important moments of your life through the language of music.",
      hero_h1:"Every story deserves <em>its own melody</em>",
      hero_lead:"A first meeting. Mom’s favorite phrase. A family joke. A number engraved inside a wedding ring. Tell us what matters most, and we will turn your story into a song you will want to play years from now.",
      hero_btn_order:"Tell your story",
      hero_btn_listen:"Listen to the stories",
      hero_btn_author:"Author of the project and his songs",
      tracks_eyebrow:"Musical stories",
      tracks_h2:"Stories you can hear",
      tracks_p:"First comes the person and the details that matter. Then come the lyrics, the music, and the moment loved ones recognize themselves.",
      library_featured_story:"Featured story",
      stories_count_label:"musical stories",
      stories_open_all:"Open all stories",
      stories_library_title:"All musical stories",
      stories_library_subtitle:"Choose a language or open any story from the complete catalog.",
      library_close:"Back",
      library_empty:"There are no songs in this language section yet.",
      library_search_label:"Search songs",
      library_search_placeholder:"Search songs",
      library_filter_all:"All",
      library_no_results:"No songs found",
      library_reset_search:"Reset search",
      track_127_title:"127",
      track_127_desc:"She paid for his coffee. A week later he wrote, “Can I pay you back?” After 127 days, he knew he wanted to spend his life with her. That number is now engraved on their rings.",
      track_main_title:"The Main Journey",
      track_main_desc:"Thirty-five years on the railway. He always put his family first and postponed his own dreams. His final shift was not a farewell, but the first ticket into a new chapter of life.",
      track_65_title:"Natalia — 65",
      track_65_desc:"A white coat after a shift. Her favorite rain outside, coffee on the veranda, blooming peonies, and words the whole family knows: “The main thing is that everyone is healthy.” This is the story of a woman who has spent her life giving love and care to others.",
      how_eyebrow:"How it works",
      how_h2:"Three steps from story to finished song",
      step1_title:"Tell your story",
      step1_desc:"Names, places, funny and touching details, the style you want — voice message or text, whatever's easiest.",
      step2_title:"We create your song",
      step2_desc:"We find the heart of the story, turn meaningful details into lyrics, and shape the music around the person, the occasion, and the emotion.",
      step3_title:"Delivery",
      step3_desc:"You receive a finished high-quality song. Delivery time and the number of revisions depend on the selected package.",
      pricing_eyebrow:"Formats and pricing",
      pricing_h2:"Choose your format",
      pricing_p:"Choose the depth of the work: from a song based on ready lyrics to the complete creation of the story and lyrics.",
      pricing_promo_title:"Limited launch offer",
      pricing_promo_until:"Only until August 31",
      tier_open_btn:"View details",
      tier_detail_close:"Close",
      tier_detail_label:"Song format",
      tier_detail_select:"Choose this plan and continue",
      tier_select_btn:"Choose",
      wedding_eyebrow:"FOR YOUR WEDDING",
      wedding_subtitle:"Music for the moments<br>you will carry with you forever.",
      wedding_panel_label:"For your wedding",
      wedding_what_included:"What is included",
      wedding_ideal_for:"Perfect for",
      wedding_order_type_label:"Order type:",
      wedding_order_type_value:"Wedding Package",
      wedding_selected_package_label:"Selected wedding package",
      wedding_change_hint:"You can change the package before sending your request.",
      msg_order_type:"Order type",
      contact_eyebrow:"Begin your story",
      contact_h2:"Tell us your story",
      contact_p:"Pick a package and style, tell us about the person — and we'll send a ready order in one click.",
      path_order_title:"Order a song",
      path_order_desc:"Tell us someone’s story and we’ll turn it into a personal song.",
      path_order_action:"Start your order",
      path_certificate_title:"Gift certificate",
      path_certificate_desc:"Give someone the chance to preserve an important story in their own song.",
      path_certificate_action:"Choose a certificate",
      path_corporate_title:"Corporate song",
      path_corporate_desc:"Songs for teams, companies, partners and meaningful corporate occasions.",
      path_corporate_action:"Open the form",
      path_back:"Back to choices",
      contact_tg:"Message on Telegram",
      contact_wa:"WhatsApp",
      contact_alternatives:"Or contact us in whichever way is most convenient for you.",
      summary_tier:"Package:",
      summary_style:"Style:",
      label_style:"Song style",
      style_hint:"Choose up to two",
      label_name:"Your name",
      placeholder_name:"What's your name?",
      label_occasion:"Occasion",
      occasion_placeholder:"Select an occasion",
      label_description:"About the person, or a ready lyric",
      placeholder_description:"Tell the story, facts, jokes — or paste your own lyrics if you already have them",
      golden_toggle:"Answer a few questions to make the lyrics come alive (2 minutes, optional)",

      label_other_occasion:"What is the event?",
      placeholder_other_occasion:"Describe it in your own words",
      story_core_title:"How would you like to remember this day in 20 years?",
      story_core_hint:"In one or several sentences, tell us what matters most in your story. Choose an example or select “My own story”.",
      placeholder_story_core:"Write the heart of your story in your own words",
      story_core_note:"Don't worry if you're not a writer. Sometimes one simple sentence is enough for a song to begin.",
      label_contact:"How to reach you",
      placeholder_contact:"Telegram, WhatsApp, or phone",
      btn_generate:"Generate order",
      preview_title:"Your order:",
      btn_copy:"Copy text",
      copied_msg:"Copied",
      msg_header:"Order from TuneWrap",
      msg_package:"Package",
      msg_style:"Style",
      msg_name:"Name",
      msg_occasion:"Occasion",
      msg_description:"Description",
      msg_contact:"Contact",
      dash:"—",
      mode_order:"Order a song",
      mode_certificate:"Gift a certificate",
      mode_order_hint:"Fill in the details and we'll write a song for a specific person.",
      mode_certificate_hint:"The recipient sends the details themselves later — you're simply gifting a song certificate.",
      summary_total:"Total:",
      urgent_label:"Rush delivery in 24 hours (+$25)",
      msg_urgent:"Rush delivery (24 hours)",
      msg_certificate_note:"This is a gift certificate — the recipient will send the song details themselves.",
      reviews_eyebrow:"Reviews",
      reviews_h2:"The reactions that make this worth doing",
      review1_quote:"\"She burst into tears when she recognized her own story in the lyrics — says no one's ever given her anything like it.\"",
      review1_author:"Marina — an anniversary gift for her husband",
      review2_quote:"\"They blasted the track at the birthday party — everyone was singing along by the second verse.\"",
      review2_author:"Giorgi — Tbilisi",
      review3_quote:"\"Ordered it for my parents' wedding anniversary — Mom said it was the best gift in 30 years.\"",
      review3_author:"Alex — Kyiv",
      corp_close:"Close",
      corp_panel_label:"For companies",
      corp_eyebrow:"For companies",
      corp_h2:"Need more than one song?",
      corp_p:"Shout-outs for employees, gifts for partners, a company anthem — orders of 5+ songs get a discount.",
      corp_qty_label:"Number of songs",
      corp_tier_label:"Base package",
      corp_total_label:"Total",
      corp_discount_label:"discount",
      corp_btn:"Discuss on Telegram",
      corp_msg:"Hi! Interested in a corporate order: {qty} songs, {tier} package. Estimated total: ${total} ({discount}% discount).",
      footer_location:"Tbilisi · Kyiv · online",

      author_eyebrow:"Original songs",
      author_h2:"The project author and his songs",
      author_p:"These songs were not written to order. They were born from journeys, encounters, losses, hope, freedom of choice and a love of life. Each one is a chapter in one continuing story.",
      author_showcase_p:"Original songs shaped by travel, encounters, freedom of choice, and a love of life.",
      library_featured_author:"Featured original song",
      author_count_label:"original tracks",
      author_open_library:"Open the artist library",
      author_library_title:"Artist library",
      author_library_subtitle:"The complete catalog of songs by the TuneWrap author.",
      author_amsterdam_desc:"This story began late at night in Amsterdam. My son and I simply kept walking through the empty city, unaware that we would remember that night forever. Red lights, canals and a feeling of absolute freedom eventually became a song.",
      author_ukraine_desc:"This song is dedicated to millions of Ukrainians living far from home today—to those who keep loving their country, praying for it and believing they will one day say the most important words: “I am home.”",
      author_mychoice_desc:"Sometimes you have to lose the life you knew to find your own. This song appeared on the day I understood that freedom is the right to choose your path and remain true to yourself.",
      author_tbilisi_desc:"Sometimes a foreign city becomes home. Tbilisi gave me a new chapter, new people and faith that it is never too late to begin again.",
      author_goodvibe_desc:"Sometimes months of support, smiles and warm conversations turn into good music. This song is a thank-you to life—and to one person—for its brighter moments.",
      author_pulse_desc:"Music has been with me all my life. Bass guitar, the stage, spotlights and thousands of hearts beating in one rhythm. Some moments cannot be described in words — they can only be felt. This is a story about freedom, the energy of music and the pulse of the night that I am still part of.",
      author_yayaya_desc:"Sometimes a song is born not from pain, but from pure energy. Ya Ya Ya is about the moment you stop looking back at other people’s opinions and move in your own rhythm. Guitar drive, the open road and a chorus made to be sung together.",
      author_iwant_desc:"After years of living by someone else’s schedule, silence finally arrives—and for the first time nobody tells you what you must do. This song was born from a simple, almost defiant feeling of freedom: today I choose my own day, my own path and my own life. “I do what I want” is not a whim; it is a return to yourself.",
      author_53_desc:"53 is the number shared by two young people who follow their own path, regardless of other people’s rules or opinions. It is a story of freedom of choice, loyalty to one another, and the power of true love. Its central message is: Our Way. Our Choice.",
      author_signature:"Songwriter, producer and founder of TuneWrap.",
    },
    de: {
      mobile_hero_h1:"Eine Geschichte wird <em>zum Lied</em>",
      mobile_menu_philosophy:"Philosophie",
      mobile_nav_home:"Start",
      mobile_nav_stories:"Geschichten",
      mobile_nav_author:"Originale",
      mobile_nav_packages:"Pakete",
      mobile_nav_contacts:"Kontakt",
      mobile_story_label:"Musikgeschichte",
      philosophy_kicker:"Die Philosophie von TuneWrap",
      philosophy_quote:"„Zuerst entsteht die Geschichte. Dann der Text. Dann die Musik.“",
      philosophy_credit:"— Philosophie von TuneWrap",
      philosophy_text:"Für uns ist die Geschichte immer wichtiger als die Musik. Wir beginnen nicht mit Akkorden oder einer Melodie, sondern mit einem Menschen — mit seinen Erinnerungen, Gefühlen und wertvollsten Momenten. Erst danach entstehen die Worte und schließlich die Musik, die die Geschichte verstärkt, statt sie zu ersetzen. Deshalb wird jedes TuneWrap-Lied zu einer persönlichen musikalischen Geschichte, zu der man immer wieder zurückkehren möchte.",
      track_justfive_title:"Just Five More Minutes",
      track_justfive_desc:"Manchmal liegen die wichtigsten Worte in der Bitte, noch fünf Minuten zu bleiben. Eine persönliche Geschichte über Zeit, Nähe und Augenblicke, die wir festhalten möchten.",
      track_justfive_type:"Persönliche Geschichte",
      author_amsterdamen_desc:"Dieselbe Nacht, dieselben Kanäle und roten Lichter — eine Geschichte, die auf Englisch erzählt wird.",
      author_mychoiceen_desc:"Die englische Version einer persönlichen Geschichte über Freiheit, einen neuen Weg und das Recht, nach der eigenen Entscheidung zu leben.",
      track_growold_title:"Wir werden gemeinsam alt",
      track_growold_type:"Liebesgeschichte",
      track_growold_desc:"Liebe ist kein Versprechen für nur einen Tag. Sie bedeutet tausend Sonnenaufgänge, morgendlichen Kaffee, Kinderlachen und die Wärme vertrauter Hände nach vielen Jahren. Das größte Glück ist, nicht die Jahre zu zählen, sondern jeden Tag gemeinsam zu leben.",
      tagline:"Ihre Geschichte — als Lied",
      nav_cta:"Anfrage senden",
      hero_eyebrow:"IHRE GESCHICHTE",
      track_65_type:"Geschichte der Dankbarkeit",
      track_main_type:"Geschichte eines neuen Anfangs",
      listen_story:"▶ Geschichte anhören",
      track_127_duration:"Hörprobe: 1:00",
      track_127_lang:"Sprache: Russisch",
      track_127_type:"Liebesgeschichte",
      brand_manifesto:"Wir bewahren die wichtigsten Momente Ihres Lebens in der Sprache der Musik.",
      hero_h1:"Jede Geschichte hat <em>ihre eigene Melodie</em>",
      hero_lead:"Das erste Treffen. Mamas Lieblingssatz. Ein Familienwitz. Eine Zahl im Ehering. Erzählen Sie uns, was wirklich zählt — wir machen daraus ein Lied, das Sie auch Jahre später noch hören möchten.",
      hero_btn_order:"Ihre Geschichte erzählen",
      hero_btn_listen:"Geschichten anhören",
      hero_btn_author:"Autor des Projekts und seine Lieder",
      tracks_eyebrow:"Geschichten, die zu Liedern wurden",
      tracks_h2:"Drei Geschichten, die zu Liedern wurden",
      tracks_p:"Zuerst kommen der Mensch und die wichtigen Details seines Lebens. Dann entstehen Text, Musik und der Moment, in dem sich die Liebsten wiedererkennen.",
      library_featured_story:"Ausgewählte Geschichte",
      stories_count_label:"musikalische Geschichten",
      stories_open_all:"Alle Geschichten öffnen",
      stories_library_title:"Alle musikalischen Geschichten",
      stories_library_subtitle:"Wählen Sie eine Sprache oder öffnen Sie eine beliebige Geschichte aus dem vollständigen Katalog.",
      library_close:"Zurück",
      library_empty:"In diesem Sprachbereich gibt es noch keine Songs.",
      library_search_label:"Songs suchen",
      library_search_placeholder:"Songs suchen",
      library_filter_all:"Alle",
      library_no_results:"Keine Songs gefunden",
      library_reset_search:"Suche zurücksetzen",
      track_127_title:"127",
      track_127_desc:"Sie bezahlte seinen Kaffee. Eine Woche später schrieb er: „Darf ich den Kaffee zurückzahlen?“ Nach 127 Tagen wusste er, dass er sein Leben mit ihr verbringen wollte. Heute steht diese Zahl in ihren Ringen.",
      track_main_title:"Der wichtigste Weg",
      track_main_desc:"35 Jahre bei der Bahn. Seine Familie stand für ihn immer an erster Stelle, während er seine eigenen Träume auf später verschob. Seine letzte Schicht war kein Abschied, sondern die erste Fahrkarte in ein neues Kapitel seines Lebens.",
      track_65_title:"Natalia — 65 Jahre",
      track_65_desc:"Der weiße Kittel nach der Schicht. Ihr geliebter Regen vor dem Fenster, Kaffee auf der Veranda, blühende Pfingstrosen und die Worte, die die ganze Familie kennt: „Hauptsache, alle sind gesund.“ Dies ist die Geschichte einer Frau, die ihr ganzes Leben anderen Liebe und Fürsorge schenkt.",
      how_eyebrow:"So funktioniert's",
      how_h2:"Drei Schritte von der Geschichte zum fertigen Song",
      step1_title:"Erzähl deine Geschichte",
      step1_desc:"Namen, Orte, lustige und berührende Details, gewünschter Stil — per Sprachnachricht oder Text, wie es dir lieber ist.",
      step2_title:"Wir erschaffen Ihr Lied",
      step2_desc:"Wir finden das Herz der Geschichte, verwandeln wichtige Details in einen Text und entwickeln die Musik passend zur Person, zum Anlass und zur gewünschten Emotion.",
      step3_title:"Lieferung",
      step3_desc:"Sie erhalten einen fertigen Song in hoher Qualität. Lieferzeit und Anzahl der Änderungen richten sich nach dem gewählten Paket.",
      pricing_eyebrow:"Formate und Preise",
      pricing_h2:"Wählen Sie Ihr Format",
      pricing_p:"Wählen Sie die Arbeitstiefe: vom Song nach einem fertigen Text bis zur vollständigen Entwicklung von Geschichte und Liedtext.",
      pricing_promo_title:"Zeitlich begrenztes Startangebot",
      pricing_promo_until:"Nur bis 31. August",
      tier_open_btn:"Details ansehen",
      tier_detail_close:"Schließen",
      tier_detail_label:"Songformat",
      tier_detail_select:"Tarif wählen und fortfahren",
      tier_select_btn:"Wählen",
      wedding_eyebrow:"FÜR IHRE HOCHZEIT",
      wedding_subtitle:"Musik für Momente,<br>die für immer bei Ihnen bleiben.",
      wedding_panel_label:"Für Ihre Hochzeit",
      wedding_what_included:"Was enthalten ist",
      wedding_ideal_for:"Ideal geeignet für",
      wedding_order_type_label:"Bestellart:",
      wedding_order_type_value:"Hochzeitspaket",
      wedding_selected_package_label:"Gewähltes Hochzeitspaket",
      wedding_change_hint:"Sie können das Paket vor dem Absenden der Anfrage ändern.",
      msg_order_type:"Bestellart",
      contact_eyebrow:"Ihre Geschichte beginnen",
      contact_h2:"Erzählen Sie uns Ihre Geschichte",
      contact_p:"Wähle Paket und Stil, erzähl uns von der Person — und wir schicken dir eine fertige Bestellung per Klick.",
      path_order_title:"Song bestellen",
      path_order_desc:"Erzählen Sie uns die Geschichte eines Menschen – wir machen daraus einen persönlichen Song.",
      path_order_action:"Bestellung starten",
      path_certificate_title:"Geschenkgutschein",
      path_certificate_desc:"Verschenken Sie die Möglichkeit, eine wichtige Geschichte im eigenen Song festzuhalten.",
      path_certificate_action:"Gutschein auswählen",
      path_corporate_title:"Firmensong",
      path_corporate_desc:"Songs für Teams, Unternehmen, Partner und besondere Firmenevents.",
      path_corporate_action:"Formular öffnen",
      path_back:"Zurück zur Auswahl",
      contact_tg:"Auf Telegram schreiben",
      contact_wa:"WhatsApp",
      contact_alternatives:"Oder kontaktieren Sie uns auf dem für Sie bequemsten Weg.",
      summary_tier:"Paket:",
      summary_style:"Stil:",
      label_style:"Songstil",
      style_hint:"Bis zu zwei auswählbar",
      label_name:"Dein Name",
      placeholder_name:"Wie heißt du?",
      label_occasion:"Anlass",
      occasion_placeholder:"Anlass wählen",
      label_description:"Über die Person oder fertiger Songtext",
      placeholder_description:"Erzähl die Geschichte, Fakten, Insider-Witze — oder füge deinen fertigen Songtext ein",
      golden_toggle:"Beantworte ein paar Fragen, damit der Text lebendiger wird (2 Minuten, optional)",

      label_other_occasion:"Was ist das für ein Anlass?",
      placeholder_other_occasion:"Beschreibe ihn mit deinen eigenen Worten",
      story_core_title:"Wie möchtest du dich in 20 Jahren an diesen Tag erinnern?",
      story_core_hint:"Erzähle in einem oder mehreren Sätzen, was in deiner Geschichte am wichtigsten ist. Wähle ein Beispiel oder „Meine eigene Geschichte“.",
      placeholder_story_core:"Schreibe das Wichtigste mit deinen eigenen Worten",
      story_core_note:"Mach dir keine Sorgen, wenn du nicht schön schreiben kannst. Manchmal reicht ein einziger einfacher Satz, damit ein Song entsteht.",
      label_contact:"Wie wir dich erreichen",
      placeholder_contact:"Telegram, WhatsApp oder Telefon",
      btn_generate:"Bestellung erstellen",
      preview_title:"Deine Bestellung:",
      btn_copy:"Text kopieren",
      copied_msg:"Kopiert",
      msg_header:"Bestellung von TuneWrap",
      msg_package:"Paket",
      msg_style:"Stil",
      msg_name:"Name",
      msg_occasion:"Anlass",
      msg_description:"Beschreibung",
      msg_contact:"Kontakt",
      dash:"—",
      mode_order:"Song bestellen",
      mode_certificate:"Gutschein verschenken",
      mode_order_hint:"Fülle die Details aus — wir schreiben einen Song für eine bestimmte Person.",
      mode_certificate_hint:"Der Beschenkte schickt die Details später selbst — du verschenkst einfach einen Song-Gutschein.",
      summary_total:"Gesamt:",
      urgent_label:"Express-Lieferung in 24 Stunden (+$25)",
      msg_urgent:"Express-Lieferung (24 Stunden)",
      msg_certificate_note:"Dies ist ein Geschenkgutschein — der Beschenkte schickt die Song-Details später selbst.",
      reviews_eyebrow:"Bewertungen",
      reviews_h2:"Reaktionen, für die sich das lohnt",
      review1_quote:"„Sie ist in Tränen ausgebrochen, als sie ihre eigene Geschichte im Text erkannt hat — sagt, niemand hat ihr je so etwas geschenkt.“",
      review1_author:"Marina — Jubiläumsgeschenk für ihren Mann",
      review2_quote:"„Wir haben den Track auf der Geburtstagsfeier voll aufgedreht — alle haben schon ab der zweiten Strophe mitgesungen.“",
      review2_author:"Giorgi — Tiflis",
      review3_quote:"„Für das Hochzeitsjubiläum meiner Eltern bestellt — Mama meinte, es sei das beste Geschenk seit 30 Jahren.“",
      review3_author:"Alex — Kiew",
      corp_close:"Schließen",
      corp_panel_label:"Für Unternehmen",
      corp_eyebrow:"Für Unternehmen",
      corp_h2:"Mehrere Songs gesucht?",
      corp_p:"Grüße an Mitarbeitende, Geschenke für Partner, eine Firmenhymne — ab 5 Songs gibt es einen Rabatt.",
      corp_qty_label:"Anzahl der Songs",
      corp_tier_label:"Basispaket",
      corp_total_label:"Gesamt",
      corp_discount_label:"Rabatt",
      corp_btn:"Auf Telegram besprechen",
      corp_msg:"Hallo! Interesse an einer Firmenbestellung: {qty} Songs, Paket „{tier}“. Geschätzte Summe: ${total} ({discount}% Rabatt).",
      footer_location:"Tiflis · Kiew · online",

      author_eyebrow:"Eigene Songs",
      author_h2:"Der Autor des Projekts und seine Songs",
      author_p:"Diese Songs wurden nicht im Auftrag geschrieben. Sie entstanden aus Reisen, Begegnungen, Verlusten, Hoffnung, Entscheidungsfreiheit und Liebe zum Leben. Jeder von ihnen ist ein Kapitel einer großen Geschichte, die bis heute weitergeht.",
      author_showcase_p:"Eigene Songs über Reisen, Begegnungen, Entscheidungsfreiheit und die Liebe zum Leben.",
      library_featured_author:"Ausgewählter eigener Song",
      author_count_label:"eigene Tracks",
      author_open_library:"Autorenbibliothek öffnen",
      author_library_title:"Autorenbibliothek",
      author_library_subtitle:"Der vollständige Songkatalog des TuneWrap-Autors.",
      author_amsterdam_desc:"Diese Geschichte begann tief in der Nacht in Amsterdam. Mein Sohn und ich gingen einfach durch die leere Stadt, ohne zu ahnen, dass wir diese Nacht nie vergessen würden. Rote Lichter, Kanäle und ein Gefühl grenzenloser Freiheit wurden später zu einem Song.",
      author_ukraine_desc:"Dieser Song ist Millionen Ukrainern gewidmet, die heute fern von zu Hause leben. Menschen, die ihr Land weiter lieben, für es beten und daran glauben, eines Tages die wichtigsten Worte sagen zu können: „Ich bin zu Hause.“",
      author_mychoice_desc:"Manchmal muss man das vertraute Leben verlieren, um das eigene zu finden. Dieser Song entstand an dem Tag, an dem ich verstand: Freiheit bedeutet, den eigenen Weg wählen und sich selbst treu bleiben zu dürfen.",
      author_tbilisi_desc:"Manchmal wird eine fremde Stadt zur Heimat. Tbilisi schenkte mir ein neues Kapitel, neue Menschen und den Glauben daran, dass es nie zu spät ist, neu anzufangen.",
      author_goodvibe_desc:"Manchmal werden Monate voller Unterstützung, Lächeln und warmer Gespräche zu guter Musik. Dieser Song ist ein Dank an das Leben und an einen Menschen für seine hellen Momente.",
      author_pulse_desc:"Musik war mein ganzes Leben lang an meiner Seite. Bassgitarre, Bühne, Scheinwerfer und Tausende Herzen, die im gleichen Rhythmus schlagen. Manche Momente lassen sich nicht in Worte fassen — man kann sie nur fühlen. Dies ist eine Geschichte über Freiheit, die Energie der Musik und den Puls der Nacht, zu dem ich bis heute gehöre.",
      author_yayaya_desc:"Manchmal entsteht ein Song nicht aus Schmerz, sondern aus reiner Energie. Ya Ya Ya handelt von dem Moment, in dem man nicht mehr auf die Meinung anderer zurückblickt und im eigenen Rhythmus weitergeht. Gitarrendrive, Straße und ein Refrain, den man gemeinsam singen möchte.",
      author_iwant_desc:"Nach vielen Jahren nach dem Zeitplan anderer kommt plötzlich Stille—und zum ersten Mal sagt niemand mehr, was man tun muss. Dieser Song entstand aus einem einfachen, fast trotzigen Gefühl von Freiheit: Heute bestimme ich meinen Tag, meinen Weg und mein Leben selbst. „Ich mache, was ich will“ ist keine Laune, sondern die Rückkehr zu sich selbst.",
      author_53_desc:"53 ist die gemeinsame Zahl zweier junger Menschen, die ihren eigenen Weg gehen, ohne sich nach den Regeln oder Meinungen anderer zu richten. Es ist eine Geschichte über freie Entscheidungen, Treue zueinander und die Kraft wahrer Liebe. Ihre zentrale Botschaft lautet: Our Way. Our Choice.",
      author_signature:"Songwriter, Produzent und Gründer von TuneWrap.",
    }
  };

  const TIERS = {
    ru: [
      {name:"Просто", oldPrice:"39", price:"19", badge:null, features:["Ваш текст или идея — в песне","1 стиль на выбор","Базовый монтаж дублей","Доставка 48–72 часа"]},
      {name:"Продвинутый", oldPrice:"99", price:"49", badge:"Популярный", features:["Всё из тарифа «Просто»","Ручной отбор дублей и сведение","До 2 бесплатных правок текста","Доставка 24–48 часов"]},
      {name:"Хит", oldPrice:"199", price:"139", badge:null, features:["Всё из тарифа «Продвинутый»","Углублённая продюсерская работа","Правки текста до утверждения","Инструментальная версия в подарок"]}
    ],
    uk: [
      {name:"Просто", oldPrice:"39", price:"19", badge:null, features:["Ваш текст або ідея — у пісні","1 стиль на вибір","Базовий монтаж дублів","Доставка 48–72 години"]},
      {name:"Просунутий", oldPrice:"99", price:"49", badge:"Популярний", features:["Все з тарифу «Просто»","Ручний відбір дублів і зведення","До 2 безкоштовних правок тексту","Доставка 24–48 годин"]},
      {name:"Хіт", oldPrice:"199", price:"139", badge:null, features:["Все з тарифу «Просунутий»","Поглиблена продюсерська робота","Правки тексту до затвердження","Інструментальна версія в подарунок"]}
    ],
    ka: [
      {name:"მარტივი", oldPrice:"39", price:"19", badge:null, features:["თქვენი ტექსტი ან იდეა — სიმღერაში","1 სტილი არჩევანით","დუბლების საბაზისო მონტაჟი","მიწოდება 48–72 საათში"]},
      {name:"გაძლიერებული", oldPrice:"99", price:"49", badge:"პოპულარული", features:["ყველაფერი «მარტივიდან»","საუკეთესო დუბლების ხელით შერჩევა","ტექსტის 2 უფასო შესწორებამდე","მიწოდება 24–48 საათში"]},
      {name:"ჰიტი", oldPrice:"199", price:"139", badge:null, features:["ყველაფერი «გაძლიერებულიდან»","ღრმა პროდიუსერული მუშაობა","ტექსტის შესწორება დამტკიცებამდე","საჩუქრად საკარაოკე ვერსია"]}
    ],
    en: [
      {name:"Simple", oldPrice:"39", price:"19", badge:null, features:["Your text or idea, turned into a song","1 style of your choice","Basic take editing","Delivery in 48–72 hours"]},
      {name:"Advanced", oldPrice:"99", price:"49", badge:"Popular", features:["Everything in Simple","Hand-picked takes and mixing","Up to 2 free lyric revisions","Delivery in 24–48 hours"]},
      {name:"Hit", oldPrice:"199", price:"139", badge:null, features:["Everything in Advanced","Deeper production work","Revisions until you approve","Free instrumental version"]}
    ],
    de: [
      {name:"Einfach", oldPrice:"39", price:"19", badge:null, features:["Dein Text oder deine Idee wird zum Song","1 Stil deiner Wahl","Einfaches Take-Editing","Lieferung in 48–72 Stunden"]},
      {name:"Fortgeschritten", oldPrice:"99", price:"49", badge:"Beliebt", features:["Alles aus „Einfach“","Handverlesene Takes und Mixing","Bis zu 2 kostenlose Textkorrekturen","Lieferung in 24–48 Stunden"]},
      {name:"Hit", oldPrice:"199", price:"139", badge:null, features:["Alles aus „Fortgeschritten“","Vertiefte Produktionsarbeit","Korrekturen bis zur Freigabe","Instrumentalversion gratis"]}
    ]
  };

  const WEDDING_PACKAGE_IDS = ["first-dance","love-story","wedding-collection"];
  const WEDDING_PACKAGE_PRICES = {
    "first-dance": {oldPrice:"99", price:"49"},
    "love-story": {oldPrice:"199", price:"99"},
    "wedding-collection": {oldPrice:"299", price:"149"}
  };
  const WEDDING_PACKAGES = {
    ru: [
      {
        id:"first-dance", name:"First Dance", short:"Песня для первого танца",
        description:"Персональная песня для вашего первого танца. История, слова и музыка, созданные только для вас двоих.",
        includes:["сбор истории пары","написание персонального текста","создание музыки","готовая песня в MP3","текст песни","обложка","версия для свадебного танца"],
        ideal:"Первый танец молодожёнов", button:"Выбрать First Dance"
      },
      {
        id:"love-story", name:"Love Story", short:"История вашей любви",
        description:"История вашего знакомства, любви и пути к свадьбе, превращённая в полноценную песню.",
        includes:["подробный сбор истории","ключевые моменты знакомства и отношений","персональный текст","музыка и вокал","готовая песня в MP3","текст песни","обложка","версия для видео Love Story"],
        ideal:"Love Story, свадебное видео, церемония или подарок", button:"Выбрать Love Story"
      },
      {
        id:"wedding-collection", name:"Wedding Collection", short:"Музыка для всей свадьбы",
        description:"Персональная музыкальная коллекция для самых важных моментов вашей свадьбы.",
        includes:["песня для первого танца","история любви пары","песня-благодарность родителям","семейная или финальная песня","единый стиль обложек","комплект MP3 и текстов"],
        ideal:"Полное музыкальное оформление свадебной истории", button:"Выбрать Wedding Collection"
      }
    ],
    uk: [
      {
        id:"first-dance", name:"First Dance", short:"Пісня для першого танцю",
        description:"Персональна пісня для вашого першого танцю. Історія, слова й музика, створені лише для вас двох.",
        includes:["збір історії пари","написання персонального тексту","створення музики","готова пісня в MP3","текст пісні","обкладинка","версія для весільного танцю"],
        ideal:"Перший танець молодят", button:"Обрати First Dance"
      },
      {
        id:"love-story", name:"Love Story", short:"Історія вашого кохання",
        description:"Історія вашого знайомства, кохання та шляху до весілля, перетворена на повноцінну пісню.",
        includes:["детальний збір історії","ключові моменти знайомства й стосунків","персональний текст","музика та вокал","готова пісня в MP3","текст пісні","обкладинка","версія для відео Love Story"],
        ideal:"Love Story, весільне відео, церемонія або подарунок", button:"Обрати Love Story"
      },
      {
        id:"wedding-collection", name:"Wedding Collection", short:"Музика для всього весілля",
        description:"Персональна музична колекція для найважливіших моментів вашого весілля.",
        includes:["пісня для першого танцю","історія кохання пари","пісня-подяка батькам","сімейна або фінальна пісня","єдиний стиль обкладинок","комплект MP3 і текстів"],
        ideal:"Повне музичне оформлення весільної історії", button:"Обрати Wedding Collection"
      }
    ],
    ka: [
      {
        id:"first-dance", name:"First Dance", short:"სიმღერა პირველი ცეკვისთვის",
        description:"პერსონალური სიმღერა თქვენი პირველი ცეკვისთვის. ისტორია, სიტყვები და მუსიკა, შექმნილი მხოლოდ თქვენთვის.",
        includes:["წყვილის ისტორიის შეგროვება","პერსონალური ტექსტის დაწერა","მუსიკის შექმნა","მზა სიმღერა MP3 ფორმატში","სიმღერის ტექსტი","ყდა","ვერსია საქორწილო ცეკვისთვის"],
        ideal:"ახალდაქორწინებულთა პირველი ცეკვა", button:"აირჩიეთ First Dance"
      },
      {
        id:"love-story", name:"Love Story", short:"თქვენი სიყვარულის ისტორია",
        description:"თქვენი გაცნობის, სიყვარულისა და ქორწილამდე გზის ისტორია, სრულფასოვან სიმღერად ქცეული.",
        includes:["ისტორიის დეტალური შეგროვება","გაცნობისა და ურთიერთობის მნიშვნელოვანი მომენტები","პერსონალური ტექსტი","მუსიკა და ვოკალი","მზა სიმღერა MP3 ფორმატში","სიმღერის ტექსტი","ყდა","ვერსია Love Story ვიდეოსთვის"],
        ideal:"Love Story, საქორწილო ვიდეო, ცერემონია ან საჩუქარი", button:"აირჩიეთ Love Story"
      },
      {
        id:"wedding-collection", name:"Wedding Collection", short:"მუსიკა მთელი ქორწილისთვის",
        description:"პერსონალური მუსიკალური კოლექცია თქვენი ქორწილის ყველაზე მნიშვნელოვანი მომენტებისთვის.",
        includes:["სიმღერა პირველი ცეკვისთვის","წყვილის სიყვარულის ისტორია","მადლობის სიმღერა მშობლებისთვის","ოჯახური ან ფინალური სიმღერა","ყდების ერთიანი სტილი","MP3-ებისა და ტექსტების კომპლექტი"],
        ideal:"საქორწილო ისტორიის სრული მუსიკალური გაფორმება", button:"აირჩიეთ Wedding Collection"
      }
    ],
    en: [
      {
        id:"first-dance", name:"First Dance", short:"A song for your first dance",
        description:"A personal song for your first dance. A story, lyrics and music created only for the two of you.",
        includes:["the couple’s story collection","personal lyric writing","music creation","finished MP3 song","song lyrics","cover artwork","a wedding-dance version"],
        ideal:"The newlyweds’ first dance", button:"Choose First Dance"
      },
      {
        id:"love-story", name:"Love Story", short:"The story of your love",
        description:"The story of how you met, fell in love and reached your wedding day, transformed into a complete song.",
        includes:["in-depth story collection","key moments from your meeting and relationship","personal lyrics","music and vocals","finished MP3 song","song lyrics","cover artwork","a version for a Love Story video"],
        ideal:"Love Story, wedding video, ceremony or gift", button:"Choose Love Story"
      },
      {
        id:"wedding-collection", name:"Wedding Collection", short:"Music for the whole wedding",
        description:"A personal music collection for the most important moments of your wedding.",
        includes:["a first-dance song","the couple’s love story","a thank-you song for parents","a family or final song","one visual style for all covers","a complete set of MP3 files and lyrics"],
        ideal:"A complete musical setting for your wedding story", button:"Choose Wedding Collection"
      }
    ],
    de: [
      {
        id:"first-dance", name:"First Dance", short:"Ein Song für den ersten Tanz",
        description:"Ein persönlicher Song für Ihren ersten Tanz. Geschichte, Text und Musik, nur für Sie beide geschaffen.",
        includes:["Erfassung Ihrer Paargeschichte","persönlicher Liedtext","Komposition der Musik","fertiger Song als MP3","Liedtext","Cover","Version für den Hochzeitstanz"],
        ideal:"Der erste Tanz des Brautpaares", button:"First Dance auswählen"
      },
      {
        id:"love-story", name:"Love Story", short:"Die Geschichte Ihrer Liebe",
        description:"Ihre Kennenlern-, Liebes- und Hochzeitsgeschichte, verwandelt in einen vollständigen Song.",
        includes:["ausführliche Erfassung der Geschichte","Schlüsselmomente des Kennenlernens und der Beziehung","persönlicher Liedtext","Musik und Gesang","fertiger Song als MP3","Liedtext","Cover","Version für ein Love-Story-Video"],
        ideal:"Love Story, Hochzeitsvideo, Zeremonie oder Geschenk", button:"Love Story auswählen"
      },
      {
        id:"wedding-collection", name:"Wedding Collection", short:"Musik für die gesamte Hochzeit",
        description:"Eine persönliche Musiksammlung für die wichtigsten Momente Ihrer Hochzeit.",
        includes:["Song für den ersten Tanz","Liebesgeschichte des Paares","Dankeslied für die Eltern","Familien- oder Abschlusssong","einheitlicher Coverstil","Komplettpaket aus MP3-Dateien und Texten"],
        ideal:"Die vollständige musikalische Gestaltung Ihrer Hochzeitsgeschichte", button:"Wedding Collection auswählen"
      }
    ]
  };

  const STYLE_IDS = ["pop","disco","funk","rock","trap","industrial","symphonic","indie","jazz","rnb","synthwave","balkan"];
  const STYLES = {
    ru: ["Поп","Диско","Фанк","Рок","Трэп","Индастриал","Симфонический","Инди","Джаз","R&B","Синтвейв","Балканский брасс"],
    uk: ["Поп","Диско","Фанк","Рок","Треп","Індастріал","Симфонічний","Інді","Джаз","R&B","Синтвейв","Балканський брас"],
    ka: ["პოპი","დისკო","ფანკი","როკი","ტრეპი","ინდასტრიალი","სიმფონიური","ინდი","ჯაზი","R&B","სინთვეივი","ბალკანური სპილენძი"],
    en: ["Pop","Disco","Funk","Rock","Trap","Industrial","Symphonic","Indie","Jazz","R&B","Synthwave","Balkan Brass"],
    de: ["Pop","Disco","Funk","Rock","Trap","Industrial","Symphonisch","Indie","Jazz","R&B","Synthwave","Balkan-Brass"]
  };

  const OCCASIONS = {
    ru: [
      "Свадьба","История любви","Предложение руки и сердца","Годовщина отношений","Венчание",
      "День рождения","Юбилей","Для мамы","Для папы","Для родителей","Для сына","Для дочери",
      "Для бабушки","Для дедушки","Для брата","Для сестры","Для друга","Для любимого человека",
      "Детская песня","Для новорождённого","Выписка из роддома","Первый годик малыша",
      "Выпускной","Последний звонок","Корпоративный подарок","Для руководителя","Открытие бизнеса",
      "Новоселье","Выход на пенсию","История знакомства","История семьи","История жизни",
      "История преодоления","Благодарность близкому человеку","Любимый город","Путешествие",
      "О своей стране","Для любимого питомца","Песня-воспоминание","Песня о мечте",
      "Новый этап жизни","Песня-пожелание","Песня-сюрприз","Песня-признание","Песня-примирение",
      "Песня памяти","У меня просто есть история…","Другое"
    ],
    uk: [
      "Весілля","Історія кохання","Освідчення","Річниця стосунків","Вінчання",
      "День народження","Ювілей","Для мами","Для тата","Для батьків","Для сина","Для доньки",
      "Для бабусі","Для дідуся","Для брата","Для сестри","Для друга","Для коханої людини",
      "Дитяча пісня","Для новонародженого","Виписка з пологового","Перший рік малюка",
      "Випускний","Останній дзвоник","Корпоративний подарунок","Для керівника","Відкриття бізнесу",
      "Новосілля","Вихід на пенсію","Історія знайомства","Історія родини","Історія життя",
      "Історія подолання","Подяка близькій людині","Улюблене місто","Подорож",
      "Про свою країну","Для улюбленця","Пісня-спогад","Пісня про мрію",
      "Новий етап життя","Пісня-побажання","Пісня-сюрприз","Пісня-зізнання","Пісня-примирення",
      "Пісня пам’яті","У мене просто є історія…","Інше"
    ],
    ka: [
      "ქორწილი","სიყვარულის ისტორია","ხელის თხოვნა","ურთიერთობის წლისთავი","ჯვრისწერა",
      "დაბადების დღე","იუბილე","დედისთვის","მამისთვის","მშობლებისთვის","ვაჟისთვის","ქალიშვილისთვის",
      "ბებიისთვის","ბაბუისთვის","ძმისთვის","დისთვის","მეგობრისთვის","საყვარელი ადამიანისთვის",
      "საბავშვო სიმღერა","ახალშობილისთვის","სამშობიაროდან გამოსვლა","ბავშვის პირველი წელი",
      "გამოსაშვები საღამო","ბოლო ზარი","კორპორატიული საჩუქარი","ხელმძღვანელისთვის","ბიზნესის გახსნა",
      "ახალი სახლი","პენსიაზე გასვლა","გაცნობის ისტორია","ოჯახის ისტორია","ცხოვრების ისტორია",
      "გადალახვის ისტორია","მადლობა ახლობელს","საყვარელი ქალაქი","მოგზაურობა",
      "ჩემს ქვეყანაზე","საყვარელი ცხოველისთვის","მოგონების სიმღერა","ოცნების სიმღერა",
      "ცხოვრების ახალი ეტაპი","სურვილის სიმღერა","სიურპრიზის სიმღერა","აღიარების სიმღერა","შერიგების სიმღერა",
      "ხსოვნის სიმღერა","უბრალოდ მაქვს ისტორია…","სხვა"
    ],
    en: [
      "Wedding","Love story","Marriage proposal","Relationship anniversary","Wedding ceremony",
      "Birthday","Jubilee","For Mom","For Dad","For parents","For a son","For a daughter",
      "For a grandmother","For a grandfather","For a brother","For a sister","For a friend","For a loved one",
      "Children's song","For a newborn","Coming home with a baby","Baby's first birthday",
      "Graduation","Last school bell","Corporate gift","For a manager","Business opening",
      "Housewarming","Retirement","How we met","Family story","Life story",
      "A story of overcoming","Thank you to someone special","Favorite city","Travel",
      "About my country","For a beloved pet","Song of remembrance","Song about a dream",
      "A new chapter in life","A wish song","A surprise song","A confession song","A reconciliation song",
      "Memorial song","I simply have a story…","Other"
    ],
    de: [
      "Hochzeit","Liebesgeschichte","Heiratsantrag","Jahrestag der Beziehung","Trauung",
      "Geburtstag","Jubiläum","Für Mama","Für Papa","Für die Eltern","Für den Sohn","Für die Tochter",
      "Für die Großmutter","Für den Großvater","Für den Bruder","Für die Schwester","Für einen Freund","Für einen geliebten Menschen",
      "Kinderlied","Für ein Neugeborenes","Heimkehr mit dem Baby","Erster Geburtstag",
      "Abschlussfeier","Letzter Schultag","Firmengeschenk","Für die Leitung","Geschäftseröffnung",
      "Einzug","Ruhestand","Kennenlerngeschichte","Familiengeschichte","Lebensgeschichte",
      "Eine Geschichte des Überwindens","Dank an einen besonderen Menschen","Lieblingsstadt","Reise",
      "Über mein Land","Für ein geliebtes Haustier","Erinnerungslied","Lied über einen Traum",
      "Ein neuer Lebensabschnitt","Wunschlied","Überraschungslied","Liebesgeständnis","Versöhnungslied",
      "Gedenklied","Ich habe einfach eine Geschichte…","Sonstiges"
    ]
  };

  const QUESTIONS = {
    ru: ["Какая у него/неё любимая фраза?","Как его/её называют дома (домашнее прозвище)?","Какая у него/неё смешная привычка?","Что он/она всегда говорит детям?","Из-за чего вы познакомились?","Какой момент вы никогда не забудете?","Какая песня напоминает вам о нём/ней?"],
    uk: ["Яка у нього/неї улюблена фраза?","Як його/її звуть вдома (домашнє прізвисько)?","Яка у нього/неї смішна звичка?","Що він/вона завжди каже дітям?","Через що ви познайомилися?","Який момент ви ніколи не забудете?","Яка пісня нагадує вам про нього/неї?"],
    ka: ["რომელი ფრაზა უყვარს ყველაზე მეტად?","როგორ ეძახიან სახლში (შინაური მეტსახელი)?","რა სასაცილო ჩვევა აქვს?","რას ეუბნება ყოველთვის ბავშვებს?","რის გამო გაიცანით ერთმანეთი?","რომელი მომენტი არასდროს დაგავიწყდებათ?","რომელი სიმღერა გახსენებთ მას?"],
    en: ["What's their favorite phrase?","What do people call them at home (nickname)?","What's a funny habit of theirs?","What do they always say to the kids?","How did you two meet?","What moment will you never forget?","What song reminds you of them?"],
    de: ["Was ist sein/ihr Lieblingsspruch?","Wie wird er/sie zuhause genannt (Kosename)?","Was ist eine lustige Angewohnheit von ihm/ihr?","Was sagt er/sie immer zu den Kindern?","Wie habt ihr euch kennengelernt?","Welchen Moment werdet ihr nie vergessen?","Welches Lied erinnert dich an ihn/sie?"]
  };


  const STORY_EXAMPLES = {
    ru: [
      "Она заплатила за мой кофе всего 6 евро.",
      "Мы познакомились в поезде по дороге домой.",
      "Папа 37 лет работал на железной дороге.",
      "Она каждый день говорит: «Главное — чтобы все были здоровы».",
      "Мы встретились снова спустя 20 лет.",
      "Своя история"
    ],
    uk: [
      "Вона заплатила за мою каву лише 6 євро.",
      "Ми познайомилися в потязі дорогою додому.",
      "Тато 37 років працював на залізниці.",
      "Вона щодня каже: «Головне — щоб усі були здорові».",
      "Ми зустрілися знову через 20 років.",
      "Своя історія"
    ],
    ka: [
      "მან ჩემი ყავა მხოლოდ 6 ევროდ გადაიხადა.",
      "ჩვენ სახლში მიმავალ მატარებელში გავიცანით ერთმანეთი.",
      "მამა 37 წელი რკინიგზაზე მუშაობდა.",
      "ის ყოველდღე ამბობს: „მთავარია, ყველა ჯანმრთელი იყოს“.",
      "ჩვენ 20 წლის შემდეგ კვლავ შევხვდით.",
      "ჩემი ისტორია"
    ],
    en: [
      "She paid just €6 for my coffee.",
      "We met on a train on the way home.",
      "Dad worked on the railway for 37 years.",
      "She always says: “The main thing is that everyone is healthy.”",
      "We met again after 20 years.",
      "My own story"
    ],
    de: [
      "Sie bezahlte nur 6 Euro für meinen Kaffee.",
      "Wir lernten uns im Zug auf dem Heimweg kennen.",
      "Papa arbeitete 37 Jahre bei der Bahn.",
      "Sie sagt jeden Tag: „Hauptsache, alle sind gesund.“",
      "Nach 20 Jahren trafen wir uns wieder.",
      "Meine eigene Geschichte"
    ]
  };

  const LANG_TAGS = {ru:'ru', uk:'uk', ka:'ka', en:'en', de:'de'};
  const els = document.querySelectorAll('[data-i18n]');
  const phEls = document.querySelectorAll('[data-i18n-ph]');
  const buttons = document.querySelectorAll('.lang-btn');

  let currentLang = 'ru';
  let selectedTierIdx = null;
  let selectedWeddingPackageId = null;
  let selectedStyles = [];
  let currentMode = 'order';
  let activeTierPanelIdx = 0;
  let activeWeddingPanelIdx = 0;
  let activeOfferType = 'tier';
  let tierPanelRestoreFocus = null;

  const tierPanel = document.getElementById('tierDetailPanel');
  const tierPanelClose = document.getElementById('tierDetailClose');
  const tierPanelTitle = document.getElementById('tierDetailTitle');
  const tierPanelBadge = document.getElementById('tierDetailBadge');
  const tierPanelOldPrice = document.getElementById('tierDetailOldPrice');
  const tierPanelPrice = document.getElementById('tierDetailPrice');
  const tierPanelPriceWrap = document.getElementById('tierDetailPriceWrap');
  const tierPanelUntil = document.getElementById('tierDetailUntil');
  const tierPanelKicker = document.getElementById('tierDetailKicker');
  const tierPanelStep = document.getElementById('tierDetailStep');
  const tierPanelFeatures = document.getElementById('tierDetailFeatures');
  const tierPanelSelect = document.getElementById('tierDetailSelect');
  const tierPanelVisual = document.getElementById('tierDetailVisual');
  const tierPanelVisualImage = document.getElementById('tierDetailVisualImage');
  const tierPanelDescription = document.getElementById('tierDetailDescription');
  const tierPanelWeddingContent = document.getElementById('tierDetailWeddingContent');
  const tierPanelWeddingIncludes = document.getElementById('tierDetailWeddingIncludes');
  const tierPanelWeddingIdeal = document.getElementById('tierDetailWeddingIdeal');
  const weddingPackageSelect = document.getElementById('fieldWeddingPackage');
  const tierPanelLanguageSelect = document.getElementById('tierDetailLanguageSelect');

  function t(key){ return (I18N[currentLang] || I18N.ru)[key] || ''; }

  function weddingPackageById(lang,id){
    return (WEDDING_PACKAGES[lang] || WEDDING_PACKAGES.ru).find(item => item.id === id) || null;
  }

  function weddingIconMarkup(id){
    if(id === 'first-dance'){
      return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 23c4-8 7-12 10-12 3 0 4 4 8 4"/><path d="M9 9l4 4M19 7l-2 5M24 22l3 3"/><circle cx="8" cy="24" r="2.5"/><circle cx="25" cy="15" r="2.5"/></svg>';
    }
    if(id === 'love-story'){
      return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 24c4-11 7-15 11-15 3 0 5 3 9 3"/><path d="M6 24h20"/><circle cx="9" cy="20" r="2"/><circle cx="17" cy="11" r="2"/><circle cx="25" cy="12" r="2"/></svg>';
    }
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 10h18M7 16h18M7 22h18"/><path d="M10 7v18M16 7v18M22 7v18"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="22" cy="22" r="2"/></svg>';
  }

  function renderTierPanel(index = activeTierPanelIdx, type = activeOfferType){
    if(
      !tierPanel || !tierPanelTitle || !tierPanelBadge || !tierPanelOldPrice ||
      !tierPanelPrice || !tierPanelFeatures || !tierPanelSelect
    ) return;

    activeOfferType = type === 'wedding' ? 'wedding' : 'tier';
    const isWedding = activeOfferType === 'wedding';
    tierPanel.classList.toggle('is-wedding',isWedding);

    if(isWedding){
      const packageData = WEDDING_PACKAGES[currentLang][index];
      if(!packageData) return;
      activeWeddingPanelIdx = index;
      tierPanelBadge.hidden = true;
      tierPanelVisual.hidden = false;
      tierPanelDescription.hidden = false;
      tierPanelPriceWrap.hidden = true;
      tierPanelUntil.hidden = true;
      tierPanelFeatures.hidden = true;
      tierPanelWeddingContent.hidden = false;
      tierPanelKicker.textContent = t('wedding_eyebrow');
      tierPanelStep.textContent = t('wedding_panel_label');
      tierPanelTitle.textContent = packageData.name;
      tierPanelDescription.textContent = packageData.description;
      tierPanelWeddingIncludes.innerHTML = packageData.includes.map(feature => '<li>' + feature + '</li>').join('');
      tierPanelWeddingIdeal.textContent = packageData.ideal;
      tierPanelSelect.textContent = packageData.button;
      tierPanelVisualImage.alt = packageData.name + ' — ' + t('wedding_panel_label');
      return;
    }

    const tier = TIERS[currentLang][index];
    if(!tier) return;
    activeTierPanelIdx = index;
    tierPanelBadge.textContent = tier.badge || '';
    tierPanelBadge.hidden = !tier.badge;
    tierPanelVisual.hidden = true;
    tierPanelDescription.hidden = true;
    tierPanelPriceWrap.hidden = false;
    tierPanelUntil.hidden = false;
    tierPanelFeatures.hidden = false;
    tierPanelWeddingContent.hidden = true;
    tierPanelKicker.textContent = t('pricing_promo_title');
    tierPanelStep.textContent = t('tier_detail_label');
    tierPanelTitle.textContent = tier.name;
    tierPanelOldPrice.textContent = '$' + tier.oldPrice;
    tierPanelPrice.textContent = '$' + tier.price;
    tierPanelFeatures.innerHTML = tier.features.map(feature => '<li>' + feature + '</li>').join('');
    tierPanelSelect.textContent = t('tier_detail_select');
  }

  function openTierPanel(index,trigger,type = 'tier'){
    if(!tierPanel) return;
    renderTierPanel(index,type);
    tierPanelRestoreFocus = trigger || null;
    tierPanel.removeAttribute('inert');
    tierPanel.classList.add('is-open');
    tierPanel.setAttribute('aria-hidden','false');
    document.body.classList.add('tier-panel-open');
    window.requestAnimationFrame(() => tierPanelClose?.focus({preventScroll:true}));
  }

  function closeTierPanel(){
    if(!tierPanel || !tierPanel.classList.contains('is-open')) return;
    tierPanel.classList.remove('is-open');
    tierPanel.setAttribute('aria-hidden','true');
    tierPanel.setAttribute('inert','');
    document.body.classList.remove('tier-panel-open');
    if(tierPanelRestoreFocus && typeof tierPanelRestoreFocus.focus === 'function'){
      window.requestAnimationFrame(() => tierPanelRestoreFocus.focus({preventScroll:true}));
    }
  }

  function syncWeddingFormState(){
    const isWedding = Boolean(selectedWeddingPackageId);
    const packageData = isWedding ? weddingPackageById(currentLang,selectedWeddingPackageId) : null;
    const typePill = document.getElementById('weddingOrderTypePill');
    const packageField = document.getElementById('weddingPackageField');
    const sumOrderType = document.getElementById('sumOrderType');
    if(typePill) typePill.hidden = !isWedding;
    if(packageField) packageField.hidden = !isWedding;
    if(sumOrderType) sumOrderType.textContent = isWedding ? t('wedding_order_type_value') : '';
    if(weddingPackageSelect && isWedding) weddingPackageSelect.value = selectedWeddingPackageId;
    if(isWedding && packageData){
      document.getElementById('sumTier').textContent = packageData.name;
    }
  }

  function resetOrderSelection(){
    selectedTierIdx = null;
    selectedWeddingPackageId = null;
    document.getElementById('sumTier').textContent = t('dash');
    syncWeddingFormState();
    updateSummaryTotal();
    renderTiers(currentLang);
    renderWeddingPackages(currentLang);
  }

  function applySelectedTier(index){
    const tier = TIERS[currentLang][index];
    if(!tier) return;
    selectedWeddingPackageId = null;
    selectedTierIdx = index;
    document.getElementById('sumTier').textContent = tier.name + ' ($' + tier.price + ')';
    syncWeddingFormState();
    updateSummaryTotal();
    renderTiers(currentLang);
    renderWeddingPackages(currentLang);
  }

  function applySelectedWeddingPackage(index){
    const packageData = WEDDING_PACKAGES[currentLang][index];
    if(!packageData) return;
    selectedTierIdx = null;
    selectedWeddingPackageId = packageData.id;
    syncWeddingFormState();
    updateSummaryTotal();
    renderTiers(currentLang);
    renderWeddingPackages(currentLang);
  }

  function continueWithSelectedTier(){
    const selectingWedding = activeOfferType === 'wedding';
    if(selectingWedding) applySelectedWeddingPackage(activeWeddingPanelIdx);
    else applySelectedTier(activeTierPanelIdx);
    closeTierPanel();
    const contact = document.getElementById('contact');
    const orderMode = document.querySelector('.mode-btn[data-mode="order"]');
    if(orderMode) orderMode.click();
    if(selectingWedding){
      const occasion = document.getElementById('fieldOccasion');
      if(occasion && occasion.options.length > 1) occasion.selectedIndex = 1;
      updateOtherOccasion();
    }
    if(contact) contact.classList.add('is-story-path-form');
    window.setTimeout(() => {
      contact?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',block:'start'});
    },80);
  }

  function renderTiers(lang){
    const grid = document.getElementById('tiersGrid');
    grid.innerHTML = '';
    TIERS[lang].forEach((tier, i)=>{
      const card = document.createElement('article');
      card.className = 'tier-card' + (i===1 ? ' featured' : '') + (selectedTierIdx===i ? ' selected' : '');
      card.tabIndex = 0;
      card.setAttribute('role','button');
      card.setAttribute('aria-label',tier.name + ', $' + tier.price + '. ' + t('tier_open_btn'));
      card.dataset.tierIndex = String(i);
      card.innerHTML =
        '<div class="tier-name">'+tier.name+'</div>' +
        '<div class="tier-price tier-price-promo"><s>$'+tier.oldPrice+'</s><strong>$'+tier.price+'</strong><small>USD</small></div>' +
        '<span class="tier-card-open">'+t('tier_open_btn')+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span>';
      card.addEventListener('click',()=>{
        openTierPanel(i,card,'tier');
      });
      card.addEventListener('keydown',event => {
        if(event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openTierPanel(i,card,'tier');
      });
      grid.appendChild(card);
    });
    if(tierPanel?.classList.contains('is-open') && activeOfferType === 'tier') renderTierPanel(activeTierPanelIdx,'tier');
  }

  function renderWeddingPackages(lang){
    const grid = document.getElementById('weddingPackagesGrid');
    if(!grid) return;
    grid.innerHTML = '';
    grid.setAttribute('aria-label',t('wedding_panel_label'));
    WEDDING_PACKAGES[lang].forEach((packageData,index) => {
      const card = document.createElement('button');
      const packagePrice = WEDDING_PACKAGE_PRICES[packageData.id];
      card.type = 'button';
      card.className = 'wedding-package-card' + (selectedWeddingPackageId === packageData.id ? ' selected' : '');
      card.dataset.weddingPackage = packageData.id;
      card.setAttribute('aria-label',packageData.name + ', $' + packagePrice.price + '. ' + t('tier_open_btn'));
      card.innerHTML =
        '<span class="wedding-package-name">'+packageData.name+'</span>' +
        '<span class="wedding-package-price"><s>$'+packagePrice.oldPrice+'</s><strong>$'+packagePrice.price+'</strong></span>' +
        '<span class="wedding-package-more">'+t('tier_open_btn')+'</span>';
      card.addEventListener('click',() => openTierPanel(index,card,'wedding'));
      grid.appendChild(card);
    });
    if(tierPanel?.classList.contains('is-open') && activeOfferType === 'wedding') renderTierPanel(activeWeddingPanelIdx,'wedding');
  }

  function renderWeddingPackageSelect(lang){
    if(!weddingPackageSelect) return;
    const previous = selectedWeddingPackageId || weddingPackageSelect.value;
    weddingPackageSelect.innerHTML = WEDDING_PACKAGES[lang]
      .map(packageData => '<option value="'+packageData.id+'">'+packageData.name+'</option>')
      .join('');
    if(previous && WEDDING_PACKAGE_IDS.includes(previous)) weddingPackageSelect.value = previous;
  }

  function updateSummaryTotal(){
    if(selectedWeddingPackageId){
      document.getElementById('sumTotal').textContent = t('dash');
      return;
    }
    const base = selectedTierIdx !== null ? parseInt(TIERS[currentLang][selectedTierIdx].price, 10) : 0;
    const urgent = document.getElementById('fieldUrgent').checked ? 25 : 0;
    const total = base + urgent;
    document.getElementById('sumTotal').textContent = (selectedTierIdx !== null) ? ('$' + total) : t('dash');
  }

  function renderStyles(lang){
    const wrap = document.getElementById('styleChips');
    wrap.innerHTML = '';
    STYLES[lang].forEach((label, i)=>{
      const id = STYLE_IDS[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (selectedStyles.includes(id) ? ' selected' : '');
      btn.textContent = label;
      btn.addEventListener('click', ()=>{
        if(selectedStyles.includes(id)){
          selectedStyles = selectedStyles.filter(s=>s!==id);
        } else if(selectedStyles.length < 2){
          selectedStyles.push(id);
        }
        const labels = selectedStyles.map(sid=> STYLES[currentLang][STYLE_IDS.indexOf(sid)]);
        document.getElementById('sumStyle').textContent = labels.length ? labels.join(', ') : t('dash');
        renderStyles(currentLang);
      });
      wrap.appendChild(btn);
    });
  }

  function renderOccasions(lang){
    const sel = document.getElementById('fieldOccasion');
    const prevValue = sel.value;
    const prevIndex = sel.selectedIndex;
    sel.innerHTML = '<option value="" disabled selected>'+t('occasion_placeholder')+'</option>' +
      OCCASIONS[lang].map(o=>'<option value="'+o+'">'+o+'</option>').join('');
    if(prevIndex > 0 && prevIndex < sel.options.length){
      sel.selectedIndex = prevIndex;
    } else if(OCCASIONS[lang].includes(prevValue)){
      sel.value = prevValue;
    }
  }


  function renderStoryExamples(lang){
    const wrap = document.getElementById('storyExamples');
    const textarea = document.getElementById('fieldStoryCore');
    if(!wrap || !textarea) return;
    wrap.innerHTML = '';
    STORY_EXAMPLES[lang].forEach((text, index)=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'story-example' + (index === STORY_EXAMPLES[lang].length - 1 ? ' custom' : '');
      btn.textContent = text;
      btn.addEventListener('click', ()=>{
        if(index === STORY_EXAMPLES[currentLang].length - 1){
          textarea.focus();
          if(!textarea.value) textarea.placeholder = t('placeholder_story_core');
        } else {
          textarea.value = text;
        }
      });
      wrap.appendChild(btn);
    });
  }

  function updateOtherOccasion(){
    const sel = document.getElementById('fieldOccasion');
    const group = document.getElementById('otherOccasionGroup');
    if(!sel || !group) return;
    const last = OCCASIONS[currentLang][OCCASIONS[currentLang].length - 1];
    const story = OCCASIONS[currentLang][OCCASIONS[currentLang].length - 2];
    const show = sel.value === last || sel.value === story;
    group.classList.toggle('visible', show);
  }

  function renderGolden(lang){
    const box = document.getElementById('goldenBox');
    const prevValues = Array.from(box.querySelectorAll('textarea')).map(ta=>ta.value);
    box.innerHTML = '';
    QUESTIONS[lang].forEach((q, i)=>{
      const g = document.createElement('div');
      g.innerHTML = '<label class="golden-q-label">'+q+'</label><textarea id="goldenQ'+i+'"></textarea>';
      box.appendChild(g);
      if(prevValues[i]) box.querySelector('#goldenQ'+i).value = prevValues[i];
    });
  }

  function renderCorpTiers(lang){
    const sel = document.getElementById('corpTier');
    const prevIdx = sel.selectedIndex >= 0 ? sel.selectedIndex : 1;
    sel.innerHTML = TIERS[lang].map((tr,i)=> '<option value="'+i+'">'+tr.name+' ($'+tr.price+')</option>').join('');
    sel.selectedIndex = prevIdx >= 0 && prevIdx < TIERS[lang].length ? prevIdx : 1;
  }

  function updateCorpTotal(){
    const qty = Math.max(1, parseInt(document.getElementById('corpQty').value, 10) || 1);
    const tierIdx = parseInt(document.getElementById('corpTier').value, 10) || 0;
    const tier = TIERS[currentLang][tierIdx];
    const price = parseInt(tier.price, 10);
    let discount = 0;
    if(qty >= 10) discount = 20;
    else if(qty >= 5) discount = 10;
    const total = Math.round(qty * price * (1 - discount/100));
    document.getElementById('corpTotal').textContent = t('corp_total_label') + ': $' + total + ' (' + t('corp_discount_label') + ' ' + discount + '%)';
    const msg = t('corp_msg')
      .replace('{qty}', qty)
      .replace('{tier}', tier.name)
      .replace('{total}', total)
      .replace('{discount}', discount);
    document.getElementById('corpTgLink').href = 'https://t.me/tunewrap?text=' + encodeURIComponent(msg);
  }

  function renderDynamic(lang){
    renderTiers(lang);
    renderWeddingPackages(lang);
    renderWeddingPackageSelect(lang);
    renderStyles(lang);
    renderOccasions(lang);
    updateOtherOccasion();
    renderGolden(lang);
    renderStoryExamples(lang);
    renderCorpTiers(lang);
    updateSummaryTotal();
    updateCorpTotal();
    syncWeddingFormState();
    if(selectedWeddingPackageId){
      const packageData = weddingPackageById(lang,selectedWeddingPackageId);
      if(packageData) document.getElementById('sumTier').textContent = packageData.name;
    } else if(selectedTierIdx !== null){
      document.getElementById('sumTier').textContent = TIERS[lang][selectedTierIdx].name + ' ($' + TIERS[lang][selectedTierIdx].price + ')';
    }
    if(selectedStyles.length){
      const labels = selectedStyles.map(sid=> STYLES[lang][STYLE_IDS.indexOf(sid)]);
      document.getElementById('sumStyle').textContent = labels.join(', ');
    }
  }

  function applyLang(lang){
    currentLang = lang;
    const dict = I18N[lang] || I18N.ru;
    els.forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(!dict[key]) return;
      if(dict[key].indexOf('<') !== -1){
        el.innerHTML = dict[key];
      } else {
        el.textContent = dict[key];
      }
    });
    phEls.forEach(el=>{
      const key = el.getAttribute('data-i18n-ph');
      if(dict[key]) el.setAttribute('placeholder', dict[key]);
    });
    document.documentElement.setAttribute('lang', LANG_TAGS[lang] || 'ru');
    document.body.classList.toggle('lang-ka', lang === 'ka');
    buttons.forEach(b=> b.classList.toggle('active', b.getAttribute('data-lang') === lang));
    if(tierPanelLanguageSelect) tierPanelLanguageSelect.value = lang;
    renderDynamic(lang);
    applyTuneWrapTrackTitles(lang);
  }

  buttons.forEach(btn=>{
    btn.addEventListener('click', ()=> applyLang(btn.getAttribute('data-lang')));
  });
  tierPanelLanguageSelect?.addEventListener('change',event => {
    const languageButton = document.querySelector('.lang-btn[data-lang="' + event.target.value + '"]');
    if(languageButton) languageButton.click();
    else applyLang(event.target.value);
  });

  tierPanelClose?.addEventListener('click',closeTierPanel);
  tierPanel?.querySelectorAll('[data-tier-panel-close]').forEach(button => {
    button.addEventListener('click',closeTierPanel);
  });
  tierPanelSelect?.addEventListener('click',continueWithSelectedTier);
  document.addEventListener('keydown',event => {
    if(event.key === 'Escape' && tierPanel?.classList.contains('is-open')){
      closeTierPanel();
    }
  });

  // mode switch (order vs gift certificate)
  document.querySelectorAll('.mode-btn').forEach(btn=>{
    btn.addEventListener('click', function(){
      currentMode = this.getAttribute('data-mode');
      document.querySelectorAll('.mode-btn').forEach(b=> b.classList.toggle('active', b===this));
      document.getElementById('orderOnlyFields').classList.toggle('hidden', currentMode === 'certificate');
      document.getElementById('occasionGroup').classList.toggle('hidden', currentMode === 'certificate');
      document.getElementById('modeHint').setAttribute('data-i18n', currentMode === 'certificate' ? 'mode_certificate_hint' : 'mode_order_hint');
      document.getElementById('modeHint').textContent = t(currentMode === 'certificate' ? 'mode_certificate_hint' : 'mode_order_hint');
    });
  });

  document.getElementById('fieldOccasion').addEventListener('change', updateOtherOccasion);
  document.getElementById('fieldUrgent').addEventListener('change', updateSummaryTotal);
  weddingPackageSelect?.addEventListener('change',event => {
    const index = WEDDING_PACKAGE_IDS.indexOf(event.target.value);
    if(index < 0) return;
    applySelectedWeddingPackage(index);
    const occasion = document.getElementById('fieldOccasion');
    if(occasion && occasion.options.length > 1) occasion.selectedIndex = 1;
    updateOtherOccasion();
  });
  document.addEventListener('tunewrap:reset-order-selection',resetOrderSelection);
  document.getElementById('corpQty').addEventListener('input', updateCorpTotal);
  document.getElementById('corpTier').addEventListener('change', updateCorpTotal);

  // golden questions toggle
  document.getElementById('goldenToggle').addEventListener('click', function(){
    document.getElementById('goldenBox').classList.toggle('open');
  });

  // generate order
  document.getElementById('btnGenerate').addEventListener('click', function(){
    const tier = selectedTierIdx !== null ? TIERS[currentLang][selectedTierIdx] : null;
    const weddingPackage = selectedWeddingPackageId ? weddingPackageById(currentLang,selectedWeddingPackageId) : null;
    const styleLabels = selectedStyles.map(sid=> STYLES[currentLang][STYLE_IDS.indexOf(sid)]);
    const name = document.getElementById('fieldName').value.trim();
    const occasion = document.getElementById('fieldOccasion').value;
    const otherOccasion = document.getElementById('fieldOtherOccasion').value.trim();
    const storyCore = document.getElementById('fieldStoryCore').value.trim();
    const description = document.getElementById('fieldDescription').value.trim();
    const contact = document.getElementById('fieldContact').value.trim();
    const urgent = document.getElementById('fieldUrgent').checked;
    const dash = t('dash');
    const basePrice = tier ? parseInt(tier.price, 10) : 0;
    const totalPrice = basePrice + (urgent ? 25 : 0);

    let lines = [];
    lines.push(t('msg_header') + (currentMode === 'certificate' ? ' — ' + t('mode_certificate') : ''));
    lines.push('—');
    if(weddingPackage){
      lines.push(t('msg_order_type') + ': ' + t('wedding_order_type_value'));
      lines.push(t('msg_package') + ': ' + weddingPackage.name);
    } else {
      lines.push(t('msg_package')+': ' + (tier ? tier.name+' ($'+tier.price+')' : dash));
    }
    if(urgent) lines.push(t('msg_urgent') + ' (+$25)');
    if(!weddingPackage) lines.push(t('summary_total') + ' $' + (tier ? totalPrice : 0));
    lines.push(t('msg_style')+': ' + (styleLabels.length ? styleLabels.join(', ') : dash));
    lines.push(t('msg_name')+': ' + (name || dash));

    if(currentMode === 'certificate'){
      lines.push('');
      lines.push(t('msg_certificate_note'));
    } else {
      lines.push(t('msg_occasion')+': ' + (occasion || dash));
      if(otherOccasion) lines.push(t('label_other_occasion')+': ' + otherOccasion);
      if(storyCore) lines.push(t('story_core_title')+' ' + storyCore);
      lines.push('');
      lines.push(t('msg_description')+':');
      lines.push(description || dash);

      QUESTIONS[currentLang].forEach((q, i)=>{
        const ta = document.getElementById('goldenQ'+i);
        const val = ta ? ta.value.trim() : '';
        if(val){
          lines.push('');
          lines.push(q);
          lines.push(val);
        }
      });
    }

    lines.push('');
    lines.push(t('msg_contact')+': ' + (contact || dash));

    const message = lines.join('\n');
    document.getElementById('previewText').textContent = message;
    document.getElementById('orderPreview').classList.add('visible');

    document.getElementById('waLink').href = 'https://wa.me/00000000000?text=' + encodeURIComponent(message);
    document.getElementById('tgLink').href = 'https://t.me/tunewrap?text=' + encodeURIComponent(message);

    document.getElementById('orderPreview').scrollIntoView({behavior:'smooth', block:'nearest'});
  });

  document.getElementById('btnCopy').addEventListener('click', function(){
    const text = document.getElementById('previewText').textContent;
    navigator.clipboard.writeText(text).then(()=>{
      const note = document.getElementById('copiedNote');
      note.classList.add('show');
      setTimeout(()=> note.classList.remove('show'), 1800);
    });
  });

  applyLang('ru');
})();



document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.story-ribbon-card[data-start-track]').forEach(card => {
    card.addEventListener('click', event => {
      event.preventDefault();
      const target = document.querySelector(card.getAttribute('href'));
      const track = card.dataset.startTrack;
      if (!target || !track) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      window.setTimeout(() => {
        const button = document.querySelector('.play-btn[data-track="' + track + '"]');
        const audio = document.getElementById('audio-' + track);
        if (!button || !audio) return;

        if (audio.paused) button.click();
      }, 650);
    });
  });
});

// ---------- Stage 8: stable cover loading ----------
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.story-ribbon-card img, .story-cover, .author-cover').forEach(image => {
    image.decoding = 'async';
    const reveal = () => image.classList.add('is-loaded');
    if(image.complete){
      reveal();
    } else {
      image.addEventListener('load',reveal,{once:true});
      image.addEventListener('error',reveal,{once:true});
    }
  });
});

// ---------- Stage 8.7: one catalog-wide playback queue ----------
function buildGlobalPlaybackQueue(items){
  const languageOrder = ['GE','UA','EN','DE','RU'];
  const libraryItems = items.filter(item =>
    item.card.classList.contains('track') && item.card.dataset.songLanguage
  );
  const authorItems = items.filter(item => item.card.classList.contains('author-card'));
  const knownLanguages = new Set(languageOrder);
  const orderedLibrary = languageOrder.flatMap(language =>
    libraryItems.filter(item => item.card.dataset.songLanguage === language)
  );
  const futureLibraryItems = libraryItems.filter(item =>
    !knownLanguages.has(item.card.dataset.songLanguage)
  );
  const catalogItems = new Set([...libraryItems,...authorItems]);
  const otherItems = items.filter(item => !catalogItems.has(item));
  return [...orderedLibrary,...futureLibraryItems,...authorItems,...otherItems];
}

// ---------- mobile app player, menu and bottom navigation ----------
document.addEventListener('DOMContentLoaded', () => {
  const mobileTrackItems = Array.from(document.querySelectorAll('.play-btn[data-track]'))
    .map(button => {
      const name = button.dataset.track;
      const card = button.closest('.track, .author-card');
      return name && card ? {name,card} : null;
    })
    .filter(Boolean);
  const uniqueMobileTrackItems = Array.from(
    new Map(mobileTrackItems.map(item => [item.name,item])).values()
  );
  const trackOrder = buildGlobalPlaybackQueue(uniqueMobileTrackItems)
    .map(item => item.name);
  const player = document.getElementById('mobilePlayer');
  const titleEl = document.getElementById('mobilePlayerTitle');
  const artistEl = document.getElementById('mobilePlayerArtist');
  const coverWrap = document.getElementById('mobilePlayerCoverWrap');
  const coverEl = document.getElementById('mobilePlayerCover');
  const progressEl = document.getElementById('mobilePlayerProgress');
  const playControl = document.getElementById('mobilePlay');
  const prevControl = document.getElementById('mobilePrev');
  const nextControl = document.getElementById('mobileNext');
  let currentTrack = 'days127';

  if(!player || !titleEl || !artistEl || !coverWrap || !coverEl || !progressEl || !playControl) return;

  function getCard(name){
    const button = document.querySelector('.play-btn[data-track="' + name + '"]');
    return button ? button.closest('.track, .author-card') : null;
  }

  function updateMobileTrack(name){
    const card = getCard(name);
    if(!card) return;
    currentTrack = name;

    const title = card.querySelector('.track-title');
    const cover = card.querySelector('.story-cover, .author-cover');
    const category = card.querySelector('.story-meta span');
    titleEl.textContent = title ? title.textContent.trim() : 'TuneWrap';

    if(card.classList.contains('author-card')){
      artistEl.removeAttribute('data-i18n');
      artistEl.textContent = 'Kosta Trufakin';
    } else {
      artistEl.removeAttribute('data-i18n');
      artistEl.textContent = category ? category.textContent.trim() : 'TuneWrap';
    }

    if(cover){
      coverEl.src = cover.getAttribute('src');
      coverEl.alt = '';
      coverWrap.classList.remove('is-wave');
    } else {
      coverEl.removeAttribute('src');
      coverEl.alt = '';
      coverWrap.classList.add('is-wave');
    }
  }

  function toggleCurrent(){
    const button = document.querySelector('.play-btn[data-track="' + currentTrack + '"]');
    if(button) button.click();
  }

  function stepTrack(direction){
    const index = Math.max(0, trackOrder.indexOf(currentTrack));
    const nextIndex = (index + direction + trackOrder.length) % trackOrder.length;
    const name = trackOrder[nextIndex];
    const audio = document.getElementById('audio-' + name);
    const button = document.querySelector('.play-btn[data-track="' + name + '"]');
    updateMobileTrack(name);
    progressEl.style.width = '0%';
    if(audio && button && audio.paused) button.click();
  }

  playControl.addEventListener('click', toggleCurrent);
  prevControl.addEventListener('click', () => stepTrack(-1));
  nextControl.addEventListener('click', () => stepTrack(1));

  trackOrder.forEach(name => {
    const audio = document.getElementById('audio-' + name);
    const timeEl = document.querySelector('[data-time="' + name + '"]');
    if(!audio) return;

    audio.addEventListener('loadedmetadata', () => {
      if(!timeEl || !Number.isFinite(audio.duration)) return;
      const minutes = Math.floor(audio.duration / 60);
      const seconds = String(Math.floor(audio.duration % 60)).padStart(2,'0');
      if(!timeEl.textContent.includes('/')){
        timeEl.textContent = '0:00 / ' + minutes + ':' + seconds;
      }
    });

    audio.addEventListener('play', () => {
      updateMobileTrack(name);
      playControl.classList.add('playing');
      playControl.setAttribute('aria-label','Пауза');
    });

    audio.addEventListener('pause', () => {
      if(name !== currentTrack) return;
      playControl.classList.remove('playing');
      playControl.setAttribute('aria-label','Воспроизвести');
    });

    audio.addEventListener('timeupdate', () => {
      if(name !== currentTrack) return;
      const ratio = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      progressEl.style.width = Math.max(0, Math.min(100, ratio)) + '%';
    });

    audio.addEventListener('ended', () => {
      if(name !== currentTrack) return;
      progressEl.style.width = '0%';
      playControl.classList.remove('playing');
    });
  });

  document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      const menu = link.closest('details');
      if(menu) menu.removeAttribute('open');
    });
  });

  document.querySelectorAll('.mobile-lang .lang-btn').forEach(button => {
    button.addEventListener('click', () => {
      const menu = button.closest('details');
      if(menu) menu.removeAttribute('open');
      window.setTimeout(() => updateMobileTrack(currentTrack), 0);
    });
  });
  document.addEventListener('tunewrap:languagechange',() => {
    updateMobileTrack(currentTrack);
  });

  const bottomLinks = Array.from(document.querySelectorAll('.mobile-bottom-nav a[data-mobile-section]'));
  function setActiveBottomLink(sectionId){
    bottomLinks.forEach(link => {
      const isActive = link.dataset.mobileSection === sectionId;
      link.classList.toggle('active', isActive);
      if(isActive){
        link.setAttribute('aria-current','page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  bottomLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const sectionId = link.dataset.mobileSection;
      const target = sectionId === 'top'
        ? document.querySelector('.hero')
        : document.getElementById(sectionId);
      if(!target) return;

      setActiveBottomLink(sectionId);
      if(sectionId === 'top'){
        window.scrollTo({top:0, behavior:'smooth'});
      } else {
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });
  setActiveBottomLink('hero');

  if('IntersectionObserver' in window){
    const observedSections = bottomLinks.map(link => ({
      id:link.dataset.mobileSection,
      element:link.dataset.mobileSection === 'top'
        ? document.querySelector('.hero')
        : document.getElementById(link.dataset.mobileSection)
    })).filter(item => item.element);
    const sectionIds = new Map(observedSections.map(item => [item.element,item.id]));
    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if(!visible) return;
      setActiveBottomLink(sectionIds.get(visible.target));
    }, {rootMargin:'-22% 0px -56% 0px', threshold:[0,.2,.45]});
    observedSections.forEach(item => sectionObserver.observe(item.element));
  }

  updateMobileTrack(currentTrack);
});

// ---------- Stage 7: full screen song player ----------
document.addEventListener('DOMContentLoaded', () => {
  const screen = document.getElementById('songPlayerScreen');
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
  const toggle = document.getElementById('songPlayerToggle');
  const previousButton = document.getElementById('songPlayerPrevious');
  const nextButton = document.getElementById('songPlayerNext');
  const seek = document.getElementById('songPlayerSeek');
  const currentTime = document.getElementById('songPlayerCurrentTime');
  const duration = document.getElementById('songPlayerDuration');
  const lyrics = document.getElementById('songPlayerLyrics');
  const translation = document.getElementById('songPlayerTranslation');
  const translationBlock = document.getElementById('songPlayerTranslationBlock');
  const orderButton = document.getElementById('songPlayerOrder');
  const appScroll = document.getElementById('appScroll');
  const bottomNav = document.querySelector('.mobile-bottom-nav');
  const playerScroll = screen ? screen.querySelector('.song-player-scroll') : null;
  const miniPlayer = document.getElementById('topMiniPlayer');
  const miniExpand = document.getElementById('topMiniExpand');
  const miniTitle = document.getElementById('topMiniTitle');
  const miniPrevious = document.getElementById('topMiniPrevious');
  const miniToggle = document.getElementById('topMiniToggle');
  const miniNext = document.getElementById('topMiniNext');
  const miniStop = document.getElementById('topMiniStop');
  const mobileViewport = window.matchMedia('(max-width:620px)');

  if(
    !screen || !backButton || !minimizeButton || !coverWrap || !cover ||
    !title || !description || !languageLabel || !descriptionToggle ||
    !descriptionSheet || !descriptionCollapse || !descriptionFull ||
    !toggle || !previousButton || !nextButton ||
    !seek || !currentTime || !duration || !lyrics || !translation ||
    !translationBlock || !orderButton || !playerScroll || !miniPlayer ||
    !miniExpand || !miniTitle || !miniPrevious || !miniToggle || !miniNext ||
    !miniStop
  ) return;

  const UI = {
    ru:{
      back:'Назад',
      minimize:'Свернуть',
      lyrics:'Текст песни',
      translation:'Перевод',
      order:'Заказать похожую историю',
      play:'Воспроизвести',
      pause:'Пауза',
      previous:'Предыдущий трек',
      next:'Следующий трек',
      expand:'Развернуть плеер',
      stop:'Остановить музыку',
      seek:'Перемотка песни',
      showFull:'Показать полностью',
      fullDescription:'Описание песни',
      collapse:'Свернуть',
      empty:'Текст песни пока не добавлен в проект.'
    },
    uk:{
      back:'Назад',
      minimize:'Згорнути',
      lyrics:'Текст пісні',
      translation:'Переклад',
      order:'Замовити схожу історію',
      play:'Відтворити',
      pause:'Пауза',
      previous:'Попередній трек',
      next:'Наступний трек',
      expand:'Розгорнути плеєр',
      stop:'Зупинити музику',
      seek:'Перемотування пісні',
      showFull:'Показати повністю',
      fullDescription:'Опис пісні',
      collapse:'Згорнути',
      empty:'Текст пісні поки не додано до проєкту.'
    },
    ka:{
      back:'უკან',
      minimize:'ჩაკეცვა',
      lyrics:'სიმღერის ტექსტი',
      translation:'თარგმანი',
      order:'მსგავსი ისტორიის შეკვეთა',
      play:'დაკვრა',
      pause:'პაუზა',
      previous:'წინა სიმღერა',
      next:'შემდეგი სიმღერა',
      expand:'პლეერის გაშლა',
      stop:'მუსიკის შეჩერება',
      seek:'სიმღერის გადახვევა',
      showFull:'სრულად ჩვენება',
      fullDescription:'სიმღერის აღწერა',
      collapse:'ჩაკეცვა',
      empty:'სიმღერის ტექსტი პროექტში ჯერ არ არის დამატებული.'
    },
    en:{
      back:'Back',
      minimize:'Minimize',
      lyrics:'Lyrics',
      translation:'Translation',
      order:'Order a similar story',
      play:'Play',
      pause:'Pause',
      previous:'Previous track',
      next:'Next track',
      expand:'Expand player',
      stop:'Stop music',
      seek:'Seek through song',
      showFull:'Show more',
      fullDescription:'Song description',
      collapse:'Collapse',
      empty:'The lyrics have not been added to the project yet.'
    },
    de:{
      back:'Zurück',
      minimize:'Minimieren',
      lyrics:'Songtext',
      translation:'Übersetzung',
      order:'Eine ähnliche Geschichte bestellen',
      play:'Abspielen',
      pause:'Pause',
      previous:'Vorheriger Titel',
      next:'Nächster Titel',
      expand:'Player öffnen',
      stop:'Musik stoppen',
      seek:'Im Song spulen',
      showFull:'Vollständig anzeigen',
      fullDescription:'Songbeschreibung',
      collapse:'Einklappen',
      empty:'Der Songtext wurde dem Projekt noch nicht hinzugefügt.'
    }
  };

  let activeCard = null;
  let activeAudio = null;
  let activeButton = null;
  let restoreFocus = null;
  let suppressCardOpen = false;
  let isSeeking = false;
  let seekCommitted = false;
  let pendingSeekTime = null;
  let seekOperationId = 0;
  let seekResumePlayback = false;
  let isSwitching = false;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeAllowed = false;
  let descriptionMeasureFrame = 0;
  const portableMediaSources = new Map();
  const originalMediaSources = new Map();
  const fallbackAudioVolumes = new WeakMap();
  const audioTransitions = window.__tuneWrapAudioTransitions;

  const trackItems = Array.from(document.querySelectorAll('.track, .author-card'))
    .map(card => {
      const button = card.querySelector('.play-btn[data-track]');
      const name = button ? button.dataset.track : '';
      const audio = name ? document.getElementById('audio-' + name) : null;
      return name && audio ? {name,card,button,audio} : null;
    })
    .filter(Boolean);
  const tracksByName = new Map(trackItems.map(item => [item.name,item]));
  const globalPlaybackQueue = buildGlobalPlaybackQueue(trackItems);
  const authorTrackLanguages = {
    amsterdam:'RU',
    mychoice:'UA',
    tbilisiua:'UA',
    tbilisige:'GE',
    goodvibe:'EN',
    pulse:'EN',
    amsterdamen:'EN',
    mychoiceen:'EN',
    yayaya:'EN',
    iwant:'UA',
    yayayaalt:'EN',
    dayspass:'UA',
    ashes:'UA',
    newflight:'UA',
    noretreat:'UA',
    '53':'EE / EN'
  };
  trackItems.forEach(({audio}) => {
    const source = audio.getAttribute('src');
    if(source) originalMediaSources.set(audio,new URL(source,document.baseURI).href);
  });

  function playbackQueue(){
    if(globalPlaybackQueue.length) return globalPlaybackQueue;
    const currentName = activeAudio ? activeAudio.id.replace(/^audio-/,'') : '';
    const currentItem = tracksByName.get(currentName);
    return currentItem ? [currentItem] : [];
  }

  function language(){
    const lang = document.documentElement.getAttribute('lang') || 'ru';
    return UI[lang] ? lang : 'ru';
  }

  function ui(){
    return UI[language()];
  }

  function formatTime(value){
    const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2,'0');
  }

  function mediaDuration(audio){
    if(!audio) return 0;
    if(Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    if(audio.seekable && audio.seekable.length){
      const end = audio.seekable.end(audio.seekable.length - 1);
      if(Number.isFinite(end) && end > 0) return end;
    }
    return 0;
  }

  function canSeekTo(audio,time){
    if(!audio || !Number.isFinite(time)) return false;
    if(time <= 0) return true;
    const tolerance = .35;
    for(let index = 0; index < audio.seekable.length; index += 1){
      const start = audio.seekable.start(index) - tolerance;
      const end = audio.seekable.end(index) + tolerance;
      if(time >= start && time <= end) return true;
    }
    return false;
  }

  function waitForMediaReady(audio){
    return new Promise((resolve,reject) => {
      let timer = 0;
      const cleanup = () => {
        window.clearTimeout(timer);
        audio.removeEventListener('loadedmetadata',onReady);
        audio.removeEventListener('error',onError);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Audio source could not be loaded'));
      };
      timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Audio metadata timed out'));
      },12000);
      audio.addEventListener('loadedmetadata',onReady,{once:true});
      audio.addEventListener('error',onError,{once:true});
    });
  }

  function portableSourceFor(audio){
    const existing = portableMediaSources.get(audio);
    if(existing) return existing.promise;

    const source = originalMediaSources.get(audio);
    const record = {url:'',promise:null};
    record.promise = fetch(source,{cache:'force-cache'})
      .then(response => {
        if(!response.ok) throw new Error('Audio request failed');
        return response.blob();
      })
      .then(blob => {
        if(!blob.size) throw new Error('Audio response was empty');
        record.url = URL.createObjectURL(
          blob.type ? blob : new Blob([blob],{type:'audio/mpeg'})
        );
        if(portableMediaSources.get(audio) !== record){
          URL.revokeObjectURL(record.url);
          record.url = '';
          throw new Error('Audio source is no longer active');
        }
        return record.url;
      })
      .catch(error => {
        portableMediaSources.delete(audio);
        throw error;
      });
    portableMediaSources.set(audio,record);
    return record.promise;
  }

  function releasePortableSource(audio){
    const record = portableMediaSources.get(audio);
    if(!record) return;
    const originalSource = originalMediaSources.get(audio);
    if(record.url && audio.currentSrc === record.url && originalSource){
      audio.pause();
      audio.src = originalSource;
      audio.preload = 'none';
      audio.load();
    }
    if(record.url) URL.revokeObjectURL(record.url);
    portableMediaSources.delete(audio);
    resetAudioGain(audio);
  }

  async function rampFallbackVolume(audio,target,durationMs){
    if(target === 0 && !fallbackAudioVolumes.has(audio)){
      fallbackAudioVolumes.set(audio,audio.volume);
    }
    const baseVolume = fallbackAudioVolumes.get(audio) ?? audio.volume;
    const destination = target === 0 ? 0 : baseVolume;
    const start = audio.volume;
    const steps = Math.max(1,Math.ceil(durationMs / 5));
    for(let step = 1; step <= steps; step += 1){
      audio.volume = start + (destination - start) * (step / steps);
      if(step < steps){
        await new Promise(resolve => window.setTimeout(resolve,5));
      }
    }
    if(target === 1) fallbackAudioVolumes.delete(audio);
  }

  async function rampAudioGain(audio,target,durationMs){
    if(audioTransitions && await audioTransitions.ramp(audio,target,durationMs)) return;
    await rampFallbackVolume(audio,target,durationMs);
  }

  function resetAudioGain(audio){
    if(!audio) return;
    if(audioTransitions && audioTransitions.reset(audio)) return;
    if(fallbackAudioVolumes.has(audio)){
      audio.volume = fallbackAudioVolumes.get(audio);
      fallbackAudioVolumes.delete(audio);
    }
  }

  function waitForConfirmedSeek(audio,targetTime){
    return new Promise((resolve,reject) => {
      let timer = 0;
      const closeEnough = () => {
        const difference = Math.abs(audio.currentTime - targetTime);
        const nearEnd = targetTime >= mediaDuration(audio) - .5 &&
          audio.currentTime >= mediaDuration(audio) - 1;
        return difference <= .75 || nearEnd;
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        audio.removeEventListener('seeked',onSeeked);
        audio.removeEventListener('error',onError);
      };
      const onSeeked = () => {
        if(!closeEnough()) return;
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Audio seek failed'));
      };
      timer = window.setTimeout(() => {
        cleanup();
        if(closeEnough()) resolve();
        else reject(new Error('Audio seek timed out'));
      },1800);
      audio.addEventListener('seeked',onSeeked);
      audio.addEventListener('error',onError,{once:true});
    });
  }

  async function installPortableSource(audio,portableUrl){
    if(audio.currentSrc === portableUrl) return;
    const ready = waitForMediaReady(audio);
    audio.src = portableUrl;
    audio.preload = 'auto';
    audio.load();
    await ready;
  }

  async function performSeekTransition(audio,targetTime,operation,shouldResume){
    let portableUrl = '';
    if(!canSeekTo(audio,targetTime)){
      portableUrl = await portableSourceFor(audio);
    }
    if(operation !== seekOperationId || audio !== activeAudio) return;

    if(shouldResume){
      await rampAudioGain(audio,0,24);
    }
    if(operation !== seekOperationId || audio !== activeAudio) return;

    if(!audio.paused) audio.pause();
    if(portableUrl){
      await installPortableSource(audio,portableUrl);
    }
    if(operation !== seekOperationId || audio !== activeAudio) return;

    const requestedTime = Math.max(0,Math.min(mediaDuration(audio),targetTime));
    const confirmed = waitForConfirmedSeek(audio,requestedTime);
    audio.currentTime = requestedTime;
    currentTime.textContent = formatTime(requestedTime);
    setSeekVisual(requestedTime,mediaDuration(audio));
    await confirmed;
    if(operation !== seekOperationId || audio !== activeAudio) return;

    if(shouldResume){
      const playRequest = audio.play();
      if(playRequest && typeof playRequest.then === 'function'){
        await playRequest;
      }
      if(operation !== seekOperationId || audio !== activeAudio) return;
      await rampAudioGain(audio,1,32);
    } else {
      resetAudioGain(audio);
    }
    completeSeeking(operation);
  }

  async function recoverSeekTransition(audio,operation,shouldResume){
    if(operation !== seekOperationId || audio !== activeAudio) return;
    if(shouldResume && audio.paused){
      try{
        const playRequest = audio.play();
        if(playRequest && typeof playRequest.then === 'function'){
          await playRequest;
        }
      } catch(error){}
    }
    await rampAudioGain(audio,1,24);
    completeSeeking(operation);
  }

  function requestMetadata(audio){
    if(!audio) return;
    audio.preload = 'metadata';
    if(audio.readyState === HTMLMediaElement.HAVE_NOTHING){
      audio.load();
    }
  }

  function songNode(card, attribute){
    if(!card) return null;
    return card.querySelector('[' + attribute + ']');
  }

  function songText(card, attribute){
    const node = songNode(card, attribute);
    if(node) return node.textContent.trim();
    const dataKey = attribute === 'data-song-lyrics' ? 'songLyrics' : 'songTranslation';
    return (card.dataset[dataKey] || '').trim();
  }

  function setSeekVisual(value, max){
    const ratio = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    seek.style.setProperty('--seek-progress', ratio + '%');
  }

  function syncTimeline(){
    if(!activeAudio) return;
    const total = mediaDuration(activeAudio);
    const position = Number.isFinite(activeAudio.currentTime) ? activeAudio.currentTime : 0;
    const displayPosition = isSeeking && pendingSeekTime !== null
      ? pendingSeekTime
      : position;
    seek.max = total || 0;
    seek.disabled = total <= 0;
    if(!isSeeking) seek.value = Math.min(position, total || 0);
    currentTime.textContent = formatTime(displayPosition);
    duration.textContent = formatTime(total);
    setSeekVisual(Number(seek.value) || 0, total);
  }

  function syncPlaybackState(){
    const playing = Boolean(activeAudio && !activeAudio.paused && !activeAudio.ended);
    toggle.classList.toggle('playing', playing);
    toggle.setAttribute('aria-label', playing ? ui().pause : ui().play);
    miniToggle.classList.toggle('playing', playing);
    miniToggle.setAttribute('aria-label', playing ? ui().pause : ui().play);
  }

  function syncMiniTrack(){
    const cardTitle = activeCard ? activeCard.querySelector('.track-title') : null;
    miniTitle.textContent = cardTitle ? cardTitle.textContent.trim() : 'TuneWrap';
  }

  function activeTrackLanguage(){
    if(!activeCard) return '';
    if(activeCard.dataset.songLanguage) return activeCard.dataset.songLanguage;
    const name = activeAudio ? activeAudio.id.replace(/^audio-/,'') : '';
    return authorTrackLanguages[name] || 'TuneWrap';
  }

  function closeDescriptionSheet(restoreToggleFocus = false){
    if(!descriptionSheet.classList.contains('is-open')) return;
    descriptionSheet.classList.remove('is-open');
    descriptionSheet.setAttribute('aria-hidden','true');
    descriptionSheet.setAttribute('inert','');
    descriptionToggle.setAttribute('aria-expanded','false');
    screen.classList.remove('is-description-open');
    if(restoreToggleFocus && !descriptionToggle.hidden){
      window.requestAnimationFrame(() => descriptionToggle.focus({preventScroll:true}));
    }
  }

  function updateDescriptionAvailability(){
    descriptionMeasureFrame = 0;
    const hasText = Boolean(description.textContent.trim());
    description.parentElement.hidden = !hasText;
    const overflows = hasText && description.scrollHeight > description.clientHeight + 1;
    descriptionToggle.hidden = !overflows;
    if(!overflows) closeDescriptionSheet(false);
  }

  function scheduleDescriptionMeasurement(){
    window.cancelAnimationFrame(descriptionMeasureFrame);
    descriptionMeasureFrame = window.requestAnimationFrame(updateDescriptionAvailability);
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
    window.requestAnimationFrame(() => descriptionCollapse.focus({preventScroll:true}));
  }

  function syncLanguage(){
    const labels = ui();
    screen.querySelectorAll('[data-player-i18n]').forEach(element => {
      const key = element.getAttribute('data-player-i18n');
      if(labels[key]) element.textContent = labels[key];
    });
    seek.setAttribute('aria-label', labels.seek);
    previousButton.setAttribute('aria-label', labels.previous);
    nextButton.setAttribute('aria-label', labels.next);
    miniExpand.setAttribute('aria-label', labels.expand);
    miniPrevious.setAttribute('aria-label', labels.previous);
    miniNext.setAttribute('aria-label', labels.next);
    miniStop.setAttribute('aria-label', labels.stop);
    syncPlaybackState();

    if(activeCard){
      const cardTitle = activeCard.querySelector('.track-title');
      const cardDescription = activeCard.querySelector('.track-desc');
      title.textContent = cardTitle ? cardTitle.textContent.trim() : 'TuneWrap';
      description.textContent = cardDescription ? cardDescription.textContent.trim() : '';
      languageLabel.textContent = activeTrackLanguage();
      if(descriptionSheet.classList.contains('is-open')){
        descriptionFull.textContent = description.textContent.trim();
      }
      const lyricText = songText(activeCard,'data-song-lyrics');
      lyrics.textContent = lyricText || labels.empty;
      lyrics.classList.toggle('is-empty', !lyricText);
      const translationText = songText(activeCard,'data-song-translation');
      translation.textContent = translationText;
      translationBlock.hidden = !translationText;
      syncMiniTrack();
      scheduleDescriptionMeasurement();
    }
  }

  function showMiniPlayer(){
    if(!activeAudio || !activeCard || !mobileViewport.matches) return;
    syncMiniTrack();
    syncPlaybackState();
    miniPlayer.classList.add('is-active');
    miniPlayer.setAttribute('aria-hidden','false');
    miniPlayer.removeAttribute('inert');
    document.body.classList.add('mini-player-active');
  }

  function hideMiniPlayer(){
    miniPlayer.classList.remove('is-active');
    miniPlayer.setAttribute('aria-hidden','true');
    miniPlayer.setAttribute('inert','');
    document.body.classList.remove('mini-player-active');
  }

  function setCover(card){
    const image = card ? card.querySelector('.story-cover, .author-cover') : null;
    if(image){
      cover.classList.remove('is-loaded');
      cover.src = image.getAttribute('src');
      cover.alt = title.textContent;
      cover.decoding = 'async';
      if(cover.complete){
        window.requestAnimationFrame(() => cover.classList.add('is-loaded'));
      }
      coverWrap.classList.remove('is-wave');
    } else {
      cover.removeAttribute('src');
      cover.alt = '';
      cover.classList.remove('is-loaded');
      coverWrap.classList.add('is-wave');
    }
  }

  function pauseOtherTracks(selectedAudio){
    document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
      if(audio === selectedAudio) return;
      if(!audio.paused){
        const name = audio.id.replace(/^audio-/,'');
        const button = document.querySelector('.play-btn[data-track="' + name + '"]');
        if(button){
          suppressCardOpen = true;
          button.click();
          suppressCardOpen = false;
        } else {
          audio.pause();
        }
      }
      try{
        audio.currentTime = 0;
      } catch(error){}
    });
  }

  function fillScreen(card, name, resetPosition){
    const item = tracksByName.get(name);
    if(!item || item.card !== card) return false;
    const {audio,button} = item;
    closeDescriptionSheet(false);
    descriptionToggle.hidden = true;

    const previousAudio = activeAudio;
    pauseOtherTracks(audio);
    if(previousAudio && previousAudio !== audio){
      seekOperationId += 1;
      isSeeking = false;
      seekCommitted = false;
      pendingSeekTime = null;
      seekResumePlayback = false;
      resetAudioGain(previousAudio);
      releasePortableSource(previousAudio);
    }
    if(resetPosition){
      try{
        audio.currentTime = 0;
      } catch(error){}
    }
    activeCard = card;
    activeAudio = audio;
    activeButton = button;

    const cardTitle = card.querySelector('.track-title');
    const cardDescription = card.querySelector('.track-desc');
    title.textContent = cardTitle ? cardTitle.textContent.trim() : 'TuneWrap';
    description.textContent = cardDescription ? cardDescription.textContent.trim() : '';
    setCover(card);
    syncLanguage();
    syncTimeline();

    if(audio.paused) requestMetadata(audio);
    return true;
  }

  window.__tuneWrapPlayerBridge = {
    adoptLibraryPlayback(card,origin){
      if(!mobileViewport.matches || !card) return false;
      const button = card.querySelector('.play-btn[data-track]');
      const name = button?.dataset.track || '';
      if(!name || !fillScreen(card,name,false)) return false;
      restoreFocus = origin || card;
      showMiniPlayer();
      syncPlaybackState();
      window.setTimeout(syncPlaybackState,0);
      return true;
    }
  };

  function autoplayActive(){
    if(!activeAudio || !activeButton) return;
    if(!activeAudio.paused){
      syncPlaybackState();
      return;
    }

    suppressCardOpen = true;
    activeButton.click();
    suppressCardOpen = false;
    syncPlaybackState();
    window.setTimeout(syncPlaybackState,0);
  }

  function animateTrack(frames, durationMs){
    const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(
      !screen.classList.contains('is-open') ||
      reducedMotion ||
      typeof playerScroll.animate !== 'function'
    ) return Promise.resolve();
    playerScroll.style.willChange = 'transform, opacity';
    const animation = playerScroll.animate(frames,{
      duration:durationMs,
      easing:'cubic-bezier(.22,.78,.22,1)',
      fill:'both'
    });
    return animation.finished
      .catch(() => {})
      .finally(() => {
        animation.cancel();
        playerScroll.style.willChange = '';
      });
  }

  async function switchTrack(direction){
    if(isSwitching || !activeAudio) return;
    const queue = playbackQueue();
    if(!queue.length) return;
    const currentName = activeAudio.id.replace(/^audio-/,'');
    const currentIndex = queue.findIndex(item => item.name === currentName);
    const nextIndex = currentIndex < 0
      ? (direction > 0 ? 0 : queue.length - 1)
      : (currentIndex + direction + queue.length) % queue.length;
    const nextItem = queue[nextIndex];
    if(!nextItem) return;
    const outgoingAudio = activeAudio;
    const fadeOutgoing = !outgoingAudio.paused && !outgoingAudio.ended;

    isSwitching = true;
    previousButton.disabled = true;
    nextButton.disabled = true;
    miniPrevious.disabled = true;
    miniNext.disabled = true;
    const exitX = direction > 0 ? -24 : 24;

    await animateTrack([
      {opacity:1,transform:'translateX(0)'},
      {opacity:.68,transform:'translateX(' + exitX + 'px)'}
    ],180);

    if(fadeOutgoing && outgoingAudio === activeAudio){
      await rampAudioGain(outgoingAudio,0,24);
    }
    fillScreen(nextItem.card,nextItem.name,true);
    playerScroll.scrollTop = 0;
    autoplayActive();

    await animateTrack([
      {opacity:.68,transform:'translateX(' + (-exitX) + 'px)'},
      {opacity:1,transform:'translateX(0)'}
    ],220);

    previousButton.disabled = false;
    nextButton.disabled = false;
    miniPrevious.disabled = false;
    miniNext.disabled = false;
    isSwitching = false;
  }

  function openPlayer(card, origin, shouldAutoplay = true){
    if(!mobileViewport.matches || suppressCardOpen) return;
    const button = card.querySelector('.play-btn[data-track]');
    const name = button ? button.dataset.track : '';
    const selectedAudio = name ? document.getElementById('audio-' + name) : null;
    const openedFromPlayButton = Boolean(origin && origin.closest('.play-btn'));
    const resetPosition = activeAudio !== selectedAudio && !openedFromPlayButton;
    if(!name || !fillScreen(card,name,resetPosition)) return;

    restoreFocus = origin || card;
    screen.removeAttribute('inert');
    screen.classList.add('is-open');
    screen.setAttribute('aria-hidden','false');
    document.body.classList.add('song-player-open');
    if(appScroll) appScroll.setAttribute('inert','');
    if(bottomNav) bottomNav.setAttribute('inert','');
    miniPlayer.setAttribute('inert','');
    window.requestAnimationFrame(() => backButton.focus({preventScroll:true}));
    scheduleDescriptionMeasurement();
    if(shouldAutoplay) autoplayActive();
  }

  function closePlayer(showMini = true){
    if(!screen.classList.contains('is-open')) return;
    closeDescriptionSheet(false);
    screen.classList.remove('is-open');
    screen.setAttribute('aria-hidden','true');
    screen.setAttribute('inert','');
    document.body.classList.remove('song-player-open');
    if(appScroll) appScroll.removeAttribute('inert');
    if(bottomNav) bottomNav.removeAttribute('inert');
    miniPlayer.removeAttribute('inert');
    if(showMini){
      showMiniPlayer();
    } else {
      hideMiniPlayer();
    }

    if(restoreFocus && typeof restoreFocus.focus === 'function'){
      window.requestAnimationFrame(() => restoreFocus.focus({preventScroll:true}));
    }
  }

  function stopPlayback(){
    document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
      const name = audio.id.replace(/^audio-/,'');
      const button = document.querySelector('.play-btn[data-track="' + name + '"]');
      if(button && !audio.paused){
        suppressCardOpen = true;
        button.click();
        suppressCardOpen = false;
      } else if(!audio.paused){
        audio.pause();
      }
      if(button) button.classList.remove('playing');
      try{
        audio.currentTime = 0;
      } catch(error){}
    });

    activeCard = null;
    activeAudio = null;
    activeButton = null;
    seek.value = 0;
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
    setSeekVisual(0,0);
    syncPlaybackState();
    miniTitle.textContent = 'TuneWrap';
    hideMiniPlayer();
    portableMediaSources.forEach((record,audio) => releasePortableSource(audio));
  }

  trackItems.forEach(({card}) => {
    card.setAttribute('tabindex','0');

    card.addEventListener('click', event => {
      if(suppressCardOpen) return;
      const playButton = event.target.closest('.play-btn');
      openPlayer(card,playButton || card,!playButton);
    });

    card.addEventListener('keydown', event => {
      if(event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      openPlayer(card,card);
    });
  });

  function toggleActivePlayback(){
    if(!activeButton) return;
    suppressCardOpen = true;
    activeButton.click();
    suppressCardOpen = false;
    syncPlaybackState();
  }

  backButton.addEventListener('click',() => closePlayer(true));
  minimizeButton.addEventListener('click',() => closePlayer(true));
  previousButton.addEventListener('click',() => switchTrack(-1));
  nextButton.addEventListener('click',() => switchTrack(1));
  toggle.addEventListener('click',toggleActivePlayback);
  descriptionToggle.addEventListener('click',openDescriptionSheet);
  descriptionCollapse.addEventListener('click',() => closeDescriptionSheet(true));

  miniPrevious.addEventListener('click',() => switchTrack(-1));
  miniToggle.addEventListener('click',toggleActivePlayback);
  miniNext.addEventListener('click',() => switchTrack(1));
  miniStop.addEventListener('click',stopPlayback);

  miniPlayer.addEventListener('click', event => {
    if(event.target.closest('.top-mini-controls, .top-mini-stop')) return;
    if(activeCard) openPlayer(activeCard,miniExpand,false);
  });

  cover.addEventListener('load', () => cover.classList.add('is-loaded'));
  cover.addEventListener('error', () => cover.classList.add('is-loaded'));

  playerScroll.addEventListener('pointerdown', event => {
    const interactive = event.target.closest('button,a,input,select,textarea,[contenteditable="true"]');
    const pointerIsMouse = event.pointerType === 'mouse';
    swipeAllowed = Boolean(
      screen.classList.contains('is-open') &&
      !isSwitching &&
      !interactive &&
      !pointerIsMouse
    );
    if(!swipeAllowed) return;
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
  });

  playerScroll.addEventListener('pointerup', event => {
    if(!swipeAllowed) return;
    swipeAllowed = false;
    const deltaX = event.clientX - swipeStartX;
    const deltaY = event.clientY - swipeStartY;
    const horizontal = Math.abs(deltaX) >= 60 && Math.abs(deltaX) > Math.abs(deltaY);
    if(horizontal) switchTrack(deltaX < 0 ? 1 : -1);
  });

  playerScroll.addEventListener('pointercancel',() => {
    swipeAllowed = false;
  });

  function beginSeeking(event){
    const startsGesture = !isSeeking ||
      event?.type === 'pointerdown' ||
      event?.type === 'touchstart' ||
      event?.type === 'mousedown';
    if(startsGesture){
      if(!isSeeking){
        seekResumePlayback = Boolean(activeAudio && !activeAudio.paused && !activeAudio.ended);
      }
      seekOperationId += 1;
    }
    isSeeking = true;
    seekCommitted = false;
    pendingSeekTime = Number(seek.value) || 0;
    if(event && event.pointerId !== undefined && typeof seek.setPointerCapture === 'function'){
      try{
        seek.setPointerCapture(event.pointerId);
      } catch(error){}
    }
    const point = event?.touches?.[0] || event;
    if(Number.isFinite(point?.clientX)) updateSeekFromClientX(point.clientX);
  }

  function previewSeek(){
    if(!activeAudio) return;
    const total = mediaDuration(activeAudio);
    if(!total){
      requestMetadata(activeAudio);
      return;
    }
    if(!isSeeking) beginSeeking();
    pendingSeekTime = Math.max(0,Math.min(total,Number(seek.value) || 0));
    currentTime.textContent = formatTime(pendingSeekTime);
    setSeekVisual(pendingSeekTime,total);
  }

  function updateSeekFromClientX(clientX){
    if(!activeAudio) return;
    const total = mediaDuration(activeAudio);
    const bounds = seek.getBoundingClientRect();
    if(!total || bounds.width <= 0) return;
    const ratio = Math.max(0,Math.min(1,(clientX - bounds.left) / bounds.width));
    seek.value = ratio * total;
    previewSeek();
  }

  function moveSeeking(event){
    if(!isSeeking) return;
    const point = event?.touches?.[0] || event;
    if(Number.isFinite(point?.clientX)) updateSeekFromClientX(point.clientX);
  }

  function completeSeeking(operation = seekOperationId){
    if(operation !== seekOperationId) return;
    isSeeking = false;
    seekCommitted = false;
    pendingSeekTime = null;
    seekResumePlayback = false;
    syncTimeline();
  }

  function commitSeeking(){
    if(!activeAudio || !isSeeking || seekCommitted) return;
    const total = mediaDuration(activeAudio);
    if(!total){
      requestMetadata(activeAudio);
      return;
    }
    const nextTime = Math.max(0,Math.min(
      total,
      pendingSeekTime === null ? Number(seek.value) || 0 : pendingSeekTime
    ));
    seekCommitted = true;
    pendingSeekTime = nextTime;
    if(Math.abs(activeAudio.currentTime - nextTime) <= .2){
      completeSeeking(seekOperationId);
      return;
    }
    const audio = activeAudio;
    const operation = seekOperationId;
    const shouldResume = seekResumePlayback;
    performSeekTransition(audio,nextTime,operation,shouldResume)
      .catch(() => recoverSeekTransition(audio,operation,shouldResume));
  }

  function releaseSeeking(){
    if(!isSeeking) return;
    previewSeek();
    commitSeeking();
  }

  seek.addEventListener('input',previewSeek);
  seek.addEventListener('change',releaseSeeking);
  if('PointerEvent' in window){
    seek.addEventListener('pointerdown',beginSeeking);
    seek.addEventListener('pointermove',moveSeeking);
    seek.addEventListener('pointerup',releaseSeeking);
    seek.addEventListener('pointercancel',releaseSeeking);
    document.addEventListener('pointerup',() => {
      if(isSeeking) releaseSeeking();
    },{capture:true});
  } else {
    let lastTouchAt = 0;
    seek.addEventListener('touchstart',event => {
      lastTouchAt = Date.now();
      beginSeeking(event);
    },{passive:true});
    seek.addEventListener('touchmove',moveSeeking,{passive:true});
    seek.addEventListener('touchend',releaseSeeking,{passive:true});
    seek.addEventListener('touchcancel',releaseSeeking,{passive:true});
    seek.addEventListener('mousedown',event => {
      if(Date.now() - lastTouchAt < 700) return;
      beginSeeking(event);
    });
    document.addEventListener('mousemove',event => {
      if(Date.now() - lastTouchAt < 700) return;
      moveSeeking(event);
    },{capture:true});
    document.addEventListener('mouseup',event => {
      if(Date.now() - lastTouchAt < 700) return;
      releaseSeeking(event);
    },{capture:true});
  }

  document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
    audio.addEventListener('loadedmetadata', () => {
      if(audio === activeAudio) syncTimeline();
    });
    audio.addEventListener('durationchange', () => {
      if(audio === activeAudio) syncTimeline();
    });
    audio.addEventListener('canplay', () => {
      if(audio === activeAudio) syncTimeline();
    });
    audio.addEventListener('progress', () => {
      if(audio === activeAudio && !isSeeking) syncTimeline();
    });
    audio.addEventListener('seeked', () => {
      if(audio !== activeAudio) return;
      if(isSeeking) return;
      syncTimeline();
    });
    audio.addEventListener('timeupdate', () => {
      if(audio === activeAudio && !isSeeking) syncTimeline();
    });
    audio.addEventListener('play', () => {
      if(audio === activeAudio) syncPlaybackState();
    });
    audio.addEventListener('pause', () => {
      if(audio === activeAudio) syncPlaybackState();
    });
    audio.addEventListener('tunewrap:playblocked', () => {
      if(audio === activeAudio) syncPlaybackState();
    });
    audio.addEventListener('ended', () => {
      if(audio !== activeAudio) return;
      audio.currentTime = 0;
      seek.value = 0;
      isSeeking = false;
      syncTimeline();
      syncPlaybackState();
      switchTrack(1);
    });
  });

  window.addEventListener('pagehide',() => {
    portableMediaSources.forEach(record => {
      if(record.url) URL.revokeObjectURL(record.url);
    });
    portableMediaSources.clear();
  },{once:true});

  orderButton.addEventListener('click', event => {
    event.preventDefault();
    const contact = document.getElementById('contact');
    closePlayer();
    if(contact){
      window.setTimeout(() => contact.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }
  });

  document.addEventListener('keydown', event => {
    if(!screen.classList.contains('is-open')) return;
    if(event.key === 'Escape'){
      if(descriptionSheet.classList.contains('is-open')){
        closeDescriptionSheet(true);
        return;
      }
      closePlayer();
    } else if(event.key === 'ArrowLeft' && event.target !== seek){
      switchTrack(-1);
    } else if(event.key === 'ArrowRight' && event.target !== seek){
      switchTrack(1);
    }
  });

  document.querySelectorAll('.lang-btn').forEach(button => {
    button.addEventListener('click', () => window.setTimeout(syncLanguage,0));
  });

  if('ResizeObserver' in window){
    const descriptionObserver = new ResizeObserver(scheduleDescriptionMeasurement);
    descriptionObserver.observe(description);
  } else {
    window.addEventListener('resize',scheduleDescriptionMeasurement,{passive:true});
  }

  if(typeof mobileViewport.addEventListener === 'function'){
    mobileViewport.addEventListener('change', event => {
      if(!event.matches){
        closePlayer(false);
        hideMiniPlayer();
      } else if(activeAudio && !screen.classList.contains('is-open')){
        showMiniPlayer();
      }
    });
  }

  hideMiniPlayer();
  screen.setAttribute('inert','');
  syncLanguage();
});

// ---------- Stage 8: stable mobile form focus ----------
document.addEventListener('DOMContentLoaded', () => {
  const mobileViewport = window.matchMedia('(max-width:620px)');
  const contact = document.getElementById('contact');
  if(!contact) return;

  const fieldSelector = 'input, select, textarea, button';
  let focusTimer = 0;

  contact.addEventListener('focusin', event => {
    if(!mobileViewport.matches || !event.target.matches(fieldSelector)) return;
    window.clearTimeout(focusTimer);
    document.body.classList.add('form-input-active');

    if(!event.target.matches('input, select, textarea')) return;
    focusTimer = window.setTimeout(() => {
      if(document.activeElement !== event.target) return;
      const behavior = window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth';
      event.target.scrollIntoView({behavior,block:'center',inline:'nearest'});
    },180);
  });

  contact.addEventListener('focusout', () => {
    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => {
      if(!contact.contains(document.activeElement)){
        document.body.classList.remove('form-input-active');
      }
    },80);
  });
});

// ---------- Stage 8.1: scalable Songs language shelf ----------
document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('tracks');
  if(section?.dataset.libraryArchitecture === 'fullscreen') return;
  const filterRoot = section ? section.querySelector('[data-songs-filter-root]') : null;
  const rail = filterRoot ? filterRoot.querySelector('[data-filter-level="language"]') : null;
  const stage = document.getElementById('songsLibraryPanel');
  const list = stage ? stage.querySelector('.tracks') : null;
  const empty = document.getElementById('songsLibraryEmpty');
  const activeLanguageLabel = document.getElementById('songsLibraryLanguage');
  const visibleCountLabel = document.getElementById('songsLibraryCount');
  const emptyTitle = document.getElementById('songsLibraryEmptyTitle');
  const emptyText = document.getElementById('songsLibraryEmptyText');

  if(
    !section || !filterRoot || !rail || !stage || !list || !empty ||
    !activeLanguageLabel || !visibleCountLabel || !emptyTitle || !emptyText
  ) return;

  const languageMap = {ka:'GE',uk:'UA',en:'EN',de:'DE',ru:'RU'};
  const languageNames = {
    GE:'ქართული',
    UA:'Українська',
    EN:'English',
    DE:'Deutsch',
    RU:'Русский'
  };
  const copy = {
    ru:{
      rail:'Язык песен',
      emptyTitle:'Песни скоро появятся',
      emptyText:'Библиотека TuneWrap постоянно пополняется новыми музыкальными историями.',
      count:value => value === 1 ? '1 история' : value > 1 && value < 5 ? value + ' истории' : value + ' историй'
    },
    uk:{
      rail:'Мова пісень',
      emptyTitle:'Пісні незабаром з’являться',
      emptyText:'Бібліотека TuneWrap постійно поповнюється новими музичними історіями.',
      count:value => value === 1 ? '1 історія' : value > 1 && value < 5 ? value + ' історії' : value + ' історій'
    },
    ka:{
      rail:'სიმღერების ენა',
      emptyTitle:'სიმღერები მალე გამოჩნდება',
      emptyText:'TuneWrap-ის ბიბლიოთეკა მუდმივად ივსება ახალი მუსიკალური ისტორიებით.',
      count:value => value + ' სიმღერა'
    },
    en:{
      rail:'Song language',
      emptyTitle:'Songs are coming soon',
      emptyText:'The TuneWrap library is always growing with new musical stories.',
      count:value => value === 1 ? '1 story' : value + ' stories'
    },
    de:{
      rail:'Sprache der Songs',
      emptyTitle:'Songs folgen in Kürze',
      emptyText:'Die TuneWrap-Bibliothek wächst ständig um neue musikalische Geschichten.',
      count:value => value === 1 ? '1 Song' : value + ' Songs'
    }
  };
  const tabs = Array.from(rail.querySelectorAll('[data-song-language-filter]'));
  const cards = Array.from(list.querySelectorAll('.track[data-song-language]'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  let activeLanguage = '';
  let switchTimer = 0;
  let scrollCheckFrame = 0;

  function interfaceLanguage(){
    const value = document.documentElement.getAttribute('lang') || 'ru';
    return copy[value] ? value : 'ru';
  }

  function updateCopy(visibleCount){
    const labels = copy[interfaceLanguage()];
    rail.setAttribute('aria-label',labels.rail);
    activeLanguageLabel.textContent = languageNames[activeLanguage] || activeLanguage;
    visibleCountLabel.textContent = labels.count(visibleCount);
    emptyTitle.textContent = labels.emptyTitle;
    emptyText.textContent = labels.emptyText;
  }

  function centerActiveTab(tab, animate){
    if(!tab || typeof rail.scrollTo !== 'function') return;
    const left = Math.max(0,tab.offsetLeft - (rail.clientWidth - tab.offsetWidth) / 2);
    rail.scrollTo({
      left,
      behavior:animate && !reducedMotion.matches ? 'smooth' : 'auto'
    });
  }

  /*
    The Songs list owns vertical gestures only when its content genuinely
    overflows. This keeps the parent screen scroller in control for short and
    empty language views, while preserving an internal list for a large
    catalogue.
  */
  function syncScrollOwnership(){
    window.cancelAnimationFrame(scrollCheckFrame);
    scrollCheckFrame = window.requestAnimationFrame(() => {
      list.classList.remove('is-scrollable');
      const isScrollable = list.scrollHeight > list.clientHeight + 1;
      list.classList.toggle('is-scrollable',isScrollable);
    });
  }

  function commitLanguage(language, animate){
    activeLanguage = language;
    let visibleCount = 0;

    cards.forEach(card => {
      const visible = card.dataset.songLanguage === language;
      card.hidden = !visible;
      if(visible) visibleCount += 1;
    });

    tabs.forEach(tab => {
      const selected = tab.dataset.songLanguageFilter === language;
      tab.classList.toggle('is-active',selected);
      tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    list.scrollTop = 0;
    empty.hidden = visibleCount !== 0;
    stage.classList.toggle('is-empty',visibleCount === 0);
    stage.setAttribute('aria-busy','false');
    updateCopy(visibleCount);
    syncScrollOwnership();

    const activeTab = tabs.find(tab => tab.dataset.songLanguageFilter === language);
    if(activeTab) stage.setAttribute('aria-labelledby',activeTab.id);
    centerActiveTab(activeTab,animate);
    window.requestAnimationFrame(() => stage.classList.remove('is-switching'));
  }

  function selectLanguage(language, options = {}){
    if(!languageNames[language]) return;
    const animate = options.animate !== false && activeLanguage && activeLanguage !== language;
    window.clearTimeout(switchTimer);

    if(language === activeLanguage){
      updateCopy(cards.filter(card => !card.hidden).length);
      return;
    }

    stage.setAttribute('aria-busy','true');
    if(animate && !reducedMotion.matches){
      stage.classList.add('is-switching');
      switchTimer = window.setTimeout(() => commitLanguage(language,true),140);
    } else {
      commitLanguage(language,false);
    }
  }

  tabs.forEach((tab,index) => {
    tab.addEventListener('click',() => {
      selectLanguage(tab.dataset.songLanguageFilter);
    });

    tab.addEventListener('keydown',event => {
      let nextIndex = index;
      if(event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if(event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if(event.key === 'Home') nextIndex = 0;
      else if(event.key === 'End') nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      const nextTab = tabs[nextIndex];
      nextTab.focus({preventScroll:true});
      selectLanguage(nextTab.dataset.songLanguageFilter);
    });
  });

  document.querySelectorAll('.lang-btn[data-lang]').forEach(button => {
    button.addEventListener('click',() => {
      window.setTimeout(() => {
        const language = languageMap[interfaceLanguage()] || 'RU';
        selectLanguage(language);
      },0);
    });
  });

  if('ResizeObserver' in window){
    const scrollOwnershipObserver = new ResizeObserver(syncScrollOwnership);
    scrollOwnershipObserver.observe(stage);
    scrollOwnershipObserver.observe(list);
  } else {
    window.addEventListener('resize',syncScrollOwnership,{passive:true});
  }

  selectLanguage(languageMap[interfaceLanguage()] || 'RU',{animate:false});
});

// ---------- Stage 8.2: mobile story path selection ----------
document.addEventListener('DOMContentLoaded', () => {
  const contact = document.getElementById('contact');
  const picker = document.getElementById('storyPathPicker');
  const form = document.getElementById('storyOrderForm');
  const back = document.getElementById('storyPathBack');
  const corporate = document.getElementById('corporate');
  const corporateClose = document.getElementById('corporatePanelClose');
  const appScroll = document.getElementById('appScroll');
  const bottomNav = document.querySelector('.mobile-bottom-nav');
  const siteHeader = document.querySelector('body > nav');
  const mobileViewport = window.matchMedia('(max-width:620px)');
  let corporateRestoreFocus = null;

  if(!contact || !picker || !form || !back) return;
  if(corporate && corporate.parentElement !== document.body){
    document.body.appendChild(corporate);
  }

  function contactScroll(){
    return contact.querySelector(':scope > .wrap');
  }

  function openForm(mode){
    const modeButton = form.querySelector('.mode-btn[data-mode="' + mode + '"]');
    if(modeButton) modeButton.click();
    contact.classList.add('is-story-path-form');
    const scroll = contactScroll();
    if(scroll) scroll.scrollTop = 0;
    window.requestAnimationFrame(() => back.focus({preventScroll:true}));
  }

  function openCorporate(trigger){
    if(!corporate) return;
    corporateRestoreFocus = trigger || null;
    corporate.removeAttribute('inert');
    corporate.classList.add('is-open');
    corporate.setAttribute('aria-hidden','false');
    document.body.classList.add('corporate-panel-open');
    appScroll?.setAttribute('inert','');
    bottomNav?.setAttribute('inert','');
    siteHeader?.setAttribute('inert','');
    window.requestAnimationFrame(() => corporateClose?.focus({preventScroll:true}));
  }

  function closeCorporate(){
    if(!corporate || !corporate.classList.contains('is-open')) return;
    corporate.classList.remove('is-open');
    corporate.setAttribute('aria-hidden','true');
    corporate.setAttribute('inert','');
    document.body.classList.remove('corporate-panel-open');
    appScroll?.removeAttribute('inert');
    bottomNav?.removeAttribute('inert');
    siteHeader?.removeAttribute('inert');
    if(corporateRestoreFocus && typeof corporateRestoreFocus.focus === 'function'){
      window.requestAnimationFrame(() => corporateRestoreFocus.focus({preventScroll:true}));
    }
  }

  picker.querySelectorAll('[data-story-path]').forEach(button => {
    button.addEventListener('click',() => {
      const path = button.dataset.storyPath;
      if(path === 'corporate'){
        openCorporate(button);
        return;
      }
      openForm(path === 'certificate' ? 'certificate' : 'order');
    });
  });

  back.addEventListener('click',() => {
    contact.classList.remove('is-story-path-form');
    const scroll = contactScroll();
    if(scroll) scroll.scrollTop = 0;
    const firstAction = picker.querySelector('[data-story-path="order"]');
    if(firstAction) window.requestAnimationFrame(() => firstAction.focus({preventScroll:true}));
  });

  corporateClose?.addEventListener('click',closeCorporate);
  document.addEventListener('keydown',event => {
    if(event.key === 'Escape' && corporate?.classList.contains('is-open')){
      closeCorporate();
    }
  });

  if(typeof mobileViewport.addEventListener === 'function'){
    mobileViewport.addEventListener('change',event => {
      if(!event.matches) contact.classList.remove('is-story-path-form');
    });
  }
});

// ---------- Stage 8.9: pricing CTA opens the existing order flow ----------
document.addEventListener('DOMContentLoaded',() => {
  const cta = document.getElementById('pricingOrderCta');
  const contact = document.getElementById('contact');
  const orderEntry = document.querySelector('[data-story-path="order"]');
  if(!cta || !contact || !orderEntry) return;

  cta.addEventListener('click',event => {
    event.preventDefault();
    document.dispatchEvent(new CustomEvent('tunewrap:reset-order-selection'));
    orderEntry.click();
    window.setTimeout(() => {
      contact.scrollIntoView({
        behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
        block:'start'
      });
    },40);
  });
});

// ---------- Stage 8.2: tariff gesture axis arbiter ----------
document.addEventListener('DOMContentLoaded', () => {
  const appScroll = document.getElementById('appScroll');
  const rail = document.querySelector('#pricing .tiers-grid');
  const mobileViewport = window.matchMedia('(max-width:620px)');
  if(!appScroll || !rail) return;

  let gesture = null;

  function finishGesture(event){
    if(!gesture) return;
    const touch = event.changedTouches && event.changedTouches[0];
    const currentX = touch ? touch.clientX : gesture.lastX;
    const currentY = touch ? touch.clientY : gesture.lastY;
    const deltaX = gesture.startX - currentX;
    const deltaY = gesture.startY - currentY;
    const vertical = Math.abs(deltaY) > Math.abs(deltaX);

    if(vertical && Math.abs(deltaY) >= 44){
      const pricingScroll = document.querySelector('#pricing > .wrap');
      const hasInnerScroll = pricingScroll && pricingScroll.scrollHeight > pricingScroll.clientHeight + 2;
      const atTop = !pricingScroll || pricingScroll.scrollTop <= 1;
      const atBottom = !pricingScroll || pricingScroll.scrollTop + pricingScroll.clientHeight >= pricingScroll.scrollHeight - 1;
      const canContinueInside = hasInnerScroll && ((deltaY > 0 && !atBottom) || (deltaY < 0 && !atTop));
      if(!canContinueInside){
        const target = deltaY > 0
          ? document.getElementById('contact')
          : document.getElementById('tracks');
        if(target){
          appScroll.scrollTo({
            top:target.offsetTop,
            behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'
          });
        }
      }
    } else if(Math.abs(deltaX) >= 20){
      const cards = Array.from(rail.querySelectorAll('.tier-card'));
      const nearest = cards
        .map(card => ({card,distance:Math.abs(card.offsetLeft - rail.scrollLeft)}))
        .sort((a,b) => a.distance - b.distance)[0];
      if(nearest) rail.scrollTo({left:nearest.card.offsetLeft,behavior:'smooth'});
    } else {
      const action = gesture.startTarget && gesture.startTarget.closest('.tier-select');
      if(action) action.click();
    }

    gesture = null;
  }

  rail.addEventListener('touchstart',event => {
    if(!mobileViewport.matches || event.touches.length !== 1) return;
    const touch = event.touches[0];
    gesture = {
      startX:touch.clientX,
      startY:touch.clientY,
      startTarget:event.target,
      startScrollLeft:rail.scrollLeft,
      lastX:touch.clientX,
      lastY:touch.clientY
    };
  },{passive:true});

  rail.addEventListener('touchmove',event => {
    if(!gesture || event.touches.length !== 1) return;
    const touch = event.touches[0];
    gesture.lastX = touch.clientX;
    gesture.lastY = touch.clientY;
    const deltaX = gesture.startX - touch.clientX;
    const deltaY = gesture.startY - touch.clientY;
    if(Math.abs(deltaX) >= Math.abs(deltaY)){
      event.preventDefault();
      rail.scrollLeft = gesture.startScrollLeft + deltaX;
    }
  },{passive:false});

  rail.addEventListener('touchend',finishGesture,{passive:true});
  rail.addEventListener('touchcancel',finishGesture,{passive:true});
});

// ---------- Stage 8.2: deterministic one-gesture screen snap ----------
document.addEventListener('DOMContentLoaded', () => {
  const appScroll = document.getElementById('appScroll');
  const mobileViewport = window.matchMedia('(max-width:620px)');
  if(!appScroll) return;

  const screenSelector = '.hero,#philosophy,#how,#tracks,#pricing,#contact,#author';
  let gesture = null;
  let settleTimer = 0;

  function screens(){
    return Array.from(appScroll.querySelectorAll(screenSelector));
  }

  function nearestScreenIndex(scrollTop){
    return screens().reduce((bestIndex,screen,index,list) => {
      const bestDistance = Math.abs(list[bestIndex].offsetTop - scrollTop);
      const distance = Math.abs(screen.offsetTop - scrollTop);
      return distance < bestDistance ? index : bestIndex;
    },0);
  }

  function settleGesture(){
    window.clearTimeout(settleTimer);
    if(!gesture || !gesture.ended || !mobileViewport.matches) return;

    const scrollDelta = appScroll.scrollTop - gesture.startScrollTop;
    if(Math.abs(scrollDelta) < 6 && !gesture.forceScreenNavigation){
      gesture = null;
      return;
    }

    const direction = gesture.deltaY > 0 ? 1 : -1;
    const items = screens();
    const targetIndex = Math.max(0,Math.min(items.length - 1,gesture.startIndex + direction));
    const targetTop = items[targetIndex].offsetTop;
    gesture = null;
    appScroll.scrollTo({
      top:targetTop,
      behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'
    });
  }

  appScroll.addEventListener('touchstart',event => {
    if(!mobileViewport.matches || event.touches.length !== 1) return;
    window.clearTimeout(settleTimer);
    const touch = event.touches[0];
    gesture = {
      startX:touch.clientX,
      startY:touch.clientY,
      startScrollTop:appScroll.scrollTop,
      startIndex:nearestScreenIndex(appScroll.scrollTop),
      forceScreenNavigation:(() => {
        const pricingScroll = event.target.closest('#pricing')?.querySelector(':scope > .wrap');
        const hasInnerScroll = pricingScroll && pricingScroll.scrollHeight > pricingScroll.clientHeight + 2;
        return Boolean(event.target.closest('#pricing .tiers-grid') && !hasInnerScroll);
      })(),
      deltaX:0,
      deltaY:0,
      ended:false
    };
  },{passive:true,capture:true});

  appScroll.addEventListener('touchend',event => {
    if(!gesture) return;
    const touch = event.changedTouches[0];
    gesture.deltaX = gesture.startX - touch.clientX;
    gesture.deltaY = gesture.startY - touch.clientY;
    const vertical = Math.abs(gesture.deltaY) > Math.abs(gesture.deltaX);
    if(Math.abs(gesture.deltaY) < 44 || !vertical){
      gesture = null;
      return;
    }
    gesture.ended = true;
    settleTimer = window.setTimeout(settleGesture,90);
  },{passive:true,capture:true});

  appScroll.addEventListener('touchcancel',event => {
    window.clearTimeout(settleTimer);
    if(gesture && gesture.forceScreenNavigation && event.changedTouches.length){
      const touch = event.changedTouches[0];
      gesture.deltaX = gesture.startX - touch.clientX;
      gesture.deltaY = gesture.startY - touch.clientY;
      const vertical = Math.abs(gesture.deltaY) > Math.abs(gesture.deltaX);
      if(vertical && Math.abs(gesture.deltaY) >= 44){
        gesture.ended = true;
        settleTimer = window.setTimeout(settleGesture,0);
        return;
      }
    }
    gesture = null;
  },{passive:true,capture:true});

  appScroll.addEventListener('scroll',() => {
    if(!gesture || !gesture.ended) return;
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settleGesture,90);
  },{passive:true});
});

// ---------- Stage 8.10: showcase screens and searchable fullscreen libraries ----------
document.addEventListener('DOMContentLoaded', () => {
  const appScroll = document.getElementById('appScroll');
  const bottomNav = document.querySelector('.mobile-bottom-nav');
  const playerScreen = document.getElementById('songPlayerScreen');
  const storiesPanel = document.getElementById('storiesLibraryScreen');
  const authorPanel = document.getElementById('authorLibraryScreen');
  const storiesList = document.querySelector('#songsLibraryPanel .tracks');
  const authorList = document.querySelector('#author .author-grid');
  const authorSignature = document.querySelector('#author .author-signature');
  const storiesResults = document.getElementById('storiesLibraryList');
  const authorResults = document.getElementById('authorLibraryList');
  const storiesCount = document.getElementById('storiesCatalogCount');
  const authorCount = document.getElementById('authorCatalogCount');

  if(
    !storiesPanel || !authorPanel || !storiesList || !authorList ||
    !storiesResults || !authorResults || !storiesCount || !authorCount
  ) return;

  const authorLanguages = {
    amsterdam:'RU',
    mychoice:'UA',
    tbilisiua:'UA',
    tbilisige:'GE',
    goodvibe:'EN',
    pulse:'EN',
    amsterdamen:'EN',
    mychoiceen:'EN',
    yayaya:'EN',
    iwant:'UA',
    yayayaalt:'EN',
    dayspass:'UA',
    ashes:'UA',
    newflight:'UA',
    noretreat:'UA',
    '53':'EN'
  };
  const searchLanguageAliases = {
    RU:'RU Russian русский російська რუსული Russisch',
    UA:'UA Ukrainian українська украинский უკრაინული Ukrainisch',
    EN:'EN English английский англійська ინგლისური Englisch',
    DE:'DE German немецкий німецька გერმანული Deutsch',
    GE:'GE Georgian грузинский грузинська ქართული Georgisch'
  };
  const countCopy = {
    ru(count){
      const mod10 = count % 10;
      const mod100 = count % 100;
      const word = mod10 === 1 && mod100 !== 11
        ? 'песня'
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
          ? 'песни'
          : 'песен';
      return count + ' ' + word;
    },
    uk(count){
      const mod10 = count % 10;
      const mod100 = count % 100;
      const word = mod10 === 1 && mod100 !== 11
        ? 'пісня'
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
          ? 'пісні'
          : 'пісень';
      return count + ' ' + word;
    },
    ka:count => count + ' სიმღერა',
    en:count => count + (count === 1 ? ' song' : ' songs'),
    de:count => count + (count === 1 ? ' Song' : ' Songs')
  };
  const filterLabels = {
    ru:'Язык песен',
    uk:'Мова пісень',
    ka:'სიმღერის ენა',
    en:'Song language',
    de:'Sprache der Songs'
  };
  const panels = [storiesPanel,authorPanel];
  const panelState = new Map();
  let pendingFeaturedFocus = null;

  storiesList.classList.add('music-library-card-list','music-library-story-list');
  authorList.classList.add('music-library-card-list','music-library-author-list');
  storiesResults.append(storiesList);
  authorResults.append(authorList);
  if(authorSignature) authorResults.append(authorSignature);

  const storyCards = Array.from(storiesList.querySelectorAll('.track[data-song-language]'));
  const authorCards = Array.from(authorList.querySelectorAll('.author-card'));
  authorCards.forEach(card => {
    const track = card.querySelector('.play-btn[data-track]')?.dataset.track || '';
    card.dataset.libraryLanguage = authorLanguages[track] || 'EN';
  });
  storiesCount.textContent = String(storyCards.length);
  authorCount.textContent = String(authorCards.length);

  function interfaceLanguage(){
    const code = document.documentElement.getAttribute('lang') || 'ru';
    return countCopy[code] ? code : 'ru';
  }

  function normalizeSearch(value){
    return String(value || '')
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu,'')
      .replace(/[^\p{Letter}\p{Number}]+/gu,' ')
      .trim();
  }

  function cardsFor(panel){
    return panel === storiesPanel ? storyCards : authorCards;
  }

  function cardLanguage(panel,card){
    return panel === storiesPanel
      ? card.dataset.songLanguage
      : card.dataset.libraryLanguage;
  }

  function trackName(card){
    return card.querySelector('.play-btn[data-track]')?.dataset.track || '';
  }

  function cardDuration(card){
    const values = Array.from(card.querySelectorAll('.story-meta span, .author-track-meta span'))
      .map(span => span.textContent.trim());
    const metadataDuration = values.find(value => /^\d{1,2}:\d{2}$/.test(value));
    if(metadataDuration) return metadataDuration;
    const timeline = card.querySelector('.track-time')?.textContent || '';
    return timeline.split('/').pop()?.trim() || '';
  }

  function cardCategory(panel,card){
    if(panel === authorPanel) return '';
    const language = cardLanguage(panel,card);
    const values = Array.from(card.querySelectorAll('.story-meta span'))
      .map(span => span.textContent.trim());
    return values.find(value => (
      value &&
      value !== language &&
      !/^\d{1,2}:\d{2}$/.test(value)
    )) || '';
  }

  function syncCardMetadata(panel){
    cardsFor(panel).forEach(card => {
      const name = trackName(card);
      const language = cardLanguage(panel,card);
      const category = cardCategory(panel,card);
      const duration = cardDuration(card);
      let metadata = card.querySelector('.music-library-card-meta');
      if(!metadata){
        metadata = document.createElement('div');
        metadata.className = 'music-library-card-meta';
        card.querySelector('.track-body')?.append(metadata);
      }
      metadata.textContent = [category,language,duration].filter(Boolean).join(' · ');
      card.dataset.libraryCategory = category;
      card.dataset.libraryOriginalTitle = TUNEWRAP_TRACK_ORIGINAL_TITLES[name] || '';
    });
  }

  function searchMatches(panel,card,query){
    if(!query) return true;
    const language = cardLanguage(panel,card);
    const currentTitle = card.querySelector('.track-title')?.textContent || '';
    const originalTitle = card.dataset.libraryOriginalTitle || '';
    const category = card.dataset.libraryCategory || '';
    const type = panel === authorPanel
      ? panel.querySelector('.music-library-heading .eyebrow')?.textContent || ''
      : category;
    const haystack = normalizeSearch([
      currentTitle,
      originalTitle,
      language,
      searchLanguageAliases[language],
      category,
      type
    ].join(' '));
    return normalizeSearch(query).split(/\s+/).every(token => haystack.includes(token));
  }

  function refreshLibrary(panel){
    const state = panelState.get(panel);
    if(!state) return;
    syncCardMetadata(panel);

    const tabs = Array.from(panel.querySelectorAll('[data-library-language]'));
    const cards = cardsFor(panel);
    let visibleCount = 0;

    tabs.forEach(tab => {
      const active = tab.dataset.libraryLanguage === state.language;
      tab.classList.toggle('is-active',active);
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    cards.forEach(card => {
      const languageMatches = state.language === 'ALL' || cardLanguage(panel,card) === state.language;
      const visible = languageMatches && searchMatches(panel,card,state.query);
      card.hidden = !visible;
      if(visible) visibleCount += 1;
    });

    const empty = panel.querySelector('[data-library-empty]');
    if(empty) empty.hidden = visibleCount !== 0;
    const resultCount = panel.querySelector('[data-library-result-count]');
    if(resultCount) resultCount.textContent = countCopy[interfaceLanguage()](visibleCount);
    if(panel === authorPanel && authorSignature){
      authorSignature.hidden = visibleCount === 0;
    }
  }

  function syncPlayingCards(){
    [...storyCards,...authorCards].forEach(card => {
      const name = trackName(card);
      const audio = name ? document.getElementById('audio-' + name) : null;
      card.classList.toggle('is-active-track',Boolean(audio && !audio.paused && !audio.ended));
    });
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

  function openLibrary(panel,trigger){
    panels.forEach(other => {
      if(other !== panel && other.classList.contains('is-open')) closeLibrary(other,false);
    });
    const state = panelState.get(panel);
    const scroller = panel.querySelector('.music-library-scroll');
    state.trigger = trigger;
    refreshLibrary(panel);
    panel.removeAttribute('inert');
    panel.setAttribute('aria-hidden','false');
    panel.classList.add('is-open');
    document.body.classList.add('music-library-open');
    syncUnderlyingInert();
    window.requestAnimationFrame(() => {
      if(scroller) scroller.scrollTop = state.scrollTop;
      panel.querySelector('[data-library-close]')?.focus({preventScroll:true});
      window.dispatchEvent(new Event('resize'));
    });
  }

  function closeLibrary(panel,restoreFocus = true){
    if(!panel.classList.contains('is-open')) return;
    const state = panelState.get(panel);
    const scroller = panel.querySelector('.music-library-scroll');
    if(state && scroller) state.scrollTop = scroller.scrollTop;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    panel.setAttribute('inert','');
    if(!panels.some(item => item.classList.contains('is-open'))){
      document.body.classList.remove('music-library-open');
    }
    syncUnderlyingInert();
    if(restoreFocus && state?.trigger){
      window.requestAnimationFrame(() => state.trigger.focus({preventScroll:true}));
    }
  }

  panels.forEach(panel => {
    const input = panel.querySelector('[data-library-search]');
    panelState.set(panel,{
      language:'ALL',
      query:'',
      trigger:null,
      scrollTop:0
    });

    panel.querySelectorAll('[data-library-language]').forEach(tab => {
      tab.addEventListener('click',() => {
        panelState.get(panel).language = tab.dataset.libraryLanguage;
        refreshLibrary(panel);
      });
      tab.addEventListener('keydown',event => {
        if(event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const tabs = Array.from(panel.querySelectorAll('[data-library-language]'));
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const index = tabs.indexOf(tab);
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        next.focus();
        panelState.get(panel).language = next.dataset.libraryLanguage;
        refreshLibrary(panel);
      });
    });

    input?.addEventListener('input',() => {
      panelState.get(panel).query = input.value;
      refreshLibrary(panel);
    });

    panel.querySelector('[data-library-reset-search]')?.addEventListener('click',() => {
      const state = panelState.get(panel);
      state.query = '';
      state.language = 'ALL';
      if(input) input.value = '';
      refreshLibrary(panel);
      input?.focus({preventScroll:true});
    });

    panel.querySelector('[data-library-close]')?.addEventListener('click',() => closeLibrary(panel));
    refreshLibrary(panel);
  });

  document.getElementById('openStoriesLibrary')?.addEventListener('click',event => {
    openLibrary(storiesPanel,event.currentTarget);
  });
  document.getElementById('openAuthorLibrary')?.addEventListener('click',event => {
    openLibrary(authorPanel,event.currentTarget);
  });

  document.querySelectorAll('[data-featured-track]').forEach(featured => {
    featured.addEventListener('click',() => {
      const name = featured.dataset.featuredTrack;
      const canonical = document.querySelector('.play-btn[data-track="' + name + '"]')?.closest('.track,.author-card');
      if(!canonical) return;
      pendingFeaturedFocus = featured;
      canonical.dispatchEvent(new MouseEvent('click',{
        bubbles:true,
        cancelable:true,
        view:window
      }));
    });
  });

  [...storyCards,...authorCards].forEach(card => {
    const button = card.querySelector('.play-btn[data-track]');
    const audio = button ? document.getElementById('audio-' + button.dataset.track) : null;
    button?.addEventListener('click',event => {
      if(!event.isTrusted) return;
      event.stopPropagation();
      window.__tuneWrapPlayerBridge?.adoptLibraryPlayback(card,button);
      window.setTimeout(syncPlayingCards,0);
    });
    audio?.addEventListener('play',syncPlayingCards);
    audio?.addEventListener('pause',syncPlayingCards);
    audio?.addEventListener('ended',syncPlayingCards);
  });

  function syncFeaturedTitles(){
    const code = document.documentElement.getAttribute('lang') || 'ru';
    const titles = TUNEWRAP_TRACK_TITLES[code] || TUNEWRAP_TRACK_TITLES.ru;
    document.querySelectorAll('[data-featured-track]').forEach(featured => {
      const title = titles[featured.dataset.featuredTrack];
      const titleElement = featured.querySelector('[data-featured-title]');
      if(titleElement && title) titleElement.textContent = title;
      if(title) featured.setAttribute('aria-label',title);
    });
  }

  function syncLibraryLanguage(){
    const code = interfaceLanguage();
    panels.forEach(panel => {
      const filters = panel.querySelector('[data-library-filters]');
      if(filters) filters.setAttribute('aria-label',filterLabels[code]);
      refreshLibrary(panel);
    });
  }

  document.addEventListener('tunewrap:languagechange',() => {
    syncFeaturedTitles();
    syncLibraryLanguage();
  });
  syncFeaturedTitles();
  syncLibraryLanguage();
  syncPlayingCards();

  document.addEventListener('keydown',event => {
    if(event.key !== 'Escape' || playerScreen?.classList.contains('is-open')) return;
    const openPanel = panels.find(panel => panel.classList.contains('is-open'));
    if(openPanel) closeLibrary(openPanel);
  });

  if(playerScreen && 'MutationObserver' in window){
    const playerObserver = new MutationObserver(() => {
      syncUnderlyingInert();
      if(
        pendingFeaturedFocus &&
        playerScreen.getAttribute('aria-hidden') === 'true'
      ){
        const target = pendingFeaturedFocus;
        pendingFeaturedFocus = null;
        window.requestAnimationFrame(() => target.focus({preventScroll:true}));
      }
    });
    playerObserver.observe(playerScreen,{attributes:true,attributeFilter:['class','aria-hidden']});
  }
});
