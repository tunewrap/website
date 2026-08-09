import {HttpError,handleError} from '../../_shared/http.js';

function parseRange(header,size){
  if(!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if(!match) throw new HttpError(416,'Некорректный Range');
  let start = match[1] ? Number(match[1]) : null;
  let end = match[2] ? Number(match[2]) : null;
  if(start === null){
    const suffix = Math.min(Number(end),size);
    start = size - suffix;
    end = size - 1;
  }else if(end === null || end >= size){
    end = size - 1;
  }
  if(!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size){
    throw new HttpError(416,'Range вне границ файла');
  }
  return {offset:start,length:end - start + 1,start,end};
}

function headersFor(object,length){
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag',object.httpEtag);
  headers.set('accept-ranges','bytes');
  headers.set('content-length',String(length));
  headers.set('cache-control',headers.get('cache-control') || 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options','nosniff');
  return headers;
}

async function serve(context,headOnly = false){
  try{
    const parameter = context.params.path;
    const key = Array.isArray(parameter) ? parameter.join('/') : String(parameter || '');
    if(!key || key.includes('..')) throw new HttpError(400,'Некорректный путь медиа');
    const metadata = await context.env.TUNEWRAP_MEDIA.head(key);
    if(!metadata) throw new HttpError(404,'Медиафайл не найден');
    let range;
    try{range = parseRange(context.request.headers.get('range'),metadata.size);}
    catch(error){
      if(error instanceof HttpError && error.status === 416){
        const headers = new Headers({'content-range':`bytes */${metadata.size}`,'accept-ranges':'bytes'});
        return new Response(JSON.stringify({ok:false,error:error.message}),{status:416,headers});
      }
      throw error;
    }
    if(headOnly){
      const headers = headersFor(metadata,metadata.size);
      return new Response(null,{status:200,headers});
    }
    const object = await context.env.TUNEWRAP_MEDIA.get(key,range ? {range:{offset:range.offset,length:range.length}} : undefined);
    if(!object) throw new HttpError(404,'Медиафайл не найден');
    const headers = headersFor(object,range ? range.length : object.size);
    if(range) headers.set('content-range',`bytes ${range.start}-${range.end}/${metadata.size}`);
    return new Response(object.body,{status:range ? 206 : 200,headers});
  }catch(error){
    if(error instanceof HttpError && error.status === 416){
      const response = handleError(error);
      return response;
    }
    return handleError(error);
  }
}

export const onRequestGet = context => serve(context,false);
export const onRequestHead = context => serve(context,true);
