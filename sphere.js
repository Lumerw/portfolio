// Sfera z projektami (desktop, strona główna): siatka z linii 1 px i karty 4:5 na powierzchni (CSS 3D,
// styl w styles.css → „Sfera”). Tu tylko ruch: obrót myszką z bezwładnością, powolne samoczynne kręcenie
// i płynny obrót do karty projektu (najechanie na wiersz indeksu). Kąty w zmiennych --rx / --ry.
// Bez JS sfera stoi w pozycji startowej (karty są zwykłymi linkami do paneli projektów).

const AUTO = 5;          // samoczynny obrót, stopnie / s
const DRAG = 0.32;       // stopnie na piksel przeciągnięcia
const FRICTION = 3.2;    // wygaszanie bezwładności (1 / s)
const SPRING = 7;        // obrót do karty: sztywność sprężyny (1 / s)
const MAX_RX = 55;       // pochylenie góra / dół
const IDLE_MS = 2500;    // po puszczeniu / wyjściu kursora: tyle ciszy, zanim znów się kręci

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Najbliższy kąt równoważny docelowemu (bez obrotu o 300° zamiast o 60°)
const near = (from, to) => to + Math.round((from - to) / 360) * 360;

export function initSphere(el, { reduce = false } = {}) {
  const world = el.querySelector('.sphere__world');
  const cards = new Map([...el.querySelectorAll('.sphere__card')].map(c => [c.dataset.project, c]));
  const angle = c => [parseFloat(c.style.getPropertyValue('--lat')) || 0, parseFloat(c.style.getPropertyValue('--lon')) || 0];

  let rx = parseFloat(getComputedStyle(world).getPropertyValue('--rx')) || -10;
  let ry = parseFloat(getComputedStyle(world).getPropertyValue('--ry')) || 0;
  let vx = 0, vy = 0;               // bezwładność (stopnie / s)
  let target = null;                // { rx, ry } - obrót do karty
  let drag = null;                  // { x, y, t, moved }
  let quietUntil = 0;
  let hover = false;
  let raf = 0, last = 0, visible = true;

  const write = () => {
    world.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    world.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
  };

  const frame = now => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!drag?.live) {
      if (target) {
        const k = 1 - Math.exp(-SPRING * dt);
        rx += (target.rx - rx) * k;
        ry += (target.ry - ry) * k;
        if (Math.abs(target.rx - rx) < 0.05 && Math.abs(target.ry - ry) < 0.05) { rx = target.rx; ry = target.ry; }
      } else {
        rx = clamp(rx + vx * dt, -MAX_RX, MAX_RX);
        ry += vy * dt;
        const f = Math.exp(-FRICTION * dt);
        vx *= f; vy *= f;
        if (!reduce && !hover && now > quietUntil) ry += AUTO * dt;
      }
    }
    write();
    raf = requestAnimationFrame(frame);
  };
  const run = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };

  // Przeciąganie (mysz, rysik, palec). Wskaźnik przechwytywany dopiero po ruchu > 4 px - zwykły klik
  // w kartę otwiera panel projektu; karta po przeciągnięciu panelu nie otwiera.
  const onDown = e => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), moved: 0, live: false, id: e.pointerId };
  };
  const onMove = e => {
    if (!drag) return;
    if (!drag.live) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
      drag.live = true;
      target = null; vx = vy = 0;
      try { el.setPointerCapture(drag.id); } catch { /* wskaźnik już puszczony */ }
      el.classList.add('is-dragging');
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
    const dt = Math.max(0.008, (now - drag.t) / 1000);
    ry += dx * DRAG;
    rx = clamp(rx - dy * DRAG, -MAX_RX, MAX_RX);
    vy = (dx * DRAG) / dt * 0.6 + vy * 0.4;
    vx = (-dy * DRAG) / dt * 0.6 + vx * 0.4;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    Object.assign(drag, { x: e.clientX, y: e.clientY, t: now });
    write();
  };
  const onUp = e => {
    if (!drag) return;
    if (!drag.live) { drag = null; return; }      // zwykły klik
    el.dataset.dragged = drag.moved > 6 ? '1' : '';
    if (performance.now() - drag.t > 80) vx = vy = 0;   // puszczone w bezruchu - bez rzutu
    drag = null;
    quietUntil = performance.now() + IDLE_MS;
    el.classList.remove('is-dragging');
    try { el.releasePointerCapture(e.pointerId); } catch { /* już zwolnione */ }
  };
  const onClick = e => { if (el.dataset.dragged) { e.preventDefault(); e.stopPropagation(); el.dataset.dragged = ''; } };
  const onEnter = () => { hover = true; };
  const onLeave = () => { hover = false; quietUntil = performance.now() + IDLE_MS; };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('click', onClick, true);
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
  const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; run(); });
  io.observe(el);
  document.addEventListener('visibilitychange', run);
  write();
  run();

  return {
    // Obrót do karty projektu (najechanie / focus na wierszu indeksu). instant: bez animacji.
    focus(id, instant = false) {
      const c = cards.get(id);
      if (!c) return;
      const [lat, lon] = angle(c);
      target = { rx: -lat, ry: near(ry, -lon) };
      vx = vy = 0;
      quietUntil = performance.now() + IDLE_MS * 2;
      if (instant || reduce) { rx = target.rx; ry = target.ry; write(); }
      run();
    },
    // Koniec obrotu do karty - sfera znów się kręci (po chwili ciszy)
    release() { target = null; quietUntil = performance.now() + IDLE_MS; },
    stop() {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', run);
      for (const [t, f] of [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp], ['pointerenter', onEnter], ['pointerleave', onLeave]]) el.removeEventListener(t, f);
      el.removeEventListener('click', onClick, true);
    },
  };
}
