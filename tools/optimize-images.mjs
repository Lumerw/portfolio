// Obrazy do srcset: AVIF + WebP + JPG w szerokościach z content.js (shared.imageWidths).
//   npm run images
// Bierze każdy obraz .jpg/.png wpisany w content.js i zapisuje obok warianty:
//   assets/teraz/01.jpg → 01-640.avif, 01-640.webp, 01-640.jpg, 01-1280.avif …
// Obrazy z `duotone: true` (portret) są najpierw zamieniane na tusz + papier —
// gotowy plik wygląda tak samo na stronie i w PDF, bez filtrów CSS.

import sharp from 'sharp';
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shared } from '../content.js';
import { variantWidths } from '../render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INK = [0x11, 0x11, 0x11];
const PAPER = [0xFA, 0xFA, 0xF7];

// Skala szarości → interpolacja między tuszem a papierem.
export async function duotone(input) {
  const { data, info } = await sharp(input).rotate().greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 255;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(INK[c] + (PAPER[c] - INK[c]) * v);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } });
}

async function optimize(img, label) {
  if (!/\.(jpe?g|png)$/i.test(img.src)) return;
  const src = join(root, img.src);
  try { await access(src); } catch { return console.warn(`⚠ brak pliku: ${img.src}`); }

  const meta = await sharp(src).metadata();
  const [mw, mh] = meta.orientation >= 5 ? [meta.height, meta.width] : [meta.width, meta.height]; // zdjęcie obrócone w EXIF
  const ratio = (mw / mh).toFixed(3), want = (img.w / img.h).toFixed(3);
  if (ratio !== want) console.warn(`⚠ ${img.src}: proporcja ${mw}×${mh} ≠ ${img.w}×${img.h} w content.js — kadruję do content.js`);

  const base = src.replace(/\.\w+$/, '');
  for (const w of variantWidths(img, shared.imageWidths)) {
    const h = Math.round(w * img.h / img.w);
    const pipe = (img.duotone ? await duotone(src) : sharp(src).rotate())
      .resize(w, h, { fit: 'cover', position: 'attention' });
    await Promise.all([
      pipe.clone().avif({ quality: 55, effort: 6 }).toFile(`${base}-${w}.avif`),
      pipe.clone().webp({ quality: 75 }).toFile(`${base}-${w}.webp`),
      pipe.clone().jpeg({ quality: 78, mozjpeg: true, progressive: true }).toFile(`${base}-${w}.jpg`),
    ]);
  }
  console.log(`✓ ${label}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = [[shared.portrait, 'portret']];
  for (const p of shared.projects) for (const [k, img] of Object.entries(p.images)) jobs.push([img, `${p.title} · ${k}`]);
  for (const [img, label] of jobs) await optimize(img, label);
}
