
// ---------- ambient hero waveform (idle animation) ----------
(function(){
  const canvas = document.getElementById('ambientWave');
  const ctx = canvas.getContext('2d');
  function resize(){
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);
  let t = 0;
  function draw(){
    t += 0.02;
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
      grad.addColorStop(1, 'rgba(184,84,58,0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, h/2 - bh/2, bw, bh);
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- track players with live analyser waveform ----------
(function(){
  const tracks = ['days127','mainroad','natalia65','growold','amsterdam','mychoice','tbilisi','goodvibe','pulse','amsterdamen','mychoiceen','yayaya','iwant','justfive'];
  let audioCtx = null;
  const nodes = {};
  let currentPlaying = null;

  function getCtx(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  tracks.forEach(name=>{
    const audio = document.getElementById('audio-'+name);
    const canvas = document.querySelector('canvas[data-canvas="'+name+'"]');
    const btn = document.querySelector('.play-btn[data-track="'+name+'"]');
    const timeEl = document.querySelector('[data-time="'+name+'"]');
    if(!audio || !canvas || !btn || !timeEl) return;
    const ctx2d = canvas.getContext('2d');

    function resizeCanvas(){
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

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

    let analyser, source, dataArray, rafId;

    function setupAnalyser(){
      if(analyser) return;
      const ac = getCtx();
      source = ac.createMediaElementSource(audio);
      analyser = ac.createAnalyser();
      analyser.fftSize = 128;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(ac.destination);
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
        grad.addColorStop(1,'rgba(184,84,58,0.5)');
        ctx2d.fillStyle = grad;
        ctx2d.fillRect(i*gap+gap*0.15, h/2-bh/2, gap*0.7, bh);
      }
      rafId = requestAnimationFrame(drawLive);
    }

    function fmt(s){
      s = Math.floor(s||0);
      return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
    }

    audio.addEventListener('timeupdate', ()=>{
      timeEl.textContent = fmt(audio.currentTime)+' / '+fmt(audio.duration||45);
    });
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
        audio.play();
        btn.classList.add('playing');
        currentPlaying = name;
        drawLive();
      } else {
        audio.pause();
        btn.classList.remove('playing');
        cancelAnimationFrame(rafId);
        drawIdle();
        currentPlaying = null;
      }
    });
  });
})();

// ---------- i18n ----------
(function(){
  const I18N = {
    ru: {
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
      pricing_p:"Выберите глубину работы: от песни по готовому тексту до полного создания истории, текста и музыкальной концепции.",
      tier_select_btn:"Выбрать",
      contact_eyebrow:"Начать свою историю",
      contact_h2:"Расскажите нам свою историю",
      contact_p:"Выберите пакет и стиль, расскажите о человеке — и мы отправим готовую заявку в один клик.",
      contact_tg:"Написать в Telegram",
      contact_wa:"WhatsApp",
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

      author_h2:"Автор проекта и его песни",
      author_p:"Это песни, написанные не на заказ. Они рождались вместе с путешествиями, встречами, потерями, надеждой, свободой выбора и любовью к жизни. Каждая из них — глава одной большой истории, которая продолжается и сегодня.",
      author_amsterdam_desc:"Эта история началась глубокой ночью в Амстердаме. Мы с сыном просто шли вперёд по пустому городу, не зная, что запомним эту ночь навсегда. Красные огни, каналы и ощущение абсолютной свободы однажды стали песней.",
      author_ukraine_desc:"Эта песня посвящается миллионам украинцев, которые сегодня находятся вдали от дома. Тем, кто продолжает любить свою страну, молиться за неё и верить, что однажды скажет самые важные слова: «Я дома».",
      author_mychoice_desc:"Иногда нужно потерять привычную жизнь, чтобы обрести свою собственную. Эта песня появилась в день, когда я понял, что свобода — это право выбирать свой путь и оставаться верным самому себе.",
      author_tbilisi_desc:"Иногда чужой город становится родным. Тбилиси подарил мне новую главу жизни, новых людей и веру в то, что никогда не поздно начать всё сначала.",
      author_goodvibe_desc:"Иногда несколько месяцев поддержки, улыбок и тёплых разговоров превращаются в хорошую музыку. Эта песня — благодарность жизни и одному человеку за её светлые моменты.",
      author_pulse_desc:"Музыка была рядом со мной всю жизнь. Бас-гитара, сцена, свет софитов и тысячи сердец, бьющихся в одном ритме. Есть моменты, которые невозможно описать словами — их можно только почувствовать. Это история о свободе, энергии музыки и пульсе ночи, частью которого я являюсь.",
      author_yayaya_desc:"Иногда песня рождается не из боли, а из чистой энергии. Ya Ya Ya — про момент, когда перестаёшь оглядываться на чужое мнение и просто идёшь своим ритмом. Гитарный драйв, дорога и припев, который хочется петь всей компанией.",
      author_iwant_desc:"После долгих лет жизни по чужому расписанию однажды наступает тишина — и впервые никто не говорит, что ты должен делать. Эта песня родилась из простого, почти дерзкого ощущения свободы: сегодня я сам выбираю свой день, свой путь и свою жизнь. «Я роблю що хочу» — не про каприз, а про возвращение к себе.",
      author_signature:"Автор песен, продюсер и основатель TuneWrap.",
    },
    uk: {
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
      pricing_p:"Оберіть глибину роботи: від пісні за готовим текстом до повного створення історії, тексту та музичної концепції.",
      tier_select_btn:"Обрати",
      contact_eyebrow:"Почати свою історію",
      contact_h2:"Розкажіть нам свою історію",
      contact_p:"Оберіть пакет і стиль, розкажіть про людину — і ми надішлемо готову заявку в один клік.",
      contact_tg:"Написати в Telegram",
      contact_wa:"WhatsApp",
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

      author_h2:"Автор проєкту та його пісні",
      author_p:"Це пісні, написані не на замовлення. Вони народжувалися разом із подорожами, зустрічами, втратами, надією, свободою вибору та любов’ю до життя. Кожна з них — розділ однієї великої історії, що триває й сьогодні.",
      author_amsterdam_desc:"Ця історія почалася глибокої ночі в Амстердамі. Ми із сином просто йшли вперед порожнім містом, не знаючи, що запам’ятаємо цю ніч назавжди. Червоні вогні, канали й відчуття абсолютної свободи одного дня стали піснею.",
      author_ukraine_desc:"Ця пісня присвячена мільйонам українців, які сьогодні далеко від дому. Тим, хто продовжує любити свою країну, молитися за неї й вірити, що одного дня скаже найважливіші слова: «Я вдома».",
      author_mychoice_desc:"Іноді потрібно втратити звичне життя, щоб знайти власне. Ця пісня з’явилася в день, коли я зрозумів: свобода — це право обирати свій шлях і залишатися вірним самому собі.",
      author_tbilisi_desc:"Іноді чуже місто стає рідним. Тбілісі подарував мені новий розділ життя, нових людей і віру в те, що ніколи не пізно почати все спочатку.",
      author_goodvibe_desc:"Іноді кілька місяців підтримки, усмішок і теплих розмов перетворюються на хорошу музику. Ця пісня — подяка життю й одній людині за його світлі миті.",
      author_pulse_desc:"Музика була поруч зі мною все життя. Бас-гітара, сцена, світло софітів і тисячі сердець, що б'ються в одному ритмі. Є моменти, які неможливо описати словами — їх можна лише відчути. Це історія про свободу, енергію музики та пульс ночі, частиною якого я є.",
      author_yayaya_desc:"Іноді пісня народжується не з болю, а з чистої енергії. Ya Ya Ya — про мить, коли перестаєш озиратися на чужу думку й просто йдеш у власному ритмі. Гітарний драйв, дорога та приспів, який хочеться співати всією компанією.",
      author_iwant_desc:"Після довгих років життя за чужим розкладом одного дня настає тиша — і вперше ніхто не говорить, що ти повинен робити. Ця пісня народилася з простого, майже зухвалого відчуття свободи: сьогодні я сам обираю свій день, свій шлях і своє життя. «Я роблю що хочу» — не про примху, а про повернення до себе.",
      author_signature:"Автор пісень, продюсер і засновник TuneWrap.",
    },
    ka: {
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
      pricing_p:"აირჩიეთ მუშაობის სიღრმე: მზა ტექსტის გახმოვანებიდან ისტორიის, ტექსტისა და მუსიკალური კონცეფციის სრულ შექმნამდე.",
      tier_select_btn:"არჩევა",
      contact_eyebrow:"დაიწყეთ თქვენი ისტორია",
      contact_h2:"მოგვიყევით თქვენი ისტორია",
      contact_p:"აირჩიეთ პაკეტი და სტილი, მოგვიყევით ადამიანის შესახებ — და ერთი დაწკაპუნებით გამზადებულ განაცხადს გამოგიგზავნით.",
      contact_tg:"დაწერეთ Telegram-ში",
      contact_wa:"WhatsApp",
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

      author_h2:"პროექტის ავტორი და მისი სიმღერები",
      author_p:"ეს სიმღერები შეკვეთით არ დაწერილა. ისინი მოგზაურობებთან, შეხვედრებთან, დანაკარგებთან, იმედთან, არჩევანის თავისუფლებასთან და სიცოცხლის სიყვარულთან ერთად დაიბადა. თითოეული მათგანი ერთი დიდი ისტორიის თავია, რომელიც დღესაც გრძელდება.",
      author_amsterdam_desc:"ეს ისტორია ამსტერდამში, ღრმა ღამით დაიწყო. მე და ჩემი შვილი ცარიელ ქალაქში უბრალოდ წინ მივდიოდით და არ ვიცოდით, რომ ამ ღამეს სამუდამოდ დავიმახსოვრებდით. წითელი შუქები, არხები და სრული თავისუფლების განცდა ერთ დღეს სიმღერად იქცა.",
      author_ukraine_desc:"ეს სიმღერა ეძღვნება მილიონობით უკრაინელს, რომლებიც დღეს სახლიდან შორს არიან. მათ, ვინც კვლავ უყვარს თავისი ქვეყანა, ლოცულობს მისთვის და სჯერა, რომ ერთ დღეს ყველაზე მნიშვნელოვან სიტყვებს იტყვის: „მე სახლში ვარ“.",
      author_mychoice_desc:"ხანდახან ჩვეული ცხოვრება უნდა დაკარგო, რათა საკუთარი იპოვო. ეს სიმღერა იმ დღეს გაჩნდა, როცა გავიგე: თავისუფლება არის უფლება, აირჩიო შენი გზა და საკუთარ თავს ერთგული დარჩე.",
      author_tbilisi_desc:"ხანდახან უცხო ქალაქი მშობლიური ხდება. თბილისმა მაჩუქა ცხოვრების ახალი თავი, ახალი ადამიანები და რწმენა, რომ ყველაფრის თავიდან დაწყება არასოდეს არის გვიანი.",
      author_goodvibe_desc:"ხანდახან მხარდაჭერის, ღიმილისა და თბილი საუბრების რამდენიმე თვე კარგ მუსიკად იქცევა. ეს სიმღერა მადლობაა ცხოვრებისადმი და ერთი ადამიანისადმი მისი ნათელი წუთებისთვის.",
      author_pulse_desc:"მუსიკა მთელი ცხოვრება ჩემ გვერდით იყო. ბას-გიტარა, სცენა, პროჟექტორების შუქი და ათასობით გული, რომლებიც ერთ რიტმში ცემენ. არის მომენტები, რომელთა სიტყვებით აღწერა შეუძლებელია — ისინი მხოლოდ უნდა იგრძნო. ეს არის ისტორია თავისუფლებაზე, მუსიკის ენერგიასა და ღამის პულსზე, რომლის ნაწილიც დღესაც ვარ.",
      author_yayaya_desc:"ზოგჯერ სიმღერა ტკივილისგან კი არა, სუფთა ენერგიისგან იბადება. Ya Ya Ya იმ წამზეა, როცა სხვების აზრს აღარ უყურებ და საკუთარ რიტმში მიდიხარ. გიტარის დრაივი, გზა და მისამღერი, რომლის ერთად სიმღერაც ყველას მოუნდება.",
      author_iwant_desc:"სხვისი განრიგით ცხოვრების მრავალი წლის შემდეგ ერთხელ სიჩუმე დგება — და პირველად აღარავინ გეუბნება, რა უნდა გააკეთო. ეს სიმღერა თავისუფლების უბრალო, თითქმის თამამმა განცდამ დაბადა: დღეს მე თავად ვირჩევ ჩემს დღეს, გზას და ცხოვრებას. „Я роблю що хочу“ ახირება კი არა, საკუთარ თავთან დაბრუნებაა.",
      author_signature:"სიმღერების ავტორი, პროდიუსერი და TuneWrap-ის დამფუძნებელი.",
    },
    en: {
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
      pricing_p:"Choose the depth of the work: from producing a song from ready lyrics to creating the full story, lyrics, and musical concept.",
      tier_select_btn:"Choose",
      contact_eyebrow:"Begin your story",
      contact_h2:"Tell us your story",
      contact_p:"Pick a package and style, tell us about the person — and we'll send a ready order in one click.",
      contact_tg:"Message on Telegram",
      contact_wa:"WhatsApp",
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

      author_h2:"The project author and his songs",
      author_p:"These songs were not written to order. They were born from journeys, encounters, losses, hope, freedom of choice and a love of life. Each one is a chapter in one continuing story.",
      author_amsterdam_desc:"This story began late at night in Amsterdam. My son and I simply kept walking through the empty city, unaware that we would remember that night forever. Red lights, canals and a feeling of absolute freedom eventually became a song.",
      author_ukraine_desc:"This song is dedicated to millions of Ukrainians living far from home today—to those who keep loving their country, praying for it and believing they will one day say the most important words: “I am home.”",
      author_mychoice_desc:"Sometimes you have to lose the life you knew to find your own. This song appeared on the day I understood that freedom is the right to choose your path and remain true to yourself.",
      author_tbilisi_desc:"Sometimes a foreign city becomes home. Tbilisi gave me a new chapter, new people and faith that it is never too late to begin again.",
      author_goodvibe_desc:"Sometimes months of support, smiles and warm conversations turn into good music. This song is a thank-you to life—and to one person—for its brighter moments.",
      author_pulse_desc:"Music has been with me all my life. Bass guitar, the stage, spotlights and thousands of hearts beating in one rhythm. Some moments cannot be described in words — they can only be felt. This is a story about freedom, the energy of music and the pulse of the night that I am still part of.",
      author_yayaya_desc:"Sometimes a song is born not from pain, but from pure energy. Ya Ya Ya is about the moment you stop looking back at other people’s opinions and move in your own rhythm. Guitar drive, the open road and a chorus made to be sung together.",
      author_iwant_desc:"After years of living by someone else’s schedule, silence finally arrives—and for the first time nobody tells you what you must do. This song was born from a simple, almost defiant feeling of freedom: today I choose my own day, my own path and my own life. “I do what I want” is not a whim; it is a return to yourself.",
      author_signature:"Songwriter, producer and founder of TuneWrap.",
    },
    de: {
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
      pricing_p:"Wählen Sie die Arbeitstiefe: vom Song nach einem fertigen Text bis zur vollständigen Entwicklung von Geschichte, Liedtext und musikalischem Konzept.",
      tier_select_btn:"Wählen",
      contact_eyebrow:"Ihre Geschichte beginnen",
      contact_h2:"Erzählen Sie uns Ihre Geschichte",
      contact_p:"Wähle Paket und Stil, erzähl uns von der Person — und wir schicken dir eine fertige Bestellung per Klick.",
      contact_tg:"Auf Telegram schreiben",
      contact_wa:"WhatsApp",
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

      author_h2:"Der Autor des Projekts und seine Songs",
      author_p:"Diese Songs wurden nicht im Auftrag geschrieben. Sie entstanden aus Reisen, Begegnungen, Verlusten, Hoffnung, Entscheidungsfreiheit und Liebe zum Leben. Jeder von ihnen ist ein Kapitel einer großen Geschichte, die bis heute weitergeht.",
      author_amsterdam_desc:"Diese Geschichte begann tief in der Nacht in Amsterdam. Mein Sohn und ich gingen einfach durch die leere Stadt, ohne zu ahnen, dass wir diese Nacht nie vergessen würden. Rote Lichter, Kanäle und ein Gefühl grenzenloser Freiheit wurden später zu einem Song.",
      author_ukraine_desc:"Dieser Song ist Millionen Ukrainern gewidmet, die heute fern von zu Hause leben. Menschen, die ihr Land weiter lieben, für es beten und daran glauben, eines Tages die wichtigsten Worte sagen zu können: „Ich bin zu Hause.“",
      author_mychoice_desc:"Manchmal muss man das vertraute Leben verlieren, um das eigene zu finden. Dieser Song entstand an dem Tag, an dem ich verstand: Freiheit bedeutet, den eigenen Weg wählen und sich selbst treu bleiben zu dürfen.",
      author_tbilisi_desc:"Manchmal wird eine fremde Stadt zur Heimat. Tbilisi schenkte mir ein neues Kapitel, neue Menschen und den Glauben daran, dass es nie zu spät ist, neu anzufangen.",
      author_goodvibe_desc:"Manchmal werden Monate voller Unterstützung, Lächeln und warmer Gespräche zu guter Musik. Dieser Song ist ein Dank an das Leben und an einen Menschen für seine hellen Momente.",
      author_pulse_desc:"Musik war mein ganzes Leben lang an meiner Seite. Bassgitarre, Bühne, Scheinwerfer und Tausende Herzen, die im gleichen Rhythmus schlagen. Manche Momente lassen sich nicht in Worte fassen — man kann sie nur fühlen. Dies ist eine Geschichte über Freiheit, die Energie der Musik und den Puls der Nacht, zu dem ich bis heute gehöre.",
      author_yayaya_desc:"Manchmal entsteht ein Song nicht aus Schmerz, sondern aus reiner Energie. Ya Ya Ya handelt von dem Moment, in dem man nicht mehr auf die Meinung anderer zurückblickt und im eigenen Rhythmus weitergeht. Gitarrendrive, Straße und ein Refrain, den man gemeinsam singen möchte.",
      author_iwant_desc:"Nach vielen Jahren nach dem Zeitplan anderer kommt plötzlich Stille—und zum ersten Mal sagt niemand mehr, was man tun muss. Dieser Song entstand aus einem einfachen, fast trotzigen Gefühl von Freiheit: Heute bestimme ich meinen Tag, meinen Weg und mein Leben selbst. „Ich mache, was ich will“ ist keine Laune, sondern die Rückkehr zu sich selbst.",
      author_signature:"Songwriter, Produzent und Gründer von TuneWrap.",
    }
  };

  const TIERS = {
    ru: [
      {name:"Просто", price:"39", badge:null, features:["Ваш текст или идея — в песне","1 стиль на выбор","Базовый монтаж дублей","Доставка 48–72 часа"]},
      {name:"Продвинутый", price:"89", badge:"Популярный", features:["Всё из тарифа «Просто»","Ручной отбор дублей и сведение","До 2 бесплатных правок текста","Доставка 24–48 часов"]},
      {name:"Хит", price:"179", badge:null, features:["Всё из тарифа «Продвинутый»","Углублённая продюсерская работа","Правки текста до утверждения","Инструментальная версия в подарок"]}
    ],
    uk: [
      {name:"Просто", price:"39", badge:null, features:["Ваш текст або ідея — у пісні","1 стиль на вибір","Базовий монтаж дублів","Доставка 48–72 години"]},
      {name:"Просунутий", price:"89", badge:"Популярний", features:["Все з тарифу «Просто»","Ручний відбір дублів і зведення","До 2 безкоштовних правок тексту","Доставка 24–48 годин"]},
      {name:"Хіт", price:"179", badge:null, features:["Все з тарифу «Просунутий»","Поглиблена продюсерська робота","Правки тексту до затвердження","Інструментальна версія в подарунок"]}
    ],
    ka: [
      {name:"მარტივი", price:"39", badge:null, features:["თქვენი ტექსტი ან იდეა — სიმღერაში","1 სტილი არჩევანით","დუბლების საბაზისო მონტაჟი","მიწოდება 48–72 საათში"]},
      {name:"გაძლიერებული", price:"89", badge:"პოპულარული", features:["ყველაფერი «მარტივიდან»","საუკეთესო დუბლების ხელით შერჩევა","ტექსტის 2 უფასო შესწორებამდე","მიწოდება 24–48 საათში"]},
      {name:"ჰიტი", price:"179", badge:null, features:["ყველაფერი «გაძლიერებულიდან»","ღრმა პროდიუსერული მუშაობა","ტექსტის შესწორება დამტკიცებამდე","საჩუქრად საკარაოკე ვერსია"]}
    ],
    en: [
      {name:"Simple", price:"39", badge:null, features:["Your text or idea, turned into a song","1 style of your choice","Basic take editing","Delivery in 48–72 hours"]},
      {name:"Advanced", price:"89", badge:"Popular", features:["Everything in Simple","Hand-picked takes and mixing","Up to 2 free lyric revisions","Delivery in 24–48 hours"]},
      {name:"Hit", price:"179", badge:null, features:["Everything in Advanced","Deeper production work","Revisions until you approve","Free instrumental version"]}
    ],
    de: [
      {name:"Einfach", price:"39", badge:null, features:["Dein Text oder deine Idee wird zum Song","1 Stil deiner Wahl","Einfaches Take-Editing","Lieferung in 48–72 Stunden"]},
      {name:"Fortgeschritten", price:"89", badge:"Beliebt", features:["Alles aus „Einfach“","Handverlesene Takes und Mixing","Bis zu 2 kostenlose Textkorrekturen","Lieferung in 24–48 Stunden"]},
      {name:"Hit", price:"179", badge:null, features:["Alles aus „Fortgeschritten“","Vertiefte Produktionsarbeit","Korrekturen bis zur Freigabe","Instrumentalversion gratis"]}
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
  let selectedStyles = [];
  let currentMode = 'order';

  function t(key){ return (I18N[currentLang] || I18N.ru)[key] || ''; }

  function renderTiers(lang){
    const grid = document.getElementById('tiersGrid');
    grid.innerHTML = '';
    TIERS[lang].forEach((tier, i)=>{
      const card = document.createElement('div');
      card.className = 'tier-card' + (i===1 ? ' featured' : '') + (selectedTierIdx===i ? ' selected' : '');
      card.innerHTML =
        (tier.badge ? '<div class="tier-badge">'+tier.badge+'</div>' : '') +
        '<div class="tier-name">'+tier.name+'</div>' +
        '<div class="tier-price">$'+tier.price+' <small>USD</small></div>' +
        '<ul class="tier-features">' + tier.features.map(f=>'<li>'+f+'</li>').join('') + '</ul>' +
        '<button type="button" class="tier-select" data-idx="'+i+'">'+t('tier_select_btn')+'</button>';
      card.querySelector('.tier-select').addEventListener('click', ()=>{
        selectedTierIdx = i;
        document.getElementById('sumTier').textContent = TIERS[currentLang][i].name + ' ($' + TIERS[currentLang][i].price + ')';
        updateSummaryTotal();
        renderTiers(currentLang);
      });
      grid.appendChild(card);
    });
  }

  function updateSummaryTotal(){
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
    sel.innerHTML = '<option value="" disabled selected>'+t('occasion_placeholder')+'</option>' +
      OCCASIONS[lang].map(o=>'<option value="'+o+'">'+o+'</option>').join('');
    if(OCCASIONS[lang].includes(prevValue)) sel.value = prevValue;
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
    renderStyles(lang);
    renderOccasions(lang);
    renderGolden(lang);
    renderStoryExamples(lang);
    renderCorpTiers(lang);
    updateSummaryTotal();
    updateCorpTotal();
    if(selectedTierIdx !== null){
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
    renderDynamic(lang);
  }

  buttons.forEach(btn=>{
    btn.addEventListener('click', ()=> applyLang(btn.getAttribute('data-lang')));
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
  document.getElementById('corpQty').addEventListener('input', updateCorpTotal);
  document.getElementById('corpTier').addEventListener('change', updateCorpTotal);

  // golden questions toggle
  document.getElementById('goldenToggle').addEventListener('click', function(){
    document.getElementById('goldenBox').classList.toggle('open');
  });

  // generate order
  document.getElementById('btnGenerate').addEventListener('click', function(){
    const tier = selectedTierIdx !== null ? TIERS[currentLang][selectedTierIdx] : null;
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
    lines.push(t('msg_package')+': ' + (tier ? tier.name+' ($'+tier.price+')' : dash));
    if(urgent) lines.push(t('msg_urgent') + ' (+$25)');
    lines.push(t('summary_total') + ' $' + (tier ? totalPrice : 0));
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
