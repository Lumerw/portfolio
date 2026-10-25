// Generator znaków (panel #generator - otwierają go znaki obok awatara). Algorytm składa za każdym razem nowy sygnet
// z zasad, na których projektuję (i z kanonu znaków: Rand, Pentagram, „Logotype” Evamy'ego, „Logo Design Love”):
//   - jedna idea, prosta geometria, czytelność od 16 px; czerń na papierze, kolor dopiero potem,
//   - negatyw: wycięcia, przecięcia (evenodd), brakujące części,
//   - siatka i moduły, rytm, symetria lustrzana albo obrotowa, nośnik (koło / kwadrat).
// Siedem typów (kind): nośnik z wycięciem, splot, promienie, moduły, cięcia, forma organiczna, linia ciągła.
// Numer znaku (seed) wyznacza wszystkie decyzje; dwa suwaki zmieniają go płynnie, bez losowania od nowa:
//   złożoność - ile elementów (wycięć, ramion, modułów, pasów, zakrętów),
//   styl      - od kwadratowego (proste kąty, kwadraty, trójkąty) do obłego (koła, łuki, zaokrąglenia).
// Moje sygnety były tylko wzorem stylu - generator ich nie pokazuje i nie wczytuje.
// „Wygeneruj ze mną”: opis marki → Worker (/mark) → Claude dobiera typ, złożoność, styl, obrót i numer;
// bez odpowiedzi - zwykłe losowanie. Wynik: SVG do pobrania albo skopiowania, kolor z palety albo HEX.

const C = 100;                                   // środek pola 200 × 200
// Typy znaków: nazwa na stronie (pl / en) i opis dla art directora (Worker /mark buduje z niego prompt i listę typów).
// Nowy typ = wpis tutaj + funkcja w MAKERS.
export const KIND_INFO = {
  carrier: { pl: 'nośnik z wycięciem', en: 'carrier with a cut', brief: 'a circle or square with negative-space cuts (band, notch, crescent, slit, hole) - institutions, stability, finance, law, tech platforms' },
  interlock: { pl: 'splot', en: 'interlock', brief: '2-4 overlapping rings or frames, overlaps cut out - partnership, community, connection, network' },
  radial: { pl: 'promienie', en: 'radial', brief: '3-10 arms or blades around a centre (asterisk, star, propeller) - energy, light, growth, events, food, kids' },
  grid: { pl: 'moduły', en: 'modules', brief: 'modular 2x2-4x4 tiles of quarter circles, half circles, squares and triangles, often mirrored - architecture, design, culture, systems' },
  stencil: { pl: 'cięcia', en: 'cuts', brief: 'a solid shape sliced by parallel gaps - engineering, industry, speed, sport, media' },
  blob: { pl: 'forma organiczna', en: 'organic form', brief: 'organic closed forms with 0-2 small companions - health, nature, beauty, food, calm' },
  line: { pl: 'linia ciągła', en: 'continuous line', brief: 'one thick continuous line on a grid (meander, loop) - journeys, logistics, process, craft, education' },
};
export const KINDS = Object.keys(KIND_INFO);

// Liczby losowe z ziarnem: ten sam numer = ten sam znak (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = v => +v.toFixed(2);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

/* ---------- Kształty (ścieżki SVG) ---------- */
const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
// Wielokąt z zaokrąglonymi narożnikami (rad = 0 → ostre); punkty zgodnie z ruchem wskazówek
function poly(pts, rad = 0) {
  if (rad <= .01) return `M${pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L')}Z`;
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p = pts[i], p1 = pts[(i + 1) % n];
    const d0 = Math.hypot(p0[0] - p[0], p0[1] - p[1]), d1 = Math.hypot(p1[0] - p[0], p1[1] - p[1]);
    const k = Math.min(rad, d0 / 2, d1 / 2);
    const a = [p[0] + (p0[0] - p[0]) * k / d0, p[1] + (p0[1] - p[1]) * k / d0];
    const b = [p[0] + (p1[0] - p[0]) * k / d1, p[1] + (p1[1] - p[1]) * k / d1];
    out.push(`${i ? 'L' : 'M'}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`);
  }
  return `${out.join('')}Z`;
}
const rect = (x, y, w, h, rad = 0) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], rad);
const rot = (pts, deg, cx = C, cy = C) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
// Ćwiartka koła (wycinek 90°) w kwadracie x, y, s; q = narożnik środka (0 lewy górny, 1 prawy górny, 2 prawy dolny, 3 lewy dolny)
function quarter(x, y, s, q) {
  const c = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]][q];
  const a = [[x + s, y], [x + s, y + s], [x, y + s], [x, y]][q];
  const b = [[x, y + s], [x, y], [x + s, y], [x + s, y + s]][q];
  return `M${f(c[0])} ${f(c[1])}L${f(a[0])} ${f(a[1])}A${f(s)} ${f(s)} 0 0 1 ${f(b[0])} ${f(b[1])}Z`;
}
// Kształt „nośnika” wg stylu: kwadrat → zaokrąglony kwadrat → koło
const carrierShape = (cx, cy, r, style) => (style > .82 ? circle(cx, cy, r) : rect(cx - r, cy - r, 2 * r, 2 * r, r * Math.max(0, (style - .12) / .7)));

/* ---------- Typy znaków: zwracają { fill: [ścieżki], cut: [ścieżki wycięć], stroke?: {d, w, round} } ---------- */
const MAKERS = {
  // Nośnik (koło / kwadrat) z wycięciami w negatywie: pas, narożnik, przesunięte koło, szczelina od środka
  carrier(r, c, s) {
    const R = 66, cuts = [];
    const n = 1 + Math.round(c * 3);
    const types = ['band', 'notch', 'moon', 'slit', 'hole'];
    const order = Array.from({ length: 5 }, () => pick(r, types));
    for (let i = 0; i < n; i++) {
      const t = order[i], ang = pick(r, [0, 45, 90, 135]);
      if (t === 'band') { const w = lerp(10, 18, r()); cuts.push(poly(rot([[C - 90, C - w / 2], [C + 90, C - w / 2], [C + 90, C + w / 2], [C - 90, C + w / 2]], ang), 0)); }
      if (t === 'notch') { const k = lerp(26, 44, r()); const q = Math.floor(r() * 4); const [x, y] = [[C - R, C - R], [C + R - k, C - R], [C + R - k, C + R - k], [C - R, C + R - k]][q]; cuts.push(s > .5 ? quarter(x, y, k, (q + 2) % 4) : rect(x, y, k, k)); }
      if (t === 'moon') { const rr = lerp(30, 48, r()), d = lerp(18, 34, r()); const a = ang * Math.PI / 180; cuts.push(carrierShape(C + Math.cos(a) * d, C + Math.sin(a) * d, rr, s)); }
      if (t === 'slit') { const w = lerp(9, 14, r()); cuts.push(poly(rot([[C - w / 2, C - w / 2], [C + R + 4, C - w / 2], [C + R + 4, C + w / 2], [C - w / 2, C + w / 2]], ang), 0), poly(rot([[C - w / 2, C - w / 2], [C + w / 2, C - w / 2], [C + w / 2, C - R - 4], [C - w / 2, C - R - 4]], ang), 0)); }
      if (t === 'hole') cuts.push(carrierShape(C, C, lerp(12, 22, r()), s));
    }
    return { fill: [carrierShape(C, C, R, s)], cut: cuts };
  },
  // Splot: 2-4 pierścienie / ramki zachodzące na siebie - przecięcia w negatywie (evenodd)
  interlock(r, c, s) {
    const n = 2 + Math.round(c * 2), R = lerp(34, 44, r()) - n * 2, w = lerp(10, 15, r());
    const along = r() > .4;                                 // w rzędzie albo wokół środka
    const parts = [];
    for (let i = 0; i < n; i++) {
      const [cx, cy] = along
        ? [C + (i - (n - 1) / 2) * R * 1.25, C]
        : [C + Math.cos(i / n * 2 * Math.PI - Math.PI / 2) * R * .72, C + Math.sin(i / n * 2 * Math.PI - Math.PI / 2) * R * .72];
      parts.push(carrierShape(cx, cy, R, s), carrierShape(cx, cy, R - w, s));
    }
    return { fill: [parts.join('')], cut: [], evenodd: true };
  },
  // Promienie: 3-10 ramion wokół środka (gwiazdka / śmigło), opcjonalnie otwór w środku
  radial(r, c, s) {
    const n = 3 + Math.round(c * 7), L = 70, w = lerp(30, 12, c) * lerp(.9, 1.15, r());
    const blade = r() > .55;                                 // ostrze (trójkąt) zamiast belki
    const twist = blade ? pick(r, [0, 18, 30]) : 0;
    const off = r() * 360 / n;
    const arms = [];
    for (let i = 0; i < n; i++) {
      const a = off + i * 360 / n;
      const pts = blade ? [[C, C - w * .55], [C + L, C - w * .1 + twist * .3], [C, C + w * .55]] : [[C, C - w / 2], [C + L, C - w / 2], [C + L, C + w / 2], [C, C + w / 2]];
      arms.push(poly(rot(pts, a), s * w * .5));
    }
    const cut = r() > .55 ? [circle(C, C, w * .45)] : [];
    return { fill: [...arms, circle(C, C, w * .62)], cut };
  },
  // Moduły: siatka 2-4 × 2-4, w polach ćwiartki koła, półkola, koła, kwadraty i trójkąty; często lustro
  grid(r, c, s) {
    const g = 2 + Math.round(c * 2), size = 136, cell = size / g, x0 = C - size / 2, y0 = C - size / 2;
    const mirror = r() > .4;
    const shapes = [];
    const cellShape = (x, y, t, q) => {
      if (t === 'quarter') return quarter(x, y, cell, q);
      if (t === 'circle') return circle(x + cell / 2, y + cell / 2, cell / 2);
      if (t === 'half') return `M${f(x)} ${f(y + cell)}A${f(cell / 2)} ${f(cell / 2)} 0 0 1 ${f(x + cell)} ${f(y + cell)}Z`;
      if (t === 'tri') return poly([[[x, y], [x + cell, y], [x, y + cell]], [[x, y], [x + cell, y], [x + cell, y + cell]], [[x + cell, y], [x + cell, y + cell], [x, y + cell]], [[x, y], [x + cell, y + cell], [x, y + cell]]][q], 0);
      return rect(x, y, cell, cell, cell * s * .35);
    };
    const weighted = () => {                                // styl przechyla wybór: obły → łuki, kwadratowy → kąty
      const round = ['quarter', 'quarter', 'circle', 'half'], square = ['square', 'square', 'tri', 'tri'];
      return r() < s ? pick(r, round) : pick(r, square);
    };
    const plan = [];
    for (let j = 0; j < g; j++) for (let i = 0; i < g; i++) plan.push({ i, j, t: r() < .18 ? 'empty' : weighted(), q: Math.floor(r() * 4) });
    for (const p of plan) {
      let { i, t, q } = p;
      if (mirror && i >= g / 2) { const m = plan.find(o => o.j === p.j && o.i === g - 1 - i); t = m.t; q = [1, 0, 3, 2][m.q]; }
      if (t !== 'empty') shapes.push(cellShape(x0 + i * cell, y0 + p.j * cell, t, q));
    }
    if (!shapes.length) shapes.push(circle(C, C, 50));
    return { fill: shapes, cut: [] };
  },
  // Cięcia: bryła przecięta równoległymi pasami (jak szablon); czasem jeden pas w poprzek
  stencil(r, c, s) {
    const R = 64, n = 2 + Math.round(c * 6), gap = lerp(5, 3, c), ang = pick(r, [0, 0, 90, 45, -45]);
    const base = r() > .5 ? carrierShape(C, C, R, s) : poly([[C, C - R * 1.05], [C + R * 1.05, C + R * .8], [C - R * 1.05, C + R * .8]], s * 22);
    const cuts = [];
    for (let i = 1; i <= n; i++) {
      const y = C - R + (2 * R) * i / (n + 1);
      cuts.push(poly(rot([[C - 100, y - gap / 2], [C + 100, y - gap / 2], [C + 100, y + gap / 2], [C - 100, y + gap / 2]], ang), 0));
    }
    if (r() > .6) cuts.push(poly(rot([[C - gap / 2, C - 100], [C + gap / 2, C - 100], [C + gap / 2, C + 100], [C - gap / 2, C + 100]], ang), 0));
    return { fill: [base], cut: cuts };
  },
  // Forma organiczna: zamknięta krzywa z kilku fal + 0-2 mniejsze formy (jak kropla, ziarno, kamień)
  blob(r, c, s) {
    const waves = 2 + Math.round(c * 4);
    const amps = Array.from({ length: waves }, (_, k) => ({ k: k + 2, a: lerp(.04, .18, r()) / (1 + k * .4), ph: r() * Math.PI * 2 }));
    const shape = (cx, cy, R, steps) => {
      const pts = Array.from({ length: steps }, (_, i) => {
        const t = i / steps * Math.PI * 2;
        const rr = R * (1 + amps.reduce((sum, w) => sum + w.a * Math.sin(w.k * t + w.ph), 0));
        return [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr];
      });
      if (s < .45) {                                        // kwadratowy: punkty na siatce, mniej wierzchołków
        const grid = lerp(16, 4, s / .45);
        return poly(pts.filter((_, i) => i % 2 === 0).map(([x, y]) => [Math.round(x / grid) * grid, Math.round(y / grid) * grid]), 0);
      }
      // obły: krzywe Catmull-Rom przez punkty
      const k = (s - .45) / .55 / 6 + .08;
      return `M${f(pts[0][0])} ${f(pts[0][1])}${pts.map((p, i) => {
        const p0 = pts[(i - 1 + steps) % steps], p2 = pts[(i + 1) % steps], p3 = pts[(i + 2) % steps];
        return `C${f(p[0] + (p2[0] - p0[0]) * k)} ${f(p[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p[0]) * k)} ${f(p2[1] - (p3[1] - p[1]) * k)} ${f(p2[0])} ${f(p2[1])}`;
      }).join('')}Z`;
    };
    const extra = Math.round(r() * 2 * (.4 + c * .6));
    const fill = [shape(C - (extra ? 10 : 0), C + (extra ? 8 : 0), extra ? 52 : 62, 12 + waves * 2)];
    for (let i = 0; i < extra; i++) {
      const a = -Math.PI / 4 + (i ? .9 : 0) + r() * .4, d = lerp(58, 70, r());
      fill.push(shape(C - 10 + Math.cos(a) * d, C + 8 + Math.sin(a) * d, lerp(12, 20, r()), 10));
    }
    return { fill, cut: [] };
  },
  // Linia ciągła: gruba kreska po siatce 5 × 5 bez powrotów (meander, pętla), końce i zakręty wg stylu
  line(r, c, s) {
    const steps = 4 + Math.round(c * 7), cell = 30, g = 5, x0 = C - (g - 1) * cell / 2, y0 = x0;
    let p = [Math.floor(r() * g), Math.floor(r() * g)];
    const seen = new Set([p.join()]), path = [p];
    let dir = Math.floor(r() * 4);
    const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let i = 0; i < steps * 2 && path.length <= steps; i++) {
      if (r() < .45) dir = (dir + (r() < .5 ? 1 : 3)) % 4;
      const len = 1 + Math.floor(r() * 2);
      let q = p;
      for (let k = 0; k < len; k++) {
        const n = [q[0] + D[dir][0], q[1] + D[dir][1]];
        if (n[0] < 0 || n[1] < 0 || n[0] >= g || n[1] >= g || seen.has(n.join())) break;
        q = n; seen.add(n.join());
      }
      if (q !== p) { path.push(q); p = q; }
    }
    if (path.length < 3) path.push([g - 1 - path[0][0], g - 1 - path[0][1]]);
    // wyśrodkowanie i skala: ścieżka wypełnia pole ~124 px (jak inne typy)
    const raw = path.map(([i, j]) => [x0 + i * cell, y0 + j * cell]);
    const xs = raw.map(p => p[0]), ys = raw.map(p => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    const k = 124 / Math.max(bw, bh, 60), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
    const pts = raw.map(([x, y]) => [C + (x - mx) * k, C + (y - my) * k]);
    // zaokrąglone zakręty: łuk o promieniu do połowy odcinka
    const rad = s * cell * k * .55;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = pts[i + 1];
      if (!n || rad < 1) { d += `L${f(b[0])} ${f(b[1])}`; continue; }
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(n[0] - b[0], n[1] - b[1]), k = Math.min(rad, l1 / 2, l2 / 2);
      d += `L${f(b[0] - (b[0] - a[0]) * k / l1)} ${f(b[1] - (b[1] - a[1]) * k / l1)}Q${f(b[0])} ${f(b[1])} ${f(b[0] + (n[0] - b[0]) * k / l2)} ${f(b[1] + (n[1] - b[1]) * k / l2)}`;
    }
    return { fill: [], cut: [], stroke: { d, w: lerp(26, 16, c), round: s > .5 } };
  },
};

// Znak → SVG (pole 200 × 200). Wycięcia jako maska, więc plik działa w każdym programie i z każdym kolorem.
export function markSvg({ kind, seed, complexity, style, rotate = 0 }, color = '#111111', size = 400) {
  const r = rng(seed * 7 + KINDS.indexOf(kind) * 131);
  const m = MAKERS[kind](r, complexity, style);
  const id = `m${seed}`;
  const g = `transform="rotate(${rotate} ${C} ${C})"`;
  const fill = m.fill.map(d => `<path d="${d}"${m.evenodd ? ' fill-rule="evenodd"' : ''}/>`).join('');
  const stroke = m.stroke ? `<path d="${m.stroke.d}" fill="none" stroke="${color}" stroke-width="${f(m.stroke.w)}" stroke-linecap="${m.stroke.round ? 'round' : 'square'}" stroke-linejoin="${m.stroke.round ? 'round' : 'miter'}"/>` : '';
  const mask = m.cut.length ? `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect width="200" height="200" fill="#fff"/><g fill="#000">${m.cut.map(d => `<path d="${d}"/>`).join('')}</g></mask></defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${mask}<g ${g}><g fill="${color}"${m.cut.length ? ` mask="url(#${id})"` : ''}>${fill}</g>${stroke}</g></svg>`;
}

export function initGenerator(root, { copy, palette, color: start, endpoint, lang = 'pl' }) {
  const stage = root.querySelector('[data-gen-stage]');
  const $ = s => root.querySelector(`[data-gen="${s}"]`);
  const hex = $('hex'), swatch = $('swatch'), pal = $('palette'), complexity = $('complexity'), style = $('style'), info = $('info'), note = $('note');
  let color = start, mark = null, view = '0 0 200 200';

  // Kadr: znak wyśrodkowany względem swojego obrysu (puste moduły, krótka linia), z równym marginesem;
  // ten sam kadr trafia do pobranego SVG
  const raw = () => markSvg({ ...mark, complexity: complexity.value / 100, style: style.value / 100 }, color);
  const svg = () => raw().replace('viewBox="0 0 200 200"', `viewBox="${view}"`);
  // Wersje do wyboru (2-4) na scenie, w bieżących suwakach i kolorze; dopóki art director wybiera, draw() rysuje je
  let picking = null;
  const pickGrid = () => `<div class="gen__pick" data-n="${picking.length}" data-wait>${picking.map(m => markSvg({ ...m, complexity: complexity.value / 100, style: style.value / 100 }, color)).join('')}</div>`;
  const draw = () => {
    if (picking) { stage.innerHTML = pickGrid(); return; }
    if (!mark) return;
    stage.innerHTML = raw();
    const el = stage.querySelector('svg'), g = el.querySelector('g[transform]');
    const bb = g.getBBox(), sw = +(el.querySelector('[stroke-width]')?.getAttribute('stroke-width') || 0);
    const side = Math.max(bb.width, bb.height, 60) + sw + 64, cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    view = [cx - side / 2, cy - side / 2, side, side].map(v => +v.toFixed(2)).join(' ');
    el.setAttribute('viewBox', view);
    info.textContent = `${KIND_INFO[mark.kind][lang === 'en' ? 'en' : 'pl']} · ${copy.no} ${mark.seed}`;
  };
  // Selekcja: z ~30 kandydatów (losowe numery) zostają najlepsze różne wg kontroli jakości (mark-qa.js: pole, środek,
  // drzazgi, szczeliny, czytelność przy 32 px, proporcja tuszu). Suwaki potem zmieniają już tylko wybrany znak.
  let qa = null, turn = 0;
  const best = async (kind, rotate = 0, keep = 1, n = 30) => {
    const ticket = ++turn;
    qa ??= await import('./mark-qa.js');
    const c = complexity.value / 100, s = style.value / 100, all = [];
    for (let i = 0; i < n; i++) {
      const seed = 1 + Math.floor(Math.random() * 99999);
      try {
        const r = await qa.rasterize(markSvg({ kind, seed, complexity: c, style: s, rotate }, '#000000', 200));
        all.push({ seed, q: qa.score(qa.analyze(r)), h24: r.h24 });
      } catch { /* kandydat bez obrazu - pomijamy */ }
      if (ticket !== turn) return null;                 // w międzyczasie kliknięto „losuj” jeszcze raz
    }
    const top = qa.top(all, keep).map(t => ({ kind, seed: t.seed, rotate }));
    return top.length ? top : [{ kind, seed: 1 + Math.floor(Math.random() * 99999), rotate }];
  };
  const roll = async () => {
    note.textContent = '';
    const top = await best(KINDS[Math.floor(Math.random() * KINDS.length)]);
    if (!top) return;
    picking = null;
    mark = top[0];
    draw();
  };

  // Kolor: paleta (próbki jak w blobmakerze) albo HEX
  const setColor = v => {
    if (!/^#[0-9a-f]{6}$/i.test(v)) { hex.value = color.toUpperCase(); return; }
    color = v.toLowerCase();
    hex.value = color.toUpperCase();
    root.style.setProperty('--gen-c', color);
    for (const b of pal.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.c === color));
    draw();
  };
  pal.innerHTML = palette.map(c => `<button type="button" data-c="${c.toLowerCase()}" style="--c:${c}" aria-label="${c}" aria-pressed="false"></button>`).join('');
  const openPal = open => { pal.hidden = !open; swatch.setAttribute('aria-expanded', String(open)); };
  swatch.addEventListener('click', () => openPal(pal.hidden));
  pal.addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (b) { setColor(b.dataset.c); openPal(false); swatch.focus(); } });
  document.addEventListener('click', e => { if (!pal.hidden && !e.target.closest('.gen__color, .gen__palette')) openPal(false); });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && !pal.hidden) { e.stopPropagation(); openPal(false); swatch.focus(); } });
  hex.addEventListener('change', () => setColor(hex.value.trim().startsWith('#') ? hex.value.trim() : `#${hex.value.trim()}`));

  complexity.addEventListener('input', draw);
  style.addEventListener('input', draw);
  $('roll').addEventListener('click', roll);
  $('download').addEventListener('click', () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([svg()], { type: 'image/svg+xml' })), download: `znak-${mark.seed}.svg` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const code = $('code');
  code.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(svg()); } catch { return; }
    code.dataset.done = '';
    note.textContent = copy.copied;
    setTimeout(() => { delete code.dataset.done; }, 1600);
  });

  // Claude jako art director, dwa kroki (Worker):
  //   /mark      - opis marki → typ, złożoność, styl, obrót, robocza nazwa i uzasadnienie,
  //   /mark/pick - 4 najlepsze różne wersje tego typu (obrazy PNG) → wybór jednej, nazwa i uzasadnienie do tego, co widać.
  // Wersje stoją na scenie 2 × 2, dopóki art director wybiera. Błąd kroku 1 → losowanie; błąd kroku 2 → najlepsza wg QA.
  const post = async (path, body) => {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.status);
    return data;
  };
  const choose = async (brief, p, cands) => {
    const c = complexity.value / 100, s = style.value / 100, ticket = turn;
    info.textContent = KIND_INFO[p.kind][lang === 'en' ? 'en' : 'pl'];
    note.textContent = copy.picking.replace('{n}', cands.length);
    picking = cands;
    mark = cands[0];                                    // pobierz / kopiuj w trakcie wyboru: najlepsza wg QA
    draw();
    let i = 0, name = p.name, why = p.why;
    try {
      const images = await Promise.all(cands.map(m => qa.png(markSvg({ ...m, complexity: c, style: s }, '#111111', 256))));
      const q = await post('/mark/pick', { brief, lang, kind: p.kind, name: p.name, why: p.why, images });
      if (q.pick >= 1 && q.pick <= cands.length) { i = q.pick - 1; name = q.name || name; why = q.why || why; }
    } catch { /* bez wyboru - zostaje najlepsza wg kontroli jakości */ }
    if (ticket !== turn) return;                        // w międzyczasie kliknięto „losuj” (roll() zdjął wersje)
    const grid = stage.querySelector('.gen__pick');
    if (grid) {                                         // wybrana zostaje, reszta gaśnie, potem pełny kadr
      delete grid.dataset.wait;
      grid.querySelectorAll('svg').forEach((el, j) => { if (j !== i) el.dataset.out = ''; });
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(r => setTimeout(r, 600));
      if (ticket !== turn) return;
    }
    picking = null;
    mark = cands[i];
    draw();
    note.textContent = [name, why].filter(Boolean).join(' - ');
  };
  const form = $('ai');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const brief = $('brief').value.trim();
    if (!brief || form.dataset.busy) return;
    form.dataset.busy = '1';
    const btn = form.querySelector('button');
    btn.disabled = true;
    note.textContent = copy.thinking;
    try {
      if (!endpoint) throw new Error('offline');
      const p = await post('/mark', { brief, lang });
      if (!KINDS.includes(p.kind)) throw new Error('kind');
      complexity.value = p.complexity;
      style.value = p.style;
      const cands = await best(p.kind, p.rotate, 4);
      if (!cands) return;
      if (cands.length > 1) await choose(brief, p, cands);
      else { mark = cands[0]; draw(); note.textContent = [p.name, p.why].filter(Boolean).join(' - '); }
    } catch {
      roll();
      note.textContent = copy.aiError;
    } finally {
      delete form.dataset.busy;
      btn.disabled = false;
    }
  });

  setColor(start);
  roll();
}
