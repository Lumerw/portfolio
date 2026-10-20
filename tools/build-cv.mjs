// CV na jedną stronę 1080 × 1080 do wysyłania, z klikalnymi linkami.
//   npm run cv  →  private/cv-wojciech-lumer-pl.pdf, private/cv-wojciech-lumer-en.pdf
// Folder private/ jest w .gitignore - CV nie trafia do publicznego repozytorium ani na stronę.
// Treść z content.js: imię, rola, zdanie z hero, projekty (zrzuty assets/deck/), doświadczenie, narzędzia
// (pl/en.about), kompetencje i etykiety (pl/en.cv), kontakt (mail, Calendly, profile, QR do portfolio).
import { chromium } from 'playwright';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { buildQr } from './build-qr.mjs';
import { content } from '../content.js';
import { clean } from '../render.js';
import { symbol } from '../symbols.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'private');
const PORT = 8097;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isReal = v => !!v && !String(v).includes('[');
const link = (href, label) => `<a class="link-u" href="${esc(href)}">${esc(label)}</a>`;
const host = u => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function cv(lang) {
  const c = content.shared, t = content[lang], V = t.cv;
  const site = c.siteUrl.replace(/\/$/, '');

  const projects = c.projects.map((p, i) => {
    const tp = t.projects[p.id];
    const scope = (tp.meta ?? []).map(clean).filter(Boolean).join(' · ');
    const links = [
      ...(isReal(p.href) ? [link(p.href, `${host(p.href)} ↗`)] : []),
      link(`${site}/#${p.id}`, `${V.portfolio} ↗`),
    ].join('');
    return `
        <li class="proj">
          <a class="proj__thumb" href="${esc(isReal(p.href) ? p.href : `${site}/#${p.id}`)}"><img src="${esc(p.deck.desktop)}" alt=""></a>
          <div>
            <p class="proj__head"><span class="meta">${String(i + 1).padStart(2, '0')}</span><b>${esc(p.title)}</b><span class="meta">${esc(p.type)}</span></p>
            <p class="proj__tag">${esc(tp.tagline)}</p>
            ${scope ? `<p class="meta proj__scope">${esc(scope)}</p>` : ''}
            <p class="links">${links}</p>
          </div>
        </li>`;
  }).join('');

  const experience = t.about.experience.filter(e => clean(e.place)).map(e => `
          <li><span class="meta">${esc(clean(e.year))}</span><b>${esc(clean(e.place))}</b><span class="muted">${esc(clean(e.role))}</span></li>`).join('');
  const tools = t.about.tools.map(clean).filter(Boolean);
  const profiles = c.links.filter(l => isReal(l.href) && ['LinkedIn', 'Behance', 'GitHub'].includes(l.label));
  const contactLinks = [
    ...(isReal(c.calendly) ? [link(c.booking?.calUsername ? `${site}/${lang === 'en' ? 'en/' : ''}#rozmowa` : c.calendly, V.call)] : []),   // kalendarz na stronie
    ...profiles.map(l => link(l.href, l.label)),
  ].join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<base href="http://localhost:${PORT}/">
<title>${esc(c.name)} - CV</title>
<link rel="stylesheet" href="tools/cv.css">
</head>
<body>
  <main class="page">
    <header class="top">
      ${symbol('personal', { cls: 'mark' })}
      <span class="meta">CV · ${esc(c.year)}</span>
      <span class="top__site">${link(`${site}/`, `${host(site)} ↗`)}</span>
    </header>
    <section class="intro">
      <h1>${esc(c.name)}</h1>
      <p><span class="ink">${esc(t.hero.role)}</span> - ${esc(t.hero.line)}</p>
    </section>
    <div class="cols">
      <section>
        <h2 class="label">${esc(V.projects)}</h2>
        <ul class="projs">${projects}
        </ul>
      </section>
      <aside>
        <h2 class="label">${esc(V.experience)}</h2>
        <ul class="exp">${experience}
        </ul>
        <h2 class="label">${esc(V.skills)}</h2>
        <ul class="dash">${V.skillsList.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        ${tools.length ? `<h2 class="label">${esc(V.tools)}</h2><p>${esc(tools.join(', '))}</p>` : ''}
      </aside>
    </div>
    <footer class="contact">
      <div>
        <p class="contact__mail">${link(`mailto:${c.email}`, c.email)}</p>
        <p class="links">${contactLinks}</p>
      </div>
      <a class="qr" href="${esc(site)}/"><img src="assets/qr.svg" alt=""></a>
    </footer>
  </main>
</body>
</html>`;
}

await buildQr();
await mkdir(out, { recursive: true });
const server = await serve(PORT);
const browser = await chromium.launch();
let failed = false;
for (const lang of ['pl', 'en']) {
  const page = await browser.newPage();
  await page.route(`http://localhost:${PORT}/__cv.html`, r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: cv(lang) }));
  await page.goto(`http://localhost:${PORT}/__cv.html`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
    await document.fonts.ready;
  });
  const over = await page.evaluate(() => { const p = document.querySelector('.page'); return p.scrollHeight > 1080 || p.scrollWidth > 1080; });
  const file = join(out, content[lang].cv.file);
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, tagged: true });
  await page.close();
  const raw = (await readFile(file)).toString('latin1');
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const uris = (raw.match(/\/URI\s*\(/g) || []).length;
  const { size } = await stat(file);
  const ok = pages === 1 && !over;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} private/${content[lang].cv.file}: ${pages} str. · ${uris} linków · ${(size / 1024).toFixed(0)} kB${over ? ' · treść wychodzi poza 1080 × 1080' : ''}`);
}
await browser.close();
server.close();
if (failed) process.exit(1);
