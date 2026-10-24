// PDF 1080 × 1080 px - karuzela na LinkedIn / Instagram, z klikalnymi linkami.
//   npm run deck  →  portfolio-lumer-1080-pl.pdf, portfolio-lumer-1080-en.pdf
// Slajdy: start (hasło + spis) · dla każdego projektu: plansza marki + szczegóły · kontakt.
// Teksty: content.js (pl/en.deck, projekty), zrzuty: shared.projects[].deck, style: tools/deck.css,
// plansze marek: tools/covers.mjs + covers.css (te same co na stronie).
// Spis i „spis” na każdym slajdzie to linki wewnątrz PDF; strony projektów, mail i www - linki zewnętrzne.
// Fonty: Helvetica Neue (macOS), Open Sans (teraz, OFL, lokalnie). Haus (loom.studio) tylko jako logo w krzywych.
import { chromium } from 'playwright';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { buildQr } from './build-qr.mjs';
import { content } from '../content.js';
import { clean, coverSrc } from '../render.js';
import { covers } from './covers.mjs';
import { symbol } from '../symbols.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8094;
const MAX_BYTES = 10 * 1024 * 1024;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isReal = v => !!v && !String(v).includes('[');
const ext = (href, label, cls = 'link-u') => `<a class="${cls}" href="${esc(href)}">${esc(label)}</a>`;

/* ---------- Slajdy ---------- */
function deck(lang) {
  const c = content.shared, t = content[lang], D = t.deck;
  const projects = c.projects;
  const total = 2 + projects.length * 2;
  const no = n => `${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const back = `<a class="link-u" href="#s-start">${esc(D.back)}</a>`;

  const top = (n, left, right = '') => `
      <header class="top">${left}<span class="top__right">${right}<span class="t-meta">${no(n)}</span></span></header>`;
  const projectTop = (p, i, n, extra = '') => top(n,
    `${symbol(p.symbol, { cls: 'top__symbol' })}<span class="t-meta">${String(i + 1).padStart(2, '0')}</span><span class="top__title">${esc(p.title)}</span><span class="t-meta">${esc(p.type)}</span>`,
    `${extra}${back}`);
  const visit = p => (isReal(p.href) ? ext(p.href, D.visit) : `<span class="t-meta">${esc(D.soon)}</span>`);

  const start = `
    <section class="slide slide--start" id="s-start">
      ${top(1, symbol('personal', { cls: 'top__mark' }), `<span class="t-meta">${esc(D.label)}</span>`)}
      <div class="start">
        <p class="start__name"><span>${esc(c.name)}</span></p>
        <h1 class="start__title">${esc(t.hero.title)}</h1>
        <p class="start__line">${esc(t.hero.line)}</p>
        <nav class="index">${projects.map((p, i) => `
          <a class="index__row" href="#s-${p.id}"><span class="t-meta">${String(i + 1).padStart(2, '0')}</span><span class="index__title">${esc(p.title)}</span><span class="t-meta">${esc(p.type)}</span></a>`).join('')}
          <a class="index__row" href="#s-kontakt"><span class="t-meta">→</span><span class="index__title">${esc(D.contactRow)}</span><span class="t-meta">${esc(c.email)}</span></a>
        </nav>
      </div>
    </section>`;

  const slides = projects.map((p, i) => {
    const tp = t.projects[p.id], dp = D.projects[p.id];
    const n = 2 + i * 2;
    const scope = (tp.meta ?? []).map(clean).filter(Boolean);
    return `
    <section class="slide" id="s-${p.id}">
      ${projectTop(p, i, n)}
      <figure class="frame${p.cover ? ' frame--cover' : ''}">${p.cover ? `<img src="${esc(coverSrc(p, '4x5', lang))}" alt="">` : covers[p.id](p, tp)}</figure>
      <p class="caption"><span>${esc(p.title)} - ${esc(tp.tagline)}</span>${visit(p)}</p>
    </section>
    <section class="slide" id="s-${p.id}-o">
      ${projectTop(p, i, n + 1, `${visit(p)}`)}
      <h2 class="detail__title">${esc(p.title)}${p.beta ? ' <span class="beta">beta</span>' : ''}</h2>
      <p class="detail__lead">${esc(tp.lead)}</p>
      <div class="shots">
        <img class="shots__desktop" src="${esc(p.deck.desktop)}" alt="">
        <img class="shots__phone" src="${esc(p.deck.phone)}" alt="">
      </div>
      <div class="detail__cols">
        <div><p class="t-meta">${esc(D.scope)}</p><ul>${scope.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
        <div><p class="t-meta">${esc(D.facts)}</p><ul class="dash">${dp.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
      </div>
    </section>`;
  }).join('');

  const site = c.siteUrl.replace(/^https?:\/\//, '');
  const links = [
    ...(isReal(c.calendly) ? [ext(c.booking?.calUsername ? `${c.siteUrl.replace(/\/$/, '')}/${lang === 'en' ? 'en/' : ''}#rozmowa` : c.calendly, t.ui.contactButton + ' ↗')] : []),   // kalendarz na stronie
    ...c.links.filter(l => isReal(l.href)).map(l => ext(l.href, l.label)),
  ];
  const contact = `
    <section class="slide slide--contact" id="s-kontakt">
      ${top(total, symbol('personal', { cls: 'top__mark' }), back)}
      <div class="contact">
        <h2 class="contact__title">${esc(D.contactTitle)}</h2>
        <p class="contact__mail">${ext(`mailto:${c.email}`, c.email)}</p>
        ${links.length ? `<p class="contact__links">${links.join('')}</p>` : ''}
      </div>
      <footer class="contact__foot">
        <a class="contact__qr" href="${esc(c.siteUrl)}/"><img src="assets/qr.svg" alt=""></a>
        <p><span class="t-meta">${esc(D.site)}</span><br>${ext(`${c.siteUrl}/`, site)}</p>
        <p class="t-meta contact__copy">© ${esc(c.year)} ${esc(c.name)}</p>
      </footer>
    </section>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<base href="http://localhost:${PORT}/">
<title>${esc(c.name)} - ${esc(D.label)}</title>
<link rel="stylesheet" href="tools/covers.css">
<link rel="stylesheet" href="tools/deck.css">
</head>
<body>${start}${slides}${contact}
</body>
</html>`;
}

/* ---------- Druk + kontrola ---------- */
await buildQr();
await mkdir(join(root, 'pdf'), { recursive: true });
const server = await serve(PORT);
const browser = await chromium.launch();
let failed = false;

for (const lang of ['pl', 'en']) {
  const page = await browser.newPage();
  await page.route(`http://localhost:${PORT}/__deck.html`, r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: deck(lang) }));
  await page.goto(`http://localhost:${PORT}/__deck.html`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
    await document.fonts.ready;
  });
  // Każdy slajd musi mieć dokładnie 1080 × 1080 (nic nie wychodzi poza kadr).
  const over = await page.evaluate(() => [...document.querySelectorAll('.slide')]
    .filter(s => s.scrollHeight > 1080 || s.scrollWidth > 1080 || s.offsetHeight !== 1080).map(s => s.id));
  const file = join(root, 'pdf', content[lang].deck.file);   // poza repozytorium (npm run publish-pdf)
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, tagged: true });
  await page.close();

  const raw = (await readFile(file)).toString('latin1');
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const uris = (raw.match(/\/URI\s*\(/g) || []).length;
  const internal = (raw.match(/\/Dest\b/g) || []).length;
  const expected = 2 + content.shared.projects.length * 2;
  const { size } = await stat(file);
  const ok = pages === expected && size < MAX_BYTES && !over.length && internal > 0;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${content[lang].deck.file}: ${pages}/${expected} str. · ${uris} linków zewn. · ${internal} wewn. · ${(size / 1024).toFixed(0)} kB${over.length ? ` · poza kadrem: ${over.join(', ')}` : ''}`);
}

await browser.close();
server.close();
if (failed) process.exit(1);
