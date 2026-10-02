import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import type { Context } from '@netlify/functions';
import occupancy from '../netlify/functions/occupancy';
import message from '../netlify/functions/message';
import submit from '../netlify/functions/submit';
import report from '../netlify/functions/report';
import { MessageCache } from '../src/lib/repository';
import type { MessageRepository,SupportMessage } from '../src/types';
const requestId='a246e4de-a142-4ac1-94ad-9b22c427fe01';
const display:SupportMessage={id:requestId,dot_id:'ribbon-v1-00000',message:'Sending love',author_name:'Ana',symbol:'🩷',status:'published',created_at:'2026-10-02T12:00:00Z'};
const context={ip:'192.0.2.1'} as Context;
function post(path:string,body:unknown,origin?:string){
  return new Request('https://pink.example/.netlify/functions/'+path,{method:'POST',
    headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
}
beforeEach(()=>{
  vi.stubEnv('SUPABASE_URL','https://project.example.invalid');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture-server-key');
  vi.stubEnv('RATE_LIMIT_SECRET','test-only-secret-value-longer-than-32-characters');
  vi.stubEnv('MESSAGE_MODERATION_MODE','published');
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('controlled server endpoints',()=>{
  it('paginates beyond 1000 rows while requesting only occupancy IDs',async()=>{
    const fetch=vi.fn(async(url:string)=>{
      expect(url).toContain('select=dot_id');
      expect(url).not.toContain('select=message');
      const offset=Number(new URL(url).searchParams.get('offset'));
      const size=offset<2000?1000:54;
      return Response.json(Array.from({length:size},(_,i)=>({dot_id:'ribbon-v1-'+String(offset+i).padStart(5,'0')})));
    });
    vi.stubGlobal('fetch',fetch);
    const response=await occupancy(new Request('https://pink.example/.netlify/functions/occupancy'));
    expect(response.status).toBe(200);
    const body=await response.json();expect(body.count).toBe(2054);expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('restricts reads to published messages and handles missing messages',async()=>{
    const fetch=vi.fn(async(url:string)=>{expect(url).toContain('status=eq.published');return Response.json([]);});
    vi.stubGlobal('fetch',fetch);
    expect((await message(new Request('https://pink.example/.netlify/functions/message?dot_id=ribbon-v1-00000'))).status).toBe(404);
    expect((await message(new Request('https://pink.example/.netlify/functions/message?dot_id=invalid'))).status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('uses server-controlled allocation and moderation, with a hashed visitor key',async()=>{
    const fetch=vi.fn(async(_url:string,init:RequestInit)=>{
      const payload=JSON.parse(String(init.body));
      expect(payload.p_status).toBe('published');
      expect(payload.p_visitor_key).toMatch(/^[a-f0-9]{64}$/);
      expect(payload.p_visitor_key).not.toContain(context.ip);
      expect(payload).not.toHaveProperty('dot_id');
      expect(payload.p_request_id).toBe(requestId);
      return Response.json([display]);
    });
    vi.stubGlobal('fetch',fetch);
    const response=await submit(post('submit',{message:'Sending love',author_name:'Ana',symbol:'🩷',website:'',request_id:requestId,status:'rejected',dot_id:'spoofed'}),context);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(display);
  });
  it('rejects cross-origin writes and invalid payloads before database access',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    expect((await submit(post('submit',{},'https://attacker.example'),context)).status).toBe(403);
    expect((await submit(post('submit',{}),context)).status).toBe(400);
    expect((await report(post('report',{message_id:'invalid'}),context)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('refuses submissions when trusted visitor hashing is not configured',async()=>{
    vi.stubEnv('RATE_LIMIT_SECRET','');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const response=await submit(post('submit',{message:'Sending love',author_name:'Ana',symbol:'🩷',website:'',request_id:requestId}),context);
    expect(response.status).toBe(503);expect(fetch).not.toHaveBeenCalled();
  });
});
describe('session lazy-read cache',()=>{
  it('deduplicates concurrent reads and reuses loaded text',async()=>{
    const getMessage=vi.fn(async()=>display);
    const source={getMessage} as unknown as MessageRepository;
    const cache=new MessageCache(source);
    const [a,b]=await Promise.all([cache.get(display.dot_id),cache.get(display.dot_id)]);
    expect(a).toEqual(b);await cache.get(display.dot_id);expect(getMessage).toHaveBeenCalledTimes(1);
  });
  it('allows retry after a failed lazy read',async()=>{
    const getMessage=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(display);
    const cache=new MessageCache({getMessage} as unknown as MessageRepository);
    await expect(cache.get(display.dot_id)).rejects.toThrow('offline');
    await expect(cache.get(display.dot_id)).resolves.toEqual(display);
    expect(getMessage).toHaveBeenCalledTimes(2);
  });
});
