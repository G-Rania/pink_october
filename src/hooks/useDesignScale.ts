import { useLayoutEffect, useRef } from 'react';
/** Scale only the composed Figma artboard. Preserve each SVG's intrinsic dimensions. */
export function useDesignScale(designWidth: number) {
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const element=ref.current; if(!element) return;
    const update=()=>{element.style.setProperty('--design-scale',String(element.clientWidth/designWidth));element.style.setProperty('--hero-title-scale',String(Math.max(.1,(element.clientWidth-48)/935.616)));};
    update(); const observer=new ResizeObserver(update); observer.observe(element);
    return ()=>observer.disconnect();
  },[designWidth]);
  return ref;
}
