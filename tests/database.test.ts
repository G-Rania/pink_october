import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
let db:PGlite;
const key='a'.repeat(64);
async function submit(requestId=randomUUID(),visitorKey=key,status='published') {
  return db.query<{id:string;dot_id:string;status:string}>(
    'select * from public.create_support_message($1,$2,$3,$4,$5,$6)',
    ['Sending strength','Ana','🩷',requestId,visitorKey,status]);
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync('supabase/migrations/001_pink_wall.sql','utf8'));
},30000);
afterAll(async()=>{await db.close();});
describe('PostgreSQL allocation, abuse limits and privileges',()=>{
  it('assigns valid unique dots and makes retries idempotent',async()=>{
    const requestId=randomUUID();
    const first=await submit(requestId),second=await submit(requestId);
    expect(second.rows[0].id).toBe(first.rows[0].id);
    const third=await submit();expect(third.rows[0].dot_id).not.toBe(first.rows[0].dot_id);
    expect(first.rows[0].dot_id).toMatch(/^ribbon-v1-\d{5}$/);
  });
  it('reserves pending dots and excludes them from published occupancy',async()=>{
    const result=await submit(randomUUID(),'b'.repeat(64),'pending');
    const visible=await db.query("select dot_id from public.messages where status='published' and dot_id=$1",[result.rows[0].dot_id]);
    expect(visible.rows).toHaveLength(0);expect(result.rows[0].status).toBe('pending');
  });
  it('enforces quotas transactionally across calls',async()=>{
    const visitor='c'.repeat(64);
    for(let i=0;i<5;i++)await submit(randomUUID(),visitor);
    await expect(submit(randomUUID(),visitor)).rejects.toThrow('Rate limit exceeded');
    const counts=await db.query<{counter:number}>('select counter from public.rate_limits where visitor_key=$1',[visitor]);
    expect(counts.rows[0].counter).toBe(5);
  });
  it('deduplicates reports and protects anonymous database access',async()=>{
    const message=(await submit(randomUUID(),'d'.repeat(64))).rows[0];
    for(let i=0;i<2;i++)await db.query('select public.report_support_message($1,$2)',[message.id,key]);
    const reports=await db.query('select * from public.message_reports where message_id=$1',[message.id]);expect(reports.rows).toHaveLength(1);
    await db.exec('set role anon');
    try{await expect(db.query('select * from public.messages')).rejects.toThrow('permission denied');
      await expect(submit()).rejects.toThrow('permission denied');
    }finally{await db.exec('reset role');}
  });
  it('rejects invalid IDs and two occupied messages sharing a dot',async()=>{
    const message=(await submit(randomUUID(),'e'.repeat(64))).rows[0];
    await expect(db.query('insert into public.messages(dot_id,message,request_id) values($1,$2,$3)',[message.dot_id,'Another message',randomUUID()])).rejects.toThrow('duplicate key');
    await expect(db.query('insert into public.messages(dot_id,message,request_id) values($1,$2,$3)',['ribbon-v1-09999','Another message',randomUUID()])).rejects.toThrow('check constraint');
  });
});
