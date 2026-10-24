// Generator znaków (panel #brandbook, otwierają go znaki obok awatara) - jak blobmaker.app, ale z moich sygnetów:
// losuje sygnet (shared.generator.bases), wyciąga z niego kontury i składa nowy znak. Dwa suwaki:
//   złożoność - z ilu punktów składa się znak (mało = abstrakcyjny, dużo = blisko oryginału),
//   styl      - od kwadratowego (punkty na siatce, krawędzie poziomo / pionowo) przez ostre kąty do obłego (krzywe).
// Kolor dowolny, „losuj” = inny sygnet i drobne przesunięcie punktów, wynik do pobrania jako SVG albo do skopiowania.
// Kontury: sygnet rysowany na kanwie G × G, piksele „tuszu” (kryjące i nie białe - białe kreski w znaku to dziury),
// marching squares → pętle (zewnętrzne i dziury, wypełnienie evenodd) → wygładzenie (Chaikin) → próbkowanie po długości.
// main.js ładuje moduł przy pierwszym otwarciu panelu. Teksty: pl/en.brandbook.gen w content.js.

const G = 200;                       // rozdzielczość konturu = viewBox wyniku
const PAD = 22;                      // margines znaku w polu

const loadImg = src => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = rej;
  img.src = src;
});

// Sylwetka sygnetu: maska G × G (1 = tusz)
async function mask(src) {
  const img = await loadImg(src);
  const w = img.naturalWidth || 100, h = img.naturalHeight || 100;
  const k = (G - 2 * PAD) / Math.max(w, h);
  const cv = Object.assign(document.createElement('canvas'), { width: G, height: G });
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, (G - w * k) / 2, (G - h * k) / 2, w * k, h * k);
  const { data } = cx.getImageData(0, 0, G, G);
  const m = new Uint8Array(G * G);
  for (let i = 0; i < G * G; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    m[i] = a > 128 && (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.92 ? 1 : 0;
  }
  return m;
}

// Marching squares: odcinki na krawędziach komórek → zamknięte pętle
function contours(m) {
  const at = (x, y) => (x < 0 || y < 0 || x >= G || y >= G ? 0 : m[y * G + x]);
  const segs = [];
  // punkty na środkach krawędzi komórki (x, y) = rogi pikseli (x-1..x, y-1..y)
  for (let y = 0; y <= G; y++) {
    for (let x = 0; x <= G; x++) {
      const tl = at(x - 1, y - 1), tr = at(x, y - 1), br = at(x, y), bl = at(x - 1, y);
      const c = tl * 8 + tr * 4 + br * 2 + bl;
      if (c === 0 || c === 15) continue;
      const T = [x, y - .5], R = [x + .5, y], B = [x, y + .5], L = [x - .5, y];
      const add = (a, b) => segs.push([a, b]);
      switch (c) {
        case 1: case 14: add(L, B); break;
        case 2: case 13: add(B, R); break;
        case 3: case 12: add(L, R); break;
        case 4: case 11: add(T, R); break;
        case 6: case 9: add(T, B); break;
        case 7: case 8: add(L, T); break;
        case 5: add(L, T); add(B, R); break;
        case 10: add(T, R); add(L, B); break;
      }
    }
  }
  const key = p => `${p[0]},${p[1]}`;
  const ends = new Map();
  segs.forEach((s, i) => { for (const p of s) { const k = key(p); (ends.get(k) ?? ends.set(k, []).get(k)).push(i); } });
  const used = new Uint8Array(segs.length);
  const loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const loop = [segs[i][0], segs[i][1]];
    for (;;) {
      const last = loop[loop.length - 1];
      const next = (ends.get(key(last)) ?? []).find(j => !used[j]);
      if (next == null) break;
      used[next] = 1;
      const [a, b] = segs[next];
      loop.push(key(a) === key(last) ? b : a);
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

const area = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const perimeter = pts => pts.reduce((s, p, i) => s + Math.hypot(...[0, 1].map(k => pts[(i + 1) % pts.length][k] - p[k])), 0);
// Chaikin: zjada schodki pikseli, kształt zostaje
const chaikin = pts => pts.flatMap((p, i) => {
  const q = pts[(i + 1) % pts.length];
  return [[p[0] * .75 + q[0] * .25, p[1] * .75 + q[1] * .25], [p[0] * .25 + q[0] * .75, p[1] * .25 + q[1] * .75]];
});
// n punktów równo po długości pętli
function resample(pts, n) {
  const L = perimeter(pts), step = L / n, out = [];
  let i = 0, t = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const want = k * step;
    for (;;) {
      const p = pts[i % pts.length], q = pts[(i + 1) % pts.length], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (acc + d >= want || i > pts.length * 2) { t = d ? (want - acc) / d : 0; out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); break; }
      acc += d; i++;
    }
  }
  return out;
}

// Pseudolosowość z ziarnem (ten sam znak dla tych samych ustawień)
const rand = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const f = v => +v.toFixed(1);

// Znak: pętle bazy → ścieżka SVG wg złożoności (0-1) i stylu (0 kwadratowy - .5 ostry - 1 obły)
function build(loops, complexity, style, seed) {
  const total = loops.reduce((s, l) => s + perimeter(l), 0);
  const budget = Math.round(8 + Math.pow(complexity, 1.5) * 150);
  const r = rand(seed);
  const jitter = 1.6 * (1 - .75 * complexity);          // drobne przesunięcie punktów (px pola 200); przy dużej złożoności mniej
  const square = Math.max(0, (.5 - style) * 2);         // 0-1: siła „kwadratowości”
  const round = Math.max(0, (style - .5) * 2);          // 0-1: siła krzywych
  const grid = 2 + square * 14;                         // krok siatki przy stylu kwadratowym
  const parts = [];
  for (const loop of loops) {
    const n = Math.max(3, Math.round(budget * perimeter(loop) / total));
    let pts = resample(loop, n).map(([x, y]) => [x + (r() - .5) * jitter, y + (r() - .5) * jitter]);
    if (square > 0) {
      pts = pts.map(([x, y]) => [Math.round(x / grid) * grid, Math.round(y / grid) * grid])
        .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
      if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
      if (square > .55) {                                // krawędzie tylko poziomo i pionowo
        pts = pts.flatMap((p, i) => { const q = pts[(i + 1) % pts.length]; return p[0] !== q[0] && p[1] !== q[1] ? [p, [q[0], p[1]]] : [p]; });
      }
      if (pts.length < 3 || Math.abs(area(pts)) < grid * grid) continue;
    }
    if (round > 0) {
      // Catmull-Rom → Bézier; uchwyty rosną z „obłością”
      const k = round / 6 * 1.15;
      const d = pts.map((p, i) => {
        const p0 = pts[(i - 1 + pts.length) % pts.length], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
        const c1 = [p[0] + (p2[0] - p0[0]) * k, p[1] + (p2[1] - p0[1]) * k];
        const c2 = [p2[0] - (p3[0] - p[0]) * k, p2[1] - (p3[1] - p[1]) * k];
        return `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
      }).join('');
      parts.push(`M${f(pts[0][0])} ${f(pts[0][1])}${d}Z`);
    } else {
      parts.push(`M${pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L')}Z`);
    }
  }
  return parts.join('');
}

export function initGenerator(root, { bases, copy }) {
  const stage = root.querySelector('[data-gen-stage]');
  const $ = s => root.querySelector(`[data-gen="${s}"]`);
  const color = $('color'), hex = $('hex'), complexity = $('complexity'), style = $('style'), info = $('info');
  const cache = new Map();
  let base = -1, seed = 1, loops = [];

  const svg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G} ${G}" width="${G * 2}" height="${G * 2}"><path fill="${color.value}" fill-rule="evenodd" d="${build(loops, complexity.value / 100, style.value / 100, seed)}"/></svg>`;
  const draw = () => { if (loops.length) stage.innerHTML = svg(); };

  async function roll() {
    let next = Math.floor(Math.random() * bases.length);
    if (bases.length > 1 && next === base) next = (next + 1) % bases.length;
    base = next;
    seed = 1 + Math.floor(Math.random() * 1e6);
    if (!cache.has(base)) cache.set(base, contours(await mask(bases[base])).map(l => chaikin(chaikin(chaikin(l)))).filter(l => Math.abs(area(l)) > 40));
    loops = cache.get(base);
    info.textContent = `${copy.base} ${String(base + 1).padStart(2, '0')} / ${String(bases.length).padStart(2, '0')}`;
    draw();
  }

  const setColor = v => {
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    color.value = v.toLowerCase();
    hex.value = v.toUpperCase();
    root.style.setProperty('--gen-c', v);
    draw();
  };
  color.addEventListener('input', () => setColor(color.value));
  hex.addEventListener('change', () => setColor(hex.value.startsWith('#') ? hex.value : `#${hex.value}`));
  complexity.addEventListener('input', draw);
  style.addEventListener('input', draw);
  $('roll').addEventListener('click', roll);
  $('download').addEventListener('click', () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([svg()], { type: 'image/svg+xml' })), download: 'znak-lumerw.svg' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const code = $('code');
  code.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(svg()); } catch { return; }
    const was = code.getAttribute('aria-label');
    code.setAttribute('aria-label', copy.copied);
    code.dataset.done = '';
    info.textContent = copy.copied;
    setTimeout(() => { code.setAttribute('aria-label', was); delete code.dataset.done; }, 1600);
  });
  roll();
}
