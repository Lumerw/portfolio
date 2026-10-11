// Zrzuty do przeglądu etapów: 375 / 768 / 1440 px, cała strona.
// Użycie: npm run shots -- [ścieżka=specimen.html] [katalog=screenshots]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { serve } from './serve.mjs';

const [page = 'index.html', outDir = 'screenshots'] = process.argv.slice(2);
const WIDTHS = [375, 768, 1440];
const port = 8091;

await mkdir(outDir, { recursive: true });
const server = await serve(port);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const tab = await ctx.newPage();
  await tab.goto(`http://localhost:${port}/${page}`, { waitUntil: 'networkidle' });
  // Przewiń całą stronę, żeby załadowały się obrazy z loading="lazy".
  await tab.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    scrollTo(0, 0);
  });
  await tab.waitForLoadState('networkidle');
  const overflow = await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const file = `${outDir}/${page.replace(/\W+/g, '-')}-${width}.png`;
  await tab.screenshot({ path: file, fullPage: true });
  console.log(file, overflow ? '⚠ poziomy scroll' : '');
  await ctx.close();
}

await browser.close();
server.close();
