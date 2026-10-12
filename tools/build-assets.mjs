// Generuje z symbols.js:
//  - assets/symbols/*.svg      — samodzielne pliki symboli
//  - assets/<projekt>/*.svg    — wektorowe placeholdery obrazów w docelowych proporcjach
// Placeholdery zastępujesz prawdziwymi obrazami i zmieniasz ścieżki w content.js.
// Istniejących plików .jpg/.webp/.avif skrypt nie dotyka.

import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { symbolInner, SYMBOL_NAMES } from '../symbols.js';
import { shared } from '../content.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAPER = '#FAFAF7', INK = '#111111', HAIR = 'rgba(17,17,17,.14)', HANKO = '#111111';

const symbolFile = name => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="${INK}" stroke-width="1">
<style>.hanko{fill:${HANKO};stroke:none}</style>
${symbolInner(name)}
</svg>
`;

// Symbol wyśrodkowany na papierze, włosowa ramka. Kreska 1 px niezależnie od skali obrazu
// (tu non-scaling-stroke jest bezpieczny, bo placeholder się nie animuje).
function placeholder(name, w, h, { frame = true } = {}) {
  const size = Math.min(w, h) * 0.2;
  const s = size / 48;
  const x = (w - size) / 2, y = (h - size) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect width="${w}" height="${h}" fill="${PAPER}"/>
${frame ? `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${HAIR}" vector-effect="non-scaling-stroke"/>` : ''}
<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${INK}" stroke-width="1">
<style>path,circle,rect{vector-effect:non-scaling-stroke}.hanko{fill:${HANKO};stroke:none}</style>
${symbolInner(name)}
</g>
</svg>
`;
}

async function out(path, data) {
  const file = join(root, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
  console.log('  ', path);
}

for (const name of SYMBOL_NAMES) await out(`assets/symbols/${name}.svg`, symbolFile(name));

const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';

// Logo-placeholder: symbol + nazwa projektu (na środku podglądu).
const logoFile = (name, title, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<g transform="translate(0 ${(h - 96) / 2}) scale(2)" fill="none" stroke="${INK}" stroke-width=".75">
<style>.hanko{fill:${HANKO};stroke:none}</style>
${symbolInner(name)}
</g>
<text x="124" y="${h / 2 + 18}" font-family="${FONT}" font-size="52" font-weight="500" letter-spacing="-1" fill="${INK}">${title}</text>
</svg>
`;

// Sygnet-placeholder: sam symbol, kwadrat.
const sygnetFile = name => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="${INK}" stroke-width="2">
<style>.hanko{fill:${HANKO};stroke:none}</style>
${symbolInner(name === 'loom' ? 'loom-small' : name)}
</svg>
`;

// Logo firmy-placeholder: nazwa w ramce.
const clientFile = (label, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${HAIR}"/>
<text x="${w / 2}" y="${h / 2 + 6}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="#6E6E6A">${label}</text>
</svg>
`;

// Ikony-placeholdery: proste figury kreską 1 px.
const ICONS = [
  '<path d="M24 8L40 38H8Z"/>',
  '<path d="M8 32a16 16 0 0 1 32 0Z"/>',
  '<path d="M10 38L38 10M10 10h28v28"/>',
  '<circle cx="18" cy="24" r="10"/><circle cx="30" cy="24" r="10"/>',
  '<path d="M24 6L42 24L24 42L6 24Z"/>',
  '<path d="M8 16h32M8 24h32M8 32h32"/>',
];
const iconFile = d => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="${INK}" stroke-width="1.5">${d}</svg>
`;

for (const p of shared.projects) {
  for (const img of Object.values(p.images)) {
    if (!img.src.endsWith('.svg')) continue;
    // Placeholder w mniejszej skali tej samej proporcji — lżejszy plik.
    await out(img.src, placeholder(p.symbol, img.w / 2, img.h / 2));
  }
  for (const v of Object.values(p.video)) {
    // Plakaty obu formatów panelu: video-16x9.svg i video-4x5.svg (połowa wymiarów z content.js).
    // Bez ramki: ramkę rysuje CSS na figurze.
    if (v.poster.endsWith('.svg')) await out(v.poster, placeholder(p.symbol, v.w / 2, v.h / 2, { frame: false }));
  }
  // Prawdziwe assety marki (mono: false) zostają nietknięte — placeholdery tylko dla reszty.
  if (p.logo.mono !== false && p.logo.src.endsWith('.svg')) await out(p.logo.src, logoFile(p.symbol, p.title, p.logo.w, p.logo.h));
  if (p.sygnet.mono !== false && p.sygnet.src.endsWith('.svg')) await out(p.sygnet.src, sygnetFile(p.symbol));
}

for (const [i, src] of shared.icons.entries()) {
  if (src.endsWith('.svg')) await out(src, iconFile(ICONS[i % ICONS.length]));
}

for (const c of shared.clients) {
  if (c.logo.endsWith('.svg')) await out(c.logo, clientFile(c.name, c.w, c.h));
}

if (shared.portrait.src.endsWith('.svg')) {
  await out(shared.portrait.src, placeholder('personal', 600, 750));
}

// Favicony ze znaku osobistego. Grubsza kreska niż w symbolu, bo 16–32 px.
const favicon = (bg, pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${48 + 2 * pad} ${48 + 2 * pad}" width="48" height="48">
${bg ? `<rect x="${-pad}" y="${-pad}" width="${48 + 2 * pad}" height="${48 + 2 * pad}" fill="${PAPER}"/>` : ''}
<circle cx="24" cy="24" r="19" fill="none" stroke="${INK}" stroke-width="3.5"/>
<circle cx="24" cy="24" r="5.5" fill="${HANKO}"/>
</svg>
`;
await out('assets/favicon.svg', favicon(false, 0));
await sharp(Buffer.from(favicon(true, 2))).resize(32, 32).png().toFile(join(root, 'assets/favicon-32.png'));
await sharp(Buffer.from(favicon(true, 14))).resize(180, 180).png().toFile(join(root, 'assets/apple-touch-icon.png'));
console.log('   assets/favicon-32.png, assets/apple-touch-icon.png');
