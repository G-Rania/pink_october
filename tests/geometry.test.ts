import { describe,it,expect } from 'vitest';
import { createHash } from 'node:crypto';
import { DOT_BY_ID,RIBBON_DOTS,RIBBON_CAPACITY } from '../src/data/ribbonGeometry';
describe('immutable ribbon-v1 geometry',()=>{
  it('preserves deployed IDs, capacity and coordinates',()=>{
    expect(RIBBON_CAPACITY).toBe(2054);
    expect(DOT_BY_ID.size).toBe(RIBBON_CAPACITY);
    expect(createHash('sha256').update(JSON.stringify(RIBBON_DOTS)).digest('hex'))
      .toBe('fb1a5e92981727df24dd2c4b872a8839fb3ccace3514bde5a4421fa9154832d7');
    for(const dot of RIBBON_DOTS)expect(dot.dot_id).toMatch(/^ribbon-v1-\d{5}$/);
  });
});
