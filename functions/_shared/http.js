export const JSON_HEADERS = Object.freeze({
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff'
});

export function json(data,status = 200,headers = {}){
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
}

export function apiError(status,message,details){
  return json({ok:false,error:message,...(details ? {details} : {})},status);
}

export async function readJson(request){
  const type = request.headers.get('content-type') || '';
  if(!type.includes('application/json')) throw new HttpError(415,'Ожидался JSON-запрос');
  try{return await request.json();}
  catch(error){throw new HttpError(400,'Некорректный JSON');}
}

export class HttpError extends Error{
  constructor(status,message,details){
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function handleError(error){
  if(error instanceof HttpError) return apiError(error.status,error.message,error.details);
  console.error('TuneWrap API error',error);
  return apiError(500,'Внутренняя ошибка TuneWrap API');
}

export function methodNotAllowed(allowed){
  return apiError(405,'Метод не поддерживается',undefined,{allow:allowed.join(', ')});
}
