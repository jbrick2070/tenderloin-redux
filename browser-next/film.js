// Original illustrated film project, not camera capture or a real production/permit.
export const FILM_SHOTS = {
  seat: { label: 'An empty seat', caption: 'A chair waits. There is room for someone new.' },
  paint: { label: 'A shared motif', caption: 'A neighbor’s shape becomes part of something shared.' },
  welcome: { label: 'Room for one more', caption: 'A place stays open. Joining in is an invitation.' },
};
export const FILM_FRAMING = {
  close: { label: 'Objects in close-up', detail: 'Frame only our original portable props. No people are pictured; a small camera footprint stays beside the route.' },
  wide: { label: 'Table and volunteer hands', detail: 'Celeste and Dez offer their fictional hands for these drawings. Everyone else stays out of frame. The wider table view needs a marked prop edge, still beside the route.' },
};
export const FILM_PLANS = {
  quiet: { label: 'A quiet prop take', detail: 'Use soft props and no spoken take while neighbors keep talking. Our illustrated short uses descriptive captions; the soundtrack stays yours to choose.' },
  later: { label: 'Wait for the conversation', detail: 'Keep the kit packed until Rook cues a pause after the conversation. The fictional take has dialogue captions; no real voices or sound are recorded.' },
};
export const filmAvailable = state => state.opened && state.civic.phase === 'done';
const defaults = () => ({ framing: 'close', plan: 'quiet', order: ['seat','paint','welcome'] });
export const initialFilm = () => ({ phase: 'idle', draft: defaults(), result: null, captured: [] });
const validEnum = (table,value) => typeof value === 'string' && Object.hasOwn(table,value);
export const validShotOrder = order => Array.isArray(order) && order.length === 3 && new Set(order).size === 3 && order.every(id => validEnum(FILM_SHOTS,id));
const copyPlan = raw => raw && validEnum(FILM_FRAMING,raw.framing) && validEnum(FILM_PLANS,raw.plan) && validShotOrder(raw.order) ? {framing:raw.framing,plan:raw.plan,order:[...raw.order]} : null;
export function restoreFilm(raw,available) {
  const film=initialFilm();
  if(!available || !raw || !['planning','hold','shooting','done'].includes(raw.phase))return film;
  film.phase='planning';
  if(validEnum(FILM_FRAMING,raw.draft?.framing))film.draft.framing=raw.draft.framing;
  if(validEnum(FILM_PLANS,raw.draft?.plan))film.draft.plan=raw.draft.plan;
  if(validShotOrder(raw.draft?.order))film.draft.order=[...raw.draft.order];
  const result=copyPlan(raw.result);
  if(raw.phase==='planning'||!result)return film;
  film.result=result;film.draft=copyPlan(result);film.phase=raw.phase==='hold'?'hold':'shooting';
  if(film.phase==='shooting')for(let i=0;i<3;i++){if(!Array.isArray(raw.captured)||raw.captured[i]!==result.order[i])break;film.captured.push(result.order[i]);}
  if(film.captured.length===3)film.phase='done';
  return film;
}
export function changeFilm(current,action) {
  const film=restoreFilm(current,true);
  if(action.type==='film-start'&&film.phase==='idle')film.phase='planning';
  else if(action.type==='film-choice'&&film.phase==='planning'&&['framing','plan'].includes(action.key)){
    const table=action.key==='framing'?FILM_FRAMING:FILM_PLANS;
    if(!validEnum(table,action.value)||film.draft[action.key]===action.value)return null;
    film.draft[action.key]=action.value;
  }else if(action.type==='film-move'&&film.phase==='planning'&&validEnum(FILM_SHOTS,action.id)&&[-1,1].includes(action.direction)){
    const index=film.draft.order.indexOf(action.id),to=index+action.direction;
    if(to<0||to>2)return null;
    [film.draft.order[index],film.draft.order[to]]=[film.draft.order[to],film.draft.order[index]];
  }else if(action.type==='film-roll'&&film.phase==='planning'){film.result=copyPlan(film.draft);film.phase='hold';}
  else if(action.type==='film-clear'&&film.phase==='hold')film.phase='shooting';
  else if(action.type==='film-capture'&&film.phase==='shooting'&&action.id===film.result.order[film.captured.length]){
    film.captured.push(action.id);if(film.captured.length===3)film.phase='done';
  }else return null;
  return film;
}
export function filmCaption(plan,id){
  if(!copyPlan(plan)||!validEnum(FILM_SHOTS,id))return '';
  if(plan.plan==='quiet')return FILM_SHOTS[id].caption;
  return ({seat:'“May I sit here?” “We kept a place open.”',paint:'“Your shape belongs beside mine.”',welcome:'“Stay for a moment, or come back another day.”'})[id];
}
export function filmResponse(id,film){
  if(film?.phase!=='done')return '';
  if(id==='rook')return '“I helped with the cue and stayed out of the picture. A no can belong in a good film too.”';
  if(id==='celeste')return film.result.framing==='wide'?'“Dez and I offered our hands, not everyone else’s faces. We made the picture together.”':'“Our props told the story without putting anyone on camera. I like that small frame.”';
  if(id==='thanh')return '“The crew held the take while I used the route. A production should fit around the people who live here.”';
  if(id==='bea')return film.result.plan==='later'?'“They waited until the conversation finished. Being heard mattered more than rushing a take.”':'“We could keep talking while they worked quietly. The film made room for our afternoon.”';
  if(id==='dez')return `“We ended on ${FILM_SHOTS[film.result.order[2]].label.toLowerCase()}. A different order would tell a different little story.”`;
  return '';
}
export function filmFrameSVG(plan,id){
  const p=copyPlan(plan);if(!p||!validEnum(FILM_SHOTS,id))return '';
  const chair='<path d="M155 143V103H220V143M157 119H218M159 143V167M216 143V167" fill="none" stroke="#276a5a" stroke-width="8" stroke-linecap="round"/>';
  const panel='<rect x="95" y="54" width="100" height="68" rx="4" fill="#f3eedf" stroke="#276a5a" stroke-width="3"/><circle cx="124" cy="87" r="16" fill="#d9a2b2"/><path d="M146 98Q160 68 180 98" fill="none" stroke="#91bac2" stroke-width="7"/>';
  const scene=id==='seat'?chair:id==='paint'?panel:`${chair}<circle cx="270" cy="116" r="28" fill="none" stroke="#d9a2b2" stroke-width="7"/><path d="M254 116H286M270 100V132" stroke="#276a5a" stroke-width="4"/>`;
  const hands=p.framing==='wide'?'<path d="M20 167L65 135Q79 129 84 142L57 165L93 163Q108 169 94 180H20M400 167L355 135Q341 129 336 142L363 165L327 163Q312 169 326 180H400" fill="#c38c65"/>':'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="236" viewBox="0 0 420 236"><title>${FILM_SHOTS[id].label} — original illustrated frame</title><rect width="420" height="236" rx="12" fill="#253f35"/><rect x="12" y="17" width="396" height="202" rx="5" fill="#ecebdc"/><path d="M20 190H400" stroke="#91bac2" stroke-width="6"/>${p.framing==='wide'?'<rect x="64" y="176" width="292" height="7" rx="3" fill="#b59b5d"/>':''}<g${p.framing==='close'?' transform="translate(-30 -8) scale(1.2)"':''}>${scene}</g>${hands}<path d="M25 9H395M25 227H395" stroke="#f3eedf" stroke-width="4" stroke-dasharray="8 10"/></svg>`;
}
