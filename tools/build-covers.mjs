// Grafiki marek projektów na stronę (statyczne, zamiast placeholderów i zanim powstanie wideo):
//   npm run covers  →  assets/<id>/cover-4x5.webp (i cover-card.webp)
//                      dla projektów z polem `cover` w content.js (podgląd na stronie głównej + panel);
//                      przy `live` to pierwsza klatka grafiki interaktywnej (live.js, stan bez ruchu)
//                   →  assets/<id>/01.jpg, 02.jpg, 03.jpg - obrazy case study do PDF A4
//                      (01 zrzut desktop 16:10, 02 plansza marki 4:5, 03 zrzut telefonu 4:5)
// Plansze: tools/covers.mjs + covers.css - te same co w PDF 1080 × 1080. Potem: npm run images (warianty srcset).
import { chromium } from 'playwright';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { content } from '../content.js';
import { covers } from './covers.mjs';
import { liveMarkup } from '../live.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8095;
// Rozmiar pliku: podgląd 4:5 ma do ~610 px (2x), panel 16:9 do 1280 px, telefon 9:16 do ~680 px wysokości (3x).
const FORMATS = { card: [540, 675], '4x5': [1080, 1350] };   // card: karta na sferze (wersja lite), 4x5: panel projektu
const CASE_A = [1200, 1500];  // obraz „a” case study (4:5)

const page = (inner, [w, h]) => `<!doctype html><html><head><meta charset="utf-8">
<base href="http://localhost:${PORT}/"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="live.css"><link rel="stylesheet" href="tools/covers.css">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}
.box{position:relative;width:${w}px;height:${h}px;container-type:size;-webkit-font-smoothing:antialiased}</style>
</head><body><div class="box">${inner}</div></body></html>`;

const server = await serve(PORT);
const browser = await chromium.launch();

async function shoot(html, size) {
  const p = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  await p.route(`http://localhost:${PORT}/__cover.html`, r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await p.goto(`http://localhost:${PORT}/__cover.html`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const png = await p.screenshot();
  await p.close();
  return png;
}

for (const p of content.shared.projects) {
  const tp = content.pl.projects[p.id];
  if (!covers[p.id]) continue;
  const html = size => page(covers[p.id](p, tp), size);

  // Strona: plansze w trzech formatach (tylko projekty z polem cover - teraz ma planszę animowaną).
  // Projekt z grafiką interaktywną (live): cover = jej stan końcowy bez ruchu, ta sama kompozycja.
  if (p.cover) {
    for (const [fmt, size] of Object.entries(FORMATS)) {
      if (!p.cover[fmt]) continue;
      // live.js wskazuje zasoby od katalogu strony (import.meta.url = file:// w Node) - tu ten sam katalog przez serwer
      const coverHtml = p.live ? sz => page(liveMarkup(p, { static: true, lite: fmt === 'card' }).replaceAll(new URL('../', import.meta.url).href, `http://localhost:${PORT}/`), sz) : html;
      const out = join(root, p.cover[fmt]);
      await sharp(await shoot(coverHtml(size), size)).webp({ quality: 80, smartSubsample: true }).toFile(out);
      console.log(`✓ ${p.cover[fmt]}`);
    }
  }

  // PDF A4: obrazy case study z zrzutów (assets/deck/) i planszy
  if (p.deck) {
    const [main, a, b] = ['main', 'a', 'b'].map(k => join(root, p.images[k].src));
    if (!/\.jpe?g$/.test(main)) continue;
    await sharp(join(root, p.deck.desktop)).resize(1600, 1000, { fit: 'cover', position: 'top' }).jpeg({ quality: 86, mozjpeg: true }).toFile(main);
    await sharp(await shoot(html(CASE_A), CASE_A)).jpeg({ quality: 86, mozjpeg: true }).toFile(a);
    await sharp(join(root, p.deck.phone)).resize(480, 600, { fit: 'cover', position: 'top' }).jpeg({ quality: 86, mozjpeg: true }).toFile(b);
    console.log(`✓ ${p.images.main.src}, ${p.images.a.src}, ${p.images.b.src}`);
  }
}

await browser.close();
server.close();
