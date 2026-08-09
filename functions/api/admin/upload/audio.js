import {requireAdmin,requireSameOrigin} from '../../../_shared/auth.js';
import {json,HttpError,handleError} from '../../../_shared/http.js';
import {verifiedStream,isMp3} from '../../../_shared/upload.js';

const MAX_AUDIO_BYTES = 80 * 1024 * 1024;

function safeId(value){
  const id = String(value || 'draft').toLowerCase();
  if(!/^[a-z0-9][a-z0-9-]{0,95}$/.test(id)) throw new HttpError(422,'Некорректный Track ID');
  return id;
}

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    await requireAdmin(context);
    const url = new URL(context.request.url);
    const id = safeId(url.searchParams.get('trackId'));
    const fileName = decodeURIComponent(context.request.headers.get('x-file-name') || 'track.mp3');
    const type = (context.request.headers.get('content-type') || '').toLowerCase();
    const size = Number(context.request.headers.get('content-length') || 0);
    if(!/\.mp3$/i.test(fileName) || !['audio/mpeg','audio/mp3','application/octet-stream'].includes(type)) throw new HttpError(415,'Нужен MP3-файл');
    if(!size) throw new HttpError(411,'Не удалось определить размер MP3');
    if(size > MAX_AUDIO_BYTES) throw new HttpError(413,'MP3 превышает лимит 80 MB');
    if(!context.request.body) throw new HttpError(400,'MP3 не передан');
    const uploadStream = await verifiedStream(context.request.body,isMp3,'Содержимое файла не является MP3');
    const version = `${Date.now()}-${crypto.randomUUID()}`;
    const key = `tracks/${id}/audio/${version}.mp3`;
    await context.env.TUNEWRAP_MEDIA.put(key,uploadStream,{
      httpMetadata:{contentType:'audio/mpeg',cacheControl:'public, max-age=31536000, immutable'},
      customMetadata:{trackId:id,originalName:fileName,kind:'audio'}
    });
    return json({ok:true,url:`/api/media/${key}`,key,size,mime:'audio/mpeg'});
  }catch(error){return handleError(error);}
}
