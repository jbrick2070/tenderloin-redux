import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildInfo } from './build-fingerprint.mjs';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
export const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/__build') {
      const data = JSON.stringify(await buildInfo());
      res.writeHead(200, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' }); res.end(data); return;
    }
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root) || !(await stat(filename)).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(`Cannot start local preview: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Tenderloin Redux: http://127.0.0.1:${server.address().port}`));
