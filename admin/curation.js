const FALLBACK_COVER='/assets/covers/tunewrap-placeholder.svg';
const $=selector=>document.querySelector(selector);

const state={
  tracks:[],
  sections:{
    stories:{ids:[],dirty:false,dragId:null},
    author:{ids:[],dirty:false,dragId:null}
  },
  busy:false
};

const nodes={
  toast:$('#toastRegion'),
  reload:$('#reloadButton'),
  stories:{
    list:$('#storiesSortList'),
    count:$('#storiesCount'),
    select:$('#storiesFeaturedSelect'),
    featuredSave:$('#storiesFeaturedSave'),
    featuredCurrent:$('#storiesFeaturedCurrent'),
    orderSave:$('#storiesOrderSave')
  },
  author:{
    list:$('#authorSortList'),
    count:$('#authorCount'),
    select:$('#authorFeaturedSelect'),
    featuredSave:$('#authorFeaturedSave'),
    featuredCurrent:$('#authorFeaturedCurrent'),
    orderSave:$('#authorOrderSave')
  }
};

function el(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

function toast(message,error=false){
  const item=el('div','toast'+(error?' is-error':''),message);
  nodes.toast.append(item);
  setTimeout(()=>item.remove(),3800);
}

async function api(path,options={}){
  const headers=new Headers(options.headers||{});
  headers.set('accept','application/json');
  if(options.body!==undefined)headers.set('content-type','application/json');
  const response=await fetch(path,{
    ...options,
    headers,
    body:options.body===undefined?undefined:JSON.stringify(options.body)
  });
  let payload=null;
  try{payload=await response.json();}catch(error){}
  if(!response.ok)throw new Error(payload?.error||`HTTP ${response.status}`);
  return payload;
}

function sectionTracks(section){
  const ids=state.sections[section].ids;
  const map=new Map(state.tracks.filter(track=>track.section===section).map(track=>[track.id,track]));
  return ids.map(id=>map.get(id)).filter(Boolean);
}

function publishedTracks(section){
  return sectionTracks(section).filter(track=>track.published);
}

function currentFeatured(section){
  const published=publishedTracks(section);
  return published.find(track=>track.featured)||published[0]||null;
}

function updateDirty(section,value=true){
  state.sections[section].dirty=value;
  nodes[section].orderSave.disabled=!value||state.busy;
  nodes[section].orderSave.textContent=value?'Сохранить порядок':'Порядок сохранён';
}

function cover(track){
  const image=el('img','sort-cover');
  image.src=track.cover||FALLBACK_COVER;
  image.alt='';
  image.loading='lazy';
  image.draggable=false;
  image.addEventListener('error',()=>{image.src=FALLBACK_COVER;},{once:true});
  return image;
}

function featuredPreview(section){
  const target=nodes[section].featuredCurrent;
  const track=currentFeatured(section);
  if(!track){
    target.replaceChildren(el('span','sort-empty','Нет опубликованных треков для витрины.'));
    return;
  }

  const image=el('img');
  image.src=track.cover||FALLBACK_COVER;
  image.alt='';
  image.addEventListener('error',()=>{image.src=FALLBACK_COVER;},{once:true});

  const copy=el('div');
  copy.append(
    el('strong','',track.title),
    el('small','',`${track.language} · #${track.order} · ${track.id}`)
  );

  target.replaceChildren(image,copy,el('span','featured-star','★'));
}

function renderFeaturedSelect(section){
  const select=nodes[section].select;
  const published=publishedTracks(section);
  const current=currentFeatured(section);
  select.replaceChildren();

  if(!published.length){
    const option=el('option','', 'Нет опубликованных треков');
    option.value='';
    select.append(option);
    select.disabled=true;
    nodes[section].featuredSave.disabled=true;
    featuredPreview(section);
    return;
  }

  for(const track of published){
    const option=el('option','',`${track.title} · ${track.language}`);
    option.value=track.id;
    select.append(option);
  }
  select.disabled=false;
  nodes[section].featuredSave.disabled=false;
  select.value=current?.id||published[0].id;
  featuredPreview(section);
}

function move(section,id,direction){
  const ids=state.sections[section].ids;
  const index=ids.indexOf(id);
  const target=index+direction;
  if(index<0||target<0||target>=ids.length)return;
  [ids[index],ids[target]]=[ids[target],ids[index]];
  updateDirty(section,true);
  renderList(section);
}

function syncDomPositions(section){
  nodes[section].list.querySelectorAll('.sort-row').forEach((row,index)=>{
    const position=row.querySelector('.sort-position');
    if(position)position.textContent='#'+(index+1);
  });
}

function installPointerDrag(section,track,row,handle){
  let active=false;
  let changed=false;

  handle.style.touchAction='none';
  handle.tabIndex=0;
  handle.setAttribute('role','button');
  handle.setAttribute('aria-label','Перетащить трек');
  handle.title='Зажмите и перетащите';

  const finish=(event,cancelled=false)=>{
    if(!active)return;
    active=false;

    try{
      if(handle.hasPointerCapture?.(event.pointerId)){
        handle.releasePointerCapture(event.pointerId);
      }
    }catch(error){}

    row.classList.remove('is-dragging','is-pointer-dragging');
    handle.classList.remove('is-grabbing');

    if(cancelled){
      renderList(section);
      return;
    }

    if(changed){
      const ids=Array.from(nodes[section].list.querySelectorAll('.sort-row'))
        .map(item=>item.dataset.id)
        .filter(Boolean);

      if(ids.length===state.sections[section].ids.length){
        state.sections[section].ids=ids;
        updateDirty(section,true);
      }
    }

    renderList(section);
  };

  handle.addEventListener('pointerdown',event=>{
    if(state.busy)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;

    event.preventDefault();
    event.stopPropagation();

    active=true;
    changed=false;
    row.classList.add('is-dragging','is-pointer-dragging');
    handle.classList.add('is-grabbing');

    try{handle.setPointerCapture?.(event.pointerId);}catch(error){}
  });

  handle.addEventListener('pointermove',event=>{
    if(!active)return;

    event.preventDefault();

    const list=nodes[section].list;
    const target=document.elementsFromPoint(event.clientX,event.clientY)
      .map(node=>node.closest?.('.sort-row'))
      .find(candidate=>candidate&&candidate!==row&&candidate.parentElement===list);

    if(target){
      const rect=target.getBoundingClientRect();
      const insertAfter=event.clientY>rect.top+(rect.height/2);
      const reference=insertAfter?target.nextElementSibling:target;

      if(reference!==row&&row.nextElementSibling!==reference){
        list.insertBefore(row,reference);
        changed=true;
        syncDomPositions(section);
      }
    }

    const edge=92;
    if(event.clientY<edge){
      window.scrollBy({top:-18,left:0,behavior:'auto'});
    }else if(event.clientY>window.innerHeight-edge){
      window.scrollBy({top:18,left:0,behavior:'auto'});
    }
  });

  handle.addEventListener('pointerup',event=>finish(event,false));
  handle.addEventListener('pointercancel',event=>finish(event,true));
  handle.addEventListener('lostpointercapture',event=>{
    if(active)finish(event,false);
  });
}

function sortRow(section,track,index,total){
  const row=el('article','sort-row');
  row.dataset.id=track.id;
  row.draggable=false;

  const handle=el('span','drag-handle','⠿');

  const identity=el('div','sort-identity');
  identity.append(
    el('strong','',track.title),
    el('small','',`${track.language} · ${track.id}${track.featured?' · ★ витрина':''}`)
  );

  const position=el('span','sort-position',`#${index+1}`);
  const status=el('span','sort-status'+(track.published?' is-published':''),track.published?'Published':'Draft');

  const actions=el('div','sort-actions');
  const up=el('button','', '↑');
  up.type='button';
  up.title='Поднять выше';
  up.disabled=index===0;
  up.addEventListener('click',()=>move(section,track.id,-1));

  const down=el('button','', '↓');
  down.type='button';
  down.title='Опустить ниже';
  down.disabled=index===total-1;
  down.addEventListener('click',()=>move(section,track.id,1));
  actions.append(up,down);

  row.append(handle,cover(track),identity,position,status,actions);
  installPointerDrag(section,track,row,handle);

  row.addEventListener('dragstart',event=>{
    state.sections[section].dragId=track.id;
    row.classList.add('is-dragging');
    if(event.dataTransfer){
      event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('text/plain',track.id);
    }
  });

  row.addEventListener('dragend',()=>{
    state.sections[section].dragId=null;
    document.querySelectorAll('.sort-row.is-drop-target').forEach(item=>item.classList.remove('is-drop-target'));
    row.classList.remove('is-dragging');
  });

  row.addEventListener('dragover',event=>{
    event.preventDefault();
    if(state.sections[section].dragId&&state.sections[section].dragId!==track.id){
      row.classList.add('is-drop-target');
    }
  });

  row.addEventListener('dragleave',()=>row.classList.remove('is-drop-target'));

  row.addEventListener('drop',event=>{
    event.preventDefault();
    row.classList.remove('is-drop-target');
    const dragId=state.sections[section].dragId||event.dataTransfer?.getData('text/plain');
    if(!dragId||dragId===track.id)return;

    const ids=state.sections[section].ids;
    const from=ids.indexOf(dragId);
    const to=ids.indexOf(track.id);
    if(from<0||to<0)return;

    const [moved]=ids.splice(from,1);
    ids.splice(to,0,moved);
    updateDirty(section,true);
    renderList(section);
  });

  return row;
}

function renderList(section){
  const list=nodes[section].list;
  const tracks=sectionTracks(section);
  nodes[section].count.textContent=String(tracks.length);

  if(!tracks.length){
    list.replaceChildren(el('p','sort-empty','В этом разделе пока нет треков.'));
    return;
  }

  list.replaceChildren(...tracks.map((track,index)=>sortRow(section,track,index,tracks.length)));
  renderFeaturedSelect(section);
}

function renderAll(){
  renderList('stories');
  renderList('author');
  updateDirty('stories',state.sections.stories.dirty);
  updateDirty('author',state.sections.author.dirty);
}

async function loadCatalog(message=''){
  try{
    state.busy=true;
    const data=await api('/api/admin/tracks');
    state.tracks=Array.isArray(data.tracks)?data.tracks:[];
    for(const section of ['stories','author']){
      state.sections[section].ids=state.tracks
        .filter(track=>track.section===section)
        .sort((a,b)=>Number(a.order)-Number(b.order)||a.id.localeCompare(b.id))
        .map(track=>track.id);
      state.sections[section].dirty=false;
    }
    renderAll();
    if(message)toast(message);
  }catch(error){
    toast(error.message,true);
  }finally{
    state.busy=false;
    updateDirty('stories',state.sections.stories.dirty);
    updateDirty('author',state.sections.author.dirty);
  }
}

async function saveOrder(section){
  if(state.busy||!state.sections[section].dirty)return;
  try{
    state.busy=true;
    nodes[section].orderSave.disabled=true;
    nodes[section].orderSave.textContent='Сохраняю…';
    await api('/api/admin/reorder',{
      method:'POST',
      body:{section,ids:state.sections[section].ids}
    });
    await loadCatalog(section==='stories'?'Порядок Stories сохранён':'Порядок Author сохранён');
  }catch(error){
    toast(error.message,true);
  }finally{
    state.busy=false;
    updateDirty(section,state.sections[section].dirty);
  }
}

async function saveFeatured(section){
  const id=nodes[section].select.value;
  if(!id||state.busy)return;

  const track=state.tracks.find(item=>item.id===id&&item.section===section);
  if(!track||!track.published){
    toast('Для витрины можно выбрать только опубликованный трек.',true);
    return;
  }

  try{
    state.busy=true;
    nodes[section].featuredSave.disabled=true;
    nodes[section].featuredSave.textContent='Сохраняю…';

    await api(`/api/admin/tracks/${encodeURIComponent(id)}`,{
      method:'PATCH',
      body:{featured:true}
    });

    await loadCatalog(section==='stories'?'Главная песня Stories изменена':'Главная песня Author изменена');
  }catch(error){
    toast(error.message,true);
  }finally{
    state.busy=false;
    nodes[section].featuredSave.textContent='Поставить на витрину';
    nodes[section].featuredSave.disabled=false;
  }
}

nodes.reload.addEventListener('click',()=>loadCatalog('Каталог обновлён'));
nodes.stories.orderSave.addEventListener('click',()=>saveOrder('stories'));
nodes.author.orderSave.addEventListener('click',()=>saveOrder('author'));
nodes.stories.featuredSave.addEventListener('click',()=>saveFeatured('stories'));
nodes.author.featuredSave.addEventListener('click',()=>saveFeatured('author'));

loadCatalog();
