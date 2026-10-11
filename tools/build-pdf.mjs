// PDF z tej samej strony przez print.css (Playwright / Chromium).
//   npm run pdf  →  portfolio-<slug>-pl.pdf, portfolio-<slug>-en.pdf
// Po wygenerowaniu sprawdza: 6 stron, linki, rozmiar < 8 MB.

import { chromium } from 'playwright';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { buildQr } from './build-qr.mjs';
import { content } from '../content.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8093;
const EXPECTED_PAGES = 6;
const MAX_BYTES = 8 * 1024 * 1024;

await buildQr();
const server = await serve(PORT);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
let failed = false;

for (const lang of ['pl', 'en']) {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  // main.js renderuje język zapisany w localStorage
  await ctx.addInitScript(l => { try { localStorage.setItem('lang', l); } catch {} }, lang);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

  // Obrazy z loading="lazy" muszą być załadowane przed drukiem.
  await page.evaluate(async () => {
    const imgs = [...document.images];
    imgs.forEach(img => { img.loading = 'eager'; });
    await Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
    await document.fonts.ready;
  });

  const file = join(root, content[lang].ui.pdfFile);
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, tagged: true, outline: false });
  await ctx.close();

  // Kontrola: strony, linki, rozmiar.
  const buf = await readFile(file);
  const raw = buf.toString('latin1');
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const links = (raw.match(/\/URI\s*\(/g) || []).length;
  const { size } = await stat(file);
  const ok = pages === EXPECTED_PAGES && size < MAX_BYTES;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${content[lang].ui.pdfFile}: ${pages} str. · ${links} linków · ${(size / 1024).toFixed(0)} kB`);
}

await browser.close();
server.close();
if (failed) process.exit(1);
