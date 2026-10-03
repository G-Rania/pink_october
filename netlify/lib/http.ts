import type { Context } from '@netlify/functions';
import { createHmac } from 'node:crypto';
export class HttpError extends Error {
  constructor(public status:number,message:string){super(message);}
}
export function json(data:unknown,status=200,cache=false) {
  return new Response(JSON.stringify(data),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':cache?'public, max-age=30':'no-store',
    ...(cache?{'Netlify-CDN-Cache-Control':'public, s-maxage=60, stale-while-revalidate=120'}:{}),
    'X-Content-Type-Options':'nosniff'
  }});
}
export function requirePost(request:Request) {
  if(request.method!=='POST')throw new HttpError(405,'Method not allowed.');
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,'Please submit from Pink Wall.');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new HttpError(415,'Please send a JSON request.');
  if(Number(request.headers.get('content-length')||0)>4096)throw new HttpError(413,'Your message is too long.');
}
export async function readBody(request:Request) {
  const text=await request.text();
  if(new TextEncoder().encode(text).length>4096)throw new HttpError(413,'Your message is too long.');
  try{return JSON.parse(text) as unknown;}catch{throw new HttpError(400,'Please check the form fields.');}
}
export function visitorKey(context:Context) {
  // A dedicated key is preferred. Deriving a purpose-specific key from the
  // server-only Supabase credential keeps deployments functional when the
  // optional separation key was not configured.
  const sourceSecret=process.env.RATE_LIMIT_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!sourceSecret||sourceSecret.length<32)throw new HttpError(503,'Message submissions are not configured yet.');
  // context.ip is supplied by Netlify, never trust a client-provided forwarding header.
  if(!context.ip)throw new HttpError(503,'Unable to verify this request. Please try again.');
  const hmacKey=createHmac('sha256',sourceSecret).update('pink-dots/visitor-key/v1').digest();
  return createHmac('sha256',hmacKey).update(context.ip).digest('hex');
}
export function failure(error:unknown) {
  if(error instanceof HttpError)return json({error:error.message},error.status);
  // Never log payloads, keys, IPs, or upstream response bodies.
  console.error('Pink Wall API request failed.');
  return json({error:'The ribbon is taking a moment. Please try again.'},503);
}
