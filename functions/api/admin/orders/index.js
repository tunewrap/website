import {requireAdmin} from '../../../_shared/auth.js';
import {json,handleError} from '../../../_shared/http.js';
import {listOrders} from '../../../_shared/orders.js';

export async function onRequestGet(context){
  try{
    await requireAdmin(context);
    const orders=await listOrders(context.env.TUNEWRAP_DB);
    const summary=orders.reduce((result,order)=>{
      result.total+=1;
      if(result[order.status]!==undefined)result[order.status]+=1;
      return result;
    },{total:0,new:0,in_progress:0,waiting_client:0,done:0,archived:0});
    return json({ok:true,summary,orders});
  }catch(error){
    return handleError(error);
  }
}
