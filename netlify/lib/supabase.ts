import { HttpError } from './http';
export async function database<T>(path:string,init?:RequestInit):Promise<T> {
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new HttpError(503,'The ribbon is not connected yet.');
  const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{
    ...init,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...init?.headers},
    signal:AbortSignal.timeout(10000)
  });
  if(!response.ok){
    // Only known database error codes get user-facing messages.
    const error=await response.json().catch(()=>null) as {code?:string}|null;
    if(error?.code==='PT429')throw new HttpError(429,'Thank you for showing up. Please wait a little before sending another message.');
    if(error?.code==='PT409')throw new HttpError(409,'The ribbon has no available spaces right now, or this request was already used.');
    if(error?.code==='PT404')throw new HttpError(404,'This message is no longer available.');
    throw new HttpError(503,'The ribbon is taking a moment. Please try again.');
  }
  if(response.status===204)return undefined as T;
  return await response.json() as T;
}
