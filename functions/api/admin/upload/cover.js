import {requireAdmin,requireSameOrigin} from '../../../_shared/auth.js';
import {json,HttpError,handleError} from '../../../_shared/http.js';
import {verifiedStream,imageSignature} from '../../../_shared/upload.js';

const TYPES = Object.freeze({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'});
const MAX_COVER_BYTES = 8 * 1024 * 1024;

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
    const fileName = decodeURIComponent(context.request.headers.get('x-file-name') || 'cover');
    const type = (context.request.headers.get('content-type') || '').toLowerCase();
    const extension = TYPES[type];
    const size = Number(context.request.headers.get('content-length') || 0);
    const width = Number(context.request.headers.get('x-image-width') || 0);
    const height = Number(context.request.headers.get('x-image-height') || 0);
    if(!extension) throw new HttpError(415,'Обложка должна быть JPEG, PNG или WebP');
    if(!size) throw new HttpError(411,'Не удалось определить размер обложки');
    if(size > MAX_COVER_BYTES) throw new HttpError(413,'Обложка превышает лимит 8 MB');
    if(width < 600 || height < 600) throw new HttpError(422,'Минимальный размер обложки — 600×600 px');
    const ratio = width / height;
    if(ratio < 0.8 || ratio > 1.25) throw new HttpError(422,'Обложка должна быть близка к квадратной');
    if(!context.request.body) throw new HttpError(400,'Обложка не передана');
    const uploadStream = await verifiedStream(context.request.body,imageSignature(type),'Содержимое не соответствует MIME обложки');
    const version = `${Date.now()}-${crypto.randomUUID()}`;
    const key = `tracks/${id}/cover/${version}.${extension}`;
    await context.env.TUNEWRAP_MEDIA.put(key,uploadStream,{
      httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'},
      customMetadata:{trackId:id,originalName:fileName,kind:'cover',width:String(width),height:String(height)}
    });
    return json({ok:true,url:`/api/media/${key}`,key,size,mime:type,artwork:{fallback:false,width,height,bytes:size,format:extension}});
  }catch(error){return handleError(error);}
}
