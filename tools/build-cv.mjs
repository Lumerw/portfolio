// Uniwersalne CV na jedną stronę 1080 × 1080, w designie strony i PDF portfolio, z klikalnymi linkami.
//   npm run cv  →  private/Wojciech-Lumer-CV-PL.pdf, private/Wojciech-Lumer-CV-EN.pdf
// Folder private/ jest w .gitignore - CV nie trafia do publicznego repozytorium ani na stronę.
// Układ (4 wielkości tekstu: 40 hasło, 22 imię i zdanie, 18 treść, 15 opisy + znacznik beta): awatar z tęczową obwódką, obok adres strony i imię · hasło z hero, pod nim skrócone zdanie (pl/en.cv.line) · wiersze z cienką linią:
// doświadczenie (3 wiersze z klikalnymi logo firm, pl/en.cv.jobs), kompetencje, wykształcenie i języki (gdy uzupełnione), „współpracowałem z”
// (logo firm w kolejności z content.js, bez freshly; rząd wygasa gradientem w prawo) · kontakt (mail, kalendarz na stronie, profile). Zarys sfery w prawym górnym rogu, przycięty krawędzią.
// Treść z content.js (pl/en.about, pl/en.cv, shared.clients); placeholdery w [nawiasach] są pomijane.
import { chromium } from 'playwright';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { setMeta } from './pdf-meta.mjs';
import { typo } from './typo.mjs';
import { sphere } from './sphere-svg.mjs';
import { content } from '../content.js';
import { clean } from '../render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'private');
const PORT = 8097;
const SIZE = 1080;
const CV_INK = 'promotraffic';   // aktualny pracodawca: logo w pełnej czerni, reszta przygaszona
const CV_SKIP_CLIENTS = ['freshly'];   // logo pominięte w CV (na stronie, w karuzeli klientów, zostają)
const CV_LOGOS = [{ name: 'loom.studio', logo: 'assets/loom/logo.svg', href: 'https://loomstudio.pl/', h: 18 }];   // logo spoza listy klientów (doświadczenie)

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isReal = v => !!v && !String(v).includes('[');
const host = u => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const icon = {
  mail: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9"/><path d="M2 4l6 5 6-5"/></svg>',
  calendar: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3M5 9h1.5M7.25 9h1.5M9.5 9H11M5 11h1.5M7.25 11h1.5"/></svg>',
};

function cv(lang) {
  const c = content.shared, t = content[lang], V = t.cv, U = t.ui;
  const site = c.siteUrl.replace(/\/$/, '');
  const cal = c.booking?.calUsername ? `${site}/${lang === 'en' ? 'en/' : ''}#rozmowa` : c.calendly;
  const linkedin = c.links.find(l => l.label === 'LinkedIn')?.href;
  const row = (label, value) => (value ? `<div class="row"><dt>${esc(label)}</dt><dd>${value}</dd></div>` : '');

  const logoOf = name => [...c.clients, ...CV_LOGOS].find(x => x.name === name);
  const logoLink = (x, h) => {
    const img = `<img${x.name === CV_INK ? ' class="ink"' : ''} src="${esc(x.logo)}" style="height:${h}px" alt="${esc(isReal(x.name) ? x.name : '')}">`;
    return x.href ? `<a href="${esc(x.href)}">${img}</a>` : img;   // logo klikalne - strona firmy
  };
  const experience = V.jobs.map(j => `
          <li><span class="meta">${esc(j.year)}</span><span class="job">${j.logos.map(logoOf).filter(Boolean).map(x => logoLink(x, Math.round(x.h * 0.8))).join('')}<span class="muted">${esc(j.role)}</span></span></li>`).join('');
  const clients = c.clients.filter(x => x.logo && !CV_SKIP_CLIENTS.includes(x.name)).map(x => logoLink(x, Math.round(x.h * 0.8))).join('');
  const profiles = c.links.filter(l => isReal(l.href) && ['LinkedIn', 'GitHub', 'Behance'].includes(l.label));

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
    ${sphere(420, `left:${SIZE - 460}px;top:-560px`)}
    <section class="intro">
      <div class="who">
        <div class="avatar"><img src="${esc(c.avatar.photo)}" alt=""></div>
        <div>
          <p class="site"><a href="${esc(site)}/">${esc(host(site))}</a></p>
          <p class="name">${linkedin ? `<a href="${esc(linkedin)}">${esc(c.name)}</a>` : esc(c.name)}</p>
        </div>
      </div>
      <h1 class="title">${esc(t.hero.title)}</h1>
      <p class="line">${(V.line ?? [t.hero.line]).map(esc).join('<br>')}</p>
    </section>
    <dl class="rows">
      ${row(V.experience, `<ul class="list">${experience}</ul>`)}
      ${row(V.skills, `<ul class="dash">${V.skillsList.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`)}
      ${isReal(t.about.education) ? row(V.education ?? (lang === 'pl' ? 'Wykształcenie' : 'Education'), esc(t.about.education)) : ''}
      ${isReal(t.about.languages) ? row(V.languages ?? (lang === 'pl' ? 'Języki' : 'Languages'), esc(t.about.languages)) : ''}
      ${row(U.clients, clients ? `<p class="clients">${clients}</p>` : '')}
    </dl>
    <footer class="foot">
      <p class="buttons">
        <a class="button button--primary" href="mailto:${esc(c.email)}">${icon.mail}${esc(c.email)}</a>
        ${cal ? `<a class="button" href="${esc(cal)}">${icon.calendar}${esc(U.contactButton)}</a>` : ''}
      </p>
      <ul class="profiles">${profiles.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>
    </footer>
  </main>
</body>
</html>`;
}

await mkdir(out, { recursive: true });
const server = await serve(PORT);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
let failed = false;
for (const lang of ['pl', 'en']) {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.route(`http://localhost:${PORT}/__cv.html`, r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: typo(cv(lang)) }));
  await page.goto(`http://localhost:${PORT}/__cv.html`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
    await document.fonts.ready;
  });
  // ile pikseli treść wychodzi poza stronę (dół stopki, prawa krawędź)
  const over = await page.evaluate(S => {
    const els = [...document.querySelectorAll('.intro, .rows, .foot')];
    return Math.max(0, ...els.map(el => { const r = el.getBoundingClientRect(); return Math.max(r.bottom - (S - 64), r.right - S); }));
  }, SIZE);
  if (process.env.CV_PNG) await page.screenshot({ path: join(process.env.CV_PNG, `cv-${lang}.png`) });
  const file = join(out, content[lang].cv.file);
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, tagged: true });
  await page.close();
  await setMeta(file, { lang, title: `${content.shared.name} - CV` });   // autor, temat, słowa kluczowe (ATS)
  const raw = (await readFile(file)).toString('latin1');
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const uris = (raw.match(/\/URI\s*\(/g) || []).length;
  const { size } = await stat(file);
  const ok = pages === 1 && over < .5;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} private/${content[lang].cv.file}: ${pages} str. · ${uris} linków · ${(size / 1024).toFixed(0)} kB${over >= .5 ? ` · poza kadrem +${Math.ceil(over)} px` : ''}`);
}
await browser.close();
server.close();
if (failed) process.exit(1);
