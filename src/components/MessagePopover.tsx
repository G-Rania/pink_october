import { useEffect, useRef, useState } from 'react';
import type { SupportMessage } from '../types';
import type { ScreenPoint } from '../hooks/useRibbonCanvas';
import { repository } from '../lib/repository';
export function MessagePopover({message,error,point,pinned,confirmation,onClose,onNext,width,height}:{
  message:SupportMessage|null;error:string;point:ScreenPoint;pinned:boolean;confirmation:boolean;
  onClose:()=>void;onNext:(direction:number)=>void;width:number;height:number;
}) {
  const ref=useRef<HTMLDivElement>(null),[reported,setReported]=useState(false),[reportError,setReportError]=useState('');
  const [reporting,setReporting]=useState(false);
  useEffect(()=>{setReported(false);setReportError('');},[message?.id]);
  useEffect(()=>{if(pinned)ref.current?.focus({preventScroll:true});},[pinned,message?.id]);
  async function report() {
    if(!message||reporting)return;setReporting(true);
    try {await repository.report(message.id);setReported(true);} catch {setReportError('Could not send the report. Please try again.');}
    finally {setReporting(false);}
  }
  const cardWidth=Math.min(320,width-32),left=Math.max(16,Math.min(width-cardWidth-16,point.x+22));
  const hasSideRoom=width>=700;
  const top=hasSideRoom?Math.max(72,Math.min(height-260,point.y-35)):Math.max(72,Math.min(height-240,point.y+27));
  const maxHeight=hasSideRoom?Math.min(380,height-top-24):Math.min(216,height-top-24);
  return <div ref={ref} className={'message-popover '+(pinned?'pinned':'preview')} style={{left,top,width:cardWidth,maxHeight}}
    role={pinned?'dialog':'tooltip'} aria-label="Message of support" tabIndex={pinned?-1:undefined}
    onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
    {pinned&&<button className="icon-button popover-close" onClick={onClose} aria-label="Close message">×</button>}
    {confirmation&&<p className="contribution-confirmation">Your message is now part of the ribbon. 🩷</p>}
    {error?<p role="alert">{error}</p>:message?<><span className="message-symbol" aria-hidden="true">{message.symbol}</span>
      <p className="message-content">“{message.message}”</p><p className="message-author">— {message.author_name}</p></>:<p className="loading-message" role="status">Opening a little kindness…</p>}
    {pinned&&!confirmation&&<div className="message-actions">
      <button onClick={()=>onNext(-1)} aria-label="Read previous message">←</button>
      <button onClick={()=>onNext(1)} aria-label="Read next message">Next message →</button>
    </div>}
    {pinned&&message&&!confirmation&&<button className="report-button" disabled={reported||reporting} onClick={report}>
      {reported?(repository.isDemo?'Report simulated in demo':'Report received'):reporting?'Sending…':'Report this message'}
    </button>}
    {reportError&&<p className="report-error" role="alert">{reportError}</p>}
  </div>;
}
