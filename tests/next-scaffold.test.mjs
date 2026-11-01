import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildInfo } from '../scripts/build-fingerprint.mjs';
import { nextBuildInfo } from '../scripts/build-fingerprint-next.mjs';
import { VERSION, EDITION } from '../browser-next/version.js';

const CLASSIC = { version: '0.12.0', fingerprint: '2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567' };

test('classic 0.12.0 stays frozen', async () => {
  assert.deepEqual(await buildInfo(), CLASSIC);
  assert.equal(JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version, '0.12.0');
});

test('the fork has its own build identity', async () => {
  const info = await nextBuildInfo();
  assert.equal(info.edition, 'browser-next'); assert.equal(info.edition, EDITION); assert.equal(info.version, VERSION);
  assert.match(info.fingerprint, /^[0-9a-f]{64}$/); assert.notEqual(info.fingerprint, CLASSIC.fingerprint);
  assert.notEqual(VERSION, CLASSIC.version);
});

test('the fork carries byte-identical copies of the street and district data', () => {
  for (const name of ['streets.osm.json', 'transgender-district.geojson', 'cultural-district-source.json'])
    assert.ok(readFileSync(new URL(`../browser-next/data/${name}`, import.meta.url)).equals(readFileSync(new URL(`../public/data/${name}`, import.meta.url))), name);
});

test('the local server keeps classic routes and serves the fork behind its slash', async () => {
  process.env.PORT = '0';
  const { server } = await import('../scripts/serve.mjs');
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/__build`)).json(), CLASSIC);
    assert.equal(await (await fetch(`${base}/`)).text(), readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'));
    const bare = await fetch(`${base}/browser-next?seed=1`, { redirect: 'manual' });
    assert.equal(bare.status, 302); assert.equal(bare.headers.get('location'), '/browser-next/?seed=1');
    assert.equal(await (await fetch(`${base}/browser-next/`)).text(), readFileSync(new URL('../browser-next/index.html', import.meta.url), 'utf8'));
    assert.equal(await (await fetch(`${base}/browser-next/game.js`)).text(), readFileSync(new URL('../browser-next/game.js', import.meta.url), 'utf8'));
    assert.deepEqual(await (await fetch(`${base}/browser-next/__build`)).json(), await nextBuildInfo());
    for (const path of ['/package.json', '/browser-next/missing.js']) assert.equal((await fetch(base + path)).status, 404, path);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('the fork declares its Content-Security-Policy first in <head>, with no inline script or handler to allow', () => {
  const html = readFileSync(new URL('../browser-next/index.html', import.meta.url), 'utf8'), head = /<head>\s*([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
  const meta = /^<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(head);
  assert.ok(meta, 'a Content-Security-Policy meta is the first element in <head>');
  const policy = Object.fromEntries(meta[1].split(';').map(part => part.trim().split(/\s+/)).map(([directive, ...sources]) => [directive, sources]));
  assert.deepEqual(policy, {
    'default-src': ["'none'"], 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:', 'blob:'], 'media-src': ["'self'", 'blob:', 'data:'],
    'connect-src': ["'self'"], 'worker-src': ["'self'"], 'object-src': ["'none'"], 'base-uri': ["'none'"], 'form-action': ["'none'"],
  });
  assert.ok(!policy['script-src'].includes("'unsafe-inline'") && !policy['script-src'].includes("'unsafe-eval'"), 'scripts load from the fork only, never inline or from eval');
  assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>/i, 'no inline <script>');
  assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i, 'no on* event handler attribute');
});

// Play the 3D edition: a plain link to the Godot build beside the fork, right after the edition note. It opens in the same tab (no
// target), is relative (Pages serves the fork under /tenderloin-redux/), and loads nothing, so the policy above stays as it is.
test('the page links to the 3D edition right after the edition note: same tab, relative, and the note stays true', () => {
  const html = readFileSync(new URL('../browser-next/index.html', import.meta.url), 'utf8');
  const note = '<p class="save-status edition-note" id="edition-note">Playing the 3D edition too? Your progress comes with you; if it is already open in another tab, reload it after switching.</p>';
  const link = '<a id="swap-edition" class="edition-link" href="../godot/">Play the 3D edition<span aria-hidden="true">↗</span></a>';
  assert.ok(html.includes(note + link), 'the link follows the edition note, which says progress comes with you');
  assert.equal(html.split('id="swap-edition"').length - 1, 1, 'one page link');
  assert.doesNotMatch(html, /Reload the other edition after switching\./, 'the old note is gone');
  assert.ok(html.indexOf(link) < html.indexOf('</aside>', html.indexOf('class="field-guide"')), 'the link sits in the field guide, under the save status');
});

// Line endings: the files the fork copied from classic keep classic's CRLF, every other fork file is LF, and none is mixed.
const CRLF_FILES = ['camera.js', 'core.js', 'data/streets.osm.json', 'game.js', 'index.html', 'style.css', 'world.js'];
test('every fork file is uniformly LF or uniformly CRLF, and only the files copied from classic are CRLF', () => {
  const root = new URL('../browser-next/', import.meta.url), crlf = [], seen = [];
  const walk = dir => {
    for (const entry of readdirSync(new URL(dir, root), { withFileTypes: true })) {
      const rel = dir + entry.name;
      if (entry.isDirectory()) { walk(rel + '/'); continue; }
      const bytes = readFileSync(new URL(rel, root)), lf = bytes.filter(b => b === 10).length, cr = bytes.filter(b => b === 13).length;
      let pairs = 0;
      for (let i = 1; i < bytes.length; i++) if (bytes[i] === 10 && bytes[i - 1] === 13) pairs++;
      assert.ok(lf > 0, `${rel} has lines`);
      assert.ok(cr === 0 || (cr === lf && pairs === lf), `${rel} is uniformly LF or CRLF (${lf} LF, ${cr} CR, ${pairs} CRLF)`);
      if (cr) crlf.push(rel);
      seen.push(rel);
    }
  };
  walk('');
  assert.ok(seen.includes('game.js') && seen.includes('ending/ui.js') && seen.length > 40, `the walk reads the fork (${seen.length} files)`);
  assert.deepEqual(crlf.sort(), CRLF_FILES.filter(rel => seen.includes(rel)), 'exactly these files are CRLF');
});
