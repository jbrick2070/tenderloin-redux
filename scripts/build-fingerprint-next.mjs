import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERSION, EDITION } from '../browser-next/version.js';

// The fork's own build identity; classic's scripts/build-fingerprint.mjs stays untouched.
const root = fileURLToPath(new URL('../browser-next/', import.meta.url));
export async function nextBuildInfo() {
  const hash = createHash('sha256');
  async function visit(directory) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile()) { hash.update(path.relative(root, filename).replaceAll('\\', '/') + '\0'); hash.update(await readFile(filename)); }
    }
  }
  await visit(root);
  return { edition: EDITION, version: VERSION, fingerprint: hash.digest('hex') };
}
