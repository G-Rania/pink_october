import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupportMessage } from '../types';
import { DOT_BY_ID, type RibbonDot } from '../data/ribbonGeometry';
import { messageCache, repository } from '../lib/repository';
import { useRibbonCanvas } from '../hooks/useRibbonCanvas';
import { MessagePopover } from './MessagePopover';
interface Selection { dot_id:string; message:SupportMessage|null; pinned:boolean; error:string; confirmation:boolean }
export function Ribbon({onLeaveMessage,contribution}:{onLeaveMessage:()=>void;contribution:SupportMessage|null}) {
  const [occupied,setOccupied]=useState<Set<string>>(new Set());
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const [selection,setSelection]=useState<Selection|null>(null);
  const [touchExplore,setTouchExplore]=useState(false);
  const [announcement,setAnnouncement]=useState('');
  const hoverTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const selectionRef=useRef(selection);selectionRef.current=selection;
  const currentHover=useRef<string|null>(null);
  const requestVersion=useRef(0);
  const focusRef=useRef((_:string)=>{});
  const close=useCallback(()=>{
    clearTimeout(hoverTimer.current);currentHover.current=null;requestVersion.current++;
    setSelection(null);
  },[]);
  const open=useCallback((dotId:string,pinned:boolean)=>{
    const version=++requestVersion.current;
    setSelection({dot_id:dotId,message:null,pinned,error:'',confirmation:false});
    messageCache.get(dotId).then(message=>{
      if(version===requestVersion.current)setSelection({dot_id:dotId,message,pinned,error:'',confirmation:false});
    }).catch(error=>{
      if(version===requestVersion.current)setSelection({dot_id:dotId,message:null,pinned,error:error instanceof Error?error.message:'Unable to open this message.',confirmation:false});
    });
  },[]);
  const onHover=useCallback((dot:RibbonDot|null)=>{
    if(selectionRef.current?.pinned)return;
    const id=dot&&occupied.has(dot.dot_id)?dot.dot_id:null;
    if(id===currentHover.current)return;
    currentHover.current=id;clearTimeout(hoverTimer.current);
    requestVersion.current++;setSelection(null);
    if(id)hoverTimer.current=setTimeout(()=>open(id,false),180);
  },[occupied,open]);
  const onSelect=useCallback((dot:RibbonDot|null)=>{
    clearTimeout(hoverTimer.current);
    if(dot&&occupied.has(dot.dot_id)){open(dot.dot_id,true);focusRef.current(dot.dot_id);}
    else close();
  },[occupied,open,close]);
  const viewport=useRibbonCanvas({occupied,highlight:selection?.dot_id||null,touchExplore,onHover,onSelect,revealDot:contribution?.status==='published'?contribution.dot_id:null});
  focusRef.current=viewport.focusDot;
  const load=useCallback(async()=>{
    setLoading(true);setLoadError('');
    try {const result=await repository.getOccupancy();setOccupied(prior=>new Set([...prior,...result.dot_ids.filter(id=>DOT_BY_ID.has(id))]));}
    catch(error){setLoadError(error instanceof Error?error.message:'The messages could not be loaded.');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void load();return ()=>clearTimeout(hoverTimer.current);},[load]);
  useEffect(()=>{
    if(!contribution)return;
    clearTimeout(hoverTimer.current);currentHover.current=null;requestVersion.current++;
    if(contribution.status!=='published'){
      setAnnouncement('Thank you. Your message is awaiting review before it joins the ribbon.');return;
    }
    messageCache.put(contribution);
    // Backend confirmation is already received. Update local occupancy immediately.
    setOccupied(prior=>new Set([...prior,contribution.dot_id]));
    setSelection({dot_id:contribution.dot_id,message:contribution,pinned:true,error:'',confirmation:true});
    setAnnouncement('Your message is now part of the ribbon. 🩷');
    focusRef.current(contribution.dot_id);
  },[contribution]);
  const read=useCallback((direction=1)=>{
    const ids=[...occupied];if(!ids.length)return;
    const index=selectionRef.current?ids.indexOf(selectionRef.current.dot_id):-1;
    const next=ids[(index+direction+ids.length)%ids.length];
    open(next,true);focusRef.current(next);
  },[occupied,open]);
  const point=selection&&viewport.screenPoint(selection.dot_id);
  return <section className="ribbon-section" id="ribbon" aria-labelledby="ribbon-heading">
    <div className="ribbon-intro">
      <h2 id="ribbon-heading">One <em>Ribon</em>. Thousands of <em>Voices</em></h2>
      <p>Every filled dot holds a message of support, left by someone for someone they may never meet.</p>
    </div>
    <div className="ribbon-workspace">
      <div className="ribbon-toolbar"><span className="ribbon-count">
        <span className="filled-dot-key" aria-hidden="true" />{loading?'Gathering voices…':occupied.size.toLocaleString()+' messages of support'}
      </span>{repository.isDemo&&<span className="demo-badge">Local demo · example messages</span>}</div>
      <div className={'canvas-wrap '+(touchExplore?'touch-explore':'')}>
        <canvas ref={viewport.canvasRef} tabIndex={0} role="img"
          aria-label="Breast cancer awareness ribbon made of dots. Outlined dots are available spaces; filled dots contain messages."
          aria-describedby="ribbon-instructions keyboard-instructions"
          onKeyDown={e=>{
            if(e.key==='+'||e.key==='='){e.preventDefault();viewport.zoomAt(1.35);}
            else if(e.key==='-'){e.preventDefault();viewport.zoomAt(1/1.35);}
            else if(e.key==='Home'){e.preventDefault();viewport.reset();close();}
            else if(e.key==='Enter'){e.preventDefault();read();}
            else if(e.key==='Escape'){close();setTouchExplore(false);}
            else if(e.key.startsWith('Arrow')){e.preventDefault();viewport.pan(e.key==='ArrowLeft'?50:e.key==='ArrowRight'?-50:0,e.key==='ArrowUp'?50:e.key==='ArrowDown'?-50:0);}
          }} />
        {loadError&&<div className="canvas-error" role="alert"><p>{loadError}</p><button onClick={load}>Try again</button></div>}
        <div className="zoom-controls" aria-label="Ribbon zoom controls">
          <button className="icon-button" onClick={()=>viewport.zoomAt(1.35)} aria-label="Zoom in">+</button>
          <span aria-live="off">{viewport.zoom}%</span>
          <button className="icon-button" onClick={()=>viewport.zoomAt(1/1.35)} aria-label="Zoom out">−</button>
          <span className="control-divider" />
          <button className="reset-button" onClick={()=>{viewport.reset();close();}} aria-label="Reset ribbon view">Reset</button>
        </div>
        <button className="touch-toggle" aria-pressed={touchExplore} onClick={()=>{setTouchExplore(!touchExplore);close();}}>
          {touchExplore?'Done exploring':'Explore ribbon'}
        </button>
        {selection&&point&&<MessagePopover key={selection.dot_id} message={selection.message} error={selection.error}
          point={point} pinned={selection.pinned} confirmation={selection.confirmation} width={viewport.size.width} height={viewport.size.height}
          onClose={()=>{close();viewport.canvasRef.current?.focus({preventScroll:true});}} onNext={read} />}
        <span className="canvas-label" aria-hidden="true">People showing up for people.</span>
      </div>
      <div className="ribbon-bottom">
        <div><p id="ribbon-instructions">Zoom in to read them. Leave yours to fill another dot.</p>
          <p className="gesture-hint"><span className="desktop-hint">Drag to explore · Ctrl/⌘ + scroll to zoom</span><span className="mobile-hint">Tap Explore ribbon to pan and pinch. Tap Done to scroll.</span></p>
        </div>
        <button className="text-button" onClick={()=>read()} disabled={!occupied.size}>Read a message <span aria-hidden="true">↗</span></button>
        <button className="primary-button" onClick={onLeaveMessage}>Leave a message <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    <p className="sr-only" id="keyboard-instructions">Use the zoom buttons, or focus the ribbon and press plus or minus to zoom, arrow keys to pan, Home to reset, and Enter to read a message. Next and previous buttons let you read other messages.</p>
    <p className="ribbon-announcement" role="status" aria-live="polite">{announcement}</p>
  </section>;
}
