import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildInfo } from './build-fingerprint.mjs';
import { nextBuildInfo } from './build-fingerprint-next.mjs';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const godotRoot = fileURLToPath(new URL('../artifacts/godot-web/', import.meta.url));
const nextRoot = fileURLToPath(new URL('../browser-next/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png' };
export const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/__build') {
      const data = JSON.stringify(await buildInfo());
      res.writeHead(200, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' }); res.end(data); return;
    }
    // The fork needs its trailing slash: without it, './game.js' would load classic's game.js from '/'.
    if (pathname === '/browser-next') {
      res.writeHead(302, { Location: '/browser-next/' + new URL(req.url, 'http://localhost').search, 'Cache-Control': 'no-store' }); res.end(); return;
    }
    if (pathname === '/browser-next/__build') {
      const data = JSON.stringify(await nextBuildInfo());
      res.writeHead(200, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' }); res.end(data); return;
    }
    const isNext = pathname.startsWith('/browser-next/');
    const isGodot = pathname === '/godot' || pathname.startsWith('/godot/');
    const baseDir = isNext ? nextRoot : isGodot ? godotRoot : root;
    const subPath = isNext ? (pathname === '/browser-next/' ? '/index.html' : pathname.slice('/browser-next'.length)) : isGodot ? (pathname === '/godot' || pathname === '/godot/' ? '/index.html' : pathname.slice('/godot'.length)) : (pathname === '/' ? '/index.html' : pathname);
    const filename = path.resolve(baseDir, '.' + subPath);
    if (!filename.startsWith(baseDir) || !(await stat(filename)).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(`Cannot start local preview: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Tenderloin Redux: http://127.0.0.1:${server.address().port}`));
