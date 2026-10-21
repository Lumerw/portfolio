// Wpisuje treść z content.js do index.html (polska, /) i en/index.html (angielska, /en/) między znacznikami
// app/meta. Dzięki temu obie wersje działają i indeksują się bez JS. Uruchom po każdej zmianie treści:
//   npm run build
// `npm run dev` robi to samo w locie przy każdym odświeżeniu (tools/serve.mjs --dev).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'index.html');
const fill = (html, key, inner) =>
  html.replace(new RegExp(`<!-- ${key}:start -->[\\s\\S]*?<!-- ${key}:end -->`), `<!-- ${key}:start -->\n  ${inner}\n  <!-- ${key}:end -->`);

// Strona w podkatalogu /en/: względne adresy (src, href, srcset, poster) dostają „../” - pliki leżą w katalogu
// głównym. Kotwice (#…), adresy pełne, mailto: i data: zostają bez zmian.
const REL = /^(?!https?:|\/\/|#|mailto:|tel:|data:|\/|\.\.\/)/;
export const toSubdir = html => html
  .replace(/(\s(?:src|href|poster)=")([^"]*)"/g, (m, a, v) => (v && REL.test(v) ? `${a}../${v}"` : m))
  .replace(/(\ssrcset=")([^"]*)"/g, (m, a, v) => `${a}${v.split(',').map(x => { const t = x.trim(); return REL.test(t) ? `../${t}` : t; }).join(', ')}"`);

// Świeży import przy każdym wywołaniu — serwer deweloperski widzi zmiany bez restartu.
export async function renderIndex(lang = 'pl') {
  const t = Date.now();
  const { content } = await import(`../content.js?t=${t}`);
  const { render, renderMeta } = await import(`../render.js?t=${t}`);
  let html = await readFile(file, 'utf8');
  html = fill(html, 'meta', renderMeta(content, lang));
  html = fill(html, 'app', render(content, lang));
  if (lang !== 'pl') html = toSubdir(html.replace(/<html lang="pl">/, `<html lang="${lang}">`));
  return { html, content };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { html, content } = await renderIndex();

  // Brief 5.2: maks. 120 słów tekstu na projekt.
  for (const lang of ['pl', 'en']) {
    for (const p of content.shared.projects) {
      const t = content[lang].projects[p.id];
      const words = [t.lead, t.problem, t.solution, t.result].join(' ').split(/\s+/).filter(Boolean).length;
      if (words > 120) console.warn(`⚠ ${p.title} (${lang}): ${words} słów — limit to 120`);
    }
  }

  // Plansza animowana (projects[].reel): te same klucze w pl i en, niepusty opis, bez długich myślników,
  // limity znaków (dłuższy tekst wyjdzie poza kadr na telefonie). Błąd przerywa build, limit tylko ostrzega.
  const REEL_MAX = {
    listener: 12, expert: 12, you: 12, listeners: 14, experts: 14,
    stepL: 30, stepE: 30, community: 24, subL: 54, subE: 54, communitySub: 60,
    callTitle: 36, call: 32, label: 340,
  };
  const errors = [];
  for (const p of content.shared.projects.filter(p => p.reel)) {
    const [pl, en] = ['pl', 'en'].map(l => content[l].projects[p.id]?.reel);
    if (!pl || !en) { errors.push(`${p.title}: brak tekstów reel (pl i en)`); continue; }
    const keys = l => Object.keys(l).sort().join(',');
    if (keys(pl) !== keys(en)) errors.push(`${p.title}: różne klucze reel w pl i en`);
    for (const [lang, r] of [['pl', pl], ['en', en]]) {
      if (!String(r.label || '').trim()) errors.push(`${p.title} (${lang}): pusty reel.label`);
      for (const [k, v] of Object.entries(r)) {
        if (typeof v !== 'string') { errors.push(`${p.title} (${lang}): reel.${k} musi być tekstem`); continue; }
        if (/[—–]/.test(v)) errors.push(`${p.title} (${lang}): reel.${k} ma długi myślnik - użyj „-”`);
        if (REEL_MAX[k] && v.length > REEL_MAX[k]) console.warn(`⚠ ${p.title} (${lang}): reel.${k} ma ${v.length} znaków - limit ${REEL_MAX[k]}`);
      }
      const claim = `${r.claimA} ${r.claimKey}`;
      if (claim.length > 26) console.warn(`⚠ ${p.title} (${lang}): hasło reel ma ${claim.length} znaków - limit 26`);
    }
    for (const lang of ['pl', 'en']) {
    }
  }
  // Cała treść (nie tylko reel): krótki łącznik „-” zamiast długich myślników.
  const walk = (v, path) => {
    if (typeof v === 'string') { if (/[—–]/.test(v)) errors.push(`${path}: długi myślnik - użyj „-”`); }
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  for (const k of ['shared', 'pl', 'en']) walk(content[k], k);
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }

  await writeFile(file, html);
  console.log('index.html ← content.js (pl)');
  await mkdir(join(root, 'en'), { recursive: true });
  await writeFile(join(root, 'en', 'index.html'), (await renderIndex('en')).html);
  console.log('en/index.html ← content.js (en)');

  // sitemap.xml + robots.txt z adresu strony (shared.siteUrl).
  const site = content.shared.siteUrl.replace(/\/$/, '');
  if (!site.includes('[')) {
    // obie wersje językowe z wzajemnymi odnośnikami hreflang
    const alt = `<xhtml:link rel="alternate" hreflang="pl" href="${site}/"/><xhtml:link rel="alternate" hreflang="en" href="${site}/en/"/>`;
    await writeFile(join(root, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      `  <url><loc>${site}/</loc>${alt}</url>\n  <url><loc>${site}/en/</loc>${alt}</url>\n</urlset>\n`);
    await writeFile(join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
  }

  // Lista rzeczy do uzupełnienia: wszystko w [nawiasach] (strona ukrywa je, dopóki ich nie wpiszesz).
  const todo = [];
  const find = (v, path) => {
    if (typeof v === 'string') { if (/\[[^\]]*\]/.test(v)) todo.push(`${path}: ${v.length > 70 ? v.slice(0, 67) + '…' : v}`); }
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) find(x, `${path}.${k}`);
  };
  for (const k of ['shared', 'pl', 'en']) find(content[k], k);
  if (todo.length) {
    console.log(`\nDo uzupełnienia w content.js (${todo.length}) - na stronie na razie ukryte:`);
    for (const t of todo) console.log(`  · ${t}`);
  }
}
