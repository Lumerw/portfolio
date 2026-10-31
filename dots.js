// Kropki jak alfabet Braille'a (shared.effects.dots w content.js - false = poprzednia wersja strony).
//   pulse - pole komórek 2 × 3 spod awatara w prawo: kropki zapalają się i gasną falą, która wychodzi od awatara
//           (jak puls), z lekkim szumem na każdą kropkę, więc wzór nigdy się nie powtarza. W środku pola te same
//           kropki (ten sam rozmiar i odstępy) tworzą logo Figmy jak hologram: puls przez nie przepływa, ale w obrysie
//           logo kropki zapalają się w jego kolorach z przesuwającym się połyskiem - logo stoi, kropki żyją.
//   figma - duże logo Figmy z kropek na planszy pluginu w panelu Narzędzia: stoi, kropki lekko migoczą.
//   band  - pasek nad czarnym kontaktem (telefon, tablet): ten sam puls na całą szerokość, wygasa w górę.
// Siatka: w poziomie pary kolumn (jak komórki Braille'a), w pionie rzędy co 6 px bez przerw.
// Rysuje na <canvas> (ostro na ekranach retina), stoi, gdy element jest poza ekranem albo otwarty jest panel.
// Bez ruchu w systemie (prefers-reduced-motion) - jedna nieruchoma klatka.

const TAU = Math.PI * 2;
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

function setup(canvas) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: width, h: height };
}
const dot = (ctx, x, y, r) => { if (r > 0.15) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); } };

// Logo Figmy z kropek: pięć kształtów w siatce 2 × 3 jednostek (koła i półpigułki), każda kropka w kolorze
// swojego kształtu. u - jednostka, s - odstęp kropek, (ox, oy) - lewy górny róg logo.
const FIGMA = ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE', '#0ACF83'];
function figmaShape(x, y) {        // x, y w jednostkach logo (0-2, 0-3) → indeks koloru albo -1
  const inC = (cx, cy) => (x - cx) ** 2 + (y - cy) ** 2 <= 0.25;
  if (y < 1) return x < 1 ? (x >= 0.5 || inC(0.5, 0.5) ? 0 : -1) : (x < 1.5 || inC(1.5, 0.5) ? 1 : -1);
  if (y < 2) return x < 1 ? (x >= 0.5 || inC(0.5, 1.5) ? 2 : -1) : (inC(1.5, 1.5) ? 3 : -1);
  return x < 1 && ((x >= 0.5 && y < 2.5) || inC(0.5, 2.5)) ? 4 : -1;
}
// k kropek na jednostkę logo, próbkowane w środkach komórek siatki - koła wychodzą okrągłe, kształty równe
function figmaDots(ox, oy, u, k) {
  const out = [], s = u / k;
  for (let i = 0; i < 2 * k; i++) for (let j = 0; j < 3 * k; j++) {
    const x = (i + 0.5) * s, y = (j + 0.5) * s, c = figmaShape(x / u, y / u);
    if (c >= 0) out.push({ x: ox + x, y: oy + y, c, n: hash(ox + x, oy + y), v: 0, d: Math.hypot(x / u - 1, y / u - 1.5) / 1.8 });
  }
  return out;
}
// pokrycie kształtem Figmy kwadratu (x0..x1, y0..y1) w jednostkach logo - próbkowanie 6 × 6, do rozmiaru kropki
function figmaCover(x0, y0, x1, y1) {
  const hits = new Map();
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
    const c = figmaShape(x0 + (x1 - x0) * (a + 0.5) / 6, y0 + (y1 - y0) * (b + 0.5) / 6);
    if (c >= 0) hits.set(c, (hits.get(c) ?? 0) + 1);
  }
  const [c, n] = [...hits].sort((p, q) => q[1] - p[1])[0] ?? [-1, 0];
  return { c, cov: n / 36 };
}

// Pole przy awatarze: komórki Braille'a (2 kolumny × 3 rzędy), dwa rzędy komórek.
function pulse(canvas) {
  const STEP = 6, R = 1.6, CELL = 2 * STEP + 6, LOGO_COL = 3;   // logo w 4. i 5. kolumnie komórek - tuż za awatarem
  let g, dots = [];
  const layout = () => {
    g = setup(canvas);
    dots = [];
    // rzędy co STEP bez przerw (szpara między rzędami komórek wypełniona kolejnym rzędem), w poziomie pary kolumn
    const cells = Math.floor((g.h + 8) / (3 * STEP + 8)), rows = cells * 4 - 1;
    const top = (g.h - (rows - 1) * STEP) / 2;
    for (let cx = 0; cx * CELL < g.w; cx++) for (let j = 0; j < rows; j++) for (let i = 0; i < 2; i++) {
      const x = R + 1 + cx * CELL + i * STEP, y = top + j * STEP;
      const d = { x, y, n: hash(x, y), v: 0, c: -1 };
      // logo na tej samej siatce: 2 pary kolumn szerokości × wszystkie rzędy (2 × 3 jednostki logo), każda kropka
      // dostaje kolor kształtu, który pokrywa jej pole, i rozmiar wg pokrycia (zaokrąglenia kół i pigułek)
      if (cx >= LOGO_COL && cx < LOGO_COL + 2) {
        const col = (cx - LOGO_COL) * 2 + i, row = j, cols = 4, rws = rows;
        const f = figmaCover((col / cols) * 2, (row / rws) * 3, ((col + 1) / cols) * 2, ((row + 1) / rws) * 3);
        if (f.cov >= 0.2) { d.c = f.c; d.cov = 0.45 + 0.55 * f.cov; }
      }
      dots.push(d);
    }
  };
  const draw = (t, still) => {
    const { ctx, w, h } = g;
    ctx.clearRect(0, 0, w, h);
    const lit = [];
    ctx.fillStyle = getComputedStyle(canvas).color;
    ctx.beginPath();
    for (const d of dots) {
      // fala od awatara (lewa krawędź, środek wysokości) co ~2,4 s + własny, wolny rytm kropki
      const dist = Math.hypot(d.x, d.y - h / 2);             // środek awatara = lewa krawędź pola
      const wave = Math.sin(t / 380 - dist / 9);
      const own = Math.sin(t / (900 + d.n * 1400) + d.n * TAU);
      const near = 1 - Math.min(1, (d.x) / g.w);              // gęściej przy awatarze
      // w logo kropki palą się częściej (kształt stoi), ale puls dalej przez nie przechodzi
      const on = wave * 0.8 + own * 0.45 + (d.n - 0.5) * 0.5 + near * 0.35 + (d.c >= 0 ? 0.75 : 0) > 0.2 ? 1 : 0;
      d.v = still ? on : d.v + (on - d.v) * 0.18;      // miękkie zapalanie i gaszenie
      if (d.c >= 0) lit.push(d); else dot(ctx, d.x, d.y, R * d.v);
    }
    ctx.fill();
    // hologram: kolor Figmy z połyskiem, który przesuwa się po logo z góry na dół, i lekkim migotaniem kropek
    for (const d of lit) {
      if (d.v < 0.05) continue;
      const scan = 0.5 + 0.5 * Math.sin(t / 520 - d.y / 7), flick = 0.85 + 0.15 * Math.sin(t / (160 + d.n * 240) + d.n * TAU);
      ctx.globalAlpha = still ? 1 : (0.7 + 0.3 * scan) * flick;
      ctx.fillStyle = FIGMA[d.c];
      ctx.beginPath(); dot(ctx, d.x, d.y, R * d.v * d.cov * (still ? 1 : 0.9 + 0.2 * scan)); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  return { layout, draw };
}

// Pasek nad czarnym kontaktem (telefon, tablet): te same komórki Braille'a co przy awatarze, na całą szerokość.
// Organicznie jak przy awatarze, ale z kilku miejsc naraz: po pasku powoli wędrują źródła pulsu (każde we własnym
// tempie i fazie), ich fale się nakładają, do tego wolny rytm każdej kropki - wzór się nie powtarza.
// Przy czarnej krawędzi gęsto i w pełni czarno, wyżej rzadziej i bledziej.
function band(canvas) {
  const STEP = 6, R = 1.6, CELL = 2 * STEP + 6, ROW = 3 * STEP + 8;
  let g, dots = [], seeds = [];
  const layout = () => {
    g = setup(canvas);
    dots = [];
    // rzędy co STEP bez przerw między rzędami komórek (jak przy awatarze), w poziomie pary kolumn
    const rows = Math.max(3, Math.floor((g.h + 8) / ROW) * 4 - 1);
    const top = g.h - R - 1.5 - (rows - 1) * STEP;   // ostatni rząd kropek tuż nad czarną krawędzią
    const cols = Math.ceil(g.w / CELL);
    const left = (g.w - (cols * CELL - 6 - STEP)) / 2;
    for (let cx = 0; cx < cols; cx++) for (let j = 0; j < rows; j++) for (let i = 0; i < 2; i++) {
      const x = left + cx * CELL + i * STEP, y = top + j * STEP;
      dots.push({ x, y, n: hash(x, y), v: 0 });
    }
    // jedno źródło pulsu na ~220 px szerokości, każde z innym torem, tempem i fazą
    const count = Math.max(2, Math.round(g.w / 220));
    seeds = Array.from({ length: count }, (_, k) => {
      const r = q => hash(k * 17.3 + q, q * 3.1 + k);
      return { base: (k + 0.5) / count, drift: 0.35 / count + r(1) * 0.4 / count, period: 7000 + r(2) * 9000, speed: 300 + r(3) * 220, phase: r(4) * TAU, reach: 70 + r(5) * 70 };
    });
  };
  const draw = (t, still) => {
    const { ctx, w, h } = g;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(canvas.parentElement).backgroundColor;
    const src = seeds.map(e => ({ x: (e.base + Math.sin(t / e.period + e.phase) * e.drift) * w, y: h + 6, e }));
    for (const d of dots) {
      let wave = 0, weight = 0;
      for (const { x, y, e } of src) {
        const dist = Math.hypot(d.x - x, d.y - y), f = Math.exp(-dist / e.reach);
        wave += Math.sin(t / e.speed - dist / 9 + e.phase) * f; weight += f;
      }
      wave /= weight || 1;
      const own = Math.sin(t / (900 + d.n * 1400) + d.n * TAU);
      const near = 1 - (h - d.y) / h;
      const on = wave * 0.75 + own * 0.45 + (d.n - 0.5) * 0.8 + near * 0.55 > 0.4 ? 1 : 0;
      d.v = still ? on : d.v + (on - d.v) * 0.18;               // miękkie zapalanie i gaszenie
      if (d.v < 0.05) continue;
      ctx.globalAlpha = 0.12 + 0.88 * (d.y / h) ** 1.5;          // na dole pełne krycie, wyżej coraz mniej
      ctx.beginPath(); dot(ctx, d.x, d.y, R * d.v); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  return { layout, draw };
}

// Plansza pluginu: duże logo Figmy z kropek na środku płótna, kropki lekko „oddychają” (każda we własnym rytmie).
function figma(canvas) {
  let g, logo = [];
  const layout = () => {
    g = setup(canvas);
    const u = Math.min(g.w / 2.2, g.h / 3.3), k = Math.max(4, Math.min(7, Math.round(u / 11)));
    logo = figmaDots((g.w - 2 * u) / 2, (g.h - 3 * u) / 2, u, k);
    logo.forEach(d => { d.r = (u / k) * 0.36; });
  };
  const draw = (t, still) => {
    const { ctx, w, h } = g;
    ctx.clearRect(0, 0, w, h);
    for (let c = 0; c < FIGMA.length; c++) {
      ctx.fillStyle = FIGMA[c];
      ctx.beginPath();
      for (const d of logo) if (d.c === c) dot(ctx, d.x, d.y, d.r * (still ? 1 : 0.82 + 0.18 * Math.sin(t / (700 + d.n * 900) + d.n * TAU)));
      ctx.fill();
    }
  };
  return { layout, draw };
}

export function initDots(root, { reduce = false, paused = () => false } = {}) {
  const kinds = { pulse, band, figma };
  for (const canvas of root.querySelectorAll('canvas[data-dots]')) {
    const fx = kinds[canvas.dataset.dots]?.(canvas);
    if (!fx) continue;
    let visible = true, raf = 0;
    const frame = t => {
      raf = 0;
      if (!visible || canvas.offsetParent === null) return;
      if (!paused()) fx.draw(t, false);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!reduce && !raf) raf = requestAnimationFrame(frame); };
    const redraw = () => { fx.layout(); fx.draw(performance.now(), reduce); };
    redraw();
    new ResizeObserver(redraw).observe(canvas);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    start();
  }
}
