// Testy kontrast checkera (contrast-core.js) na syntetycznych obrazach: wzór WCAG, kontrast w najsłabszym miejscu,
// poświata vs cień pod literami, poprawka do progu AA/AAA (tekst, tło, auto), wykrywanie wierszy tekstu.
import { analyze, fix, detect, ratio, luminance } from '../contrast-core.js';

const results = [];
const check = (name, ok, note = '') => results.push({ name, ok, note });

// Obraz: tło (funkcja x,y → rgb), „litery” = pionowe kreski w pasie, opcjonalnie pierścień wokół nich (cień/poświata)
function image({ w = 400, h = 120, bg, ink, ring = null, ringW = 3 }) {
  const data = new Uint8ClampedArray(w * h * 4);
  const isInk = (x, y) => y >= 40 && y < 80 && x >= 40 && x < 360 && (x % 14) < 5;
  const nearInk = (x, y) => { for (let d = -ringW; d <= ringW; d++) for (let e = -ringW; e <= ringW; e++) if (isInk(x + d, y + e)) return true; return false; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = isInk(x, y) ? ink : ring && nearInk(x, y) ? ring : bg(x, y);
    data.set([...c, 255], (y * w + x) * 4);
  }
  return { data, width: w, height: h };
}
const box = { x: 20, y: 20, w: 360, h: 80 };

check('Wzór WCAG: czerń na bieli 21:1, #777 na bieli ~4.48:1',
  Math.abs(ratio(luminance(0, 0, 0), luminance(255, 255, 255)) - 21) < 0.01 && Math.abs(ratio(luminance(119, 119, 119), 1) - 4.48) < 0.02);

const good = analyze(image({ bg: () => [20, 20, 20], ink: [250, 250, 250] }), box);
check('Biały tekst na czerni: spełnia AA, tekst jasny', good.pass && good.lightText && good.worst > 15, JSON.stringify(good));

const grey = analyze(image({ bg: () => [150, 150, 150], ink: [235, 235, 235] }), box);
check('Jasnoszary tekst na szarym: nie spełnia AA, problem „low”', !grey.pass && grey.issues.includes('low'), `${grey.worst}`);

const busy = analyze(image({ bg: x => (x > 200 ? [215, 215, 215] : [30, 30, 30]), ink: [255, 255, 255] }), box);
check('Tło jasne w połowie: problem „busy”, nie spełnia AA', busy.issues.includes('busy') && !busy.pass, JSON.stringify(busy.issues));

const halo = analyze(image({ bg: () => [40, 40, 40], ink: [250, 250, 250], ring: [200, 200, 200] }), box);
check('Jasna poświata pod białym tekstem → „halo”, słaby kontrast krawędzi', halo.issues.includes('halo') && halo.edge < halo.typical, JSON.stringify(halo.issues) + ' ' + halo.edge);

const shadow = analyze(image({ bg: () => [150, 150, 150], ink: [255, 255, 255], ring: [10, 10, 10] }), box);
check('Ciemny cień pod białym tekstem → „shadowOk”', shadow.issues.includes('shadowOk'), JSON.stringify(shadow.issues));

for (const mode of ['auto', 'text', 'bg']) {
  const img = image({ bg: () => [120, 140, 160], ink: [220, 225, 230] });
  const r = fix(img, box, { mode, level: 'AA' });
  check(`Poprawka „${mode}”: po zmianie spełnia AA`, !r.before.pass && r.after.pass, `${r.before.score} → ${r.after.score} ${JSON.stringify(r.changes)}`);
}
const dark = fix(image({ bg: () => [170, 170, 170], ink: [90, 90, 90] }), box, { level: 'AAA' });
check('Ciemny tekst na jasnym, AAA: po poprawce ≥ 7:1 (lub 4.5 dla dużego)', dark.after.pass && !dark.before.lightText, `${dark.before.score} → ${dark.after.score}`);
const outside = fix(image({ bg: () => [120, 140, 160], ink: [220, 225, 230] }), { x: 100, y: 30, w: 120, h: 60 });
check('Poprawka nie rusza pikseli daleko od zaznaczenia', outside.data[(5 * 400 + 5) * 4] === 120);

const rows = image({ w: 600, h: 300, bg: () => [240, 240, 240], ink: [20, 20, 20] });
const found = detect(rows);
check('Wykrywanie: wiersz tekstu znaleziony w okolicy liter', found.length >= 1 && found.some(b => b.x < 60 && b.x + b.w > 340 && b.y < 45 && b.y + b.h > 75), JSON.stringify(found));
check('Wykrywanie: pusty obraz → brak obszarów', detect(image({ bg: () => [128, 128, 128], ink: [128, 128, 128] })).length === 0);

// Napis na przycisku (zamknięty kształt w jednym kolorze): poprawka zmienia cały przycisk równo
{
  const w = 400, h = 140, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const btn = x >= 60 && x < 340 && y >= 35 && y < 105, ink = btn && y >= 60 && y < 80 && x >= 90 && x < 310 && (x % 9) < 2;
    data.set([...(ink ? [255, 255, 255] : btn ? [120, 200, 140] : [250, 248, 244]), 255], (y * w + x) * 4);
  }
  const r = fix({ data, width: w, height: h }, { x: 45, y: 25, w: 310, h: 90 });
  const px = (x, y) => [...r.data.subarray((y * w + x) * 4, (y * w + x) * 4 + 3)].join();
  check('Przycisk: równo przyciemniony cały kształt, strona bez zmian, spełnia AA',
    r.after.pass && !!r.changes.bg?.plate && px(65, 40) === px(335, 100) && px(65, 40) !== '120,200,140' && px(20, 10) === '250,248,244', `${r.before.score} → ${r.after.score} ${JSON.stringify(r.changes)} ${px(65, 40)} ${px(335, 100)}`);
}

for (const x of results) console.log(`${x.ok ? '✓' : '✗'} ${x.name}${x.note && !x.ok ? ` - ${x.note}` : ''}`);
const failed = results.filter(x => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} ok`);
process.exit(failed ? 1 : 0);
