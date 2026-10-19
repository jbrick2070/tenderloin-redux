// Original fictional tenant-organizing event. No personal input, real stance or outbound message.
export const CIVIC_TOPICS = {
  repairs: { label: 'Repairs and staying put', request: 'We want homes cared for and neighbors able to stay. We ask for a conversation about repairs without displacement.' },
  access: { label: 'Room to come and go', request: 'We want shared spaces that welcome neighbors while keeping entrances and the through-route clear.' },
};
export const CIVIC_FORMATS = {
  circle: { label: 'Small listening circle', detail: 'Seats face one another beside the route. One person speaks at a time, without amplification. A pause between turns makes room for quieter voices; some neighbors may only have time to listen.' },
  dropin: { label: 'Drop-in notice table', detail: 'The board faces the edge of the gathering, with room to approach and leave. Short one-to-one conversations fit a brief visit; the host repeats the shared question so separate conversations stay connected. No amplification.' },
};
export const CIVIC_NOTES = {
  themes: { label: 'Keep anonymous themes', detail: 'Keep only the group’s authored shared request, with no names, signatures, recordings or individual stories. Anyone can ask for a contribution to stay out.' },
  none: { label: 'Keep no meeting notes', detail: 'Let the conversation stay in the room. The game remembers the event setup, but keeps no attendee list, individual contributions or shared-request note.' },
};
export const civicAvailable = state => state.opened && state.hosting.results.length === 4;
export const initialCivic = () => ({ phase: 'idle', draft: { topic: 'repairs', format: 'circle', notes: 'themes' }, result: null });
const fields = { topic: CIVIC_TOPICS, format: CIVIC_FORMATS, notes: CIVIC_NOTES };
const valid = (key, value) => typeof value === 'string' && Object.hasOwn(fields[key], value);
const choice = raw => raw && Object.keys(fields).every(key => valid(key, raw[key])) ? Object.fromEntries(Object.keys(fields).map(key => [key, raw[key]])) : null;
export function restoreCivic(raw, available) {
  const civic = initialCivic();
  if (!available || !raw || !['planning', 'meeting', 'done'].includes(raw.phase)) return civic;
  civic.phase = 'planning';
  for (const key of Object.keys(fields)) if (valid(key, raw.draft?.[key])) civic.draft[key] = raw.draft[key];
  const result = choice(raw.result);
  if (['meeting', 'done'].includes(raw.phase) && result) { civic.phase = raw.phase; civic.result = result; civic.draft = { ...result }; }
  return civic;
}
export function changeCivic(current, action) {
  const civic = restoreCivic(current, true);
  if (action.type === 'civic-start' && civic.phase === 'idle') civic.phase = 'planning';
  else if (action.type === 'civic-choice' && civic.phase === 'planning' && typeof action.key === 'string' && Object.hasOwn(fields, action.key) && valid(action.key, action.value)) {
    if (civic.draft[action.key] === action.value) return null;
    civic.draft[action.key] = action.value;
  } else if (action.type === 'civic-open' && civic.phase === 'planning') { civic.phase = 'meeting'; civic.result = { ...civic.draft }; }
  else if (action.type === 'civic-close' && civic.phase === 'meeting') civic.phase = 'done';
  else return null;
  return civic;
}
export function civicResponse(id, civic) {
  if (civic?.phase !== 'done') return '';
  const { topic, format, notes } = civic.result;
  if (id === 'bea') return topic === 'repairs' ? '“We put repairs and staying put into the conversation. One listening hour is a beginning, not a promise that housing problems are solved.”' : '“I still want us to talk about repairs. Making room to come and go gave us a useful place to begin.”';
  if (id === 'thanh') return format === 'dropin' ? '“I could join for a few minutes and leave when I needed to. Keeping the table off the route mattered.”' : '“I liked hearing everyone together. Next time, could we leave a drop-in moment for people who cannot stay?”';
  if (id === 'celeste') return notes === 'themes' ? '“The shared request has no names or personal stories attached. Nobody owes us their story.”' : '“We agreed to keep no meeting notes. Listening can matter without making a record of someone.”';
  if (id === 'rook') return '“No microphone needed. A listening hour can have room for a disagreement and a quiet voice.”';
  if (id === 'dez') return '“I helped welcome people who just wanted to listen. Nobody had to sign anything or agree to belong.”';
  return '';
}
export function civicConversation(plan) {
  const p = choice(plan); if (!p) return [];
  return [
    { name: 'Bea', text: p.topic === 'repairs' ? '“A repair should help a neighbor stay. That is the question I want us to carry forward.”' : '“A clear route matters. I also want repairs and staying put on a future agenda; one conversation cannot cover everything.”' },
    { name: 'Thanh', text: p.format === 'circle' ? '“I can stay for a turn today. Some days I only have a few minutes; please make a drop-in option next time.”' : '“This table lets me join briefly. Could the host repeat the question? I do not want separate conversations to lose one another.”' },
    { name: 'Celeste', text: p.notes === 'themes' ? '“Keep the shared request, not who said what. A person can listen or ask for their contribution to stay out.”' : '“No meeting notes today. We can leave with something to think about without making a record of each other.”' },
    { name: 'Dez', text: '“You can speak, pass, or just listen. There is no sign-up sheet and no one has to agree with us.”' },
  ];
}
export function civicPlanSVG(plan) {
  const p = choice(plan); if (!p) return '';
  const shapes = p.format === 'circle'
    ? [[100,42],[145,30],[190,42],[100,158],[145,170],[190,158]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#75907c"/>`).join('') + '<rect x="260" y="30" width="75" height="32" rx="4" fill="#d9a2b2"/>'
    : '<rect x="80" y="30" width="150" height="30" rx="4" fill="#d9a2b2"/><circle cx="100" cy="165" r="10" fill="#75907c"/><circle cx="155" cy="165" r="10" fill="#75907c"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="210" viewBox="0 0 420 210"><title>${CIVIC_FORMATS[p.format].label}: schematic shared-space plan</title><rect width="420" height="210" rx="12" fill="#f3eedf"/><path d="M20 100H400" stroke="#91bac2" stroke-width="32"/><path d="M20 100H400" stroke="#fffdf5" stroke-width="2" stroke-dasharray="7 6"/>${shapes}<text x="310" y="105" font-family="sans-serif" font-size="12" fill="#253f35">Clear route</text><text x="22" y="199" font-family="sans-serif" font-size="11" fill="#253f35">Fictional setup · schematic, not surveyed access widths</text></svg>`;
}
