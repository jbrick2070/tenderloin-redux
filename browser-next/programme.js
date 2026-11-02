import { t, L, format, fillNamed, num, FLAVORS } from './i18n.js';

// Original fictional proposals. IDs, labels and colors are authored here, never save-provided HTML.
export const SEGMENTS = [
  { id: 'stories', name: 'Story circle', owner: 'Bea', color: '#e5b66d', pitch: '“A story can take its time. If we follow the rhythm workshop, leave a quiet interval between it and the circle so we can settle in.”' },
  { id: 'beats', name: 'Rhythm workshop', owner: 'Dez', color: '#91bac2', pitch: '“Let’s build a rhythm together. Listening counts as joining in. We can start the afternoon or pick it up after the stories.”' },
  { id: 'art', name: 'Shared art panel', owner: 'Celeste', color: '#d9a2b2', pitch: '“Portable panels again. Everyone can add a shape, or help someone find a color. Put us wherever the afternoon needs a change.”' },
  { id: 'pause', name: 'Quiet interval', owner: 'Thanh', color: '#a3b48c', pitch: '“An unhurried pause belongs on the programme too. No amplified sound, no activity to finish. A chance to sit or come and go.”' },
];
// The programme's own text. Each sentence is whole (docs/I18N_PLAN.md 2.7): the replies that once joined an opening to a
// shared tail, or put an English ordinal into a sentence, are one entry per case; the English is unchanged.
export const PROGRAMME_TEXT = {
  issues: {
    incomplete: 'Include all four proposals once. Add them in the order you want; you can move or remove them.',
    interval: 'Bea asks for a quiet interval between the rhythm workshop and the later story circle. Move the interval between them, or place the stories before the rhythm.',
  },
  titles: { shaping: 'Another afternoon, taking shape', storiesOpen: 'Stories open the afternoon', storiesBefore: 'Stories before the rhythm', rhythmFirst: 'A rhythm, a pause, a story' },
  responses: {
    bea: {
      storiesOpen: '“Stories first this time. I’ll bring one to open with. Thanks for finding a place for Dez’s workshop too.”',
      storiesBefore: '“Stories before the rhythm this time. I’ll bring one to share. Thanks for finding a place for Dez’s workshop too.”',
      rhythmFirst: '“A quiet interval before our circle. That gives us room to listen after the rhythm. I’ll bring a story.”',
    },
    dez: {
      storiesFirst: '“I can pick up a rhythm from the stories, if their tellers want that. Glad there’s room for both ideas next time.”',
      beatsOpen: '“We start with a rhythm and leave room to settle afterward. Bea and I have both got a place next time.”',
      beatsBefore: '“The rhythm comes before the stories, with room to settle afterward. Bea and I have both got a place next time.”',
    },
    // By the segment's place in the published order: first, second, third, fourth.
    celeste: [
      '“Our panel is first. I’ll bring shapes people can arrange together. The programme is something we made together too.”',
      '“Our panel is second. I’ll bring shapes people can arrange together. The programme is something we made together too.”',
      '“Our panel is third. I’ll bring shapes people can arrange together. The programme is something we made together too.”',
      '“Our panel is fourth. I’ll bring shapes people can arrange together. The programme is something we made together too.”',
    ],
    thanh: [
      '“The quiet interval is first. I like seeing a pause treated as part of the afternoon.”',
      '“The quiet interval is second. I like seeing a pause treated as part of the afternoon.”',
      '“The quiet interval is third. I like seeing a pause treated as part of the afternoon.”',
      '“The quiet interval is fourth. I like seeing a pause treated as part of the afternoon.”',
    ],
    rook: '“A programme we can read without any music playing. I can help keep the workshop comfortable if we hold it.”',
  },
  poster: {
    desc: 'Fictional future gathering. {items}',
    item: '{n}. {name}.',
    row: '{n}. {name}',
    heading: 'OUR NEXT AFTERNOON · A FICTIONAL PLAN',
    footer: 'Come and go. Listening counts. No date or real event is announced.',
  },
};
const NAMED = { ...FLAVORS.named, legacy: (template, [values]) => fillNamed(template, values) };
const fill = (template, values) => format(template, [values], NAMED);
// An image SVG does not inherit the page's fonts or direction, so a locale passes its own (I3). The defaults are today's bytes.
const attr = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const svgDir = dir => dir === 'rtl' || dir === 'ltr' ? ` direction="${dir}"` : '';
export const segment = id => SEGMENTS.find(item => item.id === id);
export function cleanOrder(raw) {
  return Array.isArray(raw) ? raw.slice(0, 32).filter((id, i, list) => segment(id) && list.indexOf(id) === i).slice(0, SEGMENTS.length) : [];
}
// The rule itself, as the English entry or '' (logic reads this, never the shown text).
function issueOf(order) {
  if (!Array.isArray(order) || order.length !== SEGMENTS.length || new Set(order).size !== SEGMENTS.length || order.some(id => !segment(id))) return PROGRAMME_TEXT.issues.incomplete;
  const beats = order.indexOf('beats'), stories = order.indexOf('stories'), pause = order.indexOf('pause');
  return beats < stories && !(beats < pause && pause < stories) ? PROGRAMME_TEXT.issues.interval : '';
}
// The shown issue, or '' when the order is complete. Callers test it for truth, so a translation can never make it empty.
export function programmeIssue(order) {
  const english = issueOf(order);
  return english && (t(english) || english);
}
export function restoreProgramme(raw, opened) {
  if (!opened) return { order: [], published: [] };
  const order = cleanOrder(raw?.order);
  return { order, published: issueOf(raw?.published) ? [] : [...raw.published] };
}
export function changeProgramme(current, action) {
  const next = restoreProgramme(current, true), order = next.order;
  if (action.type === 'programme-publish') {
    if (issueOf(order) || order.join() === next.published.join()) return null;
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
  const T = PROGRAMME_TEXT.titles;
  return t(issueOf(order) ? T.shaping : order[0] === 'stories' ? T.storiesOpen : order.indexOf('stories') < order.indexOf('beats') ? T.storiesBefore : T.rhythmFirst);
}
export function programmeResponse(id, published) {
  if (issueOf(published)) return '';
  const R = PROGRAMME_TEXT.responses, storiesFirst = published.indexOf('stories') < published.indexOf('beats');
  const responses = {
    bea: storiesFirst ? published[0] === 'stories' ? R.bea.storiesOpen : R.bea.storiesBefore : R.bea.rhythmFirst,
    dez: storiesFirst ? R.dez.storiesFirst : published[0] === 'beats' ? R.dez.beatsOpen : R.dez.beatsBefore,
    celeste: R.celeste[published.indexOf('art')],
    thanh: R.thanh[published.indexOf('pause')],
    rook: R.rook,
  };
  return Object.hasOwn(responses, id) ? t(responses[id]) : '';
}
// order: the published order; options: { sans, dir }, the font family and the direction.
export function programmeSVG(order, { sans = 'sans-serif', dir = null } = {}) {
  if (issueOf(order)) return '';
  // Only fixed strings from SEGMENTS and PROGRAMME_TEXT reach this SVG. No names, photos or real event branding.
  const P = PROGRAMME_TEXT.poster, font = attr(sans), title = programmeTitle(order);
  const item = (template, id, i) => fill(template, { n: num(i + 1), name: L(segment(id).name) });
  return `<svg xmlns="http://www.w3.org/2000/svg"${svgDir(dir)} width="640" height="460" viewBox="0 0 640 460" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${fill(P.desc, { items: order.map((id, i) => item(P.item, id, i)).join(' ') })}</desc><rect width="640" height="460" rx="18" fill="#f8ecd9"/><text x="32" y="44" font-family="${font}" font-size="15" fill="#425547">${t(P.heading)}</text><text x="32" y="82" font-family="${font}" font-size="25" fill="#253c33">${title}</text>${order.map((id, i) => `<g transform="translate(32 ${110 + i * 73})"><rect width="576" height="61" rx="9" fill="${segment(id).color}"/><text x="18" y="39" font-family="${font}" font-size="22" fill="#253c33">${item(P.row, id, i)}</text><circle cx="546" cy="30" r="12" fill="#f8ecd9"/></g>`).join('')}<text x="32" y="435" font-family="${font}" font-size="14" fill="#425547">${t(P.footer)}</text></svg>`;
}
