import {HttpError} from './http.js';

export const ORDER_STATUSES=Object.freeze(['new','in_progress','waiting_client','done','archived']);
export const ORDER_TYPES=Object.freeze(['order','certificate','wedding','corporate']);
export const ORDER_LANGUAGES=Object.freeze(['ru','uk','ka','en','de']);

function parseJson(value,fallback){
  try{return JSON.parse(value||'');}catch(error){return fallback;}
}

function clean(value,max,{required=false,label='Поле'}={}){
  const text=String(value??'').replace(/\u0000/g,'').trim();
  if(required&&!text)throw new HttpError(422,`${label}: обязательное поле`);
  if(text.length>max)throw new HttpError(422,`${label}: максимум ${max} символов`);
  return text;
}

function listStrings(value,maxItems=8,maxLength=120){
  if(!Array.isArray(value))return [];
  return value.slice(0,maxItems).map(item=>clean(item,maxLength)).filter(Boolean);
}

function goldenAnswers(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,12).map(item=>({
    question:clean(item?.question,320),
    answer:clean(item?.answer,3200)
  })).filter(item=>item.question&&item.answer);
}

export function rowToOrder(row){
  if(!row)return null;
  return {
    id:row.id,
    clientSubmissionId:row.client_submission_id,
    status:row.status,
    orderType:row.order_type,
    language:row.interface_language,
    name:row.name,
    contact:row.contact,
    occasion:row.occasion,
    occasionDetail:row.occasion_detail,
    storyCore:row.story_core,
    description:row.description,
    goldenAnswers:parseJson(row.golden_answers_json,[]),
    tierLabel:row.tier_label,
    weddingPackageId:row.wedding_package_id,
    weddingPackageLabel:row.wedding_package_label,
    styles:parseJson(row.styles_json,[]),
    urgent:Boolean(row.urgent),
    quotedPrice:Number.isFinite(row.quoted_price)?row.quoted_price:(row.quoted_price==null?null:Number(row.quoted_price)),
    rawMessage:row.raw_message,
    source:row.source,
    sourceUrl:row.source_url,
    internalNotes:row.internal_notes,
    schemaVersion:Number(row.schema_version)||1,
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    lastEditedBy:row.last_edited_by
  };
}

export function normalizePublicOrder(input,request){
  const orderType=ORDER_TYPES.includes(input?.orderType)?input.orderType:'order';
  const language=ORDER_LANGUAGES.includes(input?.language)?input.language:'ru';
  const clientSubmissionId=clean(input?.clientSubmissionId,100,{required:true,label:'Submission ID'});
  const name=clean(input?.name,120,{required:true,label:'Имя'});
  const contact=clean(input?.contact,240,{required:true,label:'Контакт'});
  const storyCore=clean(input?.storyCore,9000,{label:'Главная история'});
  const description=clean(input?.description,24000,{label:'Описание'});
  if(orderType!=='certificate'&&!storyCore&&!description){
    throw new HttpError(422,'Добавьте историю или описание');
  }

  const quotedRaw=input?.quotedPrice;
  let quotedPrice=null;
  if(quotedRaw!==null&&quotedRaw!==undefined&&quotedRaw!==''){
    const number=Number(quotedRaw);
    if(Number.isFinite(number)&&number>=0&&number<=1000000)quotedPrice=Math.round(number);
  }

  let sourceUrl='';
  try{
    const supplied=clean(input?.sourceUrl,500);
    const referer=request.headers.get('referer')||'';
    sourceUrl=supplied||new URL(referer).pathname;
  }catch(error){
    sourceUrl=clean(input?.sourceUrl,500);
  }

  return {
    clientSubmissionId,
    status:'new',
    orderType,
    language,
    name,
    contact,
    occasion:clean(input?.occasion,300),
    occasionDetail:clean(input?.occasionDetail,1200),
    storyCore,
    description,
    goldenAnswers:goldenAnswers(input?.goldenAnswers),
    tierLabel:clean(input?.tierLabel,300),
    weddingPackageId:clean(input?.weddingPackageId,100),
    weddingPackageLabel:clean(input?.weddingPackageLabel,300),
    styles:listStrings(input?.styles,4,120),
    urgent:Boolean(input?.urgent),
    quotedPrice,
    rawMessage:clean(input?.rawMessage,32000),
    source:clean(input?.source,40)||'web',
    sourceUrl,
    internalNotes:'',
    schemaVersion:1
  };
}

export async function findBySubmissionId(db,clientSubmissionId){
  const row=await db.prepare('SELECT * FROM orders WHERE client_submission_id=? LIMIT 1').bind(clientSubmissionId).first();
  return rowToOrder(row);
}

export async function getOrder(db,id){
  const row=await db.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(id).first();
  return rowToOrder(row);
}

export async function listOrders(db){
  const result=await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 2000').all();
  return (result?.results||[]).map(rowToOrder);
}

export async function insertOrder(db,order,id){
  const now=new Date().toISOString();
  await db.prepare(`
    INSERT INTO orders (
      id,client_submission_id,status,order_type,interface_language,name,contact,
      occasion,occasion_detail,story_core,description,golden_answers_json,
      tier_label,wedding_package_id,wedding_package_label,styles_json,urgent,
      quoted_price,raw_message,source,source_url,internal_notes,schema_version,
      created_at,updated_at,last_edited_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id,order.clientSubmissionId,order.status,order.orderType,order.language,order.name,order.contact,
    order.occasion,order.occasionDetail,order.storyCore,order.description,JSON.stringify(order.goldenAnswers),
    order.tierLabel,order.weddingPackageId,order.weddingPackageLabel,JSON.stringify(order.styles),order.urgent?1:0,
    order.quotedPrice,order.rawMessage,order.source,order.sourceUrl,order.internalNotes,order.schemaVersion,
    now,now,'public-form'
  ).run();
  return getOrder(db,id);
}

export async function updateOrderAdmin(db,id,input,editor){
  const current=await getOrder(db,id);
  if(!current)throw new HttpError(404,'Заявка не найдена');

  const status=input?.status===undefined?current.status:String(input.status);
  if(!ORDER_STATUSES.includes(status))throw new HttpError(422,'Некорректный статус заявки');
  const internalNotes=input?.internalNotes===undefined
    ? current.internalNotes
    : clean(input.internalNotes,16000,{label:'Внутренние заметки'});

  const now=new Date().toISOString();
  await db.prepare(`
    UPDATE orders
    SET status=?,internal_notes=?,updated_at=?,last_edited_by=?
    WHERE id=?
  `).bind(status,internalNotes,now,editor,id).run();

  return getOrder(db,id);
}
