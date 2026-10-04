import { useLayoutEffect, useRef, useState } from 'react';
import type { SupportMessage } from './types';
import { Hero, Closing, Footer, Navbar } from './components/Sections';
import { Ribbon } from './components/Ribbon';
import { MessageForm } from './components/MessageForm';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useScrollReveal } from './hooks/useScrollReveal';
export default function App() {
  const [formOpen,setFormOpen]=useState(false),[contribution,setContribution]=useState<SupportMessage|null>(null);
  const restoreFocus=useRef<HTMLElement|null>(null);
  const reduced=useReducedMotion();
  useScrollReveal();
  useLayoutEffect(()=>{
    const previous=history.scrollRestoration;
    history.scrollRestoration='manual';
    const toTop=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
    toTop();
    window.addEventListener('pageshow',toTop);
    return ()=>{window.removeEventListener('pageshow',toTop);history.scrollRestoration=previous;};
  },[]);
  function leaveMessage() { restoreFocus.current=document.activeElement as HTMLElement;setFormOpen(true); }
  function submitted(message:SupportMessage) {
    setFormOpen(false);setContribution(message);
    requestAnimationFrame(()=>document.getElementById('ribbon')?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'}));
  }
  return <>
    <a className="skip-link" href="#ribbon">Skip to the ribbon</a>
    <Navbar />
    <main className="page-shell"><Hero />
      <Ribbon onLeaveMessage={leaveMessage} contribution={contribution} />
      <Closing />
    </main>
    <Footer />
    {formOpen&&<MessageForm onClose={()=>{setFormOpen(false);restoreFocus.current?.focus();}} onSubmitted={submitted} />}
  </>;
}
