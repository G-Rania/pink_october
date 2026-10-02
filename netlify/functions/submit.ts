import type { Context } from '@netlify/functions';
import type { SupportMessage } from '../../src/types';
import { validateMessageInput,ValidationError } from '../../src/lib/validation';
import { database } from '../lib/supabase';
import { failure,json,readBody,requirePost,visitorKey,HttpError } from '../lib/http';
export default async (request:Request,context:Context) => {
  try {
    requirePost(request);
    const input=validateMessageInput(await readBody(request));
    const moderation=process.env.MESSAGE_MODERATION_MODE||'published';
    if(!['published','pending'].includes(moderation))throw new HttpError(503,'Message submissions are not configured yet.');
    const messages=await database<SupportMessage[]>('rpc/create_support_message',{method:'POST',body:JSON.stringify({
      p_message:input.message,p_author_name:input.author_name,p_symbol:input.symbol,
      p_request_id:input.request_id,p_visitor_key:visitorKey(context),p_status:moderation
    })});
    if(!messages[0])throw new HttpError(503,'Unable to add your message. Please try again.');
    return json(messages[0],201);
  }catch(error){
    if(error instanceof ValidationError)return json({error:error.message},400);
    return failure(error);
  }
};
