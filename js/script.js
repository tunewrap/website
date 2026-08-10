
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
  if(document.getElementById('tuneWrapAudioEngine')) return;
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
const TUNEWRAP_TRACK_TITLES = window.TuneWrapCatalog?.titleMaps || Object.freeze({});

const TUNEWRAP_LISTEN_LABELS = {
  ru:"Слушать",
  uk:"Слухати",
  ka:"მოსმენა",
  en:"Listen to",
  de:"Anhören"
};

const TUNEWRAP_TRACK_ORIGINAL_TITLES = window.TuneWrapCatalog?.originalTitles || Object.freeze({});

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
      philosophy_quote:"«Сначала — ваша история.<br>Потом — слова.<br>Потом — музыка.»",
      philosophy_credit:"— Философия TuneWrap",
      philosophy_text:"В TuneWrap всё начинается не с аккордов и мелодии, а с человека — с его воспоминаний, чувств и самых важных моментов. Мы бережно превращаем их в слова, а затем создаём музыку, которая раскрывает и усиливает историю. Так рождается личная песня, в которой можно узнать себя и к которой захочется возвращаться спустя годы.",
      tagline:"Ваша история — в песне",
      nav_cta:"Оставить заявку",
      hero_eyebrow:"ВАША ИСТОРИЯ",
      listen_story:"▶ Слушать историю",
      brand_manifesto:"Мы сохраняем самые важные моменты вашей жизни языком музыки.",
      hero_h1:"У каждой истории есть <em>своя мелодия</em>",
      hero_lead:"Первая встреча. Любимая фраза мамы. Семейная шутка. Число на обручальном кольце.<br><br>Расскажите нам самое важное — и мы создадим для вас персональную песню, к которой захочется возвращаться спустя годы.",
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
      how_eyebrow:"Как это работает",
      how_h2:"Три шага от вашей истории до готовой песни",
      step1_title:"Расскажите свою историю",
      step1_desc:"Заполните короткую форму: расскажите, для кого создаётся песня, какое событие вас объединяет и какие детали особенно важно сохранить.",
      step2_title:"Мы создадим вашу песню",
      step2_desc:"Найдём главное в вашей истории, превратим важные детали в слова и создадим музыку в выбранном стиле и настроении.",
      step3_title:"Получите готовую песню",
      step3_desc:"Мы отправим вам готовую песню в высоком качестве. Вы сможете прослушать результат и при необходимости внести правки в рамках выбранного пакета.",
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
      wedding_eyebrow:"СВАДЕБНЫЙ ФОРМАТ",
      wedding_subtitle:"Музыка для моментов, которые останутся с вами навсегда.",
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
      contact_hub_title:"Контакты",
      contact_hub_subtitle:"Музыка начинается с вашей истории.",
      contact_payment_title:"Способы оплаты",
      contact_payment_pending:"Подключённые способы оплаты появятся здесь.",
      contact_about_title:"О нас",
      contact_info_title:"Информация",
      contact_nav_philosophy:"Философия TuneWrap",
      contact_nav_process:"Как это работает",
      contact_nav_stories:"Музыкальные истории",
      contact_nav_pricing:"Стоимость и форматы",
      contact_nav_author:"Авторские песни создателя проекта",
      contact_nav_order:"Рассказать свою историю",
      contact_nav_corporate:"Для корпоративных клиентов",
      contact_nav_wedding:"Свадебный формат",
      contact_nav_contacts:"Контакты",
      contact_nav_payment:"Оплата",
      contact_nav_terms:"Условия использования",
      contact_nav_write:"Написать нам",
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
      author_ukraine_desc:"Эта песня посвящается миллионам украинцев, которые сегодня находятся вдали от дома. Тем, кто продолжает любить свою страну, молиться за неё и верить, что однажды скажет самые важные слова: «Я дома».",
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
      philosophy_quote:"«Спочатку — ваша історія.<br>Потім — слова.<br>Потім — музика.»",
      philosophy_credit:"— Філософія TuneWrap",
      philosophy_text:"У TuneWrap усе починається не з акордів і мелодії, а з людини — з її спогадів, почуттів і найважливіших моментів. Ми дбайливо перетворюємо їх на слова, а потім створюємо музику, яка розкриває й підсилює історію. Так народжується особиста пісня, у якій можна впізнати себе і до якої захочеться повертатися через роки.",
      tagline:"Ваша історія — у пісні",
      nav_cta:"Залишити заявку",
      hero_eyebrow:"ВАША ІСТОРІЯ",
      listen_story:"▶ Слухати історію",
      brand_manifesto:"Ми зберігаємо найважливіші моменти вашого життя мовою музики.",
      hero_h1:"У кожної історії є <em>своя мелодія</em>",
      hero_lead:"Перша зустріч. Улюблена мамина фраза. Сімейний жарт. Число на обручці.<br><br>Розкажіть нам про найважливіше — і ми створимо для вас персональну пісню, до якої захочеться повертатися через роки.",
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
      how_eyebrow:"Як це працює",
      how_h2:"Три кроки від вашої історії до готової пісні",
      step1_title:"Розкажіть свою історію",
      step1_desc:"Заповніть коротку форму: розкажіть, для кого створюється пісня, яка подія вас об’єднує та які деталі особливо важливо зберегти.",
      step2_title:"Ми створимо вашу пісню",
      step2_desc:"Знайдемо головне у вашій історії, перетворимо важливі деталі на слова й створимо музику в обраному стилі та настрої.",
      step3_title:"Отримайте готову пісню",
      step3_desc:"Ми надішлемо вам готову пісню у високій якості. Ви зможете прослухати результат і за потреби внести правки в межах обраного пакета.",
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
      wedding_eyebrow:"ВЕСІЛЬНИЙ ФОРМАТ",
      wedding_subtitle:"Музика для моментів, які назавжди залишаться з вами.",
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
      contact_hub_title:"Контакти",
      contact_hub_subtitle:"Музика починається з вашої історії.",
      contact_payment_title:"Способи оплати",
      contact_payment_pending:"Підключені способи оплати з’являться тут.",
      contact_about_title:"Про нас",
      contact_info_title:"Інформація",
      contact_nav_philosophy:"Філософія TuneWrap",
      contact_nav_process:"Як це працює",
      contact_nav_stories:"Музичні історії",
      contact_nav_pricing:"Вартість і формати",
      contact_nav_author:"Авторські пісні засновника проєкту",
      contact_nav_order:"Розповісти свою історію",
      contact_nav_corporate:"Для корпоративних клієнтів",
      contact_nav_wedding:"Весільний формат",
      contact_nav_contacts:"Контакти",
      contact_nav_payment:"Оплата",
      contact_nav_terms:"Умови користування",
      contact_nav_write:"Написати нам",
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
      author_ukraine_desc:"Ця пісня присвячена мільйонам українців, які сьогодні далеко від дому. Тим, хто продовжує любити свою країну, молитися за неї й вірити, що одного дня скаже найважливіші слова: «Я вдома».",
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
      philosophy_quote:"„ჯერ — თქვენი ისტორია.<br>შემდეგ — სიტყვები.<br>შემდეგ — მუსიკა.“",
      philosophy_credit:"— TuneWrap-ის ფილოსოფია",
      philosophy_text:"TuneWrap-ში ყველაფერი იწყება არა აკორდებითა და მელოდიით, არამედ ადამიანით — მისი მოგონებებით, გრძნობებითა და ცხოვრების ყველაზე მნიშვნელოვანი მომენტებით. ჩვენ მათ სიფრთხილით ვაქცევთ სიტყვებად, შემდეგ კი ვქმნით მუსიკას, რომელიც ისტორიას ხსნის და აძლიერებს. ასე იბადება პირადი სიმღერა, რომელშიც საკუთარ თავს ამოიცნობთ და რომლის მოსმენაც წლების შემდეგაც მოგინდებათ.",
      tagline:"თქვენი ისტორია — სიმღერაში",
      nav_cta:"განაცხადის გაგზავნა",
      hero_eyebrow:"თქვენი ისტორია",
      listen_story:"▶ მოუსმინეთ ისტორიას",
      brand_manifesto:"ჩვენ მუსიკის ენით ვინახავთ თქვენი ცხოვრების ყველაზე მნიშვნელოვან მომენტებს.",
      hero_h1:"ყველა ისტორიას თავისი <em>მელოდია</em> აქვს",
      hero_lead:"პირველი შეხვედრა. დედის საყვარელი ფრაზა. ოჯახური ხუმრობა. რიცხვი საქორწინო ბეჭედზე.<br><br>მოგვიყევით ყველაზე მნიშვნელოვანი — და ჩვენ შეგიქმნით პერსონალურ სიმღერას, რომლის მოსმენაც წლების შემდეგაც მოგინდებათ.",
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
      how_eyebrow:"როგორ მუშაობს",
      how_h2:"თქვენი ამბავი.<br>სამი ნაბიჯი — და სიმღერა მზადაა.",
      step1_title:"მოგვიყევით თქვენი ისტორია",
      step1_desc:"შეავსეთ მოკლე ფორმა: მოგვიყევით, ვისთვის იქმნება სიმღერა, რა მოვლენა გაერთიანებთ და რომელი დეტალების შენარჩუნებაა განსაკუთრებით მნიშვნელოვანი.",
      step2_title:"ჩვენ შევქმნით თქვენს სიმღერას",
      step2_desc:"თქვენს ისტორიაში მთავარს ვიპოვით, მნიშვნელოვან დეტალებს სიტყვებად ვაქცევთ და შერჩეული სტილისა და განწყობის მუსიკას შევქმნით.",
      step3_title:"მიიღეთ მზა სიმღერა",
      step3_desc:"მზა სიმღერას მაღალი ხარისხით გამოგიგზავნით. თქვენ შეძლებთ შედეგის მოსმენას და საჭიროების შემთხვევაში, არჩეული პაკეტის ფარგლებში, შესწორებების შეტანას.",
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
      wedding_eyebrow:"საქორწილო ფორმატი",
      wedding_subtitle:"მუსიკა იმ მომენტებისთვის, რომლებიც სამუდამოდ დაგრჩებათ.",
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
      contact_hub_title:"კონტაქტი",
      contact_hub_subtitle:"მუსიკა თქვენი ისტორიით იწყება.",
      contact_payment_title:"გადახდის მეთოდები",
      contact_payment_pending:"დაკავშირებული გადახდის მეთოდები აქ გამოჩნდება.",
      contact_about_title:"ჩვენ შესახებ",
      contact_info_title:"ინფორმაცია",
      contact_nav_philosophy:"TuneWrap-ის ფილოსოფია",
      contact_nav_process:"როგორ მუშაობს",
      contact_nav_stories:"მუსიკალური ისტორიები",
      contact_nav_pricing:"ფასი და ფორმატები",
      contact_nav_author:"პროექტის დამფუძნებლის საავტორო სიმღერები",
      contact_nav_order:"მოგვიყევით თქვენი ისტორია",
      contact_nav_corporate:"კორპორაციული კლიენტებისთვის",
      contact_nav_wedding:"საქორწილო ფორმატი",
      contact_nav_contacts:"კონტაქტი",
      contact_nav_payment:"გადახდა",
      contact_nav_terms:"გამოყენების პირობები",
      contact_nav_write:"მოგვწერეთ",
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
      author_ukraine_desc:"ეს სიმღერა ეძღვნება მილიონობით უკრაინელს, რომლებიც დღეს სახლიდან შორს არიან. მათ, ვინც კვლავ უყვარს თავისი ქვეყანა, ლოცულობს მისთვის და სჯერა, რომ ერთ დღეს ყველაზე მნიშვნელოვან სიტყვებს იტყვის: „მე სახლში ვარ“.",
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
      philosophy_quote:"“First comes your story.<br>Then come the words.<br>Then comes the music.”",
      philosophy_credit:"— TuneWrap Philosophy",
      philosophy_text:"At TuneWrap, everything begins not with chords or melody, but with a person — their memories, feelings, and most meaningful moments. We carefully turn them into words, then create music that reveals and strengthens the story. The result is a personal song in which you can recognize yourself, and one you will want to return to for years to come.",
      tagline:"Your story — in a song",
      nav_cta:"Get a quote",
      hero_eyebrow:"YOUR STORY",
      listen_story:"▶ Listen to the story",
      brand_manifesto:"We preserve the most important moments of your life through the language of music.",
      hero_h1:"Every story deserves <em>its own melody</em>",
      hero_lead:"A first meeting. Mom’s favorite phrase. A family joke. A number engraved on a wedding ring.<br><br>Tell us what matters most, and we will create a personal song for you — one you will want to return to years from now.",
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
      how_eyebrow:"How it works",
      how_h2:"Three steps from your story to a finished song",
      step1_title:"Tell us your story",
      step1_desc:"Complete a short form: tell us who the song is for, what occasion or experience brings you together, and which details matter most to preserve.",
      step2_title:"We will create your song",
      step2_desc:"We will find the heart of your story, turn its meaningful details into words, and create music in your chosen style and mood.",
      step3_title:"Receive your finished song",
      step3_desc:"We will send you the finished song in high quality. You can listen to the result and request revisions, if needed, within the terms of your selected package.",
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
      wedding_eyebrow:"WEDDING FORMAT",
      wedding_subtitle:"Music for the moments you will carry with you forever.",
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
      contact_hub_title:"Contacts",
      contact_hub_subtitle:"Music begins with your story.",
      contact_payment_title:"Payment methods",
      contact_payment_pending:"Connected payment methods will appear here.",
      contact_about_title:"About us",
      contact_info_title:"Information",
      contact_nav_philosophy:"TuneWrap philosophy",
      contact_nav_process:"How it works",
      contact_nav_stories:"Musical stories",
      contact_nav_pricing:"Formats and pricing",
      contact_nav_author:"Original songs by the project founder",
      contact_nav_order:"Tell your story",
      contact_nav_corporate:"For corporate clients",
      contact_nav_wedding:"Wedding format",
      contact_nav_contacts:"Contacts",
      contact_nav_payment:"Payment",
      contact_nav_terms:"Terms of use",
      contact_nav_write:"Write to us",
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
      author_ukraine_desc:"This song is dedicated to millions of Ukrainians living far from home today—to those who keep loving their country, praying for it and believing they will one day say the most important words: “I am home.”",
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
      philosophy_quote:"„Zuerst kommt Ihre Geschichte.<br>Dann die Worte.<br>Dann die Musik.“",
      philosophy_credit:"— Philosophie von TuneWrap",
      philosophy_text:"Bei TuneWrap beginnt alles nicht mit Akkorden oder einer Melodie, sondern mit einem Menschen — mit seinen Erinnerungen, Gefühlen und wichtigsten Momenten. Wir verwandeln sie behutsam in Worte und schaffen anschließend Musik, die die Geschichte entfaltet und verstärkt. So entsteht ein persönliches Lied, in dem Sie sich selbst wiedererkennen und zu dem Sie auch Jahre später gern zurückkehren werden.",
      tagline:"Ihre Geschichte — als Lied",
      nav_cta:"Anfrage senden",
      hero_eyebrow:"IHRE GESCHICHTE",
      listen_story:"▶ Geschichte anhören",
      brand_manifesto:"Wir bewahren die wichtigsten Momente Ihres Lebens in der Sprache der Musik.",
      hero_h1:"Jede Geschichte hat <em>ihre eigene Melodie</em>",
      hero_lead:"Die erste Begegnung. Mamas Lieblingssatz. Ein Familienwitz. Eine Zahl im Ehering.<br><br>Erzählen Sie uns, was Ihnen am wichtigsten ist — und wir schaffen für Sie ein persönliches Lied, zu dem Sie auch Jahre später gern zurückkehren werden.",
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
      how_eyebrow:"So funktioniert's",
      how_h2:"Drei Schritte von Ihrer Geschichte zum fertigen Lied",
      step1_title:"Erzählen Sie Ihre Geschichte",
      step1_desc:"Füllen Sie ein kurzes Formular aus: Erzählen Sie uns, für wen das Lied entsteht, welches Ereignis Sie verbindet und welche Details unbedingt bewahrt werden sollen.",
      step2_title:"Wir erschaffen Ihr Lied",
      step2_desc:"Wir finden das Wesentliche in Ihrer Geschichte, verwandeln wichtige Details in Worte und schaffen Musik im gewünschten Stil und in der passenden Stimmung.",
      step3_title:"Erhalten Sie Ihr fertiges Lied",
      step3_desc:"Wir senden Ihnen das fertige Lied in hoher Qualität. Sie können das Ergebnis anhören und bei Bedarf Änderungen im Rahmen des gewählten Pakets vornehmen lassen.",
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
      wedding_eyebrow:"HOCHZEITSFORMAT",
      wedding_subtitle:"Musik für Momente, die für immer bei Ihnen bleiben.",
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
      contact_hub_title:"Kontakt",
      contact_hub_subtitle:"Musik beginnt mit Ihrer Geschichte.",
      contact_payment_title:"Zahlungsmethoden",
      contact_payment_pending:"Verfügbare Zahlungsmethoden werden hier angezeigt.",
      contact_about_title:"Über uns",
      contact_info_title:"Informationen",
      contact_nav_philosophy:"Die Philosophie von TuneWrap",
      contact_nav_process:"So funktioniert's",
      contact_nav_stories:"Musikalische Geschichten",
      contact_nav_pricing:"Formate und Preise",
      contact_nav_author:"Eigene Songs des Projektgründers",
      contact_nav_order:"Ihre Geschichte erzählen",
      contact_nav_corporate:"Für Firmenkunden",
      contact_nav_wedding:"Hochzeitsformat",
      contact_nav_contacts:"Kontakt",
      contact_nav_payment:"Zahlung",
      contact_nav_terms:"Nutzungsbedingungen",
      contact_nav_write:"Schreiben Sie uns",
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
      author_ukraine_desc:"Dieser Song ist Millionen Ukrainern gewidmet, die heute fern von zu Hause leben. Menschen, die ihr Land weiter lieben, für es beten und daran glauben, eines Tages die wichtigsten Worte sagen zu können: „Ich bin zu Hause.“",
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
      const card = document.createElement('article');
      const packagePrice = WEDDING_PACKAGE_PRICES[packageData.id];
      card.className = 'tier-card wedding-offer-card' + (selectedWeddingPackageId === packageData.id ? ' selected' : '');
      card.tabIndex = 0;
      card.setAttribute('role','button');
      card.dataset.weddingPackage = packageData.id;
      card.setAttribute('aria-label',packageData.name + ', $' + packagePrice.price + '. ' + t('tier_open_btn'));
      card.innerHTML =
        '<div class="tier-name">'+packageData.name+'</div>' +
        '<div class="tier-price tier-price-promo"><s>$'+packagePrice.oldPrice+'</s><strong>$'+packagePrice.price+'</strong><small>USD</small></div>' +
        '<span class="tier-card-open">'+t('tier_open_btn')+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span>';
      card.addEventListener('click',() => openTierPanel(index,card,'wedding'));
      card.addEventListener('keydown',event => {
        if(event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openTierPanel(index,card,'wedding');
      });
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
        } else if(selectedStyles.length < 5){
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
  document.addEventListener('tunewrap:set-order-tier',event => {
    const index=Number(event.detail?.index);
    if(Number.isInteger(index) && index >= 0 && index < TIERS[currentLang].length){
      applySelectedTier(index);
    }
  });
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

// ---------- Stage 9.4: order-to-contact information architecture ----------
document.addEventListener('DOMContentLoaded',() => {
  const appScroll = document.getElementById('appScroll');
  const author = document.getElementById('author');
  const pricing = document.getElementById('pricing');
  const order = document.getElementById('contact');
  const contactHub = document.getElementById('contactHub');
  const hubScroll = contactHub?.querySelector(':scope > .wrap');
  const weddingPackages = document.getElementById('weddingPackages');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');

  if(!appScroll || !contactHub) return;

  // Keep the mobile story flow deterministic: Stories → Author → Pricing → Order → Contacts.
  if(author && pricing && author.nextElementSibling !== pricing){
    appScroll.insertBefore(author,pricing);
  }

  function motionBehavior(){
    return reducedMotion.matches ? 'auto' : 'smooth';
  }

  function moveToScreen(target,{resetInner=true}={}){
    if(!target) return;
    if(target === order) order.classList.remove('is-story-path-form');
    if(resetInner){
      const inner = target.querySelector(':scope > .wrap');
      if(inner) inner.scrollTop = 0;
    }
    appScroll.scrollTo({top:target.offsetTop,behavior:motionBehavior()});
  }

  contactHub.querySelectorAll('[data-contact-target]').forEach(link => {
    link.addEventListener('click',event => {
      event.preventDefault();
      moveToScreen(document.getElementById(link.dataset.contactTarget));
    });
  });

  contactHub.querySelector('[data-contact-action="corporate"]')?.addEventListener('click',event => {
    document.dispatchEvent(new CustomEvent('tunewrap:open-corporate',{detail:{trigger:event.currentTarget}}));
  });

  contactHub.querySelector('[data-contact-action="wedding"]')?.addEventListener('click',() => {
    moveToScreen(pricing,{resetInner:false});
    window.setTimeout(() => {
      const pricingScroll = pricing?.querySelector(':scope > .wrap');
      if(!pricingScroll || !weddingPackages) return;
      const targetTop = Math.max(0,weddingPackages.offsetTop - Math.max(12,pricingScroll.clientHeight * .2));
      pricingScroll.scrollTo({top:targetTop,behavior:motionBehavior()});
    },reducedMotion.matches ? 0 : 420);
  });

  contactHub.querySelector('[data-contact-action="contacts"]')?.addEventListener('click',event => {
    event.preventDefault();
    hubScroll?.scrollTo({top:0,behavior:motionBehavior()});
  });

  contactHub.querySelector('[data-contact-action="payment"]')?.addEventListener('click',event => {
    event.preventDefault();
    const payment = document.getElementById('contactHubPayment');
    if(!hubScroll || !payment) return;
    hubScroll.scrollTo({top:Math.max(0,payment.offsetTop - 12),behavior:motionBehavior()});
  });

  const signatureWave = document.getElementById('contactSignatureWave');
  if(signatureWave && 'IntersectionObserver' in window){
    const signatureObserver = new IntersectionObserver(entries => {
      contactHub.classList.toggle('is-signature-visible',entries.some(entry => entry.isIntersecting));
    },{root:hubScroll || null,threshold:.24});
    signatureObserver.observe(signatureWave);
  } else {
    contactHub.classList.add('is-signature-visible');
  }
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
  const order = new Map((window.TuneWrapCatalog?.queue() || []).map((track,index) => [track.id,index]));
  return items.slice().sort((left,right) =>
    (order.get(left.name) ?? Number.MAX_SAFE_INTEGER) -
    (order.get(right.name) ?? Number.MAX_SAFE_INTEGER)
  );
}

// ---------- mobile app player, menu and bottom navigation ----------
document.addEventListener('DOMContentLoaded', () => {
  const usesUnifiedAudio = Boolean(document.getElementById('tuneWrapAudioEngine'));
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
  let currentTrack = window.TuneWrapCatalog?.queue()[0]?.id || '';

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

  if(!usesUnifiedAudio){
    playControl.addEventListener('click', toggleCurrent);
    prevControl.addEventListener('click', () => stepTrack(-1));
    nextControl.addEventListener('click', () => stepTrack(1));
  }

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

  document.addEventListener('tunewrap:open-corporate',event => {
    openCorporate(event.detail?.trigger || null);
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
          : document.getElementById('author');
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

  const screenSelector = '.hero,#philosophy,#how,#tracks,#author,#pricing,#contact,#contactHub';
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
      innerBoundary:(() => {
        const screen = event.target.closest('#pricing,#contact,#contactHub');
        const innerScroll = screen?.querySelector(':scope > .wrap');
        if(!innerScroll) return null;
        const hasInnerScroll = innerScroll.scrollHeight > innerScroll.clientHeight + 2;
        return {
          hasInnerScroll,
          atTop:innerScroll.scrollTop <= 1,
          atBottom:innerScroll.scrollTop + innerScroll.clientHeight >= innerScroll.scrollHeight - 1
        };
      })(),
      forceScreenNavigation:false,
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
    if(vertical && gesture.innerBoundary){
      const boundary = gesture.innerBoundary;
      gesture.forceScreenNavigation = !boundary.hasInnerScroll || (
        gesture.deltaY > 0 ? boundary.atBottom : boundary.atTop
      );
    }
    if(Math.abs(gesture.deltaY) < 44 || !vertical){
      gesture = null;
      return;
    }
    gesture.ended = true;
    settleTimer = window.setTimeout(settleGesture,90);
  },{passive:true,capture:true});

  appScroll.addEventListener('touchcancel',event => {
    window.clearTimeout(settleTimer);
    if(gesture && event.changedTouches.length){
      const touch = event.changedTouches[0];
      gesture.deltaX = gesture.startX - touch.clientX;
      gesture.deltaY = gesture.startY - touch.clientY;
      const vertical = Math.abs(gesture.deltaY) > Math.abs(gesture.deltaX);
      const boundary = gesture.innerBoundary;
      const canLeaveInner = !boundary || !boundary.hasInnerScroll || (
        gesture.deltaY > 0 ? boundary.atBottom : boundary.atTop
      );
      if(vertical && canLeaveInner && Math.abs(gesture.deltaY) >= 44){
        gesture.forceScreenNavigation = true;
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
