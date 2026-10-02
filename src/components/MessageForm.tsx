import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { SupportMessage, SymbolChoice } from '../types';
import { MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH, SYMBOLS, validateMessageInput } from '../lib/validation';
import { repository } from '../lib/repository';
export function MessageForm({onClose,onSubmitted}:{onClose:()=>void;onSubmitted:(message:SupportMessage)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const requestId=useRef(crypto.randomUUID());
  const lastPayload=useRef('');
  const [message,setMessage]=useState(''),[name,setName]=useState(''),[symbol,setSymbol]=useState<SymbolChoice>('🩷');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [website,setWebsite]=useState('');
  const length=Array.from(message).length;
  useEffect(()=>{
    const element=dialog.current!;const active=document.activeElement as HTMLElement|null;
    element.showModal();const prior=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{element.close();document.body.style.overflow=prior;active?.focus();};
  },[]);
  async function submit(event:FormEvent) {
    event.preventDefault();if(busy)return;setError('');
    try {
      const payload=JSON.stringify({message,author_name:name,symbol});
      if(lastPayload.current&&lastPayload.current!==payload)requestId.current=crypto.randomUUID();
      lastPayload.current=payload;
      const input=validateMessageInput({message,author_name:name,symbol,website,request_id:requestId.current});
      setBusy(true);
      const saved=await repository.submit(input);
      onSubmitted(saved);
    } catch(error) {setError(error instanceof Error?error.message:'Please try again in a moment.');setBusy(false);}
  }
  return <dialog ref={dialog} className="message-dialog" aria-labelledby="form-heading"
    onCancel={event=>{if(busy)event.preventDefault();else onClose();}}
    onClick={event=>{if(event.target===dialog.current&&!busy)onClose();}}>
    <div className="message-form-shell">
      <button className="icon-button close-form" type="button" onClick={onClose} disabled={busy} aria-label="Close message form">×</button>
      <p className="eyebrow">A few words can mean so much</p>
      <h2 id="form-heading">Leave a little <em>love.</em></h2>
      <p className="form-intro">For someone you may never meet. For a day they may need it.</p>
      <form onSubmit={submit}>
        <label htmlFor="support-message">Your message</label>
        <textarea id="support-message" autoFocus rows={4} value={message} onChange={e=>setMessage(e.target.value)}
          placeholder="Sending you strength, today and always…" required disabled={busy}
          aria-describedby="message-limit message-error" />
        <div className="field-meta"><span>Keep it kind. Please leave out links and personal details.</span><span id="message-limit" className={length>MESSAGE_MAX_LENGTH?'over-limit':''}>{length} / {MESSAGE_MAX_LENGTH}</span></div>
        <label htmlFor="author-name">From <span className="optional">(optional)</span></label>
        <input id="author-name" autoComplete="given-name" maxLength={NAME_MAX_LENGTH} value={name}
          onChange={e=>setName(e.target.value)} placeholder="Your first name, or Anonymous" disabled={busy} />
        <fieldset disabled={busy} className="symbol-choices"><legend>A little something <span className="optional">(optional)</span></legend>
          {SYMBOLS.map(item=><label key={item||'none'} className={symbol===item?'symbol-choice selected':'symbol-choice'}>
            <input type="radio" name="symbol" value={item} checked={symbol===item} onChange={()=>setSymbol(item)} />
            <span>{item||'None'}</span><span className="sr-only">{item==='🩷'?'Pink heart':item==='🌷'?'Tulip':item==='🎀'?'Ribbon':item==='✨'?'Sparkles':''}</span>
          </label>)}
        </fieldset>
        <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)} /></div>
        <p id="message-error" className="form-error" role="alert">{error}</p>
        <button className="primary-button submit-message" disabled={busy||length<3||length>MESSAGE_MAX_LENGTH}>{busy?'Adding your words…':'Add my message to the ribbon'}<span aria-hidden="true">↗</span></button>
        <p className="form-note">{repository.isDemo?'Demo: your message is saved only in this browser.':'Your message and chosen name will be public. No account needed.'}</p>
      </form>
    </div>
  </dialog>;
}
