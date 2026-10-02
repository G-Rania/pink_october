import type { MessageInput, MessageRepository, Occupancy, SupportMessage } from '../types';
import { RIBBON_DOTS, DOT_BY_ID } from '../data/ribbonGeometry';
import { validateMessageInput } from './validation';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response=await fetch('/.netlify/functions/'+path,{...options,signal:AbortSignal.timeout(15000)});
  const body=await response.json().catch(()=>null);
  if(!response.ok) throw new ApiError(body?.error||'The ribbon is taking a moment. Please try again.',response.status);
  return body as T;
}
export class ApiRepository implements MessageRepository {
  readonly isDemo=false;
  private occupancy:Promise<Occupancy>|undefined;
  getOccupancy() {
    if(!this.occupancy)this.occupancy=request<Occupancy>('occupancy').catch(error=>{this.occupancy=undefined;throw error;});
    return this.occupancy;
  }
  getMessage(dotId: string) { return request<SupportMessage>('message?dot_id='+encodeURIComponent(dotId)); }
  submit(input: MessageInput) {
    return request<SupportMessage>('submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  }
  async report(messageId: string) {
    await request('report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message_id:messageId})});
  }
}
const examples=[
  ['Sending you strength today. One breath, one moment, one day at a time.','Sarah','🩷'],
  ['You deserve care on the hopeful days and the difficult ones. We are here with you.','Maya','🌷'],
  ['A little reminder from someone you have never met: you are held in so much love.','Anonymous','🎀'],
  ['May today bring a small moment of peace. Thinking of you, always.','Ana','✨'],
  ['There is no right way to feel. You are allowed to rest. You are allowed to hope.','Clara',''],
] as const;
const storageKey='pink-wall-demo-v1';
/** Explicit demo: examples and browser-local contributions, never pretending to be public data. */
export class DemoRepository implements MessageRepository {
  readonly isDemo=true;
  private messages=new Map<string,SupportMessage>();
  private requests=new Map<string,SupportMessage>();
  constructor() {
    for(let i=0;i<120;i++) {
      const dot=RIBBON_DOTS[(i*137+31)%RIBBON_DOTS.length];
      const [message,author_name,symbol]=examples[i%examples.length];
      this.messages.set(dot.dot_id,{id:'demo-'+i,dot_id:dot.dot_id,message,author_name,symbol,status:'published',created_at:'2026-10-01T12:00:00Z'});
    }
    try {
      const saved: unknown=JSON.parse(localStorage.getItem(storageKey)||'[]');
      if(Array.isArray(saved)) for(const item of saved) {
        if(item && typeof item==='object' && DOT_BY_ID.has(item.dot_id) &&
          typeof item.message==='string' && typeof item.author_name==='string' && item.status==='published')
          this.messages.set(item.dot_id,item);
      }
    } catch { /* Storage may be disabled. The in-memory demo still works. */ }
  }
  async getOccupancy() { return {dot_ids:[...this.messages.keys()],count:this.messages.size}; }
  async getMessage(dotId: string) {
    const message=this.messages.get(dotId);
    if(!message) throw new ApiError('This message is no longer available.',404);
    return message;
  }
  async submit(raw: MessageInput) {
    const input=validateMessageInput(raw);
    const prior=this.requests.get(input.request_id); if(prior) return prior;
    const dot=RIBBON_DOTS.find(dot=>!this.messages.has(dot.dot_id) && dot.y>260 && dot.y<460)
      || RIBBON_DOTS.find(dot=>!this.messages.has(dot.dot_id));
    if(!dot) throw new ApiError('The ribbon has no available spaces right now.',409);
    const message: SupportMessage={id:crypto.randomUUID(),dot_id:dot.dot_id,message:input.message,
      author_name:input.author_name,symbol:input.symbol,status:'published',created_at:new Date().toISOString()};
    this.messages.set(dot.dot_id,message); this.requests.set(input.request_id,message);
    try { localStorage.setItem(storageKey,JSON.stringify([...this.messages.values()].filter(m=>!m.id.startsWith('demo-')))); } catch { /* Optional persistence. */ }
    return message;
  }
  async report() { /* Demo reports stay local and have no public recipient. */ }
}

/** Deduplicate in-flight lazy reads and reuse successful messages for this session. */
export class MessageCache {
  private values=new Map<string,SupportMessage>();
  private pending=new Map<string,Promise<SupportMessage>>();
  constructor(private source: MessageRepository) {}
  put(message: SupportMessage) { this.values.set(message.dot_id,message); }
  get(dotId: string) {
    const value=this.values.get(dotId); if(value) return Promise.resolve(value);
    const existing=this.pending.get(dotId); if(existing) return existing;
    const promise=this.source.getMessage(dotId).then(message=>{this.put(message);return message;})
      .finally(()=>this.pending.delete(dotId));
    this.pending.set(dotId,promise); return promise;
  }
}
const mode=import.meta.env.VITE_DATA_MODE;
// Local development is ready immediately; production requires an explicit choice.
if(mode && !['demo','api'].includes(mode)) throw new Error('VITE_DATA_MODE must be demo or api.');
export const repository: MessageRepository=(mode==='demo'||(!mode&&import.meta.env.DEV))
  ? new DemoRepository() : new ApiRepository();
export const messageCache=new MessageCache(repository);
