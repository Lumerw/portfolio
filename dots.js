// Kropki jak alfabet Braille'a (shared.effects.dots w content.js - false = poprzednia wersja strony).
//   pulse - pole komórek 2 × 3 obok awatara: kropki zapalają się i gasną falą, która wychodzi od awatara
//           (jak puls), z lekkim szumem na każdą kropkę, więc wzór nigdy się nie powtarza;
//   edge  - pas nad czarnym kontaktem (telefon, tablet): półton z kropek rosnących w dół, aż zlewają się
//           w czerń - zamiast twardej krawędzi. Kropki powoli oddychają.
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

// Pole przy awatarze: komórki Braille'a (2 kolumny × 3 rzędy), dwa rzędy komórek.
function pulse(canvas) {
  const STEP = 6, R = 1.6, CELL = 2 * STEP + 6;
  let g, dots = [];
  const layout = () => {
    g = setup(canvas);
    dots = [];
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
    ctx.beginPath();
    for (const d of dots) {
      // fala od awatara (lewa krawędź, środek wysokości) co ~2,4 s + własny, wolny rytm kropki
      const dist = Math.hypot(d.x + 29, d.y - h / 2);
      const wave = Math.sin(t / 380 - dist / 9);
      const own = Math.sin(t / (900 + d.n * 1400) + d.n * TAU);
      const near = 1 - Math.min(1, (d.x) / g.w);              // gęściej przy awatarze
      const on = wave * 0.8 + own * 0.45 + (d.n - 0.5) * 0.5 + near * 0.35 > 0.2 ? 1 : 0;
      d.v = still ? on : d.v + (on - d.v) * 0.18;      // miękkie zapalanie i gaszenie
      dot(ctx, d.x, d.y, R * d.v);
    }
    ctx.fill();
  };
  return { layout, draw };
}

// Pas nad kontaktem: półton na siatce Braille'a, promień kropki rośnie w dół do zlania się w kolor kontaktu.
function edge(canvas) {
  const STEP = 6;
  let g;
  const layout = () => { g = setup(canvas); };
  const draw = t => {
    const { ctx, w, h } = g;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(canvas.parentElement).backgroundColor;
    ctx.beginPath();
    for (let y = STEP / 2; y < h + STEP; y += STEP) {
      const k = Math.min(1, y / h);                      // 0 u góry → 1 przy krawędzi kontaktu
      for (let x = STEP / 2; x < w + STEP; x += STEP) {
        const n = hash(x, y);
        const breath = Math.sin(t / 1600 + n * TAU) * 0.12;
        const r = (k * k * 1.15 + (n - 0.5) * 0.35 + breath) * STEP * 0.62;   // przy k = 1 kropki zachodzą na siebie
        if (k * k + (n - 0.5) * 0.5 > 0.04) dot(ctx, x, y, Math.min(r, STEP * 0.75));
      }
    }
    ctx.fill();
  };
  return { layout, draw };
}

export function initDots(root, { reduce = false, paused = () => false } = {}) {
  const kinds = { pulse, edge };
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
