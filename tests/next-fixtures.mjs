// Godot-shaped envelopes for the browser-next tests. Never published with the fork.
// The literal saves were written by the Godot web build during tests/persistence-browser.mjs
// (artifacts/persistence-browser-1793406316191, October 30, 2026) and are copied here verbatim.
export const GODOT_SAVE_SCHEMA = 'tenderloin-redux.godot.save';
export const GODOT_WRITTEN = {
  // Godot's first write after importing the classic save {version:1, core:{greeted:true}} (save_seq 1).
  firstMeeting: '{"active_motif":"sun","blackhawk_discovered":false,"block_opened":false,"celeste_talk_count":0,"civic":{"draft":{"format":"circle","notes":"themes","topic":"repairs"},"phase":"idle","result":null},"discovered_surprises":[],"district_boundary_visible":true,"epilogue":{"packing":false,"photo":{"layout":"table","mural":{},"palette":"garden","participants":[],"status":"unasked"},"returned":[]},"film":{"captured":[],"draft":{"framing":"close","order":["seat","paint","welcome"],"plan":"quiet"},"phase":"idle","result":null},"gathering_layout":"","history_read":false,"hosting":{"draft":{"palette":"warm","pattern":85,"quiet":"arc","story":"memory","tiles":[0,1,2,2,1,0]},"order":[],"results":[]},"mural_palette":"garden","mural_placements":{},"optional":{},"programme":{"order":[],"published":[]},"rook_soundcheck_done":false,"save_seq":1,"schema":"tenderloin-redux.godot.save","version":1,"visited_neighbors":["bea"]}',
  // The earned full-run profile from tests/godot-browser.mjs (rhythmFixtureSave), save_seq 113.
  fullRun: '{"active_motif":"sun","blackhawk_discovered":true,"block_opened":true,"celeste_talk_count":17,"civic":{"draft":{"format":"dropin","notes":"none","topic":"access"},"phase":"done","result":{"format":"dropin","notes":"none","topic":"access"}},"discovered_surprises":[],"district_boundary_visible":true,"epilogue":{"packing":true,"photo":{"layout":"table","mural":{"rise":{"col":4,"row":2},"sun":{"col":0,"row":0},"wave":{"col":2,"row":1}},"palette":"ocean","participants":["bea","dez"],"status":"taken"},"returned":["table","paint-case","speaker"]},"film":{"captured":["welcome","seat","paint"],"draft":{"framing":"wide","order":["welcome","seat","paint"],"plan":"later"},"phase":"done","result":{"framing":"wide","order":["welcome","seat","paint"],"plan":"later"}},"gathering_layout":"table","history_read":true,"hosting":{"draft":{"palette":"cool","pattern":0,"quiet":"pairs","story":"future","tiles":[1,1,2,2,1,0]},"order":["beats","pause","stories","art"],"results":[{"id":"beats","value":0},{"id":"pause","value":"pairs"},{"id":"stories","value":"future"},{"id":"art","value":{"palette":"cool","tiles":[1,1,2,2,1,0]}}]},"mural_palette":"ocean","mural_placements":{"rise":{"col":0,"row":0},"sun":{"col":1,"row":0},"wave":{"col":3,"row":0}},"mural_scenes":{"left":"music","right":"garden"},"optional":{"voices_bookmark":"glide"},"programme":{"order":["beats","pause","stories","art"],"published":["beats","pause","stories","art"]},"rook_soundcheck_done":true,"save_seq":113,"schema":"tenderloin-redux.godot.save","version":1,"visited_neighbors":["bea","celeste","dez","rook","thanh"]}',
  // fullRun after Godot saved a Living Mural scene edit (save_seq 114).
  fullRunScenes: '{"active_motif":"sun","blackhawk_discovered":true,"block_opened":true,"celeste_talk_count":17,"civic":{"draft":{"format":"dropin","notes":"none","topic":"access"},"phase":"done","result":{"format":"dropin","notes":"none","topic":"access"}},"discovered_surprises":[],"district_boundary_visible":true,"epilogue":{"packing":true,"photo":{"layout":"table","mural":{"rise":{"col":4,"row":2},"sun":{"col":0,"row":0},"wave":{"col":2,"row":1}},"palette":"ocean","participants":["bea","dez"],"status":"taken"},"returned":["table","paint-case","speaker"]},"film":{"captured":["welcome","seat","paint"],"draft":{"framing":"wide","order":["welcome","seat","paint"],"plan":"later"},"phase":"done","result":{"framing":"wide","order":["welcome","seat","paint"],"plan":"later"}},"gathering_layout":"table","history_read":true,"hosting":{"draft":{"palette":"cool","pattern":0,"quiet":"pairs","story":"future","tiles":[1,1,2,2,1,0]},"order":["beats","pause","stories","art"],"results":[{"id":"beats","value":0},{"id":"pause","value":"pairs"},{"id":"stories","value":"future"},{"id":"art","value":{"palette":"cool","tiles":[1,1,2,2,1,0]}}]},"mural_palette":"ocean","mural_placements":{"rise":{"col":0,"row":0},"sun":{"col":1,"row":0},"wave":{"col":3,"row":0}},"mural_scenes":{"left":"cooking","right":"sharing"},"optional":{"voices_bookmark":"glide"},"programme":{"order":["beats","pause","stories","art"],"published":["beats","pause","stories","art"]},"rook_soundcheck_done":true,"save_seq":114,"schema":"tenderloin-redux.godot.save","version":1,"visited_neighbors":["bea","celeste","dez","rook","thanh"]}',
};
// Not written by Godot: persistence-browser.mjs partial('art') edits fullRun in JavaScript (3 of 4 hosted
// results, civic and film idle with their earned drafts). Godot loaded it and its next write, after one
// same-width tile change, measured EDITED_PARTIAL_ART_GODOT_BYTES (the recorded storage fault).
export const EDITED_PARTIAL_ART = '{"active_motif":"sun","blackhawk_discovered":true,"block_opened":true,"celeste_talk_count":17,"civic":{"draft":{"format":"dropin","notes":"none","topic":"access"},"phase":"idle","result":null},"discovered_surprises":[],"district_boundary_visible":true,"epilogue":{"packing":true,"photo":{"layout":"table","mural":{"rise":{"col":4,"row":2},"sun":{"col":0,"row":0},"wave":{"col":2,"row":1}},"palette":"ocean","participants":["bea","dez"],"status":"taken"},"returned":["table","paint-case","speaker"]},"film":{"captured":[],"draft":{"framing":"wide","order":["welcome","seat","paint"],"plan":"later"},"phase":"idle","result":null},"gathering_layout":"table","history_read":true,"hosting":{"draft":{"palette":"cool","pattern":0,"quiet":"pairs","story":"future","tiles":[1,1,2,2,1,0]},"order":["stories","beats","pause","art"],"results":[{"id":"stories","value":"future"},{"id":"beats","value":0},{"id":"pause","value":"pairs"}]},"mural_palette":"ocean","mural_placements":{"rise":{"col":0,"row":0},"sun":{"col":1,"row":0},"wave":{"col":3,"row":0}},"mural_scenes":{"left":"music","right":"garden"},"optional":{"voices_bookmark":"glide"},"programme":{"order":["stories","beats","pause","art"],"published":["stories","beats","pause","art"]},"rook_soundcheck_done":true,"save_seq":113,"schema":"tenderloin-redux.godot.save","version":1,"visited_neighbors":["bea","celeste","dez","rook","thanh"]}';
export const EDITED_PARTIAL_ART_GODOT_BYTES = 1391;

export const NEIGHBORS = ['bea', 'celeste', 'dez', 'rook', 'thanh'];
export const SURPRISES = ['jeffrey_record', 'hidden_mural_145', 'impromptu_drag_show', 'viking_dirt_biker', 'cutesy_dino', 'magic_carpet_chef', 'bite_size_nachos', 'good_donut_and_bagel', 'clown_horn_walker', 'mayor_pomp_event'];
export const FULL_MURAL = { sun: { col: 1, row: 0 }, wave: { col: 3, row: 1 }, rise: { col: 5, row: 2 } };
export const PUBLISHED = ['stories', 'beats', 'pause', 'art'];
export const HOSTED_RESULTS = [
  { id: 'stories', value: 'memory' }, { id: 'beats', value: 85 }, { id: 'pause', value: 'arc' },
  { id: 'art', value: { palette: 'warm', tiles: [0, 1, 2, 2, 1, 0] } },
];
export const parseRaw = raw => JSON.parse(raw);
export const raw = envelope => JSON.stringify(envelope);

// The envelope Godot's build_save_envelope writes after reset_mural_state_to_defaults, plus overrides.
export function godotEnvelope(overrides = {}) {
  return {
    schema: GODOT_SAVE_SCHEMA, version: 1, save_seq: 0, celeste_talk_count: 0, mural_palette: 'garden', active_motif: 'sun', mural_placements: {},
    rook_soundcheck_done: false, visited_neighbors: [], discovered_surprises: [], block_opened: false, gathering_layout: '', history_read: false,
    blackhawk_discovered: false, district_boundary_visible: true,
    epilogue: { photo: { status: 'unasked', participants: [], mural: {}, palette: 'garden', layout: 'table' }, packing: false, returned: [] },
    programme: { order: [], published: [] },
    hosting: { order: [], results: [], draft: { story: 'memory', pattern: 85, tiles: [0, 1, 2, 2, 1, 0], palette: 'warm', quiet: 'arc' } },
    civic: { phase: 'idle', draft: { topic: 'repairs', format: 'circle', notes: 'themes' }, result: null },
    film: { phase: 'idle', draft: { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] }, result: null, captured: [] },
    optional: {}, ...overrides,
  };
}
// The hand-written minimum used by godot/tests/study_test.gd rejection cases (lines 962-975).
export function minimalEnvelope(extra = {}) {
  return { schema: GODOT_SAVE_SCHEMA, version: 1, mural_palette: 'garden', celeste_talk_count: 1, mural_placements: {}, ...extra };
}
// Meet-five gate met (5 neighbors, 3 motifs, soundcheck) but not opened.
export const readyEnvelope = (overrides = {}) => godotEnvelope({ visited_neighbors: [...NEIGHBORS], mural_placements: structuredClone(FULL_MURAL), rook_soundcheck_done: true, celeste_talk_count: 2, ...overrides });
export const openedEnvelope = (overrides = {}) => readyEnvelope({ block_opened: true, gathering_layout: 'table', ...overrides });
// Opened, photo taken, loans returned, programme published and all four hosted results complete.
export function hostedEnvelope(overrides = {}) {
  const base = openedEnvelope();
  return {
    ...base,
    epilogue: { photo: { status: 'taken', participants: ['bea', 'celeste'], mural: structuredClone(FULL_MURAL), palette: 'garden', layout: 'table' }, packing: true, returned: ['table', 'paint-case', 'speaker'] },
    programme: { order: [...PUBLISHED], published: [...PUBLISHED] },
    hosting: { ...base.hosting, order: [...PUBLISHED], results: structuredClone(HOSTED_RESULTS) },
    ...overrides,
  };
}
export const civicDoneEnvelope = (overrides = {}) => hostedEnvelope({ civic: { phase: 'done', draft: { topic: 'access', format: 'dropin', notes: 'none' }, result: { topic: 'access', format: 'dropin', notes: 'none' } }, ...overrides });
export const filmDoneEnvelope = (overrides = {}) => civicDoneEnvelope({ film: { phase: 'done', draft: { framing: 'wide', plan: 'later', order: ['welcome', 'seat', 'paint'] }, result: { framing: 'wide', plan: 'later', order: ['welcome', 'seat', 'paint'] }, captured: ['welcome', 'seat', 'paint'] }, ...overrides });
