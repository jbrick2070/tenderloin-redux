import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../artifacts/godot-web/', import.meta.url));
const browserRoot = fileURLToPath(new URL('../public/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const isBrowser = name === '/browser' || name.startsWith('/browser/');
    const baseDir = isBrowser ? browserRoot : root;
    const subPath = isBrowser ? (name === '/browser' || name === '/browser/' ? '/index.html' : name.slice('/browser'.length)) : (name === '/' ? '/index.html' : name);
    const filename = path.resolve(baseDir, '.' + subPath);
    const relative = path.relative(baseDir, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Outside export');
    const bytes = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(Number(process.env.GODOT_PORT || 4174), '127.0.0.1', () => console.log('Godot study: http://127.0.0.1:' + server.address().port));
