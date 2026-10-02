import { database } from '../lib/supabase';
import { failure,json,HttpError } from '../lib/http';
import { RIBBON_CAPACITY } from '../../src/data/ribbonGeometry';
export default async (request:Request) => {
  try {
    if(request.method!=='GET')throw new HttpError(405,'Method not allowed.');
    const rows:{dot_id:string}[]=[];
    // Supabase's default 1,000-row cap must not truncate a growing ribbon.
    // A bounded server-side page loop; only IDs cross the wire.
    for(let offset=0;offset<RIBBON_CAPACITY;offset+=1000) {
      const batch=await database<{dot_id:string}[]>('messages?select=dot_id&status=eq.published&order=dot_id.asc&limit=1000&offset='+offset);
      rows.push(...batch);if(batch.length<1000)break;
    }
    return json({dot_ids:rows.map(row=>row.dot_id),count:rows.length},200,true);
  }catch(error){return failure(error);}
};
