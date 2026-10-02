import type { Context } from '@netlify/functions';
import { database } from '../lib/supabase';
import { failure,json,readBody,requirePost,visitorKey,HttpError } from '../lib/http';
export default async (request:Request,context:Context) => {
  try {
    requirePost(request);
    const body=await readBody(request) as {message_id?:unknown}|null;
    if(!body||typeof body.message_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.message_id))
      throw new HttpError(400,'Please choose a message to report.');
    await database('rpc/report_support_message',{method:'POST',body:JSON.stringify({
      p_message_id:body.message_id,p_visitor_key:visitorKey(context)
    })});
    return json({ok:true});
  }catch(error){return failure(error);}
};
