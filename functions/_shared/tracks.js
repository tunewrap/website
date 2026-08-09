import {HttpError} from './http.js';

export const SECTIONS = Object.freeze(['stories','author']);
export const LANGUAGES = Object.freeze(['GE','UA','EN','DE','RU']);
export const TRACK_COLUMNS = `id, legacy_key, title, original_title, titles_json, descriptions_json,
  section, language, audio_url, cover_url, artwork_json, lyrics_json, translation_json,
  artist, album, category_json, tags_json, duration_label, duration, audio_quality_json,
  sort_order, featured, published, archived, schema_version, created_at, updated_at,
  published_at, last_edited_by`;

const JSON_FIELDS = Object.freeze({
  titles_json:'titles', descriptions_json:'descriptions', artwork_json:'artwork',
  lyrics_json:'lyrics', translation_json:'translation', category_json:'category',
  tags_json:'tags', audio_quality_json:'audioQuality'
});

const ID_RE = /^[a-z0-9][a-z0-9-]{0,95}$/;

const TRANSLIT = Object.freeze({
  // Russian / Ukrainian
  'а':'a','б':'b','в':'v','г':'g','ґ':'g','д':'d','е':'e','ё':'yo','є':'ye','ж':'zh','з':'z',
  'и':'i','і':'i','ї':'yi','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ы':'y',
  'э':'e','ю':'yu','я':'ya','ь':'','ъ':'',
  // Georgian
  'ა':'a','ბ':'b','გ':'g','დ':'d','ე':'e','ვ':'v','ზ':'z','თ':'t','ი':'i','კ':'k','ლ':'l',
  'მ':'m','ნ':'n','ო':'o','პ':'p','ჟ':'zh','რ':'r','ს':'s','ტ':'t','უ':'u','ფ':'p','ქ':'k',
  'ღ':'gh','ყ':'q','შ':'sh','ჩ':'ch','ც':'ts','ძ':'dz','წ':'ts','ჭ':'ch','ხ':'kh','ჯ':'j','ჰ':'h'
});

function parseJson(value,fallback){
  if(value === null || value === undefined || value === '') return fallback;
  try{return JSON.parse(value);}catch(error){return fallback;}
}

export function rowToTrack(row,{admin = false} = {}){
  const track = {
    id:row.id,
    legacyKey:row.legacy_key || undefined,
    title:row.title,
    originalTitle:row.original_title || row.title,
    titles:parseJson(row.titles_json,{}),
    descriptions:parseJson(row.descriptions_json,{}),
    section:row.section,
    language:row.language,
    audio:row.audio_url || '',
    cover:row.cover_url || '',
    artwork:parseJson(row.artwork_json,{}),
    lyrics:parseJson(row.lyrics_json,{}),
    translation:parseJson(row.translation_json,{}),
    artist:row.artist || 'TuneWrap',
    album:row.album || '',
    category:parseJson(row.category_json,{}),
    tags:parseJson(row.tags_json,[]),
    durationLabel:row.duration_label || '',
    duration:Number(row.duration) || 0,
    audioQuality:parseJson(row.audio_quality_json,{}),
    order:Number(row.sort_order),
    featured:Boolean(row.featured),
    published:Boolean(row.published)
  };
  if(admin){
    track.archived = Boolean(row.archived);
    track.schemaVersion = Number(row.schema_version) || 2;
    track.createdAt = row.created_at;
    track.updatedAt = row.updated_at;
    track.publishedAt = row.published_at;
    track.lastEditedBy = row.last_edited_by;
  }
  return track;
}

export async function listTracks(db,{admin = false,includeArchived = false} = {}){
  const where = admin ? (includeArchived ? '' : 'WHERE archived = 0') : "WHERE published = 1 AND archived = 0 AND audio_url <> ''";
  const result = await db.prepare(`SELECT ${TRACK_COLUMNS} FROM tracks ${where}
    ORDER BY CASE section WHEN 'stories' THEN 0 WHEN 'author' THEN 1 ELSE 2 END, sort_order, id`).all();
  return (result.results || []).map(row => rowToTrack(row,{admin}));
}

export async function getTrack(db,id,{admin = true} = {}){
  const row = await db.prepare(`SELECT ${TRACK_COLUMNS} FROM tracks WHERE id = ?`).bind(id).first();
  return row ? rowToTrack(row,{admin}) : null;
}

export function validateTrack(input,{publishing = false} = {}){
  const errors = [];
  if(!input || typeof input !== 'object') return ['Данные трека отсутствуют'];
  if(input.id && !ID_RE.test(String(input.id))) errors.push('Некорректный Track ID');
  if(!String(input.title || '').trim()) errors.push('Название обязательно');
  if(!SECTIONS.includes(input.section)) errors.push('Раздел должен быть stories или author');
  if(!LANGUAGES.includes(String(input.language || '').toUpperCase())) errors.push('Неподдерживаемый язык');
  if(publishing && !String(input.audio || '').trim()) errors.push('Для публикации нужен MP3');
  if(input.audio && !/^(?:https?:\/\/|\/api\/media\/|content\/tracks\/)/.test(input.audio)) errors.push('Недопустимый адрес MP3');
  if(input.cover && !/^(?:https?:\/\/|\/api\/media\/|content\/tracks\/|assets\/)/.test(input.cover)) errors.push('Недопустимый адрес обложки');
  const order = Number(input.order);
  if(!Number.isInteger(order) || order < 1) errors.push('Порядок должен быть положительным целым числом');
  return errors;
}

function asciiSlug(value){
  const source = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let output = '';
  for(const char of source){
    if(/[a-z0-9]/.test(char)) output += char;
    else if(Object.prototype.hasOwnProperty.call(TRANSLIT,char)) output += TRANSLIT[char];
    else output += '-';
  }
  return output.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64);
}

export function slugify(title,language){
  const safe = asciiSlug(title) || 'track';
  return `${safe}-${String(language || 'RU').toLowerCase()}`;
}

function asJson(value,fallback){
  const normalized = value === undefined || value === null ? fallback : value;
  return JSON.stringify(normalized);
}

export function insertStatement(db,track,editor,now = new Date().toISOString()){
  return db.prepare(`INSERT INTO tracks (
    id, legacy_key, title, original_title, titles_json, descriptions_json, section, language,
    audio_url, cover_url, artwork_json, lyrics_json, translation_json, artist, album,
    category_json, tags_json, duration_label, duration, audio_quality_json, sort_order,
    featured, published, archived, schema_version, created_at, updated_at, published_at, last_edited_by
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    track.id, track.legacyKey || null, String(track.title).trim(), track.originalTitle || track.title,
    asJson(track.titles,{}), asJson(track.descriptions,{}), track.section, String(track.language).toUpperCase(),
    track.audio || '', track.cover || '', asJson(track.artwork,{}), asJson(track.lyrics,{}),
    asJson(track.translation,{}), track.artist || 'TuneWrap', track.album || '', asJson(track.category,{}),
    asJson(track.tags,[]), track.durationLabel || '', Number(track.duration) || 0, asJson(track.audioQuality,{}),
    Number(track.order), track.featured ? 1 : 0, track.published ? 1 : 0, track.archived ? 1 : 0,
    Number(track.schemaVersion) || 2, track.createdAt || now, now, track.published ? (track.publishedAt || now) : null, editor
  );
}

export function updateStatement(db,id,track,editor,now = new Date().toISOString()){
  return db.prepare(`UPDATE tracks SET
    title=?, original_title=?, titles_json=?, descriptions_json=?, section=?, language=?,
    audio_url=?, cover_url=?, artwork_json=?, lyrics_json=?, translation_json=?, artist=?, album=?,
    category_json=?, tags_json=?, duration_label=?, duration=?, audio_quality_json=?, sort_order=?,
    featured=?, archived=?, updated_at=?, last_edited_by=? WHERE id=?`).bind(
    String(track.title).trim(), track.originalTitle || track.title, asJson(track.titles,{}), asJson(track.descriptions,{}),
    track.section, String(track.language).toUpperCase(), track.audio || '', track.cover || '', asJson(track.artwork,{}),
    asJson(track.lyrics,{}), asJson(track.translation,{}), track.artist || 'TuneWrap', track.album || '',
    asJson(track.category,{}), asJson(track.tags,[]), track.durationLabel || '', Number(track.duration) || 0,
    asJson(track.audioQuality,{}), Number(track.order), track.featured ? 1 : 0, track.archived ? 1 : 0, now, editor, id
  );
}

export function mergeTrack(current,input){
  const allowed = ['title','originalTitle','titles','descriptions','section','language','audio','cover','artwork',
    'lyrics','translation','artist','album','category','tags','durationLabel','duration','audioQuality','order','featured','archived'];
  const next = {...current};
  for(const key of allowed){if(Object.prototype.hasOwnProperty.call(input,key)) next[key] = input[key];}
  next.id = current.id;
  next.published = current.published;
  return next;
}

export function mediaKeyFromUrl(value){
  if(typeof value !== 'string' || !value.startsWith('/api/media/')) return null;
  return decodeURIComponent(value.slice('/api/media/'.length));
}
