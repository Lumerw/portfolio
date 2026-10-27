// PDF portfolio do pobrania ze strony - własny szablon (tools/pdf.css), nie wydruk strony.
//   npm run pdf  →  pdf/ (poza repozytorium), dla pl i en po 4 pliki; npm run publish-pdf wysyła je do GitHub Releases:
//     Wojciech-Lumer-Portfolio-<PL|EN>.pdf            16:9 (1920 × 1080), jasny   - desktop
//     Wojciech-Lumer-Portfolio-<PL|EN>-dark.pdf       16:9, ciemny
//     Wojciech-Lumer-Portfolio-<PL|EN>-9x16.pdf       9:16 (1080 × 1920), jasny  - telefon
//     Wojciech-Lumer-Portfolio-<PL|EN>-9x16-dark.pdf  9:16, ciemny
// Link „pobierz PDF” wybiera plik po urządzeniu (telefon / pionowo → 9:16) i motywie strony (main.js).
// Strony: okładka (układ i proporcje hero strony na desktopie: awatar, imię, hasło, akapit, przyciski; „kontakt” → mail,
// „umów rozmowę” → kalendarz na stronie) · projekty (kadr 4:5 + opis, jak panel projektu) · kontakt (jak sekcja
// Kontakt). Sfera przycięta krawędzią - w tym samym miejscu na okładce i na stronie kontaktu. Kadry projektów:
// statyczne okładki projektów (cover-4x5, npm run covers - pierwsza klatka okładek z live.js; loom.studio w języku PDF).
// Kontrola: 5 stron, nic poza kadrem, linki, rozmiar < 8 MB.
import { chromium } from 'playwright';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { setMeta } from './pdf-meta.mjs';
import { typo } from './typo.mjs';
import { content } from '../content.js';
import { clean, DRIVE_D, coverSrc } from '../render.js';
import { sphere } from './sphere-svg.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8093;
const EXPECTED_PAGES = 5;   // okładka, 3 projekty, kontakt
const MAX_BYTES = 8 * 1024 * 1024;
const FORMATS = { '16x9': [1920, 1080], '9x16': [1080, 1920] };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isReal = v => !!v && !String(v).includes('[');
const num = i => String(i + 1).padStart(2, '0');
// Nazwa pliku wariantu: bazowa = 16:9 jasny (ten sam adres co dotąd); = pdfVariant() w main.js
export const pdfName = (base, fmt, dark) => base.replace(/\.pdf$/, `${fmt === '9x16' ? '-9x16' : ''}${dark ? '-dark' : ''}.pdf`);

const icon = {
  calendar: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3M5 9h1.5M7.25 9h1.5M9.5 9H11M5 11h1.5M7.25 11h1.5"/></svg>',
  mail: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9"/><path d="M2 4l6 5 6-5"/></svg>',
  linkedin: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x=".5" y=".5" width="15" height="15"/><path d="M4.5 7v5M7.5 12V7M7.5 9.2c0-1.5.9-2.2 2-2.2s2 .7 2 2.2V12"/><circle cx="4.5" cy="4.6" r=".5" fill="currentColor" stroke="none"/></svg>',
};

function doc(lang, fmt, dark) {
  const c = content.shared, t = content[lang], U = t.ui;
  const [W, H] = FORMATS[fmt];
  const site = c.siteUrl.replace(/\/$/, '');
  const cal = c.booking?.calUsername ? `${site}/${lang === 'en' ? 'en/' : ''}#rozmowa` : (isReal(c.calendly) ? c.calendly : `mailto:${c.email}`);   // kalendarz rozmowy na stronie (30 min)
  const linkedin = c.links.find(l => l.label === 'LinkedIn')?.href;
  const total = 2 + c.projects.length;
  const counter = n => `${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const wide = fmt === '16x9';
  // Sfera: to samo miejsce na okładce i na stronie kontaktu - duża, w prawym górnym rogu, przycięta górą i prawą krawędzią
  const globe = wide ? sphere(620, `left:${W - 120 - 620}px;top:${170 - 620 - 80}px`) : sphere(560, `left:${W - 80 - 560}px;top:${110 - 560}px`);

  // Dół okładki: wykształcenie (+ certyfikaty), doświadczenie (+ loga firm), kompetencje - loga z content.shared.pdfAbout
  const A = c.pdfAbout;
  const logo = x => (x.logo ? `<img class="logo" src="${esc(x.logo)}" alt="${esc(x.name)}" style="height:${x.h}px">` : `<span class="logo logo--text">${esc(x.name)}</span>`);
  const entry = x => `<li class="entry">${logo(x)}${x.text || x.role ? `<span class="entry__text">${esc(x.text?.[lang] ?? x.role)}${x.year ? ` <span class="meta">${esc(x.year[lang])}</span>` : ''}</span>` : ''}</li>`;
  const col = (label, body) => `<div class="about__col"><h3>${esc(label)}</h3>${body}</div>`;
  const cover = `
  <section class="page cover">
    ${globe}
    <header class="bar"><span class="bar__right">${counter(1)}</span></header>
    <div class="cover__text">
      <div class="cover__avatar"><img src="${esc(c.avatar.photo)}" alt=""></div>
      <p class="cover__name">${linkedin ? `<a href="${esc(linkedin)}">${esc(c.name)}</a> <a href="${esc(linkedin)}" aria-label="LinkedIn">${icon.linkedin}</a>` : esc(c.name)}</p>
      <h1 class="cover__title">${esc(t.hero.title)}</h1>
      <p class="cover__line">${esc(t.hero.line)}</p>
      <p class="buttons">
        <a class="button button--primary" href="mailto:${esc(c.email)}">${icon.mail}${esc(U.contactCta)}</a>
        ${isReal(c.drive) ? `<a class="button" href="${esc(c.drive)}"><svg class="fill" viewBox="0 0 24 24" aria-hidden="true"><path d="${DRIVE_D}"/></svg>${esc(U.drive)}</a>` : ''}
      </p>
    </div>
    <aside class="about">
      <h2 class="about__title">${esc(t.about.title)}</h2>
      <div class="about__cols">
        ${col(U.education, `<ul class="axis">${A.education.map(entry).join('')}<li class="entry entry--group"><span class="entry__label">${esc(U.certificates)}</span><span class="logos">${A.certificates.map(logo).join('')}</span></li></ul>`)}
        ${col(U.experience, `<ul class="axis">${A.work.map(entry).join('')}</ul>`)}
        ${col(t.cv.skills, `<ul class="dash">${t.cv.skillsList.filter(x => !A.skipSkills?.includes(x)).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      </div>
    </aside>
    <footer class="cover__foot"><a href="${esc(site)}/">${esc(site.replace(/^https?:\/\//, ''))}</a> <span>${esc(c.year)}</span></footer>
  </section>`;

  // Linki projektu: strona i brandbook; bez adresu - nazwa z „wkrótce”, bez linku
  const pjLink = (href, label) => (isReal(href)
    ? `<a class="link-u" href="${esc(href)}">${esc(label)} ↗</a>`
    : `<span class="pj__soon">${esc(label)} <span class="meta">${esc(U.soon)}</span></span>`);
  const projects = c.projects.map((p, i) => {
    const tp = t.projects[p.id];
    const scope = (tp.meta ?? []).map(clean).filter(Boolean);
    const tools = (p.tools ?? []).map(clean).filter(Boolean);
    const points = (t.deck?.projects?.[p.id]?.facts ?? []).map(clean).filter(Boolean);
    const row = (label, value) => (value ? `<div class="pj__row"><dt>${esc(label)}</dt><dd>${value}</dd></div>` : '');
    return `
  <section class="page">
    <header class="bar"><img src="${esc(p.sygnet.src)}" alt=""><span>${num(i)}</span><span>${esc(p.type)}</span><span class="bar__right">${counter(i + 2)}</span></header>
    <div class="pj">
      <figure class="pj__media"><img src="${esc(coverSrc(p, '4x5', lang))}" alt=""></figure>
      <div class="pj__info">
        <h2 class="pj__title">${esc(p.title)}${p.beta ? ' <span class="beta">beta</span>' : ''}</h2>
        <p class="pj__tagline">${esc(tp.tagline)}</p>
        <p class="pj__lead">${esc(tp.lead)}</p>
        <dl class="pj__rows">${row(U.scope, esc(scope.join(' · ')))}${row(U.tools, esc(tools.join(' · ')))}${points.length ? row(U.highlights, `<ul class="dash">${points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`) : ''}</dl>
        <p class="pj__link">${[pjLink(p.href, U.projectSite), ...(p.brandbook ? [pjLink(p.brandbook, U.projectBrandbook)] : [])].join('')}</p>
      </div>
    </div>
  </section>`;
  }).join('');

  const links = c.links.filter(l => isReal(l.href));
  const contact = `
  <section class="page last">
    ${globe}
    <header class="bar"><span class="bar__right">${counter(total)}</span></header>
    <div class="contact">
      <h2 class="contact__title">${esc(t.contact.title)}</h2>
      <p class="contact__mail"><a class="link-u" href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
      <p class="buttons">
        <a class="button button--primary" href="${esc(cal)}">${icon.calendar}${esc(U.contactButton)}</a>
        <a class="button agent" href="${esc(site)}/#agent"><span class="agent-glow" aria-hidden="true"></span><img class="agent-face" src="${esc(c.avatar.drawing)}" alt="">${esc(U.askAgent)}</a>
      </p>
    </div>
    <footer class="contact__foot">
      <ul class="contact__links">${links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>
      <p class="contact__copy">© ${esc(c.year)} ${esc(c.name)}</p>
    </footer>
  </section>`;

  return `<!doctype html>
<html lang="${lang}" data-fmt="${fmt}"${dark ? ' data-theme="dark"' : ''}>
<head>
<meta charset="utf-8">
<base href="http://localhost:${PORT}/">
<title>${esc(c.name)} - portfolio</title>
<link rel="stylesheet" href="tools/pdf.css">
<style>@page { size: ${W}px ${H}px; margin: 0; }</style>
</head>
<body>${cover}${projects}${contact}
</body>
</html>`;
}

const server = await serve(PORT);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
let failed = false;
await mkdir(join(root, 'pdf'), { recursive: true });

for (const lang of ['pl', 'en']) {
  for (const fmt of Object.keys(FORMATS)) {
    for (const dark of [false, true]) {
      const [W, H] = FORMATS[fmt];
      const page = await browser.newPage({ viewport: { width: W, height: H } });
      await page.route(`http://localhost:${PORT}/__pdf.html`, r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: typo(doc(lang, fmt, dark)) }));
      await page.goto(`http://localhost:${PORT}/__pdf.html`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
        await document.fonts.ready;
      });
      // Każda strona dokładnie W × H, treść w kadrze
      const over = await page.evaluate(([W, H]) => [...document.querySelectorAll('.page')].map((s, i) => {
        // ile pikseli treść wychodzi poza stronę (dół, prawa krawędź, przewijanie w bloku)
        const px = Math.max(0, ...[...s.querySelectorAll('.pj__info, .cover__text, .about, .contact, .contact__foot, .cover__foot, .bar')].map(el => {
          const r = el.getBoundingClientRect(), b = s.getBoundingClientRect();
          return Math.max(r.bottom - b.bottom, r.right - b.right, el.scrollHeight - el.clientHeight - .5);
        }));
        return (s.offsetWidth !== W || s.offsetHeight !== H || px > .5) ? `${i + 1} (+${Math.ceil(px)} px)` : null;
      }).filter(Boolean), [W, H]);
      const name = pdfName(content[lang].ui.pdfFile, fmt, dark);
      const file = join(root, 'pdf', name);   // poza repozytorium; publikacja: npm run publish-pdf (GitHub Releases)
      await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, tagged: true, outline: false });
      await page.close();
      await setMeta(file, { lang, title: `${content.shared.name} - Portfolio` });

      const raw = (await readFile(file)).toString('latin1');
      const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) || []).length;
      const links = (raw.match(/\/URI\s*\(/g) || []).length;
      const { size } = await stat(file);
      const ok = pages === EXPECTED_PAGES && size < MAX_BYTES && !over.length;
      if (!ok) failed = true;
      console.log(`${ok ? '✓' : '✗'} ${name}: ${pages} str. · ${links} linków · ${(size / 1024).toFixed(0)} kB${over.length ? ` · poza kadrem: str. ${over.join(', ')}` : ''}`);
    }
  }
}

await browser.close();
server.close();
if (failed) process.exit(1);
