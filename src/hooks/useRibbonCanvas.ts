import { useCallback, useEffect, useRef, useState } from 'react';
import { DOT_BY_ID, DOT_RADIUS, RIBBON_BOUNDS, RIBBON_DOTS, type RibbonDot } from '../data/ribbonGeometry';
import { useReducedMotion } from './useReducedMotion';
export interface View { x: number; y: number; scale: number }
export interface ScreenPoint { x: number; y: number }
interface Options {
  occupied: Set<string>; highlight: string|null; touchExplore: boolean; revealDot:string|null;
  onHover: (dot: RibbonDot|null)=>void; onSelect: (dot: RibbonDot|null)=>void;
}
export function useRibbonCanvas({occupied,highlight,touchExplore,onHover,onSelect,revealDot}:Options) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const size=useRef({width:600,height:700});
  const view=useRef<View>({x:0,y:0,scale:1});
  const base=useRef<View>({x:0,y:0,scale:1});
  const drawRef=useRef(()=>{});
  const drawFrame=useRef(0);
  const journey=useRef(0);
  const reveal=useRef<{dot_id:string;start:number}|null>(null);
  const revealFrame=useRef(0);
  const options=useRef({occupied,highlight,touchExplore,onHover,onSelect});
  options.current={occupied,highlight,touchExplore,onHover,onSelect};
  const [zoom,setZoom]=useState(100);
  const [revision,setRevision]=useState(0);
  const reduced=useReducedMotion();
  const update=useCallback(()=>{
    if(drawFrame.current) return;
    drawFrame.current=requestAnimationFrame(()=>{
      drawFrame.current=0; drawRef.current();
      setZoom(Math.round(view.current.scale/base.current.scale*100));
      setRevision(v=>v+1);
    });
  },[]);
  const clamp=useCallback((next:View):View=>{
    const {width,height}=size.current;
    const scale=Math.max(base.current.scale*.8,Math.min(base.current.scale*9,next.scale));
    return {scale,
      x:Math.max(40-RIBBON_BOUNDS.width*scale,Math.min(width-40,next.x)),
      y:Math.max(40-RIBBON_BOUNDS.height*scale,Math.min(height-40,next.y))};
  },[]);
  const stopJourney=useCallback(()=>{cancelAnimationFrame(journey.current); journey.current=0;},[]);
  const zoomAt=useCallback((factor:number,x=size.current.width/2,y=size.current.height/2)=>{
    stopJourney();
    const old=view.current;
    const scale=Math.max(base.current.scale*.8,Math.min(base.current.scale*9,old.scale*factor));
    view.current=clamp({scale,x:x-(x-old.x)*scale/old.scale,y:y-(y-old.y)*scale/old.scale});
    update();
  },[clamp,stopJourney,update]);
  const reset=useCallback(()=>{stopJourney();view.current={...base.current};update();},[stopJourney,update]);
  const focusDot=useCallback((dotId:string)=>{
    const dot=DOT_BY_ID.get(dotId); if(!dot) return;
    stopJourney();
    const from={...view.current}, {width,height}=size.current;
    const scale=base.current.scale*5.5;
    const to=clamp({scale,x:width*.45-dot.x*scale,y:height*.46-dot.y*scale});
    if(reduced){view.current=to;update();return;}
    const start=performance.now();
    const animate=(now:number)=>{
      const t=Math.min(1,(now-start)/1100),e=t<.5?4*t*t*t:1-(-2*t+2)**3/2;
      view.current={x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e,scale:from.scale+(to.scale-from.scale)*e};
      update(); if(t<1) journey.current=requestAnimationFrame(animate); else journey.current=0;
    };
    journey.current=requestAnimationFrame(animate);
  },[clamp,reduced,stopJourney,update]);
  const screenPoint=useCallback((dotId:string):ScreenPoint|null=>{
    const dot=DOT_BY_ID.get(dotId); if(!dot) return null;
    return {x:dot.x*view.current.scale+view.current.x,y:dot.y*view.current.scale+view.current.y};
  },[]);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const context=canvas.getContext('2d'); if(!context) return;
    const hollow=new Path2D();
    for(const dot of RIBBON_DOTS){hollow.moveTo(dot.x+DOT_RADIUS,dot.y);hollow.arc(dot.x,dot.y,DOT_RADIUS,0,Math.PI*2);}
    drawRef.current=()=>{
      const {width,height}=size.current, {x,y,scale}=view.current;
      const dpr=Math.min(devicePixelRatio||1,2);
      context.setTransform(dpr,0,0,dpr,0,0); context.clearRect(0,0,width,height);
      context.translate(x,y); context.scale(scale,scale);
      context.strokeStyle='#dc879c';context.lineWidth=.85;context.stroke(hollow);
      context.fillStyle='#fb6f92';context.beginPath();
      for(const id of options.current.occupied){
        const dot=DOT_BY_ID.get(id);if(!dot||reveal.current?.dot_id===id)continue;
        context.moveTo(dot.x+DOT_RADIUS,dot.y);context.arc(dot.x,dot.y,DOT_RADIUS,0,Math.PI*2);
      }
      context.fill();
      if(reveal.current){
        const fresh=DOT_BY_ID.get(reveal.current.dot_id);
        const progress=Math.max(0,Math.min(1,(performance.now()-reveal.current.start-1050)/450));
        if(fresh&&progress>0){context.globalAlpha=progress;context.beginPath();context.arc(fresh.x,fresh.y,DOT_RADIUS*(.6+.4*progress),0,Math.PI*2);context.fill();context.globalAlpha=1;}
      }
      const dot=options.current.highlight && DOT_BY_ID.get(options.current.highlight);
      if(dot){
        context.beginPath();context.arc(dot.x,dot.y,DOT_RADIUS+2.4,0,Math.PI*2);
        context.strokeStyle='#96344f';context.lineWidth=1;context.stroke();
      }
    };
    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      const width=rect.width,height=rect.height;
      if(!width||!height)return;
      const priorBase=base.current.scale;
      const relative=view.current.scale/priorBase;
      size.current={width,height};
      const scale=Math.min((width-48)/RIBBON_BOUNDS.width,(height-60)/RIBBON_BOUNDS.height);
      base.current={scale,x:(width-RIBBON_BOUNDS.width*scale)/2,y:(height-RIBBON_BOUNDS.height*scale)/2};
      canvas.width=Math.round(width*Math.min(devicePixelRatio||1,2));
      canvas.height=Math.round(height*Math.min(devicePixelRatio||1,2));
      view.current={...base.current};
      if(relative>1.1)view.current.scale=scale; // Resize restores a recognizable whole ribbon.
      update();
    };
    resize(); const observer=new ResizeObserver(resize);observer.observe(canvas);
    const local=(event:PointerEvent|WheelEvent)=>{const r=canvas.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};};
    const hit=(p:ScreenPoint)=>{
      const {x,y,scale}=view.current,wx=(p.x-x)/scale,wy=(p.y-y)/scale;
      const tolerance=Math.min(12/scale,6);
      let nearest:RibbonDot|null=null,best=tolerance*tolerance;
      for(const dot of RIBBON_DOTS){
        const distance=(dot.x-wx)**2+(dot.y-wy)**2;
        if(distance<best){nearest=dot;best=distance;}
      }
      return nearest;
    };
    const pointers=new Map<number,ScreenPoint>();
    let last:ScreenPoint|null=null,start:ScreenPoint|null=null,moved=false,pinched=false,pinchDistance=0;
    let passiveTouch:ScreenPoint|null=null;
    const wheel=(event:WheelEvent)=>{
      // Standard wheel scrolling continues the page. Ctrl/Command + wheel zooms
      // (including trackpad pinch); buttons work without modifier keys.
      if(!event.ctrlKey&&!event.metaKey)return;
      event.preventDefault();const p=local(event);zoomAt(Math.exp(-event.deltaY*.008),p.x,p.y);
    };
    const down=(event:PointerEvent)=>{
      if(event.button!==0)return;
      if(event.pointerType==='touch'&&!options.current.touchExplore){passiveTouch=local(event);return;}
      stopJourney();const p=local(event);pointers.set(event.pointerId,p);
      canvas.setPointerCapture(event.pointerId);last=p;start=p;moved=false;
      if(pointers.size===2){pinched=true;moved=true;const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);last={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
      canvas.classList.add('dragging'); options.current.onHover(null);
    };
    const move=(event:PointerEvent)=>{
      const p=local(event);
      if(!pointers.has(event.pointerId)){
        if(event.pointerType==='mouse')options.current.onHover(hit(p));
        return;
      }
      pointers.set(event.pointerId,p);
      if(pointers.size>=2){
        const [a,b]=[...pointers.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        const distance=Math.hypot(a.x-b.x,a.y-b.y);
        if(pinchDistance>0)zoomAt(distance/pinchDistance,center.x,center.y);
        if(last)view.current=clamp({...view.current,x:view.current.x+center.x-last.x,y:view.current.y+center.y-last.y});
        last=center;pinchDistance=distance;moved=true;update();return;
      }
      if(start&&Math.hypot(p.x-start.x,p.y-start.y)>5)moved=true;
      if(last&&moved){view.current=clamp({...view.current,x:view.current.x+p.x-last.x,y:view.current.y+p.y-last.y});update();}
      last=p;
    };
    const up=(event:PointerEvent)=>{
      if(!pointers.has(event.pointerId)) {
        if(event.type==='pointerup'&&event.pointerType==='touch'&&!options.current.touchExplore&&passiveTouch){
          const p=local(event);if(Math.hypot(p.x-passiveTouch.x,p.y-passiveTouch.y)<8)options.current.onSelect(hit(p));
        }
        passiveTouch=null;
        return;
      }
      pointers.delete(event.pointerId);
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
      if(!moved&&!pinched&&event.type!=='pointercancel')options.current.onSelect(hit(local(event)));
      if(!pointers.size){canvas.classList.remove('dragging');last=null;start=null;pinchDistance=0;pinched=false;}
      else {last=[...pointers.values()][0];start=last;moved=true;}
    };
    const leave=()=>{if(!pointers.size)options.current.onHover(null);};
    canvas.addEventListener('wheel',wheel,{passive:false});
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('pointerleave',leave);
    return ()=>{
      observer.disconnect();cancelAnimationFrame(drawFrame.current);drawFrame.current=0;stopJourney();
      canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('pointerdown',down);
      canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);
      canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('pointerleave',leave);
    };
  },[clamp,stopJourney,update,zoomAt]);
  useEffect(()=>{update();},[occupied,highlight,update]);
  useEffect(()=>{
    if(!revealDot||reduced){reveal.current=null;update();return;}
    reveal.current={dot_id:revealDot,start:performance.now()};
    const tick=()=>{update();if(reveal.current&&performance.now()-reveal.current.start<1600)revealFrame.current=requestAnimationFrame(tick);else{reveal.current=null;update();}};
    tick();return ()=>{cancelAnimationFrame(revealFrame.current);reveal.current=null;};
  },[revealDot,reduced,update]);
  const pan=useCallback((dx:number,dy:number)=>{stopJourney();view.current=clamp({...view.current,x:view.current.x+dx,y:view.current.y+dy});update();},[clamp,stopJourney,update]);
  return {canvasRef,zoom,revision,zoomAt,reset,focusDot,screenPoint,pan,size:size.current};
}
