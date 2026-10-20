// Minimalny serwer statyczny bez zależności: `npm run dev` → http://localhost:8080
// Z flagą --dev index.html i en/index.html są renderowane z content.js przy każdym odświeżeniu.
// Używany też przez build-pdf.mjs i screenshots.mjs.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderIndex } from './build-html.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4',
  '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.json': 'application/json',
};

export function serve(port = 8080, { dev = false } = {}) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = dev && file === join(root, 'index.html') ? (await renderIndex()).html
        : dev && file === join(root, 'en', 'index.html') ? (await renderIndex('en')).html
        : await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      // PDF-y leżą lokalnie w pdf/ (na stronie: z GitHub Releases) - ten sam adres co na lumerw.com
      if (extname(file) === '.pdf') {
        try { const body = await readFile(join(root, 'pdf', path.replace(/^.*[/\\]/, ''))); res.writeHead(200, { 'content-type': TYPES['.pdf'] }); return res.end(body); } catch { /* brak */ }
      }
      res.writeHead(404).end('404');
    }
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  await serve(port, { dev: process.argv.includes('--dev') });
  console.log(`http://localhost:${port}`);
}
