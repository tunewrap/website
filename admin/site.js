const LANGUAGES=['ru','uk','ka','en','de'];
const AI_CODES={ru:'RU',uk:'UA',ka:'GE',en:'EN',de:'DE'};

const GROUPS=[
  {
    number:'01',title:'Шапка и главная',description:'Логотип не меняется. Здесь — подписи, Hero и главные кнопки.',
    fields:[
      ['tagline','Подпись под TuneWrap','input'],
      ['nav_cta','Кнопка в шапке','input'],
      ['hero_eyebrow','Метка Hero','input'],
      ['brand_manifesto','Короткая фраза бренда','textarea'],
      ['hero_h1','Главный заголовок desktop','input','*слово* = золотой акцент'],
      ['mobile_hero_h1','Главный заголовок mobile','input','*слово* = золотой акцент'],
      ['hero_lead','Текст Hero','textarea','Переносы строк сохраняются'],
      ['hero_btn_order','Главная кнопка','input'],
      ['hero_btn_listen','Кнопка «Послушать истории»','input'],
      ['hero_btn_author','Кнопка автора','input']
    ]
  },
  {
    number:'02',title:'Философия TuneWrap',description:'Текст блока «Сначала — ваша история».',
    fields:[
      ['philosophy_kicker','Метка раздела','input'],
      ['philosophy_quote','Главная цитата','textarea','Переносы строк сохраняются'],
      ['philosophy_text','Описание философии','textarea']
    ]
  },
  {
    number:'03',title:'Как это работает',description:'Заголовок и три шага.',
    fields:[
      ['how_eyebrow','Метка раздела','input'],
      ['how_h2','Заголовок','input'],
      ['step1_title','Шаг 1 — заголовок','input'],
      ['step1_desc','Шаг 1 — текст','textarea'],
      ['step2_title','Шаг 2 — заголовок','input'],
      ['step2_desc','Шаг 2 — текст','textarea'],
      ['step3_title','Шаг 3 — заголовок','input'],
      ['step3_desc','Шаг 3 — текст','textarea']
    ]
  },
  {
    number:'04',title:'Истории и авторские',description:'Заголовки библиотек. Сами песни редактируются во вкладке «Музыка».',
    fields:[
      ['tracks_eyebrow','Истории — метка','input'],
      ['tracks_h2','Истории — заголовок','input'],
      ['tracks_p','Истории — описание','textarea'],
      ['stories_open_all','Кнопка всех историй','input'],
      ['author_eyebrow','Авторские — метка','input'],
      ['author_h2','Авторские — заголовок','input'],
      ['author_showcase_p','Авторские — описание','textarea'],
      ['author_open_library','Кнопка авторской библиотеки','input'],
      ['author_signature','Подпись автора','textarea','*текст* = курсив; переносы строк сохраняются']
    ]
  },
  {
    number:'05',title:'Рассказать свою историю',description:'Вход в форму и три карточки выбора.',
    fields:[
      ['contact_eyebrow','Метка раздела','input'],
      ['contact_h2','Заголовок','input'],
      ['contact_p','Описание','textarea'],
      ['path_order_title','Заказать песню — название','input'],
      ['path_order_desc','Заказать песню — описание','textarea'],
      ['path_order_action','Заказать песню — кнопка','input'],
      ['path_certificate_title','Сертификат — название','input'],
      ['path_certificate_desc','Сертификат — описание','textarea'],
      ['path_certificate_action','Сертификат — кнопка','input'],
      ['path_corporate_title','Корпоративная — название','input'],
      ['path_corporate_desc','Корпоративная — описание','textarea'],
      ['path_corporate_action','Корпоративная — кнопка','input']
    ]
  },
  {
    number:'06',title:'Форма заявки',description:'Основные подписи формы. Цены и пакеты остаются во вкладке «Стоимость».',
    fields:[
      ['mode_order','Режим «Заказать песню»','input'],
      ['mode_certificate','Режим «Сертификат»','input'],
      ['mode_order_hint','Подсказка формы','textarea'],
      ['label_style','Стиль песни','input'],
      ['style_hint','Подсказка стилей','input'],
      ['label_name','Поле имени','input'],
      ['label_occasion','Поле события','input'],
      ['label_other_occasion','Другое событие','input'],
      ['story_core_title','Главный вопрос истории','input'],
      ['story_core_hint','Подсказка к вопросу','textarea'],
      ['story_core_note','Нижняя подсказка','textarea'],
      ['label_description','Описание человека / текст','input'],
      ['golden_toggle','Кнопка дополнительных вопросов','textarea'],
      ['label_contact','Контакт клиента','input'],
      ['btn_generate','Кнопка сформировать заявку','input'],
      ['preview_title','Заголовок готовой заявки','input'],
      ['contact_wa','Кнопка WhatsApp','input'],
      ['contact_tg','Кнопка Telegram','input'],
      ['btn_copy','Кнопка копирования','input']
    ],
    placeholders:[
      ['placeholder_name','Имя — placeholder'],
      ['placeholder_other_occasion','Другое событие — placeholder'],
      ['placeholder_story_core','Главное — placeholder'],
      ['placeholder_description','Описание — placeholder'],
      ['placeholder_contact','Контакт — placeholder']
    ]
  },
  {
    number:'07',title:'Корпоративные клиенты и Контакты',description:'Корпоративная панель, Контакт-центр, навигация и условия.',
    fields:[
      ['corp_panel_label','Корпоративная метка','input'],
      ['corp_eyebrow','Корпоративный eyebrow','input'],
      ['corp_h2','Корпоративный заголовок','input'],
      ['corp_p','Корпоративный текст','textarea'],
      ['corp_qty_label','Количество песен','input'],
      ['corp_tier_label','Базовый пакет','input'],
      ['corp_btn','Корпоративная кнопка','input'],
      ['contact_hub_title','Контакты — заголовок','input'],
      ['contact_hub_subtitle','Контакты — подзаголовок','input'],
      ['contact_payment_title','Оплата — заголовок','input'],
      ['contact_payment_pending','Оплата — текст без карточек','textarea'],
      ['contact_about_title','Колонка «О нас»','input'],
      ['contact_info_title','Колонка «Информация»','input'],
      ['contact_nav_philosophy','Ссылка: Философия','input'],
      ['contact_nav_process','Ссылка: Как это работает','input'],
      ['contact_nav_stories','Ссылка: Истории','input'],
      ['contact_nav_pricing','Ссылка: Стоимость','input'],
      ['contact_nav_author','Ссылка: Авторские','input'],
      ['contact_nav_order','Ссылка: Рассказать историю','input'],
      ['contact_nav_corporate','Ссылка: Корпоративные','input'],
      ['contact_nav_wedding','Ссылка: Свадебный формат','input'],
      ['contact_nav_contacts','Ссылка: Контакты','input'],
      ['contact_nav_payment','Ссылка: Оплата','input'],
      ['contact_nav_terms','Ссылка: Условия использования','input'],
      ['contact_nav_write','Ссылка: Написать нам','input'],
      ['footer_location','География / подпись внизу','input'],
      ['terms_title','Условия — заголовок','input'],
      ['terms_intro','Условия — вступление','textarea'],
      ['terms_body','Условия использования — полный текст','textarea','Пока поле пустое, ссылка на сайте остаётся неактивной.']
    ]
  }
];

const CHANNELS=[
  ['whatsapp','WhatsApp','Номер или ссылка'],
  ['telegram','Telegram','@username или ссылка'],
  ['instagram','Instagram','Ссылка профиля'],
  ['tiktok','TikTok','Ссылка профиля'],
  ['youtube','YouTube','Ссылка канала'],
  ['email','Email','Email или mailto:']
];

const state={config:null,language:'ru',dirty:false,busy:false,audit:null};

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

function toast(message,type=''){
  const region=$('#siteToastRegion');
  if(!region)return;
  const node=document.createElement('div');
  node.className='toast'+(type?` ${type}`:'');
  node.textContent=message;
  region.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
  setTimeout(()=>{node.classList.remove('show');setTimeout(()=>node.remove(),250);},2800);
}

function ensureLocale(bucket,lang){
  bucket ||= {};
  bucket.locales ||= {};
  bucket.locales[lang] ||= {};
  return bucket.locales[lang];
}
function texts(){return ensureLocale(state.config.texts,state.language);}
function placeholders(){return ensureLocale(state.config.placeholders,state.language);}

function markDirty(){
  state.dirty=true;
  $('#siteSaveBar')?.classList.add('is-dirty');
  if($('#siteDirtyLabel'))$('#siteDirtyLabel').textContent='Есть несохранённые изменения';
}

function markSaved(audit){
  state.dirty=false;
  state.audit=audit||state.audit;
  $('#siteSaveBar')?.classList.remove('is-dirty');
  if($('#siteDirtyLabel'))$('#siteDirtyLabel').textContent='Все изменения сохранены';
  renderAudit();
}

function renderAudit(){
  const node=$('#siteAudit');
  if(!node)return;
  if(!state.audit?.updatedAt){node.textContent='—';return;}
  const date=new Date(state.audit.updatedAt);
  node.textContent=`Обновлено ${Number.isNaN(date.getTime())?state.audit.updatedAt:date.toLocaleString('ru-RU')}${state.audit.lastEditedBy?` · ${state.audit.lastEditedBy}`:''}`;
}

function makeField(label,value,onInput,{textarea=false,wide=false,help=''}={}){
  const wrap=document.createElement('label');
  wrap.className='field'+(wide?' site-field-wide':'');
  const title=document.createElement('span');
  title.textContent=label;
  wrap.appendChild(title);

  const input=textarea?document.createElement('textarea'):document.createElement('input');
  if(textarea)input.rows=textarea===true?4:textarea;
  input.value=value??'';
  input.addEventListener('input',()=>{onInput(input.value);markDirty();});
  wrap.appendChild(input);

  if(help){
    const hint=document.createElement('small');
    hint.className='site-field-help';
    hint.textContent=help;
    wrap.appendChild(hint);
  }
  return wrap;
}

function renderTextSections(){
  const root=$('#siteTextSections');
  root.innerHTML='';
  const textLocale=texts();
  const placeholderLocale=placeholders();

  GROUPS.forEach(group=>{
    const section=document.createElement('section');
    section.className='form-section site-section';
    section.innerHTML=`<div class="section-heading"><span>${group.number}</span><div><h2>${group.title}</h2><p>${group.description}</p></div></div>`;

    const grid=document.createElement('div');
    grid.className='site-fields-grid';

    group.fields.forEach(([key,label,type,help])=>{
      const isTextArea=type==='textarea';
      const wide=isTextArea||key==='hero_lead'||key==='terms_body';
      grid.appendChild(makeField(label,textLocale[key]||'',value=>{textLocale[key]=value;},{
        textarea:isTextArea?(key==='terms_body'?12:4):false,
        wide,
        help:help||''
      }));
    });

    if(group.placeholders?.length){
      group.placeholders.forEach(([key,label])=>{
        grid.appendChild(makeField(label,placeholderLocale[key]||'',value=>{placeholderLocale[key]=value;}));
      });
    }

    section.appendChild(grid);
    if(group.number==='01'||group.number==='04'){
      const hint=document.createElement('p');
      hint.className='site-rich-hint';
      hint.innerHTML='Подсказка: <code>*текст*</code> сохраняет акцент/курсив там, где он предусмотрен дизайном.';
      section.appendChild(hint);
    }
    root.appendChild(section);
  });
}

function normalizeContactUrl(kind,value,url){
  const explicit=String(url||'').trim();
  if(explicit)return explicit;
  const raw=String(value||'').trim();
  if(!raw)return '';
  if(kind==='whatsapp'){
    const digits=raw.replace(/\D+/g,'');
    return digits?`https://wa.me/${digits}`:'';
  }
  if(kind==='telegram'){
    const handle=raw.replace(/^@/,'').replace(/^https?:\/\/t\.me\//i,'').split(/[/?#]/)[0];
    return handle?`https://t.me/${handle}`:'';
  }
  if(kind==='email'){
    const address=raw.replace(/^mailto:/i,'');
    return address?`mailto:${address}`:'';
  }
  return /^https?:\/\//i.test(raw)?raw:'';
}

function renderContacts(){
  const root=$('#siteContactEditors');
  root.innerHTML='';
  state.config.contacts ||= {primary:'telegram',channels:{}};
  state.config.contacts.channels ||= {};
  $('#sitePrimaryContact').value=state.config.contacts.primary||'telegram';

  CHANNELS.forEach(([kind,title,help])=>{
    const channel=state.config.contacts.channels[kind] ||= {enabled:false,label:title,value:'',url:''};

    const card=document.createElement('article');
    card.className='site-editor-card'+(channel.enabled?'':' is-disabled');

    const head=document.createElement('div');
    head.className='site-card-head';
    head.innerHTML=`<div><small>КАНАЛ СВЯЗИ</small><strong>${title}</strong></div>`;

    const toggle=document.createElement('label');
    toggle.className='site-enabled';
    const check=document.createElement('input');
    check.type='checkbox';
    check.checked=channel.enabled===true;
    check.addEventListener('change',()=>{
      channel.enabled=check.checked;
      markDirty();
      renderContacts();
    });
    toggle.append(check,document.createTextNode('Показывать на сайте'));
    head.appendChild(toggle);
    card.appendChild(head);

    card.append(
      makeField('Подпись',channel.label,value=>{channel.label=value;}),
      makeField(help,channel.value,value=>{
        channel.value=value;
        if(!channel.url)channel.url=normalizeContactUrl(kind,value,'');
      }),
      makeField('Прямая ссылка',channel.url,value=>{channel.url=value;},{
        help:'Можно оставить пустым: для WhatsApp / Telegram / Email ссылка соберётся из поля выше.'
      })
    );
    root.appendChild(card);
  });
}

function paymentLocale(payment){
  payment.locales ||= {};
  payment.locales[state.language] ||= {title:'',subtitle:'',note:''};
  return payment.locales[state.language];
}

function addPayment(){
  state.config.payments ||= [];
  const id=`payment-${Date.now().toString(36)}`;
  const payment={
    id,enabled:true,order:state.config.payments.length+1,url:'',
    locales:{[state.language]:{title:'Новый способ оплаты',subtitle:'',note:''}}
  };
  state.config.payments.push(payment);
  markDirty();
  renderPayments();
}

function renderPayments(){
  const root=$('#sitePaymentEditors');
  const empty=$('#sitePaymentsEmpty');
  root.innerHTML='';
  state.config.payments ||= [];

  [...state.config.payments].sort((a,b)=>(a.order||99)-(b.order||99)).forEach(payment=>{
    const loc=paymentLocale(payment);
    const card=document.createElement('article');
    card.className='site-editor-card'+(payment.enabled===false?' is-disabled':'');

    const head=document.createElement('div');
    head.className='site-card-head';
    head.innerHTML=`<div><small>СПОСОБ ОПЛАТЫ</small><strong>${loc.title||payment.id}</strong></div>`;

    const toggle=document.createElement('label');
    toggle.className='site-enabled';
    const check=document.createElement('input');
    check.type='checkbox';
    check.checked=payment.enabled!==false;
    check.addEventListener('change',()=>{payment.enabled=check.checked;markDirty();renderPayments();});
    toggle.append(check,document.createTextNode('Показывать'));
    head.appendChild(toggle);
    card.appendChild(head);

    const row=document.createElement('div');
    row.className='site-payment-price-row';
    row.append(
      makeField('Порядок',payment.order,value=>{payment.order=Math.max(1,Number(value)||1);}),
      makeField('Ссылка (необязательно)',payment.url,value=>{payment.url=value;})
    );
    card.appendChild(row);

    card.append(
      makeField('Название карточки',loc.title,value=>{loc.title=value;head.querySelector('strong').textContent=value||payment.id;}),
      makeField('Короткое описание',loc.subtitle,value=>{loc.subtitle=value;},{textarea:3}),
      makeField('Метка / примечание',loc.note,value=>{loc.note=value;})
    );

    const remove=document.createElement('button');
    remove.className='site-remove-button';
    remove.type='button';
    remove.textContent='Удалить карточку';
    remove.addEventListener('click',()=>{
      if(!confirm('Удалить эту карточку оплаты?'))return;
      state.config.payments=state.config.payments.filter(item=>item!==payment);
      markDirty();
      renderPayments();
    });
    card.appendChild(remove);
    root.appendChild(card);
  });

  empty.hidden=state.config.payments.length>0;
}

function renderLanguage(){
  $$('#siteLanguageTabs button').forEach(button=>button.classList.toggle('is-active',button.dataset.language===state.language));
  const names={ru:'RU',uk:'UA',ka:'GE',en:'EN',de:'DE'};
  $('#siteLanguageHint').textContent=`Редактируется ${names[state.language]}. Пустые поля оставляют встроенный перевод сайта.`;
}

function renderAnnouncement(){
  let section=$('#siteAnnouncementSection');
  if(!section){
    section=document.createElement('section');
    section.id='siteAnnouncementSection';
    section.className='form-section site-section site-announcement-admin';
    $('#siteSaveBar')?.insertAdjacentElement('beforebegin',section);
  }

  state.config.announcement ||= {enabled:false,startDate:'',endDate:''};
  const announcement=state.config.announcement;
  const locale=texts();

  section.replaceChildren();

  const heading=document.createElement('div');
  heading.className='section-heading';
  heading.innerHTML='<span>10</span><div><h2>Новости / уведомление на главной</h2><p>Акции, важные сообщения, временная недоступность и другие объявления. Можно задать период показа.</p></div>';
  section.appendChild(heading);

  const controls=document.createElement('div');
  controls.className='site-announcement-controls';

  const enabled=document.createElement('label');
  enabled.className='site-announcement-switch';
  const checkbox=document.createElement('input');
  checkbox.type='checkbox';
  checkbox.checked=announcement.enabled===true;
  checkbox.addEventListener('change',()=>{announcement.enabled=checkbox.checked;markDirty();});
  enabled.append(checkbox,document.createTextNode('Показывать на главной'));
  controls.appendChild(enabled);

  const dateField=(label,key)=>{
    const wrap=document.createElement('label');
    wrap.className='site-announcement-date';
    const title=document.createElement('span');
    title.textContent=label;
    const input=document.createElement('input');
    input.type='date';
    input.value=announcement[key]||'';
    input.addEventListener('change',()=>{announcement[key]=input.value;markDirty();});
    wrap.append(title,input);
    return wrap;
  };

  controls.append(
    dateField('Показывать с','startDate'),
    dateField('Показывать до','endDate')
  );
  section.appendChild(controls);

  const grid=document.createElement('div');
  grid.className='site-fields-grid';
  grid.append(
    makeField('Метка',locale.announcement_label||'',value=>{locale.announcement_label=value;},{help:'Например: НОВОСТИ, ВАЖНО, АКЦИЯ'}),
    makeField('Заголовок',locale.announcement_title||'',value=>{locale.announcement_title=value;},{wide:true}),
    makeField('Текст объявления',locale.announcement_text||'',value=>{locale.announcement_text=value;},{textarea:4,wide:true})
  );
  section.appendChild(grid);

  const note=document.createElement('p');
  note.className='site-announcement-note';
  note.textContent='Тексты объявления участвуют в кнопке «Автоперевести язык». Если период не указан, объявление показывается постоянно, пока включён переключатель.';
  section.appendChild(note);
}

function render(){
  if(!state.config)return;
  renderLanguage();
  renderTextSections();
  renderContacts();
  renderPayments();
  renderAnnouncement();
  renderAudit();
}

async function load(){
  if(state.busy)return;
  state.busy=true;
  try{
    const response=await fetch('/api/admin/site-content',{headers:{accept:'application/json'},cache:'no-store'});
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.ok)throw new Error(data?.error||`HTTP ${response.status}`);
    state.config=data.config;
    state.audit={updatedAt:data.updatedAt,lastEditedBy:data.lastEditedBy};
    render();
    markSaved(state.audit);
  }catch(error){
    console.error(error);
    toast(`Не удалось загрузить Site CMS: ${error.message}`,'error');
  }finally{
    state.busy=false;
  }
}

async function save(){
  if(!state.config||state.busy)return;
  state.busy=true;
  const buttons=[$('#saveSiteButton'),$('#saveSiteBottomButton')].filter(Boolean);
  buttons.forEach(button=>{button.disabled=true;button.textContent='Сохраняем…';});

  try{
    const response=await fetch('/api/admin/site-content',{
      method:'PUT',
      headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({config:state.config})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.ok)throw new Error(data?.error||`HTTP ${response.status}`);

    state.config=data.config;
    markSaved({updatedAt:data.updatedAt,lastEditedBy:data.lastEditedBy});
    render();
    toast('Сайт сохранён. Новые тексты и контакты уже доступны публичной странице.','success');
  }catch(error){
    console.error(error);
    toast(`Не удалось сохранить: ${error.message}`,'error');
  }finally{
    state.busy=false;
    buttons.forEach(button=>{
      button.disabled=false;
      button.textContent=button.id==='saveSiteButton'?'Сохранить':'Сохранить изменения';
    });
  }
}

function translationEntries(source){
  const entries=[];
  const sourceTexts=ensureLocale(state.config.texts,source);
  Object.entries(sourceTexts).forEach(([key,text])=>{
    if(!String(text||'').trim())return;
    entries.push({
      id:`text.${key}`,text,
      set:(target,value)=>{ensureLocale(state.config.texts,target)[key]=value;}
    });
  });

  const sourcePlaceholders=ensureLocale(state.config.placeholders,source);
  Object.entries(sourcePlaceholders).forEach(([key,text])=>{
    if(!String(text||'').trim())return;
    entries.push({
      id:`ph.${key}`,text,
      set:(target,value)=>{ensureLocale(state.config.placeholders,target)[key]=value;}
    });
  });

  (state.config.payments||[]).forEach(payment=>{
    const loc=payment.locales?.[source];
    if(!loc)return;
    ['title','subtitle','note'].forEach(key=>{
      const text=loc[key];
      if(!String(text||'').trim())return;
      entries.push({
        id:`payment.${payment.id}.${key}`,text,
        set:(target,value)=>{
          payment.locales ||= {};
          payment.locales[target] ||= {title:'',subtitle:'',note:''};
          payment.locales[target][key]=value;
        }
      });
    });
  });

  return entries;
}

async function translateChunk(source,target,items){
  const response=await fetch('/api/admin/translate',{
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({
      sourceLanguage:AI_CODES[source],
      target:AI_CODES[target],
      items:items.map(item=>({id:item.id,text:item.text}))
    })
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw new Error(data?.error||`HTTP ${response.status}`);
  return data.translations||{};
}

async function autoTranslate(){
  if(!state.config||state.busy)return;
  const source=state.language;
  const targets=LANGUAGES.filter(lang=>lang!==source);
  const entries=translationEntries(source);
  if(!entries.length){toast('В текущем языке нет текста для перевода.','error');return;}

  if(!confirm(`Перевести ${AI_CODES[source]} во все остальные языки? Существующие переводы этих полей будут обновлены.`))return;

  const button=$('#translateSiteButton');
  state.busy=true;
  button.disabled=true;
  try{
    for(const target of targets){
      for(let offset=0;offset<entries.length;offset+=8){
        const chunk=entries.slice(offset,offset+8);
        button.textContent=`${AI_CODES[target]} · ${Math.min(offset+8,entries.length)}/${entries.length}`;
        const translated=await translateChunk(source,target,chunk);
        chunk.forEach(entry=>{
          const value=translated[entry.id];
          if(typeof value==='string'&&value.trim())entry.set(target,value.trim());
        });
      }
    }
    markDirty();
    render();
    toast('Переводы подготовлены. Нажмите «Сохранить».','success');
  }catch(error){
    console.error(error);
    toast(`Автоперевод остановлен: ${error.message}`,'error');
  }finally{
    state.busy=false;
    button.disabled=false;
    button.textContent='Автоперевести язык';
  }
}

function init(){
  $('#refreshSiteButton')?.addEventListener('click',()=>{
    if(!state.dirty||confirm('Отменить несохранённые изменения?'))load();
  });
  $('#saveSiteButton')?.addEventListener('click',save);
  $('#saveSiteBottomButton')?.addEventListener('click',save);
  $('#translateSiteButton')?.addEventListener('click',autoTranslate);
  $('#addPaymentButton')?.addEventListener('click',addPayment);

  $('#sitePrimaryContact')?.addEventListener('change',event=>{
    state.config.contacts.primary=event.target.value;
    markDirty();
  });

  $('#siteLanguageTabs')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-language]');
    if(!button)return;
    state.language=button.dataset.language;
    render();
  });

  window.addEventListener('beforeunload',event=>{
    if(!state.dirty)return;
    event.preventDefault();
    event.returnValue='';
  });

  load();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
