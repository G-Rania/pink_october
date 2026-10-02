import { useRef, useState } from 'react';
import type { SupportMessage } from './types';
import { Hero, Closing, Footer } from './components/Sections';
import { Ribbon } from './components/Ribbon';
import { MessageForm } from './components/MessageForm';
import { useReducedMotion } from './hooks/useReducedMotion';
export default function App() {
  const [formOpen,setFormOpen]=useState(false),[contribution,setContribution]=useState<SupportMessage|null>(null);
  const restoreFocus=useRef<HTMLElement|null>(null);
  const reduced=useReducedMotion();
  function leaveMessage() { restoreFocus.current=document.activeElement as HTMLElement;setFormOpen(true); }
  function submitted(message:SupportMessage) {
    setFormOpen(false);setContribution(message);
    requestAnimationFrame(()=>document.getElementById('ribbon')?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'}));
  }
  return <>
    <a className="skip-link" href="#ribbon">Skip to the ribbon</a>
    <main className="page-shell"><Hero onLeaveMessage={leaveMessage} />
      <Ribbon onLeaveMessage={leaveMessage} contribution={contribution} />
      <Closing />
    </main>
    <Footer />
    {formOpen&&<MessageForm onClose={()=>{setFormOpen(false);restoreFocus.current?.focus();}} onSubmitted={submitted} />}
  </>;
}
