import { useLayoutEffect } from 'react';
import { useDesignScale } from '../hooks/useDesignScale';
export function Arrow() { return <img src="/assets/icons/arrow-up-right.svg" alt="" width="42" height="42" />; }
export function Hero({onLeaveMessage}:{onLeaveMessage:()=>void}) {
  const ref=useDesignScale(1280);
  return <section className="hero" aria-labelledby="hero-heading" data-node-id="453:269">
    <h1 className="sr-only" id="hero-heading">October reminds us. But support has no season.</h1>
    <div ref={ref} className="hero-scale">
      <div className="hero-artboard">
        <img className="hero-texture" src="/assets/images/hero-texture.png" alt="" width="1282" height="762" />
        <img className="hero-title" src="/assets/vectors/hero-title.svg" alt="October reminds us." />
        <div className="hero-support">
          <span>But <em>support<img className="support-highlight" src="/assets/vectors/support-highlight.svg" alt="" /></em><br />has no season.</span>
        </div>
        <p className="hero-description">Leave a few words of love, strength, or hope and let them stay here, all year long.</p>
        <div className="hero-pattern" aria-hidden="true">
          {[0,1,2].map(i=><div key={i}><span>PINK OCTOBER</span><span>PINK OCTOBER</span></div>)}
        </div>
        <img className="hero-backdrop" src="/assets/vectors/hero-flower-backdrop.svg" alt="" />
        <div className="hero-photo"><img src="/assets/images/hand-flower.png" alt="Two hands gently holding a pink gerbera flower" width="918" height="917" /></div>
        <button className="hero-button" onClick={onLeaveMessage}>Leave a message<Arrow /></button>
      </div>
    </div>
  </section>;
}
export function Closing() {
  const ref=useDesignScale(625);
  useLayoutEffect(()=>{
    const fit=()=>{const label=ref.current?.querySelector<HTMLElement>('.closing-pattern-label');if(label)label.style.transform='scaleX('+700/label.offsetWidth+')';};
    fit();void document.fonts.ready.then(fit);
  },[ref]);
  return <section className="closing" aria-labelledby="closing-heading" data-node-id="461:423">
    <div ref={ref} className="closing-art-scale" aria-hidden="true">
      <div className="closing-artboard">
        <span className="closing-pattern"><span className="closing-pattern-label">PINK OCTOBER</span></span>
        <img className="closing-leaves" src="/assets/vectors/closing-leaves.svg" alt="" />
        <img className="closing-flower" src="/assets/vectors/closing-flower.svg" alt="" />
      </div>
    </div>
    <div className="closing-copy">
      <h2 id="closing-heading">And if you're the one fighting…</h2>
      <div>
        <p>You may never meet the people behind these dots, but every one of them showed up here with you in mind.</p>
        <p className="closing-emphasis">On the hard days, the hopeful ones, and everything in between.....<br />we're with you. <span className="heart">🩷</span></p>
      </div>
    </div>
  </section>;
}
export function Footer() {
  return <footer><p>Pink Wall · Pink October 2026</p><p>Made with love by Niara Designs.</p></footer>;
}
