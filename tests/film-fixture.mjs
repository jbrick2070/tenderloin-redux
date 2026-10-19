import { civicFixture } from './civic-fixture.mjs';
import { applyAction as act } from '../public/core.js';
export function filmFixture(layout='table') {
  let s=civicFixture(layout);
  for(const type of ['civic-start','civic-open','civic-close'])s=act(s,{type});
  return s;
}
