(function(root,factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.TuneWrapCatalogCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this,function(){
  'use strict';

  const UI_LANGUAGES = ['ru','uk','ka','en','de'];
  const SECTION_ORDER = Object.freeze(['stories','author']);

  function normalize(value){
    return String(value || '')
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^\p{Letter}\p{Number}]+/gu,' ')
      .trim();
  }

  function localized(value,language,fallback = ''){
    if(typeof value === 'string') return value;
    if(!value || typeof value !== 'object') return fallback;
    return value[language] || value.ru || value.en || value.uk || value.ka || value.de || value.original || Object.values(value)[0] || fallback;
  }

  function title(track,language){
    return localized(track?.titles,language,track?.title || 'TuneWrap');
  }

  function description(track,language){
    return localized(track?.descriptions,language,'');
  }

  function category(track,language){
    return localized(track?.category,language,'');
  }

  function searchText(track){
    return normalize([
      track.id,
      track.title,
      track.originalTitle,
      ...Object.values(track.titles || {}),
      track.language,
      track.section,
      track.artist,
      track.album,
      ...Object.values(track.category || {}),
      ...(track.categoryIds || []),
      ...(track.tags || [])
    ].join(' '));
  }

  function createCatalog(rawTracks){
    const seen = new Set();
    return Object.freeze((Array.isArray(rawTracks) ? rawTracks : []).map(raw => {
      if(!raw?.id || seen.has(raw.id)) throw new Error('Invalid or duplicate Track Catalog id: ' + (raw?.id || '(missing)'));
      seen.add(raw.id);
      return Object.freeze({...raw,_search:searchText(raw)});
    }));
  }

  function published(tracks){
    return tracks.filter(track => track.published === true);
  }

  function queue(tracks){
    const playable = published(tracks).filter(track => Boolean(track.audio));
    return SECTION_ORDER.flatMap(section => playable
      .filter(track => track.section === section)
      .sort((left,right) => Number(left.order) - Number(right.order) || left.id.localeCompare(right.id)));
  }

  function filter(tracks,options = {}){
    const section = options.section || '';
    const language = String(options.language || 'ALL').toUpperCase();
    const categoryId = String(options.categoryId || '').trim();
    const tokens = normalize(options.query).split(/\s+/).filter(Boolean);
    return published(tracks).filter(track => {
      if(section && track.section !== section) return false;
      if(language !== 'ALL' && track.language !== language) return false;
      if(categoryId && !(Array.isArray(track.categoryIds) && track.categoryIds.includes(categoryId))) return false;
      return tokens.every(token => track._search.includes(token));
    });
  }

  function featured(tracks,section){
    const sectionTracks = published(tracks).filter(track => track.section === section);
    return sectionTracks.find(track => track.featured) || sectionTracks.sort((left,right) => left.order - right.order)[0] || null;
  }

  function page(tracks,offset = 0,limit = 24){
    return tracks.slice(Math.max(0,offset),Math.max(0,offset) + Math.max(1,limit));
  }

  function titleMaps(tracks){
    return Object.fromEntries(UI_LANGUAGES.map(language => [language,Object.fromEntries(tracks.map(track => [track.id,title(track,language)]))]));
  }

  return Object.freeze({UI_LANGUAGES,SECTION_ORDER,normalize,localized,title,description,category,createCatalog,published,queue,filter,featured,page,titleMaps});
});
