// Synchronizacja assetów marki ze stron projektów → portfolio.
//   npm run sync-brands
// Uruchamiana też codziennie przez GitHub Actions (.github/workflows/sync-brands.yml).
//
// Projekt w content.js z polem `sync: 'https://teraz.eu'` jest pobierany tak:
//   1. {url}/brand.json — stały plik marki (zalecany), np.:
//        { "logo": "/brand/logo-white.svg", "sygnet": "/brand/sygnet.svg",
//          "bg": "#000000", "aurora": ["#1D3E93F2", "#146EF480", "#0A1A3FF2", "#FC8AD31F"], "speed": "26s" }
//   2. gdy brand.json nie istnieje — sygnet z <link rel="icon" type="image/svg+xml"> strony.
// Pliki zapisywane są lokalnie (assets/<id>/…), więc odwiedzający nie łączą się ze stronami projektów.
// Wynik: brands.generated.js (nadpisuje wartości z content.js). Gdy pobranie się nie uda — zostaje ostatnia dobra wersja.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'brands.generated.js');
const MAX_SVG = 200 * 1024;
const COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SPEED = /^\d{1,3}(?:\.\d+)?m?s$/;

async function get(url, type = 'text') {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'portfolio-brand-sync' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return type === 'json' ? res.json() : res.text();
}

// Assety z zewnątrz trafiają na publiczną stronę — tylko czyste SVG.
export function safeSvg(svg, url) {
  const s = svg.trim();
  if (s.length > MAX_SVG) throw new Error(`za duży plik: ${url}`);
  if (!/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(s)) throw new Error(`to nie jest SVG: ${url}`);
  if (/<script|<foreignObject|<!ENTITY|\son\w+\s*=|javascript:|(?:xlink:)?href\s*=\s*["'](?!#)/i.test(s)) {
    throw new Error(`SVG ze skryptem lub zewnętrznym odnośnikiem — pomijam: ${url}`);
  }
  return s + (s.endsWith('\n') ? '' : '\n');
}

function svgSize(svg) {
  const vb = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  return vb ? { w: Math.round(+vb[1]), h: Math.round(+vb[2]) } : null;
}

const abs = (base, path) => new URL(path, base).href;

export async function syncProject(p) {
  const base = p.sync.endsWith('/') ? p.sync : `${p.sync}/`;
  const result = {};
  const files = [];

  let manifest = null;
  try { manifest = await get(abs(base, 'brand.json'), 'json'); } catch { /* brak brand.json — tryb awaryjny */ }

  if (manifest) {
    if (manifest.logo) {
      const svg = safeSvg(await get(abs(base, manifest.logo)), manifest.logo);
      const size = svgSize(svg);
      const src = `assets/${p.id}/logo-sync.svg`;
      files.push([src, svg]);
      result.logo = { src, ...(size || { w: p.logo.w, h: p.logo.h }), mono: false };
    }
    if (manifest.sygnet) {
      const src = `assets/${p.id}/sygnet-sync.svg`;
      files.push([src, safeSvg(await get(abs(base, manifest.sygnet)), manifest.sygnet)]);
      result.sygnet = { src, mono: false };
    }
    const brand = {};
    if (COLOR.test(manifest.bg || '')) brand.bg = manifest.bg;
    if (Array.isArray(manifest.aurora)) {
      const aurora = manifest.aurora.filter(c => COLOR.test(c)).slice(0, 4);
      if (aurora.length) brand.aurora = aurora;
    }
    if (SPEED.test(manifest.speed || '')) brand.speed = manifest.speed;
    if (Object.keys(brand).length) result.brand = brand;
  } else {
    // Tryb awaryjny: sygnet z favicony SVG strony.
    const html = await get(base);
    const link = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*type=["']image\/svg\+xml["'][^>]*>|<link[^>]+type=["']image\/svg\+xml["'][^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/i);
    const href = link && link[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (href) {
      const src = `assets/${p.id}/sygnet-sync.svg`;
      files.push([src, safeSvg(await get(abs(base, href)), href)]);
      result.sygnet = { src, mono: false };
    }
  }

  return { result, files, source: manifest ? 'brand.json' : 'favicon' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

async function main() {
const { shared } = await import(`../content.js?t=${Date.now()}`);
let previous = {};
try { previous = (await import(`../brands.generated.js?t=${Date.now()}`)).synced; } catch { /* pierwszy raz */ }

const synced = { ...previous };
const written = [];
for (const p of shared.projects.filter(p => p.sync)) {
  try {
    const { result, files, source } = await syncProject(p);
    for (const [path, data] of files) {
      const file = join(root, path);
      const old = await readFile(file, 'utf8').catch(() => null);
      if (old !== data) { await writeFile(file, data); written.push(path); }
    }
    synced[p.id] = result;
    console.log(`✓ ${p.title}: ${source} — ${Object.keys(result).join(', ') || 'nic do pobrania'}`);
  } catch (err) {
    // Strona niedostępna albo zły plik — zostaje ostatnia dobra wersja.
    console.warn(`⚠ ${p.title}: ${err.message} — zostawiam poprzednią wersję`);
  }
}

const code = `// Wygenerowane przez tools/sync-brands.mjs — nie edytuj ręcznie.
// Assety marki pobrane ze stron projektów (pole \`sync\` w content.js); nadpisują wartości z content.js.
export const synced = ${JSON.stringify(synced, null, 2)};
`;
const oldCode = await readFile(OUT, 'utf8').catch(() => null);
if (oldCode !== code) { await writeFile(OUT, code); written.push('brands.generated.js'); }
console.log(written.length ? `zmienione: ${written.join(', ')}` : 'bez zmian');
}
