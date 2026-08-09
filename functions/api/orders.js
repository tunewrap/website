import {requireSameOrigin} from '../_shared/auth.js';
import {json,readJson,HttpError,handleError} from '../_shared/http.js';
import {normalizePublicOrder,findBySubmissionId,insertOrder} from '../_shared/orders.js';

const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomToken(length=5){
  const bytes=crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes,byte=>ALPHABET[byte%ALPHABET.length]).join('');
}

async function uniqueOrderId(db){
  const stamp=new Date().toISOString().slice(2,10).replace(/-/g,'');
  for(let attempt=0;attempt<8;attempt++){
    const id=`TW-${stamp}-${randomToken()}`;
    const exists=await db.prepare('SELECT id FROM orders WHERE id=? LIMIT 1').bind(id).first();
    if(!exists)return id;
  }
  throw new HttpError(503,'Не удалось создать номер заявки. Повторите отправку.');
}

export async function onRequestPost(context){
  try{
    requireSameOrigin(context.request);
    if(!context.env.TUNEWRAP_DB)throw new HttpError(503,'База заявок не подключена');
    const input=await readJson(context.request);
    const order=normalizePublicOrder(input,context.request);

    const existing=await findBySubmissionId(context.env.TUNEWRAP_DB,order.clientSubmissionId);
    if(existing){
      return json({ok:true,duplicate:true,order:{id:existing.id,status:existing.status,createdAt:existing.createdAt}});
    }

    const id=await uniqueOrderId(context.env.TUNEWRAP_DB);
    const saved=await insertOrder(context.env.TUNEWRAP_DB,order,id);
    return json({ok:true,duplicate:false,order:{id:saved.id,status:saved.status,createdAt:saved.createdAt}},201);
  }catch(error){
    return handleError(error);
  }
}

export function onRequestGet(){
  return json({ok:false,error:'Метод не поддерживается'},405,{allow:'POST'});
}
