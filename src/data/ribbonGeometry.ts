/**
 * Immutable ribbon-v1 geometry. A row-major hex lattice is clipped to the
 * 45-unit stroke of three sampled cubic Bezier segments, then cut at y=690.
 * Changing these constants changes IDs: introduce v2 rather than editing v1.
 * No randomness, browser dimensions, or message data participate in geometry.
 */
export interface RibbonDot { dot_id: string; x: number; y: number }
type Point = { x: number; y: number };
export const RIBBON_BOUNDS = { width: 600, height: 760 };
export const DOT_RADIUS = 2.6;
const segments: [Point, Point, Point, Point][] = [
  [{x:90,y:690},{x:185,y:520},{x:470,y:270},{x:390,y:120}],
  [{x:390,y:120},{x:350,y:35},{x:250,y:35},{x:210,y:120}],
  [{x:210,y:120},{x:130,y:270},{x:415,y:520},{x:510,y:690}],
];
const path: Point[] = segments.flatMap(([a,b,c,d]) =>
  Array.from({length:161},(_,i) => {
    const t=i/160, u=1-t;
    return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,
      y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};
  })
);
function distanceSquared(p: Point, a: Point, b: Point) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return (p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2;
}
function generate(): RibbonDot[] {
  const dots: RibbonDot[]=[];
  for(let row=0,y=32;y<=690;row++,y+=8) {
    for(let x=40+(row%2)*4;x<=560;x+=8) {
      const p={x,y};
      if(path.some((a,i)=>i>0 && distanceSquared(p,path[i-1],a)<=45**2)) {
        dots.push({dot_id:'ribbon-v1-'+String(dots.length).padStart(5,'0'),x,y});
      }
    }
  }
  return dots;
}
export const RIBBON_DOTS: readonly RibbonDot[] = Object.freeze(generate());
export const RIBBON_CAPACITY = RIBBON_DOTS.length;
export const DOT_BY_ID = new Map(RIBBON_DOTS.map(dot=>[dot.dot_id,dot]));
export function dotIdForIndex(index: number) {
  return 'ribbon-v1-'+String(index).padStart(5,'0');
}
