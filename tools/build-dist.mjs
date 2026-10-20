// Strona do publikacji (GitHub Pages przez Actions): kopia plików strony w _site/ ze zminifikowanym JS i CSS.
//   npm run dist  →  _site/
// Źródła w repozytorium zostają czytelne; minifikacja tylko w kopii. Narzędzia, Worker, notatki i zależności
// nie trafiają na stronę. PDF-y (GitHub Releases, tag „pdf”) dokłada do _site/ workflow publikacji.
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
// Poza stroną: narzędzia, Worker asystenta, prywatne pliki, zależności, notatki i konfiguracja repozytorium
const SKIP = new Set(['node_modules', 'tools', 'agent', 'private', 'pdf', 'screenshots', '_site', '.git', '.github', '.claude',
  'README.md', 'BRIEF.md', 'package.json', 'package-lock.json', '.gitignore', '.DS_Store', 'specimen.html']);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

let before = 0, after = 0, files = 0;
async function copyDir(dir) {
  for (const name of await readdir(dir)) {
    if (SKIP.has(name) || name.startsWith('.') && name !== '.nojekyll') continue;
    const src = join(dir, name), rel = relative(root, src), dst = join(out, rel);
    if ((await stat(src)).isDirectory()) { await mkdir(dst, { recursive: true }); await copyDir(src); continue; }
    const ext = extname(name);
    // JS i CSS strony (nie assety): minifikacja; reszta bez zmian
    if ((ext === '.js' || ext === '.css') && !rel.startsWith('assets')) {
      const code = await readFile(src, 'utf8');
      const { code: min } = await transform(code, { loader: ext.slice(1), minify: true, format: ext === '.js' ? 'esm' : undefined, target: 'es2022', legalComments: 'none' });
      await writeFile(dst, min);
      before += code.length; after += min.length; files++;
    } else {
      await cp(src, dst);
    }
  }
}
await copyDir(root);
console.log(`_site/ gotowe · JS/CSS: ${files} plików, ${(before / 1024).toFixed(0)} kB → ${(after / 1024).toFixed(0)} kB`);
