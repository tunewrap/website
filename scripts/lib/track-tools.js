'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const VALID_LANGUAGES = new Set(['RU','UA','EN','DE','GE']);
const VALID_SECTIONS = new Set(['stories','author']);
const COVER_EXTENSIONS = ['.webp','.png','.jpg','.jpeg','.avif','.svg'];
const FALLBACK_COVER = 'assets/covers/tunewrap-placeholder.svg';
const RECOMMENDED = Object.freeze({
  minimumBitrate:128000,
  sampleRate:48000,
  channels:2,
  maximumCoverBytes:1024 * 1024,
  preferredMinimumCoverSide:512
});

function posix(value){
  return value.split(path.sep).join('/');
}

function publicPath(projectRoot,file){
  return posix(path.relative(projectRoot,file));
}

function readJson(file){
  try{
    return {value:JSON.parse(fs.readFileSync(file,'utf8')),error:null};
  } catch(error){
    return {value:null,error};
  }
}

function commandAvailable(command){
  const result = spawnSync(command,['-version'],{encoding:'utf8'});
  return result.status === 0;
}

function ffprobe(file){
  const result = spawnSync('ffprobe',[
    '-v','error',
    '-show_entries','format=duration,bit_rate,format_name:stream=codec_name,codec_type,sample_rate,channels,width,height',
    '-of','json',
    file
  ],{encoding:'utf8',maxBuffer:1024 * 1024});
  if(result.status !== 0){
    return {error:(result.stderr || result.stdout || 'ffprobe failed').trim()};
  }
  try{
    return {data:JSON.parse(result.stdout)};
  } catch(error){
    return {error:'ffprobe returned invalid JSON'};
  }
}

function firstExisting(packageDir,candidates){
  for(const candidate of candidates){
    const file = path.join(packageDir,candidate);
    if(fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return '';
}

function resolveAudio(packageDir,metadata){
  if(metadata.audio){
    const file = path.resolve(packageDir,metadata.audio);
    return file.startsWith(packageDir + path.sep) || file === packageDir ? file : '';
  }
  return firstExisting(packageDir,['track.mp3']);
}

function resolveCover(packageDir,metadata){
  if(metadata.cover){
    if(typeof metadata.cover !== 'string') return '';
    const file = path.resolve(packageDir,metadata.cover);
    return file.startsWith(packageDir + path.sep) || file === packageDir ? file : '';
  }
  return firstExisting(packageDir,COVER_EXTENSIONS.map(extension => 'cover' + extension));
}

function normalizeLocalized(value,fallback = ''){
  if(typeof value === 'string') return value.trim() ? {ru:value.trim()} : {};
  if(!value || typeof value !== 'object' || Array.isArray(value)) return fallback ? {ru:fallback} : {};
  return Object.fromEntries(Object.entries(value)
    .map(([language,text]) => [String(language).toLowerCase(),String(text || '').trim()])
    .filter(([,text]) => text));
}

function readOptionalText(packageDir,metadata,key,defaultFilename){
  const configured = metadata[key];
  if(configured && typeof configured === 'object' && !Array.isArray(configured)){
    return normalizeLocalized(configured);
  }
  const filename = typeof configured === 'string' ? configured : defaultFilename;
  const file = path.resolve(packageDir,filename);
  if(!file.startsWith(packageDir + path.sep) || !fs.existsSync(file)) return {};
  const text = fs.readFileSync(file,'utf8').trim();
  return text ? {original:text} : {};
}

function inspectAudio(file,trackLabel,errors,warnings,probeEnabled){
  if(!file || !fs.existsSync(file)){
    errors.push('Missing track.mp3');
    return null;
  }
  if(path.extname(file).toLowerCase() !== '.mp3'){
    errors.push('Audio must be an MP3 file');
    return null;
  }
  if(!probeEnabled) return null;
  const probe = ffprobe(file);
  if(probe.error){
    errors.push('MP3 cannot be opened: ' + probe.error);
    return null;
  }
  const stream = probe.data.streams?.find(item => item.codec_type === 'audio') || {};
  const duration = Number(probe.data.format?.duration || 0);
  const bitrate = Number(probe.data.format?.bit_rate || 0);
  const sampleRate = Number(stream.sample_rate || 0);
  const channels = Number(stream.channels || 0);
  if(stream.codec_name !== 'mp3') errors.push('Unsupported audio codec: ' + (stream.codec_name || 'unknown'));
  if(!(duration > 0)) errors.push('MP3 duration must be greater than 0');
  if(bitrate && bitrate < RECOMMENDED.minimumBitrate){
    warnings.push('MP3 bitrate is below the recommended TuneWrap quality (' + Math.round(bitrate / 1000) + ' kbps)');
  }
  if(sampleRate && sampleRate !== RECOMMENDED.sampleRate){
    warnings.push('MP3 sample rate differs from the TuneWrap standard (' + sampleRate + ' Hz; recommended 48000 Hz)');
  }
  if(channels && channels !== RECOMMENDED.channels){
    warnings.push('MP3 channel layout differs from the TuneWrap standard (' + channels + ' channel(s); recommended stereo)');
  }
  return {duration,bitrate,sampleRate,channels,codec:stream.codec_name || ''};
}

function inspectCover(file,errors,warnings,probeEnabled){
  if(!file) return {fallback:true,width:1200,height:1200,bytes:0,format:'svg'};
  if(!fs.existsSync(file)){
    errors.push('Configured cover file does not exist');
    return null;
  }
  const extension = path.extname(file).toLowerCase();
  if(!COVER_EXTENSIONS.includes(extension)){
    errors.push('Unsupported cover format: ' + extension);
    return null;
  }
  const bytes = fs.statSync(file).size;
  if(bytes > RECOMMENDED.maximumCoverBytes){
    warnings.push('Cover exceeds the recommended web size of 1 MiB (' + Math.round(bytes / 1024) + ' KiB)');
  }
  if(extension === '.svg'){
    const source = fs.readFileSync(file,'utf8');
    if(!/<svg\b/i.test(source)) errors.push('Cover SVG is not a valid SVG document');
    return {fallback:false,width:0,height:0,bytes,format:'svg'};
  }
  if(!probeEnabled) return {fallback:false,width:0,height:0,bytes,format:extension.slice(1)};
  const probe = ffprobe(file);
  if(probe.error){
    errors.push('Cover cannot be opened: ' + probe.error);
    return null;
  }
  const stream = probe.data.streams?.find(item => item.codec_type === 'video') || probe.data.streams?.[0] || {};
  const width = Number(stream.width || 0);
  const height = Number(stream.height || 0);
  if(!(width > 0 && height > 0)) errors.push('Cover dimensions could not be determined');
  if(width && height && Math.abs(width / height - 1) > .04) warnings.push('Cover is not square (' + width + '×' + height + ')');
  if(Math.min(width || Infinity,height || Infinity) < RECOMMENDED.preferredMinimumCoverSide){
    warnings.push('Cover is below the preferred 512×512 web artwork size (' + width + '×' + height + ')');
  }
  return {fallback:false,width,height,bytes,format:extension.slice(1)};
}

function validatePackage(projectRoot,packageDir,options = {}){
  const errors = [];
  const warnings = [];
  const folder = path.basename(packageDir);
  const metadataFile = path.join(packageDir,'track.json');
  if(!fs.existsSync(metadataFile)){
    return {folder,errors:['Missing track.json'],warnings,track:null};
  }
  const parsed = readJson(metadataFile);
  if(parsed.error){
    return {folder,errors:['Invalid track.json: ' + parsed.error.message],warnings,track:null};
  }
  const metadata = parsed.value || {};
  const id = String(metadata.id || '').trim();
  const title = String(metadata.title || '').trim();
  const language = String(metadata.language || '').trim().toUpperCase();
  const section = String(metadata.section || '').trim().toLowerCase();
  const published = metadata.published === true;
  if(!id) errors.push('Missing required field: id');
  else if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) errors.push('Track id must use lowercase letters, numbers and hyphens');
  else if(id !== folder) errors.push('Folder name must match track id: ' + id);
  if(!title) errors.push('Missing required field: title');
  if(!language) errors.push('Missing required field: language');
  else if(!VALID_LANGUAGES.has(language)) errors.push('Unsupported language: ' + language);
  if(!section) errors.push('Missing required field: section');
  else if(!VALID_SECTIONS.has(section)) errors.push('Unsupported section: ' + section);
  if(!Number.isInteger(Number(metadata.order)) || Number(metadata.order) < 1){
    errors.push('Missing or invalid field: order (use a positive integer within the track section)');
  }

  const audioFile = resolveAudio(packageDir,metadata);
  let audioInfo = null;
  if(published || audioFile){
    audioInfo = inspectAudio(audioFile,id || folder,errors,warnings,options.probe !== false);
  } else {
    warnings.push('Draft has no MP3 and will not be published');
  }
  const coverFile = resolveCover(packageDir,metadata);
  const configuredCover = typeof metadata.cover === 'string' ? metadata.cover.trim() : '';
  let artwork = null;
  let coverReady = true;
  if(metadata.cover && typeof metadata.cover !== 'string'){
    errors.push('Track "' + (id || folder) + '" cover must be a filename string');
    coverReady = false;
  }
  if(configuredCover){
    const configuredFile = path.resolve(packageDir,configuredCover);
    const insidePackage = configuredFile === packageDir || configuredFile.startsWith(packageDir + path.sep);
    const displayPath = insidePackage ? publicPath(projectRoot,configuredFile) : configuredCover;
    if(!insidePackage){
      errors.push('Track "' + (id || folder) + '" cover path must stay inside its package: ' + configuredCover);
      coverReady = false;
    } else if(!fs.existsSync(configuredFile) || !fs.statSync(configuredFile).isFile()){
      errors.push('Track "' + (id || folder) + '" cover file not found: ' + displayPath);
      coverReady = false;
    } else {
      try{ fs.accessSync(configuredFile,fs.constants.R_OK); }
      catch(error){
        errors.push('Track "' + (id || folder) + '" cover file is not readable: ' + displayPath);
        coverReady = false;
      }
    }
  }
  if(coverReady) artwork = inspectCover(coverFile,errors,warnings,options.probe !== false);
  if(!configuredCover && !coverFile) warnings.push('Cover is missing; TuneWrap fallback artwork will be used');
  const lyrics = readOptionalText(packageDir,metadata,'lyrics','lyrics.md');
  const translation = readOptionalText(packageDir,metadata,'translation','translation.md');
  if(!Object.keys(lyrics).length) warnings.push('Lyrics are missing. Track may still be published without lyrics');

  const track = errors.length ? null : {
    id,
    legacyKey:String(metadata.legacyKey || '').trim(),
    title,
    originalTitle:String(metadata.originalTitle || title).trim(),
    titles:normalizeLocalized(metadata.titles,title),
    descriptions:normalizeLocalized(metadata.descriptions),
    section,
    language,
    audio:audioFile ? publicPath(projectRoot,audioFile) : '',
    cover:coverFile ? publicPath(projectRoot,coverFile) : FALLBACK_COVER,
    artwork:artwork || {fallback:true,width:1200,height:1200,bytes:0,format:'svg'},
    lyrics,
    translation,
    artist:String(metadata.artist || (section === 'author' ? 'Kosta Trufakin' : 'TuneWrap')).trim(),
    album:String(metadata.album || (section === 'author' ? 'TuneWrap · Author Songs' : 'TuneWrap · Musical Stories')).trim(),
    category:normalizeLocalized(metadata.category),
    tags:Array.isArray(metadata.tags) ? metadata.tags.map(String).map(value => value.trim()).filter(Boolean) : [],
    durationLabel:String(metadata.durationLabel || '').trim(),
    duration:audioInfo?.duration || 0,
    audioQuality:audioInfo || null,
    order:Number(metadata.order),
    featured:metadata.featured === true,
    published
  };
  return {folder,errors,warnings,track};
}

function listPackages(tracksRoot){
  if(!fs.existsSync(tracksRoot)) return [];
  return fs.readdirSync(tracksRoot,{withFileTypes:true})
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => path.join(tracksRoot,entry.name))
    .sort((left,right) => left.localeCompare(right,'en'));
}

function formatResult(result){
  const lines = [];
  result.errors.forEach(message => lines.push('ERROR: ' + result.folder + '\n  ' + message));
  result.warnings.forEach(message => lines.push('WARNING: ' + result.folder + '\n  ' + message));
  return lines;
}

module.exports = {
  FALLBACK_COVER,
  RECOMMENDED,
  VALID_LANGUAGES,
  VALID_SECTIONS,
  commandAvailable,
  formatResult,
  listPackages,
  validatePackage
};
