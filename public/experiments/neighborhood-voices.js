const SOURCES = { tndc: 'https://www.tndc.org/about', glide: 'https://www.glide.org/programs/', larkin: 'https://larkinstreetyouth.org/about/' };
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function readRecords(raw) {
  if (raw?.version !== 1 || raw.checkedAt !== '2026-10-18' || !Array.isArray(raw.records) || raw.records.length !== 3) throw Error('Unsupported organization notes');
  const seen = new Set();
  const records = raw.records.map(record => {
    if (!record || typeof record.id !== 'string' || !Object.hasOwn(SOURCES, record.id) || seen.has(record.id) || record.url !== SOURCES[record.id]) throw Error('Unknown organization source');
    seen.add(record.id);
    const result = { id: record.id, url: record.url };
    for (const key of ['name', 'topic', 'summary', 'sourceTitle']) {
      if (typeof record[key] !== 'string' || !record[key].trim() || record[key].length > (key === 'summary' ? 450 : 100)) throw Error('Invalid organization text');
      result[key] = record[key];
    }
    return result;
  });
  return { checkedAt: raw.checkedAt, records };
}
export async function readBounded(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error('Organization notes unavailable');
  const decoder = new TextDecoder(); let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 8192) { await reader.cancel(); throw Error('Organization notes too large'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
export async function activate(scope) {
  const response = await fetch(new URL('./neighborhood-voices.json', import.meta.url), { signal: scope.signal });
  if (!response.ok) throw Error('Organization notes unavailable');
  const text = await readBounded(response);
  const data = readRecords(JSON.parse(text));
  let cleanView = () => {};
  const dismiss = () => { cleanView(); cleanView = () => {}; };
  scope.own(dismiss);
  return {
    open() {
      if (!scope.active()) return;
      dismiss();
      scope.present(`<section data-neighborhood-voices><span class="eyebrow">EXPERIMENTAL · TEXT ONLY</span><h2 id="modal-title" tabindex="-1">People already doing the work.</h2><p>The neighborhood’s work began long before our fictional gathering. Here are three places to learn about it, in original summaries of their own public descriptions.</p><p class="footnote">Sources checked October 18, 2026. This is a dated introduction, not a current service or emergency directory. Follow the official pages for current information. No organization endorses or assigns missions in this game. “Neighborhood Voices” is the feature’s name; this version contains no recorded voices.</p><div class="voices-cards">${data.records.map(record => `<article><span class="eyebrow">${escape(record.topic)}</span><h3>${escape(record.name)}</h3><p>${escape(record.summary)}</p><p class="footnote">Checked ${data.checkedAt} · real organization</p><a href="${record.url}" target="_blank" rel="noopener noreferrer">${escape(record.sourceTitle)} ↗</a></article>`).join('')}</div><p>Our game’s residents, projects and conversations are fictional. Care and services are never rewards for finishing a game task.</p><div class="button-row"><button id="voices-close" class="primary-button">Back to the block</button><button id="voices-disable" class="secondary-button">Turn off Neighborhood Voices</button></div></section>`);
      if (!scope.active()) return;
      const releases = [scope.listen(document.getElementById('voices-close'), 'click', scope.close), scope.listen(document.getElementById('voices-disable'), 'click', scope.disable)];
      cleanView = () => { for (const release of releases) release(); };
    },
    dismiss,
    dispose: dismiss,
  };
}
