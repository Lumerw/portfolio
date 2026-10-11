// Obraz Open Graph 1200 × 630 w stylu strony → assets/og.jpg
//   npm run og
// Renderowany przez Chromium, żeby typografia była identyczna jak na stronie.
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { symbol } from '../symbols.js';
import { shared, pl } from '../content.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #FAFAF7; color: #111; padding: 72px 80px;
         font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }
  .symbol { width: 72px; height: 72px; fill: none; stroke: #111; stroke-width: .67; }
  .symbol .hanko { fill: #2450D8; stroke: none; }
  .name { margin-top: auto; font-size: 24px; font-weight: 500; }
  .name span { font-weight: 400; color: #6E6E6A; }
  h1 { margin-top: 12px; font-size: 64px; font-weight: 500; letter-spacing: -.01em; line-height: 1.1; }
  p { margin-top: 20px; font-size: 26px; line-height: 1.45; color: #6E6E6A; max-width: 860px; }
  .meta { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 20px;
          border-top: 1px solid rgba(17,17,17,.14); font-size: 18px; color: #73736E; }
</style></head><body>
  ${symbol('personal')}
  <div class="name">${esc(shared.name)} <span>- ${esc(pl.hero.role)}</span></div>
  <h1>${esc(pl.hero.title)}</h1>
  <p>${esc(pl.hero.line)}</p>
  <div class="meta"><span>${shared.projects.map(p => esc(p.title)).join(' · ')}</span><span>${esc(shared.year)}</span></div>
</body></html>`;

const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: join(root, 'assets/og.jpg'), type: 'jpeg', quality: 88 });
await browser.close();
console.log('assets/og.jpg');
