import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
