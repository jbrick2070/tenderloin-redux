import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../public/', import.meta.url));
export async function buildInfo() {
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
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  return { version, fingerprint: hash.digest('hex') };
}
