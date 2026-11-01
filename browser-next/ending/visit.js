// The one in-memory object that holds every ending stage for this visit. Godot keeps these in panel members and never
// saves them (docs/BIG_ENDING_PLAN.md "Keep/revisit is visit-only"); reset_visit clears them on load and import. The fork
// clears the visit on reload (it is never stored), on Start fresh, and when an adopted save changes the copies it reads.
import { freshGather } from './gather-again.js';
import { freshBench } from './bench.js';
import { freshRoom } from './habitat.js';
import { freshOrbit } from './orbital.js';
import { freshStories } from './mural.js';

export const freshVisit = (state = null) => ({
  fingerprint: state ? fingerprint(state) : '', hostedSelected: 'stories', gather: freshGather(), screenFrame: 0,
  bench: freshBench(), room: freshRoom(), orbit: freshOrbit(), stories: freshStories(),
});
// Every saved input the ending copies: the posted plan, the hosted afternoon, the Listening Hour and the film.
export function fingerprint(state) {
  const s = state || {};
  return JSON.stringify([s.opened === true, s.programme?.published ?? [], s.hosting?.order ?? [], s.hosting?.results ?? [], s.civic?.phase ?? '', s.civic?.result ?? null, s.film?.phase ?? '', s.film?.result ?? null]);
}
// After a state change. This tab's own actions never clear the visit (Godot keeps a gathering through edits and
// reposts, and the room through the Listening Hour); a save adopted from another tab or edition is Godot's load, so
// when it changes the copies the visit starts fresh. reset tells the UI to close or re-render.
export function syncVisit(visit, state, { adopted = false } = {}) {
  const now = fingerprint(state);
  if (!visit) return { visit: freshVisit(state), reset: false };
  if (visit.fingerprint === now) return { visit, reset: false };
  if (!adopted) return { visit: { ...visit, fingerprint: now }, reset: false };
  return { visit: freshVisit(state), reset: true };
}
