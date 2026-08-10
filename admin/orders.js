const $=selector=>document.querySelector(selector);
const state={orders:[],summary:null,tab:'all',query:'',current:null,busy:false};

const STATUS_LABELS={
  new:'Новая',
  in_progress:'В работе',
  waiting_client:'Ожидает клиента',
  done:'Готово',
  archived:'Архив'
};

const TYPE_LABELS={
  order:'Обычный заказ',
  certificate:'Сертификат',
  wedding:'Свадебный пакет',
  corporate:'Корпоративный'
};

function el(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

function toast(message,error=false){
  const region=$('#ordersToastRegion');
  const item=el('div','toast'+(error?' is-error':''),message);
  region.append(item);
  setTimeout(()=>item.remove(),4200);
}

async function api(path,options={}){
  const headers=new Headers(options.headers||{});
  headers.set('accept','application/json');
  if(options.body)headers.set('content-type','application/json');
  const response=await fetch(path,{
    ...options,
    headers,
    body:options.body?JSON.stringify(options.body):undefined
  });
  let payload=null;
  try{payload=await response.json();}catch(error){}
  if(!response.ok)throw new Error(payload?.error||`HTTP ${response.status}`);
  return payload;
}

function setBusy(value){
  state.busy=value;
  document.querySelectorAll('#orderEditor button').forEach(button=>button.disabled=value);
}

function formatDate(value){
  if(!value)return '—';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return value;
  return new Intl.DateTimeFormat('ru-RU',{
    day:'2-digit',month:'2-digit',year:'2-digit',
    hour:'2-digit',minute:'2-digit'
  }).format(date);
}

function summary(){
  const s=state.summary||{total:0,new:0,in_progress:0,waiting_client:0,done:0,archived:0};
  $('#ordersTotalLabel').textContent=s.total;
  $('#metricNew').textContent=s.new;
  $('#metricProgress').textContent=s.in_progress;
  $('#metricWaiting').textContent=s.waiting_client;
  $('#metricDone').textContent=s.done;
}

function searchable(order){
  return [
    order.id,order.name,order.contact,order.occasion,order.occasionDetail,order.storyCore,
    order.description,order.tierLabel,order.weddingPackageLabel,...(order.styles||[]),
    ...(order.instruments||[]),order.soundPrompt
  ].join(' ').toLocaleLowerCase();
}

function filteredOrders(){
  const q=state.query.trim().toLocaleLowerCase();
  return state.orders.filter(order=>{
    if(state.tab!=='all'&&order.status!==state.tab)return false;
    if(!q)return true;
    return searchable(order).includes(q);
  });
}

function row(order){
  const item=el('article','order-row');
  item.tabIndex=0;
  item.dataset.id=order.id;

  const client=el('div','order-client');
  client.append(el('strong','',order.name||'Без имени'),el('small','',order.contact||'—'));

  const request=el('div','order-request');
  const label=order.weddingPackageLabel||order.tierLabel||TYPE_LABELS[order.orderType]||order.orderType;
  request.append(el('strong','',label||'Заявка'),el('small','',order.occasion||order.storyCore||order.id));

  const date=el('span','order-date',formatDate(order.createdAt));
  const status=el('span','order-status',STATUS_LABELS[order.status]||order.status);
  status.dataset.status=order.status;

  const open=el('button','order-open','›');
  open.type='button';
  open.setAttribute('aria-label','Открыть заявку');

  const openOrder=()=>openEditor(order);
  open.addEventListener('click',event=>{event.stopPropagation();openOrder();});
  item.addEventListener('click',openOrder);
  item.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();
    openOrder();
  });

  item.append(client,request,date,status,open);
  return item;
}

function render(){
  const items=filteredOrders();
  $('#orderList').replaceChildren(...items.map(row));
  $('#ordersEmptyState').hidden=items.length>0;
}

async function loadOrders(message=''){
  try{
    const data=await api('/api/admin/orders');
    state.orders=data.orders||[];
    state.summary=data.summary||null;
    summary();
    render();
    if(message)toast(message);
  }catch(error){
    toast(error.message,true);
    $('#orderList').replaceChildren(el('p','empty-state','Не удалось загрузить заявки.'));
  }
}

function setStoryBlock(blockId,value){
  const block=$(blockId);
  const paragraph=block?.querySelector('p');
  if(!block||!paragraph)return;
  paragraph.textContent=value||'';
  block.hidden=!value;
}

function openEditor(order){
  state.current=order;
  $('#orderEditorTitle').textContent=order.id;
  $('#detailId').textContent=order.id;
  $('#detailName').textContent=order.name||'Без имени';
  $('#detailContact').textContent=order.contact||'—';
  $('#detailStatusBadge').textContent=STATUS_LABELS[order.status]||order.status;
  $('#detailType').textContent=TYPE_LABELS[order.orderType]||order.orderType;
  $('#detailLanguage').textContent=(order.language||'ru').toUpperCase();
  $('#detailTier').textContent=order.weddingPackageLabel||order.tierLabel||'—';
  $('#detailStyles').textContent=(order.styles||[]).join(', ')||'—';
  $('#detailInstruments').textContent=(order.instruments||[]).join(', ')||'—';
  $('#detailSoundPrompt').textContent=order.soundPrompt||'—';
  $('#detailPrice').textContent=order.quotedPrice==null?'—':`$${order.quotedPrice}${order.urgent?' + urgent':''}`;
  $('#detailCreated').textContent=formatDate(order.createdAt);
  $('#orderStatusField').value=order.status;
  $('#orderNotesField').value=order.internalNotes||'';
  $('#detailRawMessage').textContent=order.rawMessage||'—';

  const occasion=[order.occasion,order.occasionDetail].filter(Boolean).join(' · ');
  setStoryBlock('#detailOccasionBlock',occasion);
  setStoryBlock('#detailCoreBlock',order.storyCore);
  setStoryBlock('#detailDescriptionBlock',order.description);

  const golden=$('#detailGolden');
  golden.replaceChildren();
  (order.goldenAnswers||[]).forEach(answer=>{
    const item=el('div','golden-answer');
    item.append(el('strong','',answer.question),el('p','',answer.answer));
    golden.append(item);
  });
  $('#detailGoldenBlock').hidden=!golden.children.length;

  $('#orderEditor').hidden=false;
  document.body.style.overflow='hidden';
  $('#orderEditor').scrollTop=0;
}

function closeEditor(){
  $('#orderEditor').hidden=true;
  document.body.style.overflow='';
  state.current=null;
}

function copyText(value,success){
  if(!value)return;
  navigator.clipboard.writeText(value).then(()=>toast(success)).catch(()=>toast('Не удалось скопировать',true));
}

function orderAsText(order){
  if(order.rawMessage)return `${order.id}\n${order.rawMessage}`;
  return [
    order.id,
    `Имя: ${order.name}`,
    `Контакт: ${order.contact}`,
    `Тип: ${TYPE_LABELS[order.orderType]||order.orderType}`,
    `Пакет: ${order.weddingPackageLabel||order.tierLabel||'—'}`,
    `Стиль: ${(order.styles||[]).join(', ')||'—'}`,
    `Инструменты: ${(order.instruments||[]).join(', ')||'—'}`,
    `Suno: ${order.soundPrompt||'—'}`,
    `Событие: ${order.occasion||'—'}`,
    '',
    order.storyCore,
    '',
    order.description
  ].filter(value=>value!==undefined&&value!==null).join('\n');
}

async function saveCurrent(overrides={}){
  if(!state.current||state.busy)return;
  setBusy(true);
  try{
    const data=await api(`/api/admin/orders/${encodeURIComponent(state.current.id)}`,{
      method:'PATCH',
      body:{
        status:overrides.status||$('#orderStatusField').value,
        internalNotes:$('#orderNotesField').value
      }
    });
    state.current=data.order;
    await loadOrders('Заявка сохранена');
    openEditor(data.order);
  }catch(error){
    toast(error.message,true);
  }finally{
    setBusy(false);
  }
}

$('#refreshOrdersButton').addEventListener('click',()=>loadOrders('Заявки обновлены'));
$('#orderSearchInput').addEventListener('input',event=>{state.query=event.target.value;render();});
$('#orderTabs').addEventListener('click',event=>{
  const button=event.target.closest('button[data-tab]');
  if(!button)return;
  state.tab=button.dataset.tab;
  $('#orderTabs').querySelectorAll('button').forEach(item=>item.classList.toggle('is-active',item===button));
  render();
});
$('#closeOrderEditor').addEventListener('click',closeEditor);
$('#saveOrderButton').addEventListener('click',()=>saveCurrent());
$('#archiveOrderButton').addEventListener('click',()=>{
  if(!state.current)return;
  if(!confirm(`Переместить ${state.current.id} в архив?`))return;
  $('#orderStatusField').value='archived';
  saveCurrent({status:'archived'});
});
$('#copyOrderButton').addEventListener('click',()=>{
  if(state.current)copyText(orderAsText(state.current),'Заявка скопирована');
});
$('#copyContactButton').addEventListener('click',()=>{
  if(state.current)copyText(state.current.contact,'Контакт скопирован');
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('#orderEditor').hidden)closeEditor();
});

loadOrders();
