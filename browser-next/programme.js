// Original fictional proposals. IDs, labels and colors are authored here, never save-provided HTML.
export const SEGMENTS = [
  { id: 'stories', name: 'Story circle', owner: 'Bea', color: '#e5b66d', pitch: '“A story can take its time. If we follow the rhythm workshop, leave a quiet interval between it and the circle so we can settle in.”' },
  { id: 'beats', name: 'Rhythm workshop', owner: 'Dez', color: '#91bac2', pitch: '“Let’s build a rhythm together. Listening counts as joining in. We can start the afternoon or pick it up after the stories.”' },
  { id: 'art', name: 'Shared art panel', owner: 'Celeste', color: '#d9a2b2', pitch: '“Portable panels again. Everyone can add a shape, or help someone find a color. Put us wherever the afternoon needs a change.”' },
  { id: 'pause', name: 'Quiet interval', owner: 'Thanh', color: '#a3b48c', pitch: '“An unhurried pause belongs on the programme too. No amplified sound, no activity to finish. A chance to sit or come and go.”' },
];
export const segment = id => SEGMENTS.find(item => item.id === id);
export function cleanOrder(raw) {
  return Array.isArray(raw) ? raw.slice(0, 32).filter((id, i, list) => segment(id) && list.indexOf(id) === i).slice(0, SEGMENTS.length) : [];
}
export function programmeIssue(order) {
  if (!Array.isArray(order) || order.length !== SEGMENTS.length || new Set(order).size !== SEGMENTS.length || order.some(id => !segment(id))) return 'Include all four proposals once. Add them in the order you want; you can move or remove them.';
  const beats = order.indexOf('beats'), stories = order.indexOf('stories'), pause = order.indexOf('pause');
  return beats < stories && !(beats < pause && pause < stories) ? 'Bea asks for a quiet interval between the rhythm workshop and the later story circle. Move the interval between them, or place the stories before the rhythm.' : '';
}
export function restoreProgramme(raw, opened) {
  if (!opened) return { order: [], published: [] };
  const order = cleanOrder(raw?.order);
  return { order, published: programmeIssue(raw?.published) ? [] : [...raw.published] };
}
export function changeProgramme(current, action) {
  const next = restoreProgramme(current, true), order = next.order;
  if (action.type === 'programme-publish') {
    if (programmeIssue(order) || order.join() === next.published.join()) return null;
    next.published = [...order];
  } else {
    if (!segment(action.id)) return null;
    const i = order.indexOf(action.id);
    if (action.type === 'programme-add' && i < 0) order.push(action.id);
    else if (action.type === 'programme-remove' && i >= 0) order.splice(i, 1);
    else if (action.type === 'programme-move' && i >= 0 && [-1, 1].includes(action.direction) && i + action.direction >= 0 && i + action.direction < order.length) {
      [order[i], order[i + action.direction]] = [order[i + action.direction], order[i]];
    } else return null;
  }
  return next;
}
export function programmeTitle(order) {
  return programmeIssue(order) ? 'Another afternoon, taking shape' : order[0] === 'stories' ? 'Stories open the afternoon' : order.indexOf('stories') < order.indexOf('beats') ? 'Stories before the rhythm' : 'A rhythm, a pause, a story';
}
export function programmeResponse(id, published) {
  if (programmeIssue(published)) return '';
  const storiesFirst = published.indexOf('stories') < published.indexOf('beats');
  const responses = {
    bea: storiesFirst ? `“${published[0] === 'stories' ? 'Stories first this time. I’ll bring one to open with.' : 'Stories before the rhythm this time. I’ll bring one to share.'} Thanks for finding a place for Dez’s workshop too.”` : '“A quiet interval before our circle. That gives us room to listen after the rhythm. I’ll bring a story.”',
    dez: storiesFirst ? '“I can pick up a rhythm from the stories, if their tellers want that. Glad there’s room for both ideas next time.”' : `“${published[0] === 'beats' ? 'We start with a rhythm and leave room to settle afterward.' : 'The rhythm comes before the stories, with room to settle afterward.'} Bea and I have both got a place next time.”`,
    celeste: `“Our panel is ${['first', 'second', 'third', 'fourth'][published.indexOf('art')]}. I’ll bring shapes people can arrange together. The programme is something we made together too.”`,
    thanh: `“The quiet interval is ${['first', 'second', 'third', 'fourth'][published.indexOf('pause')]}. I like seeing a pause treated as part of the afternoon.”`,
    rook: '“A programme we can read without any music playing. I can help keep the workshop comfortable if we hold it.”',
  };
  return responses[id] || '';
}
export function programmeSVG(order) {
  if (programmeIssue(order)) return '';
  // Only fixed strings from SEGMENTS reach this SVG. No names, photos or real event branding.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="460" viewBox="0 0 640 460" role="img" aria-labelledby="title desc"><title id="title">${programmeTitle(order)}</title><desc id="desc">Fictional future gathering. ${order.map((id, i) => `${i + 1}. ${segment(id).name}.`).join(' ')}</desc><rect width="640" height="460" rx="18" fill="#f8ecd9"/><text x="32" y="44" font-family="sans-serif" font-size="15" fill="#425547">OUR NEXT AFTERNOON · A FICTIONAL PLAN</text><text x="32" y="82" font-family="sans-serif" font-size="25" fill="#253c33">${programmeTitle(order)}</text>${order.map((id, i) => `<g transform="translate(32 ${110 + i * 73})"><rect width="576" height="61" rx="9" fill="${segment(id).color}"/><text x="18" y="39" font-family="sans-serif" font-size="22" fill="#253c33">${i + 1}. ${segment(id).name}</text><circle cx="546" cy="30" r="12" fill="#f8ecd9"/></g>`).join('')}<text x="32" y="435" font-family="sans-serif" font-size="14" fill="#425547">Come and go. Listening counts. No date or real event is announced.</text></svg>`;
}
