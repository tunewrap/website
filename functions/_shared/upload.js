import {HttpError} from './http.js';

export async function verifiedStream(stream,validator,message){
  const [inspection,upload] = stream.tee();
  const reader = inspection.getReader();
  const bytes = [];
  try{
    while(bytes.length < 16){
      const {done,value} = await reader.read();
      if(done) break;
      bytes.push(...value.slice(0,16 - bytes.length));
    }
  }finally{
    reader.cancel().catch(()=>{});
  }
  const signature = new Uint8Array(bytes);
  if(!validator(signature)){
    await upload.cancel();
    throw new HttpError(415,message);
  }
  return upload;
}

export function isMp3(bytes){
  return bytes.length >= 3 && (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  );
}

export function imageSignature(type){
  return bytes => {
    if(type === 'image/png') return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    if(type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if(type === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
    return false;
  };
}
