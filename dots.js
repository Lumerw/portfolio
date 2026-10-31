// Kropki jak alfabet Braille'a (shared.effects.dots w content.js - false = poprzednia wersja strony).
//   pulse - pole komórek 2 × 3 spod awatara w prawo: kropki zapalają się i gasną falą, która wychodzi od awatara
//           (jak puls), z lekkim szumem na każdą kropkę, więc wzór nigdy się nie powtarza. Co kilkanaście sekund
//           w środku pola wyłania się z kropek logo Figmy (plugin lumerw) i znów się rozpływa.
//   figma - duże logo Figmy z kropek na planszy pluginu w panelu Narzędzia: stoi, kropki lekko migoczą.
//   band  - pasek nad czarnym kontaktem (telefon, tablet): ten sam puls na całą szerokość, wygasa w górę.
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
// obwiednia pojawiania się logo: cykl 14 s - wyłania się (1,6 s), stoi (3,4 s), rozpływa (1,6 s), potem sam puls
const LOGO_CYCLE = 14000, LOGO_DELAY = 2500;
function logoEnvelope(t) {
  const p = ((t - LOGO_DELAY) % LOGO_CYCLE + LOGO_CYCLE) % LOGO_CYCLE, ease = q => q * q * (3 - 2 * q);
  if (t < LOGO_DELAY) return 0;
  if (p < 1600) return ease(p / 1600);
  if (p < 5000) return 1;
  if (p < 6600) return 1 - ease((p - 5000) / 1600);
  return 0;
}

// Pole przy awatarze: komórki Braille'a (2 kolumny × 3 rzędy), dwa rzędy komórek.
function pulse(canvas) {
  const STEP = 6, R = 1.6, CELL = 2 * STEP + 6;
  let g, dots = [], logo = [], box = null;
  const layout = () => {
    g = setup(canvas);
    dots = [];
    // logo Figmy w środku widocznej części pola (za awatarem, przed wygaszeniem w prawo), drobniejsza siatka kropek
    const u = Math.min(18, (g.h - 4) / 3), ox = Math.round(g.w * 0.4 - u), oy = Math.round((g.h - 3 * u) / 2);
    logo = figmaDots(ox, oy, u, 4);
    box = { x0: ox - 12, x1: ox + 2 * u + 12, y0: -1, y1: g.h + 1 };   // pas przez całą wysokość pola
    const rows = Math.floor((g.h + 8) / (3 * STEP + 8));
    const top = (g.h - (rows * (3 * STEP + 8) - 8 - STEP)) / 2;
    for (let cx = 0; cx * CELL < g.w; cx++) for (let cy = 0; cy < rows; cy++) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
      const x = R + 1 + cx * CELL + i * STEP, y = top + cy * (3 * STEP + 8) + j * STEP;
      dots.push({ x, y, n: hash(x, y), v: 0 });
    }
  };
  const draw = (t, still) => {
    const { ctx, w, h } = g;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(canvas).color;
    const env = still ? 1 : logoEnvelope(t);
    ctx.beginPath();
    for (const d of dots) {
      // fala od awatara (lewa krawędź, środek wysokości) co ~2,4 s + własny, wolny rytm kropki
      const dist = Math.hypot(d.x, d.y - h / 2);             // środek awatara = lewa krawędź pola
      const wave = Math.sin(t / 380 - dist / 9);
      const own = Math.sin(t / (900 + d.n * 1400) + d.n * TAU);
      const near = 1 - Math.min(1, (d.x) / g.w);              // gęściej przy awatarze
      const under = d.x > box.x0 && d.x < box.x1 && d.y > box.y0 && d.y < box.y1;   // pod logo puls przygasa
      const on = wave * 0.8 + own * 0.45 + (d.n - 0.5) * 0.5 + near * 0.35 > 0.2 && !(under && env > d.n * 0.8) ? 1 : 0;
      d.v = still ? on : d.v + (on - d.v) * 0.18;      // miękkie zapalanie i gaszenie
      dot(ctx, d.x, d.y, R * d.v);
    }
    ctx.fill();
    // logo: kropka zapala się, gdy obwiednia przekroczy jej próg (od środka na zewnątrz, z szumem) - wyłania się
    // i rozpływa organicznie, nie od razu całe
    if (!env && logo.every(d => d.v < 0.02)) return;
    for (let c = 0; c < FIGMA.length; c++) {
      ctx.fillStyle = FIGMA[c];
      ctx.beginPath();
      for (const d of logo) {
        if (d.c !== c) continue;
        const on = env > d.d * 0.55 + d.n * 0.4 + 0.02 ? 1 : 0;
        d.v = still ? on : d.v + (on - d.v) * 0.14;
        dot(ctx, d.x, d.y, R * d.v);
      }
      ctx.fill();
    }
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
    const rows = Math.max(1, Math.floor((g.h + 8) / ROW));
    const top = g.h - R - 1.5 - (rows - 1) * ROW - 2 * STEP;   // ostatni rząd kropek tuż nad czarną krawędzią
    const cols = Math.ceil(g.w / CELL);
    const left = (g.w - (cols * CELL - 6 - STEP)) / 2;
    for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
      const x = left + cx * CELL + i * STEP, y = top + cy * ROW + j * STEP;
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
