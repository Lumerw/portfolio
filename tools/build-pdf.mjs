// PDF portfolio do pobrania ze strony - własny szablon (tools/pdf.css), nie wydruk strony.
//   npm run pdf  →  dla pl i en po 4 pliki:
//     portfolio-lumer-<lang>.pdf            16:9 (1920 × 1080), jasny   - desktop
//     portfolio-lumer-<lang>-dark.pdf       16:9, ciemny
//     portfolio-lumer-<lang>-9x16.pdf       9:16 (1080 × 1920), jasny  - telefon
//     portfolio-lumer-<lang>-9x16-dark.pdf  9:16, ciemny
// Link „pobierz PDF” wybiera plik po urządzeniu (telefon / pionowo → 9:16) i motywie strony (main.js).
// Strony: okładka (awatar z tęczową poświatą, hasło, „kontakt” → mail, „umów rozmowę” → Cal.com, zarys sfery
// w prawym górnym rogu) · projekty (kadr 4:5 + opis, jak panel projektu) · kontakt (jak sekcja Kontakt,
// sfera przycięta krawędzią). Kadry projektów: zrzuty z paneli strony (teraz - plakat animacji, loom.studio
// i reh.ab - pierwsza klatka grafiki), zapisywane w private/pdf/ (poza repozytorium).
// Kontrola: 5 stron, nic poza kadrem, linki, rozmiar < 8 MB.
import { chromium } from 'playwright';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { content } from '../content.js';
import { clean } from '../render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8093;
const EXPECTED_PAGES = 5;   // okładka, 3 projekty, kontakt
const MAX_BYTES = 8 * 1024 * 1024;
const FORMATS = { '16x9': [1920, 1080], '9x16': [1080, 1920] };
const SHOTS = 'private/pdf';

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

/* Sfera jak na stronie: 6 południków + 5 równoleżników (równik mocniej), rzut prostokątny z pochyleniem. */
function sphere(r, style) {
  const tilt = -14 * Math.PI / 180, turn = 18 * Math.PI / 180;
  const proj = ([x, y, z]) => {
    const x1 = x * Math.cos(turn) + z * Math.sin(turn), z1 = -x * Math.sin(turn) + z * Math.cos(turn);
    const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
    return [x1 * r, -y2 * r];
  };
  const path = f => {
    const pts = Array.from({ length: 121 }, (_, k) => proj(f((k / 120) * Math.PI * 2)));
    return `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
  };
  const meridians = [0, 30, 60, 90, 120, 150].map(d => {
    const L = d * Math.PI / 180;
    return `<path class="ring" d="${path(t => [Math.sin(t) * Math.cos(L), Math.cos(t), Math.sin(t) * Math.sin(L)])}"/>`;
  });
  const parallels = [-60, -30, 0, 30, 60].map(d => {
    const P = d * Math.PI / 180;
    return `<path class="ring${d === 0 ? ' ring--eq' : ''}" d="${path(t => [Math.cos(P) * Math.cos(t), Math.sin(P), Math.cos(P) * Math.sin(t)])}"/>`;
  });
  return `<svg class="sphere" viewBox="${-r} ${-r} ${2 * r} ${2 * r}" style="${style};width:${2 * r}px;height:${2 * r}px" aria-hidden="true"><circle class="rim" r="${r}"/>${meridians.join('')}${parallels.join('')}</svg>`;
}

function doc(lang, fmt, dark) {
  const c = content.shared, t = content[lang], U = t.ui;
  const [W, H] = FORMATS[fmt];
  const site = c.siteUrl.replace(/\/$/, '');
  const cal = c.booking?.calUsername ? `https://cal.com/${c.booking.calUsername}/${c.booking.events?.[0]?.slug ?? ''}` : (isReal(c.calendly) ? c.calendly : `mailto:${c.email}`);   // rozmowa 30 min
  const linkedin = c.links.find(l => l.label === 'LinkedIn')?.href;
  const total = 2 + c.projects.length;
  const counter = n => `${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const wide = fmt === '16x9';

  const exp = t.about.experience.map(e => ({ year: clean(e.year), place: clean(e.place), role: clean(e.role) })).filter(e => e.place);
  const cover = `
  <section class="page cover">
    ${wide ? sphere(560, `left:${W - 760}px;top:-470px`) : sphere(470, `left:${W - 520}px;top:-400px`)}
    <div class="cover__avatar"><img src="${esc(c.avatar.photo)}" alt=""></div>
    <div class="cover__text">
      <p class="cover__name">${linkedin ? `<a href="${esc(linkedin)}">${esc(c.name)}</a> <a href="${esc(linkedin)}" aria-label="LinkedIn">${icon.linkedin}</a>` : esc(c.name)}</p>
      <h1 class="cover__title">${esc(t.hero.title)}</h1>
      <p class="cover__line">${esc(t.hero.line)}</p>
      <p class="buttons">
        <a class="button button--primary" href="mailto:${esc(c.email)}">${icon.mail}${esc(U.contactCta)}</a>
        <a class="button" href="${esc(cal)}">${icon.calendar}${esc(U.contactButton)}</a>
      </p>
      <p class="cover__foot"><span>${esc(c.year)}</span><a href="${esc(site)}/">${esc(site.replace(/^https?:\/\//, ''))}</a></p>
    </div>
    <aside class="about">
      <h2 class="about__title">${esc(t.about.title)}</h2>
      <dl class="about__rows">
        <div class="about__row"><dt>${esc(U.experience)}</dt><dd><ul>${exp.map(e => `<li><span class="meta">${esc(e.year)}</span> ${esc(e.place)}, ${esc(e.role)}</li>`).join('')}</ul></dd></div>
        <div class="about__row"><dt>${esc(t.cv.skills)}</dt><dd><ul class="dash">${t.cv.skillsList.map(x => `<li>${esc(x)}</li>`).join('')}</ul></dd></div>
      </dl>
    </aside>
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
      <figure class="pj__media"><img src="${SHOTS}/${p.id}.jpg" alt=""></figure>
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
  <section class="page">
    ${wide ? sphere(470, `left:${W - 380}px;top:${H / 2 - 470}px`) : sphere(560, `left:${W - 460}px;top:${H / 2 - 560}px`)}
    <header class="bar"><span>${esc(c.name)}</span><span class="bar__right">${counter(total)}</span></header>
    <div class="contact">
      <h2 class="contact__title">${esc(t.contact.title)}</h2>
      <p class="contact__mail"><a class="link-u" href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
      <p class="buttons">
        <a class="button button--primary" href="${esc(cal)}">${icon.calendar}${esc(U.contactButton)}</a>
        <a class="button" href="${esc(site)}/#agent"><span class="dot"></span>${esc(U.askAgent)}</a>
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

/* Kadry projektów 4:5 z paneli strony (2x): teraz - plakat animacji (t = 0), reszta - pierwsza klatka (cover). */
async function shots(browser) {
  await mkdir(join(root, SHOTS), { recursive: true });
  for (const p of content.shared.projects) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, reducedMotion: p.reel ? 'no-preference' : 'reduce' });
    await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch {} });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/#${p.id}`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(900);
    await page.evaluate(id => {
      for (const a of document.getAnimations()) {
        const el = a.effect?.target;
        if (el?.closest?.(`#${id} .reel`)) { a.pause(); a.currentTime = 0; }
      }
      document.querySelector(`#${id} .reel__toggle`)?.remove();
    }, p.id);
    await page.waitForTimeout(200);
    // sama grafika (bez ramki figury i jej obwódki): plansza teraz albo statyczna klatka
    await page.locator(`#${p.id} .sheet__video > .reel, #${p.id} .sheet__video > img`).first().screenshot({ path: join(root, SHOTS, `${p.id}.jpg`), type: 'jpeg', quality: 88 });
    await ctx.close();
  }
}

const server = await serve(PORT);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
let failed = false;
await shots(browser);

for (const lang of ['pl', 'en']) {
  for (const fmt of Object.keys(FORMATS)) {
    for (const dark of [false, true]) {
      const [W, H] = FORMATS[fmt];
      const page = await browser.newPage({ viewport: { width: W, height: H } });
      await page.route(`http://localhost:${PORT}/__pdf.html`, r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: doc(lang, fmt, dark) }));
      await page.goto(`http://localhost:${PORT}/__pdf.html`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
        await document.fonts.ready;
      });
      // Każda strona dokładnie W × H, treść w kadrze
      const over = await page.evaluate(([W, H]) => [...document.querySelectorAll('.page')].map((s, i) => {
        const bad = [...s.querySelectorAll('.pj__info, .cover__text, .contact, .contact__foot, .bar')].some(el => {
          const r = el.getBoundingClientRect(), b = s.getBoundingClientRect();
          return r.bottom > b.bottom + .5 || r.right > b.right + .5 || el.scrollHeight > el.clientHeight + 1;
        });
        return (s.offsetWidth !== W || s.offsetHeight !== H || bad) ? i + 1 : null;
      }).filter(Boolean), [W, H]);
      const name = pdfName(content[lang].ui.pdfFile, fmt, dark);
      const file = join(root, name);
      await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, tagged: true, outline: false });
      await page.close();

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
