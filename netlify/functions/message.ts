import type { SupportMessage } from '../../src/types';
import { DOT_BY_ID } from '../../src/data/ribbonGeometry';
import { database } from '../lib/supabase';
import { failure,json,HttpError } from '../lib/http';
export default async (request:Request) => {
  try {
    if(request.method!=='GET')throw new HttpError(405,'Method not allowed.');
    const dotId=new URL(request.url).searchParams.get('dot_id');
    if(!dotId||!DOT_BY_ID.has(dotId))throw new HttpError(400,'Please choose a dot from the ribbon.');
    const messages=await database<SupportMessage[]>('messages?select=id,dot_id,message,author_name,symbol,status,created_at&status=eq.published&dot_id=eq.'+encodeURIComponent(dotId)+'&limit=1');
    if(!messages[0])throw new HttpError(404,'This message is no longer available.');
    // Content stays uncached at the CDN so moderation removes it immediately
    // on a new visitor read. The browser's session cache avoids repeat reads.
    return json(messages[0]);
  }catch(error){return failure(error);}
};
