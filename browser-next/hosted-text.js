// Text for the hosted afternoon, copied from the Godot edition: Bea's invitation
// (godot/bea_invitation.gd), Thanh's quiet seats (godot/quiet_seats.gd), the loan homecoming
// (godot/loan_homecoming.gd) and the completion line of godot/main.gd host_complete_current.
// The hosted afternoon's review and Bea's offer (godot/hosted_afternoon.gd) have one port,
// ending/hosted.js. Godot's wording is copied verbatim and tests/next-characters.test.mjs fails on
// drift; HOSTED_WEB_OVERRIDES drops the key hints 2D does not bind. Pure: every function reads fork
// state (the state parseGodotSave returns).
import { LOAN_IDS, LOAN_OWNERS, LOAN_TITLES, PROGRAMME_SEGMENTS, PROGRAMME_TITLES, fmt } from './story.js';

export const INVITATION_TITLES = { memory: 'A small moment you want to keep', future: 'Something you hope to make together' };
export const INVITATION_EXAMPLES = {
  memory: "I once found a folded note in an old coat: a friend had written, 'There is a place for you here.' The coat wore out; I kept the note. A tiny thing can hold a whole afternoon.",
  future: 'I would like to make a string of paper flags with whoever feels like joining. Every flag could be different. We could leave a few blank for people who come later. It would still belong together.',
};
export const INVITATION_PAPER_COLORS = { memory: ['29525e', 'fff5dd', 'f5e7cb'], future: ['f5e7cb', '6a9a8c', 'f5e7cb'] };
export const QUIET_TITLES = { arc: 'An open arc of seats', pairs: 'A pair and an open seat' };
// The open seat's woven cushion and its three stripes (quiet_seats.gd setup).
export const QUIET_CUSHION = { fill: '#8ccfa0', stripe: '#f4e2ad', stripes: 3 };
export const LOAN_REPLIES = {
  table: "The table is checked back in. I'll leave it set for another afternoon; the carrying bag and straps are packed. Thanks for helping.",
  'paint-case': 'Paint case back, and still plenty for next time. Keep our mural up a little longer; I like what we made.',
  speaker: 'Speaker checked back in. It can stay for another afternoon; cover on hand, spare cable coiled. Good crew today.',
};

// Every other copied Godot literal, grouped by source file and function.
export const HOSTED_GODOT_TEXT = {
  'bea_invitation.gd': {
    explanation: { open: 'Bea: "', sep: '. ', close: ' That is just my example. Tell something if you want to; listening is equally welcome. No story is recorded." (Original fictional scene.)' },
    update_choices: { hub: ' Choose the invitation, then Host Activity (Z) when ready. Nothing is timed.', memory: 'A small moment\nyou want to keep', future: 'Something you hope\nto make together', selected: ' , selected' },
  },
  'quiet_seats.gd': {
    explanation: { open: 'Thanh: "', close: '. Two fictional visitors can sit together; the woven green cushion marks an open seat. Sit, stand or leave whenever you like. The sidewalk stays clear. Music is your choice; there is no timer."' },
    update_ui: { hub: ' Choose the seats, then Host Activity (Z) when you are ready.', arc: 'An open arc\nof seats', pairs: 'A pair and\nan open seat', selected: ' , selected' },
  },
  'loan_homecoming.gd': {
    allow_return: { refusal: '%s: "The return was not changed: this save has no room. The last stored save stays unchanged."' },
    reply: { line: '%s: "%s"' },
    note_completion: { notice: 'Returned all three neighbor loans (3/3). ' },
    return_to_owner: { announce: 'Returned %s (%d/3). %s' },
    memory: { open: '“', close: '”' },
  },
  'main.gd': {
    host_complete_current: { summary: 'Completed %s (%d/4 hosted)%s', last: ' — Second Afternoon Complete!', next: ' · Next: ' },
  },
};
// Fork text, declared: the hosting dialog's Rhythm workshop step. Godot has no hub text or step buttons for it (its beats
// are edited only on the Rhythm Circle's pads, host_toggle_beat), so 2D keeps the classic edition's lines beside the
// Rhythm Circle entry. tests/next-characters.test.mjs checks that no Godot source has them.
export const HOSTING_FORK_TEXT = {
  beats: {
    intro: '“Leave spaces as well as taps,” says Dez. Shape eight steps with him. Selected steps are taps; the others are rests. You can leave every step quiet and share a listening round.',
    tail: 'This is a visual rhythm you can tap along with. It does not add a recording or change your optional soundtrack.',
    traced: 'Dez traces your pattern with a hand in the air.',
    quiet: 'Dez lowers his hands. “We can listen together too.”',
  },
};
// Godot text -> 2D text. 2D binds none of Godot's keys, so each key hint is dropped.
export const HOSTED_WEB_OVERRIDES = {
  ' Choose the invitation, then Host Activity (Z) when ready. Nothing is timed.': ' Choose the invitation, then Host Activity when ready. Nothing is timed.',
  ' Choose the seats, then Host Activity (Z) when you are ready.': ' Choose the seats, then Host Activity when you are ready.',
};
export const hostedWeb = text => Object.hasOwn(HOSTED_WEB_OVERRIDES, text) ? HOSTED_WEB_OVERRIDES[text] : text;
const G = HOSTED_GODOT_TEXT;
const list = value => Array.isArray(value) ? value : [];
// GDScript String.capitalize for the single-word ids used here: 'thanh' -> 'Thanh'.
const capitalize = word => String(word).split(/[_\s]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
const hostedValue = (state, id) => list(state?.hosting?.results).find(entry => entry?.id === id)?.value ?? null;

// bea_invitation.gd choice(): the story draft while it is the current activity, else the hosted one.
export function invitationChoice(state) {
  if (state?.opened !== true) return '';
  const host = state.hosting ?? {}, current = list(host.order).length === PROGRAMME_SEGMENTS.length ? list(host.order)[list(host.results).length] : '';
  if (current === 'stories') { const draft = String(host.draft?.story ?? 'memory'); return Object.hasOwn(INVITATION_TITLES, draft) ? draft : ''; }
  const result = hostedValue(state, 'stories');
  return typeof result === 'string' && Object.hasOwn(INVITATION_TITLES, result) ? result : '';
}
export function invitationExplanation(id) {
  if (!Object.hasOwn(INVITATION_TITLES, id)) return '';
  const E = G['bea_invitation.gd'].explanation;
  return E.open + INVITATION_TITLES[id] + E.sep + INVITATION_EXAMPLES[id] + E.close;
}
// The hub line Godot shows while the stories activity is chosen (with 2D's key hint dropped).
export const invitationHubText = id => { const text = invitationExplanation(id); return text ? text + hostedWeb(G['bea_invitation.gd'].update_choices.hub) : ''; };
export const invitationButtonLabel = id => id === 'memory' ? G['bea_invitation.gd'].update_choices.memory : id === 'future' ? G['bea_invitation.gd'].update_choices.future : '';

// bea_invitation.gd source(id): the original folded-paper invitation, 360x240.
export function invitationSVG(id) {
  if (!Object.hasOwn(INVITATION_TITLES, id)) return '';
  let base = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="360" height="240" fill="#f5e7cb"/><path d="M10 20 Q170 9 350 18 M16 222 Q190 230 344 216" fill="none" stroke="#d8bf96" stroke-width="3"/>';
  if (id === 'memory') base += '<path d="M18 240 L44 95 Q67 63 116 60 L266 63 Q302 84 333 240Z" fill="#386e79"/><path d="M65 112 Q174 137 289 108 L278 240 H80Z" fill="#29525e"/><path d="M75 128 Q173 152 281 125" stroke="#e0ae68" stroke-width="3" stroke-dasharray="5 5" fill="none"/><g transform="rotate(-8 180 100)"><path d="M110 34 L252 43 L242 147 L106 134Z" fill="#fff5dd" stroke="#bd8b65" stroke-width="3"/><path d="M110 34 L171 91 L252 43 M171 91 L109 134 M171 91 L242 147" stroke="#d8b990" stroke-width="3" fill="none"/><path d="M165 75 C152 58 134 72 165 96 C196 72 178 58 165 75" fill="#c36b62"/></g><path d="M54 51 Q68 37 83 50 M286 48 L298 32 M305 64 L324 59" fill="none" stroke="#d5a44f" stroke-width="5" stroke-linecap="round"/>';
  else base += '<path d="M20 69 Q178 117 340 58" fill="none" stroke="#38596c" stroke-width="5"/><path d="M48 78 L107 91 L69 155Z" fill="#d68468"/><path d="M128 96 L188 98 L160 170Z" fill="#6a9a8c"/><path d="M213 94 L271 81 L259 156Z" fill="#a194ba"/><path d="M291 74 L335 60 L330 128Z" fill="#fff5dd" stroke="#c4b18d" stroke-width="2"/><path d="M0 216 L80 158 L111 170 L59 240 H0Z" fill="#38596c"/><path d="M64 173 Q92 139 113 139 L136 132 Q151 134 143 146 L113 161 L124 166 Q142 162 145 173 Q144 187 119 194 L89 201Z" fill="#b77f5d"/><path d="M360 211 L293 159 L263 177 L310 240 H360Z" fill="#a194ba"/><path d="M299 171 Q285 141 269 135 L245 123 Q231 124 236 138 L261 155 L247 153 Q233 157 240 169 L268 191Z" fill="#e0b18b"/><path d="M182 35 L182 51 M166 43 L174 53 M198 43 L190 53" stroke="#d5a44f" stroke-width="4" stroke-linecap="round"/>';
  return base + '</svg>';
}

// quiet_seats.gd choice() and explanation().
export function quietChoice(state) {
  if (state?.opened !== true) return '';
  const host = state.hosting ?? {}, current = list(host.order).length === PROGRAMME_SEGMENTS.length ? list(host.order)[list(host.results).length] : '';
  if (current === 'pause') return String(host.draft?.quiet ?? 'arc');
  const result = hostedValue(state, 'pause');
  return typeof result === 'string' && Object.hasOwn(QUIET_TITLES, result) ? result : '';
}
export function quietExplanation(id) {
  if (!Object.hasOwn(QUIET_TITLES, id)) return '';
  const E = G['quiet_seats.gd'].explanation;
  return E.open + QUIET_TITLES[id] + E.close;
}
export const quietHubText = id => { const text = quietExplanation(id); return text ? text + hostedWeb(G['quiet_seats.gd'].update_ui.hub) : ''; };
export const quietButtonLabel = id => id === 'arc' ? G['quiet_seats.gd'].update_ui.arc : id === 'pairs' ? G['quiet_seats.gd'].update_ui.pairs : '';

// loan_homecoming.gd: the owner's reply on return, the over-budget refusal, the announcement and
// the remembered reply that becomes the owner's memory tail.
const ownerName = id => capitalize(LOAN_OWNERS[id] ?? '');
export const loanReply = id => Object.hasOwn(LOAN_REPLIES, id) ? fmt(G['loan_homecoming.gd'].reply.line, ownerName(id), LOAN_REPLIES[id]) : '';
export const loanRefusal = id => Object.hasOwn(LOAN_OWNERS, id) ? fmt(G['loan_homecoming.gd'].allow_return.refusal, ownerName(id)) : '';
export const loanReturnAnnouncement = (id, returnedCount) => Object.hasOwn(LOAN_REPLIES, id) ? fmt(G['loan_homecoming.gd'].return_to_owner.announce, LOAN_TITLES[id], returnedCount, loanReply(id)) : '';
export const LOAN_COMPLETION_NOTICE = G['loan_homecoming.gd'].note_completion.notice;
export function loanMemory(state, neighborId) {
  const returned = list(state?.epilogue?.returned), M = G['loan_homecoming.gd'].memory;
  for (const id of LOAN_IDS) if (LOAN_OWNERS[id] === neighborId && returned.includes(id)) return M.open + LOAN_REPLIES[id] + M.close;
  return '';
}
// loan_homecoming.gd pending(): the owner's loan still to return, while packing.
export function pendingLoan(state, neighborId) {
  if (state?.opened !== true || state.epilogue?.packing !== true) return '';
  const returned = list(state.epilogue.returned);
  return LOAN_IDS.find(id => LOAN_OWNERS[id] === neighborId && !returned.includes(id)) ?? '';
}
// conversation_loan(): the pending loan, else the last loan returned to this owner in this visit
// (confirmed is session-only, cleared on reload), kept as a harmless "Returned" receipt.
export function conversationLoan(state, neighborId, confirmed = '') {
  const pending = pendingLoan(state, neighborId);
  if (pending) return pending;
  return confirmed && LOAN_OWNERS[confirmed] === neighborId ? confirmed : '';
}

// The line Godot announces as each hosted activity completes. state is the state after completing.
export function hostedCompletion(state, completedId) {
  const C = G['main.gd'].host_complete_current, order = list(state?.hosting?.order), results = list(state?.hosting?.results);
  const next = order.length === PROGRAMME_SEGMENTS.length && results.length < order.length ? order[results.length] : '';
  return fmt(C.summary, PROGRAMME_TITLES[completedId] ?? String(completedId), results.length, next ? C.next + PROGRAMME_TITLES[next] : C.last);
}
