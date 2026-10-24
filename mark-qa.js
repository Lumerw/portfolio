// Kontrola jakości znaków (kod, nie AI) - te same miary dla laboratorium (bramki, tools/mark-lab.mjs) i dla strony
// (generator.js: „losuj” robi w tle ~30 kandydatów i pokazuje najlepszego). Mierzy to, co da się zmierzyć:
//   pole      - znak w polu 24..176, nie dotyka krawędzi, rozmiar 90-152 px (pole 200 × 200),
//   środek    - środek ciężkości tuszu blisko środka pola (optycznie wyśrodkowany),
//   drzazgi   - cienkie elementy i szczeliny (otwarcie morfologiczne promieniem 2 px), okruchy i dziurki < 0,25% pola,
//   32 px     - czy przy małym rozmiarze nie zlewają się szczeliny i nie znikają części (topologia 200 vs 32 px),
//   tusz      - proporcja figury do tła (12-55% pola).
// Powtarzalność (podobne znaki z różnych numerów) liczy laboratorium z odcisku 24 px (hash24).
// Czyste funkcje na tablicach krycia + rasteryzacja w przeglądarce (canvas). Bez zależności.

const F = 200;                                     // pole znaku (viewBox 0 0 200 200)

// SVG → maski krycia 200 × 200 i 32 × 32 (1 = tusz) oraz odcisk 24 × 24; tylko w przeglądarce
export async function rasterize(svg) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const grab = n => {
    const c = Object.assign(document.createElement('canvas'), { width: n, height: n });
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data, a = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) a[i] = d[i * 4 + 3] > 128 ? 1 : 0;
    return a;
  };
  return { a200: grab(F), a32: grab(32), h24: [...grab(24)].join('') };
}

// Spójne obszary (4-sąsiedztwo) wartości v; zwraca listę { size, edge } (edge = dotyka krawędzi obrazu)
function regions(a, n, v) {
  const seen = new Uint8Array(n * n), out = [], stack = [];
  for (let i = 0; i < n * n; i++) {
    if (seen[i] || a[i] !== v) continue;
    let size = 0, edge = false;
    seen[i] = 1; stack.push(i);
    while (stack.length) {
      const p = stack.pop(), x = p % n, y = (p - x) / n;
      size++;
      if (x === 0 || y === 0 || x === n - 1 || y === n - 1) edge = true;
      for (const q of [x > 0 ? p - 1 : -1, x < n - 1 ? p + 1 : -1, y > 0 ? p - n : -1, y < n - 1 ? p + n : -1]) {
        if (q >= 0 && !seen[q] && a[q] === v) { seen[q] = 1; stack.push(q); }
      }
    }
    out.push({ size, edge });
  }
  return out;
}

// Erozja / dylatacja kwadratem 3 × 3 (promień 1); otwarcie promieniem r = r × erozja, potem r × dylatacja
function morph(a, n, erode) {
  const o = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = erode ? 1 : 0;
    for (let dy = -1; dy <= 1 && (erode ? v : !v); dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      const p = X < 0 || Y < 0 || X >= n || Y >= n ? 0 : a[Y * n + X];
      if (erode && !p) { v = 0; break; }
      if (!erode && p) { v = 1; break; }
    }
    o[y * n + x] = v;
  }
  return o;
}
const open = (a, n, r) => { let b = a; for (let i = 0; i < r; i++) b = morph(b, n, true); for (let i = 0; i < r; i++) b = morph(b, n, false); return b; };

// Miary jednego znaku z masek
export function analyze({ a200, a32 }) {
  const n = F;
  let ink = 0, sx = 0, sy = 0, x0 = n, y0 = n, x1 = -1, y1 = -1, edge = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!a200[y * n + x]) continue;
    ink++; sx += x; sy += y;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (x === 0 || y === 0 || x === n - 1 || y === n - 1) edge++;
  }
  if (!ink) return { empty: true };
  const extent = Math.max(x1 - x0, y1 - y0) + 1;
  const cx = sx / ink, cy = sy / ink;
  // części (tusz) i dziury (tło zamknięte w tuszu) przy 200 i 32 px
  const parts = regions(a200, n, 1), holes = regions(a200, n, 0).filter(r => !r.edge);
  const parts32 = regions(a32, 32, 1).length, holes32 = regions(a32, 32, 0).filter(r => !r.edge).length;
  const tiny = 100;                                  // 0,25% pola: okruch / dziurka
  // drzazgi: tusz, który znika po otwarciu promieniem 2 (elementy węższe niż ~5 px);
  // szczeliny: tło wewnątrz obrysu, które znika po otwarciu tła promieniem 2 (przerwy węższe niż ~5 px)
  const opened = open(a200, n, 2);
  let thin = 0;
  for (let i = 0; i < n * n; i++) if (a200[i] && !opened[i]) thin++;
  const bg = a200.map(v => 1 - v), bgOpened = open(bg, n, 2);
  let hair = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * n + x; if (bg[i] && !bgOpened[i]) hair++; }
  return {
    ink: ink / (n * n),
    bbox: [x0, y0, x1, y1],
    extent,
    offset: Math.hypot(cx - 100, cy - 100) / extent,                  // przesunięcie środka ciężkości / rozmiar znaku
    edge,
    outside: x0 < 20 || y0 < 20 || x1 > 180 || y1 > 180,
    parts: parts.length, holes: holes.length,
    crumbs: parts.filter(r => r.size < tiny).length + holes.filter(r => r.size < tiny).length,
    thin: thin / ink,                                                   // udział cienkich elementów w tuszu
    hair: hair / ink,                                                   // włosowe szczeliny względem tuszu
    topo32: parts.length !== parts32 || holes.length !== holes32,      // przy 32 px zmienia się liczba części / dziur
  };
}

// Ocena 0-1 (1 = bez zastrzeżeń); kary rosną z odstępstwem od norm, każda ograniczona
export function score(m) {
  if (!m || m.empty) return 0;
  const pen = (v, lim, k) => Math.min(k, Math.max(0, v - lim) * k / lim);
  let p = 0;
  if (m.edge) p += .5;
  if (m.outside) p += .25;
  p += m.extent < 90 ? Math.min(.3, (90 - m.extent) / 90) : m.extent > 152 ? Math.min(.3, (m.extent - 152) / 48) : 0;
  p += pen(m.offset, .05, .25);                                       // środek ciężkości dalej niż 5% rozmiaru
  p += Math.min(.25, m.crumbs * .08);
  p += pen(m.thin, .04, .2);
  p += pen(m.hair, .03, .2);
  if (m.topo32) p += .12;
  p += m.ink < .12 ? Math.min(.2, (.12 - m.ink) * 2) : m.ink > .55 ? Math.min(.2, (m.ink - .55) * 2) : 0;
  return Math.max(0, 1 - p);
}
