// Kontrast checker - część bez DOM (testy: tools/contrast-check.mjs). Działa na pikselach RGBA (jak ImageData).
//   analyze(img, box)   - tekst vs tło w zaznaczeniu: kontrast WCAG typowy i w najsłabszym miejscu, kontrast krawędzi
//                         (tekst vs pierścień tuż przy literach - tu widać cienie i poświaty), wysokość liter, problemy;
//   fix(img, box, opts) - poprawiona kopia: tekst bliżej bieli/czerni i/lub miękko przyciemnione albo rozjaśnione
//                         tło pod tekstem, aż najsłabsze miejsce osiągnie docelowy kontrast;
//   detect(img)         - propozycje obszarów z tekstem (gęste, poziome pasy krawędzi).
// img = { data: Uint8ClampedArray RGBA, width, height }; box = { x, y, w, h } w pikselach obrazu.

const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const LIN = Float32Array.from({ length: 256 }, (_, i) => lin(i));
const gam = v => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)); };
export const luminance = (r, g, b) => 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b];
export const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const hex = ([r, g, b]) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
const median = arr => { const s = Float32Array.from(arr).sort(); return s.length ? pct(s, 0.5) : 0; };

// WCAG 2.2: duży tekst = od 24 px (18 pt) albo od ~18,7 px pogrubiony; tu bez wykrywania grubości
export const TARGETS = { AA: { normal: 4.5, large: 3 }, AAA: { normal: 7, large: 4.5 } };
const LARGE_PX = 24;

function clampBox(img, b) {
  const x = Math.max(0, Math.round(b.x)), y = Math.max(0, Math.round(b.y));
  return { x, y, w: Math.max(1, Math.min(img.width - x, Math.round(b.w))), h: Math.max(1, Math.min(img.height - y, Math.round(b.h))) };
}

// Podział zaznaczenia na tekst i tło metodą top-hat (jak w rozpoznawaniu tekstu na zdjęciach): z jasności
// odejmujemy jej „otwarcie” - wersję z wyciętymi kreskami cieńszymi niż okno. Zostają same litery, niezależnie od
// tego, jak jasne jest tło pod nimi; szeroka poświata i plamy tła zostają w tle. Jasny czy ciemny tekst: strona,
// której silnych odpowiedzi jest więcej.
function kmeans2(vals, a, b) {
  let c0 = a, c1 = b;
  for (let it = 0; it < 12; it++) {
    let s0 = 0, n0 = 0, s1 = 0, n1 = 0;
    for (const v of vals) if (Math.abs(v - c1) < Math.abs(v - c0)) { s1 += v; n1++; } else { s0 += v; n0++; }
    c0 = n0 ? s0 / n0 : c0; c1 = n1 ? s1 / n1 : c1;
  }
  return [c0, c1];
}
// Filtr min/max w oknie (2r+1)², rozdzielny; algorytm van Herka / Gil-Wermana - czas liniowy niezależnie od r
function minmax(src, w, h, r, isMax) {
  const op = isMax ? Math.max : Math.min, size = 2 * r + 1;
  const pass = (a, horiz) => {
    const out = new Float32Array(a.length), len = horiz ? w : h, lines = horiz ? h : w;
    const line = new Float32Array(len), g = new Float32Array(len), hh = new Float32Array(len);
    for (let l = 0; l < lines; l++) {
      for (let q = 0; q < len; q++) line[q] = a[horiz ? l * w + q : q * w + l];
      for (let q = 0; q < len; q++) g[q] = q % size === 0 ? line[q] : op(g[q - 1], line[q]);
      for (let q = len - 1; q >= 0; q--) hh[q] = q === len - 1 || (q + 1) % size === 0 ? line[q] : op(hh[q + 1], line[q]);
      for (let q = 0; q < len; q++) {
        const lo = Math.max(0, q - r), hi = Math.min(len - 1, q + r);
        let v;
        if (Math.floor(lo / size) !== Math.floor(hi / size)) v = op(hh[lo], g[hi]);
        else { v = line[lo]; for (let d = lo + 1; d <= hi; d++) v = op(v, line[d]); }   // okno przycięte brzegiem, w jednym bloku
        out[horiz ? l * w + q : q * w + l] = v;
      }
    }
    return out;
  };
  return pass(pass(src, true), false);
}
function split(img, box) {
  const { x, y, w, h } = box, n = w * h, L = new Float32Array(n), G = new Float32Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = ((y + j) * img.width + x + i) * 4, k = j * w + i;
    L[k] = luminance(img.data[o], img.data[o + 1], img.data[o + 2]);
    G[k] = Math.sqrt(L[k]);
  }
  const border = [];
  for (let i = 0; i < w; i++) border.push(L[i], L[(h - 1) * w + i]);
  for (let j = 1; j < h - 1; j++) border.push(L[j * w], L[j * w + w - 1]);
  const cBg = median(border);

  // okno szersze niż kreska liter: ~1/9 wysokości zaznaczenia (zaznaczenie ≈ wiersz z marginesem)
  const r = Math.max(2, Math.round(h * 0.11));
  const open = minmax(minmax(G, w, h, r, false), w, h, r, true);    // jasne cienkie kreski znikają
  const close = minmax(minmax(G, w, h, r, true), w, h, r, false);   // ciemne cienkie kreski znikają
  const white = new Float32Array(n), black = new Float32Array(n);
  for (let k = 0; k < n; k++) { white[k] = G[k] - open[k]; black[k] = close[k] - G[k]; }
  // strona tekstu: maska, której piksele najbardziej odstają jasnością od tła (odstępy między literami też są
  // „cienkimi kreskami”, ale mają jasność tła)
  // próg względem lokalnego maksimum odpowiedzi (okno ~3 litery): litery na jaśniejszym kawałku tła mają słabszą
  // odpowiedź niż reszta wiersza, ale wciąż wyraźnie odstają od swojego otoczenia
  const norm = arr => {
    const loc = minmax(arr, w, h, r * 3, true), out = new Float32Array(n);
    for (let k = 0; k < n; k++) out[k] = arr[k] > 0.025 ? arr[k] / Math.max(0.04, loc[k]) : 0;
    return out;
  };
  const mask = arr => { const v = []; for (let k = 0; k < n; k++) if (arr[k] > 0.45) v.push(L[k]); return { cut: 0.45, v }; };
  white.set(norm(white)); black.set(norm(black));
  const mw = mask(white), mb = mask(black);
  // tło odniesienia = płaskie piksele (żadna maska nie reaguje) w pobliżu liter - dla napisu w przycisku to przycisk,
  // nie strona wokół. Tekst = maska, która najbardziej od niego odstaje (przerwy między literami mają jego jasność).
  const any = new Uint8Array(n); for (let k = 0; k < n; k++) any[k] = white[k] > 0.45 || black[k] > 0.45 ? 1 : 0;
  const dAny = distance(any, w, h), flat = [];
  for (let k = 0; k < n; k++) if (!any[k] && white[k] < 0.2 && black[k] < 0.2 && dAny[k] <= r * 2) flat.push(L[k]);
  const bgRef = flat.length > n * 0.02 ? median(flat) : cBg;
  const off = m => (m.v.length ? Math.abs(Math.sqrt(median(m.v)) - Math.sqrt(bgRef)) : 0);
  let up = off(mw) >= off(mb);
  // obie maski wyraźne (np. biały tekst z czarnym obrysem lub cieniem): tekst to ta, która rzadziej dotyka tła -
  // obrys i cień otaczają litery, więc to one stykają się z tłem
  if (Math.min(off(mw), off(mb)) > 0.15 && Math.min(mw.v.length, mb.v.length) > n * 0.005) {
    const touch = arr => {
      let t = 0, c = 0;
      for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
        const k = j * w + i;
        if (arr[k] <= 0.45) continue;
        c++;
        if ([k - 1, k + 1, k - w, k + w].some(q => white[q] <= 0.45 && black[q] <= 0.45)) t++;
      }
      return c ? t / c : 1;
    };
    up = touch(white) <= touch(black);
  }
  const th = up ? white : black, { cut } = up ? mw : mb;
  const text = new Uint8Array(n), halo = new Uint8Array(n);
  let vals = [];
  for (let k = 0; k < n; k++) if (th[k] > cut) { text[k] = 1; vals.push(L[k]); }
  // wąska poświata albo obrys tego samego tonu wpada do maski: dwie grupy jasności, grupa bliższa tłu (gdy duża)
  // to poświata - tekstem zostaje grupa skrajna
  if (vals.length > 20) {
    const vs = Float32Array.from(vals).sort();
    const [cNear, cFar] = up ? kmeans2(vals, pct(vs, 0.05), pct(vs, 0.95)) : kmeans2(vals, pct(vs, 0.95), pct(vs, 0.05));
    let nFar = 0, nNear = 0;
    for (const v of vals) if (Math.abs(v - cFar) < Math.abs(v - cNear)) nFar++; else nNear++;
    if (ratio(cNear, cFar) > 1.25 && nNear >= nFar * 0.6 && nFar >= vals.length * 0.08) {
      vals = [];
      for (let k = 0; k < n; k++) if (text[k] && Math.abs(L[k] - cNear) < Math.abs(L[k] - cFar)) { text[k] = 0; halo[k] = 1; } else if (text[k]) vals.push(L[k]);
    }
  }
  // tylko główny pas wierszy z literami: paski tła strony nad i pod przyciskiem (węższe niż okno) też dają
  // odpowiedź, ale są oddzielone od liter rzędami bez tekstu - zostaje pas o największej liczbie pikseli
  // poziome odcinki dłuższe niż ~1,2 wysokości zaznaczenia to pas tła, nie kreska litery
  const longRun = Math.max(40, h * 1.2);
  for (let j = 0; j < h; j++) for (let i = 0; i < w;) {
    if (!text[j * w + i]) { i++; continue; }
    let e = i; while (e < w && text[j * w + e]) e++;
    if (e - i > longRun) for (let q = i; q < e; q++) text[j * w + q] = 0;
    i = e;
  }
  // wiersz liczony po liczbie odcinków (litery = wiele krótkich kresek), nie po liczbie pikseli
  const rowCount = new Int32Array(h), rowRuns = new Int32Array(h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (text[j * w + i]) { rowCount[j]++; if (!i || !text[j * w + i - 1]) rowRuns[j]++; }
  const minRow = Math.max(2, w * 0.01), bands = [];
  for (let j = 0, start = -1, sum = 0, gap = 0; j <= h; j++) {
    const on = j < h && rowCount[j] >= minRow;
    if (on) { if (start < 0) { start = j; sum = 0; } sum += rowRuns[j]; gap = 0; }
    else if (start >= 0 && (++gap > Math.max(2, h * 0.04) || j === h)) { bands.push([start, j - gap, sum]); start = -1; gap = 0; }
  }
  if (bands.length > 1) {
    const [b0, b1] = bands.sort((x, y) => y[2] - x[2])[0];
    for (let k = 0; k < n; k++) { const j = (k / w) | 0; if (text[k] && (j < b0 || j > b1)) text[k] = 0; }
  }
  vals = []; for (let k = 0; k < n; k++) if (text[k]) vals.push(L[k]);
  // poświata/cień tego samego tonu poza literami
  for (let k = 0; k < n; k++) if (!text[k] && (up ? L[k] > bgRef * 1.25 + 0.01 : L[k] < (bgRef - 0.01) / 1.25)) halo[k] = 1;
  return { L, text, halo, cText: vals.length ? median(vals) : cBg, cBg: bgRef };
}

// Odległość (w pikselach, chamfer 1 / 1,41 - prawie okrągła) od najbliższego piksela maski - dwa przejścia
function distance(mask, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let k = 0; k < d.length; k++) d[k] = mask[k] ? 0 : INF;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i; let v = d[k];
    if (i) v = Math.min(v, d[k - 1] + 1); if (j) v = Math.min(v, d[k - w] + 1);
    if (i && j) v = Math.min(v, d[k - w - 1] + 1.41); if (j && i < w - 1) v = Math.min(v, d[k - w + 1] + 1.41);
    d[k] = v;
  }
  for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
    const k = j * w + i; let v = d[k];
    if (i < w - 1) v = Math.min(v, d[k + 1] + 1); if (j < h - 1) v = Math.min(v, d[k + w] + 1);
    if (i < w - 1 && j < h - 1) v = Math.min(v, d[k + w + 1] + 1.41); if (j < h - 1 && i) v = Math.min(v, d[k + w - 1] + 1.41);
    d[k] = v;
  }
  return d;
}

export function analyze(img, boxIn, level = 'AA') {
  const box = clampBox(img, boxIn), { w, h } = box;
  const { L, text, halo, cText, cBg } = split(img, box);
  // rdzeń liter (bez wygładzonych krawędzi) - z niego kolor tekstu
  const core = [], coreRGB = [0, 0, 0];
  const mid = (cText + cBg) / 2, lightText = cText > cBg;
  for (let k = 0; k < L.length; k++) {
    if (!text[k] || (lightText ? L[k] < (cText + mid) / 2 : L[k] > (cText + mid) / 2)) continue;
    core.push(L[k]);
    const o = ((box.y + Math.floor(k / w)) * img.width + box.x + (k % w)) * 4;
    coreRGB[0] += img.data[o]; coreRGB[1] += img.data[o + 1]; coreRGB[2] += img.data[o + 2];
  }
  const nCore = Math.max(1, core.length);
  const textRGB = coreRGB.map(v => Math.round(v / nCore));
  const Lt = core.length ? median(core) : cText;

  // wysokość liter: rzędy z co najmniej kilkoma pikselami tekstu
  let top = -1, bottom = -1;
  for (let j = 0; j < h; j++) {
    let c = 0; for (let i = 0; i < w; i++) c += text[j * w + i];
    if (c >= Math.max(2, w * 0.004)) { if (top < 0) top = j; bottom = j; }
  }
  const textH = top < 0 ? 0 : bottom - top + 1;
  const ring = Math.max(2, Math.round(textH * 0.12));
  const dist = distance(text, w, h);
  // tło liczone w paśmie tuż przy literach (to ono decyduje o czytelności), nie w całym zaznaczeniu
  const band = ring + Math.max(4, Math.round(textH * 0.6));
  const near = [], far = [];
  // fragmenty liter, które nie weszły do maski (cienkie końcówki, kreski znaków), leżą tuż przy literach
  // i mają jasność tekstu - nie liczymy ich jako tła; jasne plamy tła dalej od liter liczą się normalnie
  const fragment = k => !halo[k] && dist[k] <= ring * 2 && (lightText ? L[k] > mid : L[k] < mid);
  for (let k = 0; k < L.length; k++) {
    if (text[k] || fragment(k)) continue;
    if (dist[k] <= ring) near.push(L[k]); else if (dist[k] <= band) far.push(L[k]);
  }
  const bgAll = Float32Array.from(far.length > 20 ? far : near).sort();
  const Lb = bgAll.length ? pct(bgAll, 0.5) : cBg;
  // najsłabsze miejsce tła: percentyl najbliższy jasności tekstu
  const Lworst = bgAll.length ? pct(bgAll, lightText ? 0.95 : 0.05) : cBg;
  const Lnear = near.length ? median(near) : Lb;

  const typical = ratio(Lt, Lb), worst = ratio(Lt, Lworst), edge = ratio(Lt, Lnear);
  const fontPx = textH / 0.95;   // od góry wydłużeń do dołu ogonków ≈ 0,95 wielkości pisma (wersaliki dają zaniżoną - ostrożniej)
  const large = fontPx >= LARGE_PX;
  const target = TARGETS[level][large ? 'large' : 'normal'];

  const issues = [];
  const spread = bgAll.length ? ratio(pct(bgAll, 0.05), pct(bgAll, 0.95)) : 1;
  const nearToText = Math.abs(Lnear - Lt) < Math.abs(Lb - Lt) * 0.75;   // pierścień bliżej tekstu niż tło
  const nearAway = Math.abs(Lnear - Lt) > Math.abs(Lb - Lt) * 1.15;    // pierścień bardziej odcięty niż tło
  if (Math.min(worst, edge) < target) issues.push('low');
  const busy = spread > 2;   // tło pod tekstem mocno niejednolite (zdjęcie, gradient)
  if (busy && worst < target) issues.push('busy');
  // cień / poświata oceniane tylko na w miarę jednolitym tle - na zdjęciu pierścień i tło mieszają się
  if (!busy && nearToText && ratio(Lnear, Lb) > 1.25) issues.push('halo');
  else if (!busy && nearAway && ratio(Lnear, Lb) > 1.25) issues.push('shadowOk');
  if (!large && textH > 0 && fontPx < 14) issues.push('small');
  if (!issues.some(i => i !== 'shadowOk')) issues.push('ok');

  return {
    box, textH: Math.round(fontPx), large, target, lightText,
    textRGB, Lt, Lb, Lworst, Lnear,
    typical: +typical.toFixed(2), worst: +worst.toFixed(2), edge: +edge.toFixed(2),
    score: +Math.min(worst, edge).toFixed(2), pass: Math.min(worst, edge) >= target, issues,
  };
}

// Poprawka zaznaczenia: mode 'auto' (najpierw tekst, potem tło), 'text' albo 'bg'. Zwraca dane obrazu,
// analizę przed i po oraz opis zmian. Przyciemnienie (rozjaśnienie) tła dostrajane w kilku krokach, aż najsłabsze
// miejsce osiągnie próg - na zdjęciowym tle jedno przeliczenie nie wystarcza.
export function fix(img, boxIn, { level = 'AA', mode = 'auto' } = {}) {
  const a = analyze(img, boxIn, level);
  if (a.pass) return { data: new Uint8ClampedArray(img.data), before: a, after: a, changes: { text: null, bg: null } };   // spełnia - bez zmian
  const box = a.box, { w, h } = box, T = a.target * 1.04;   // mały zapas nad progiem
  const { text, cText, cBg } = split(img, box);
  const light = a.lightText;

  // 1) tekst: jasność, która przy najsłabszym tle daje T z zapasem (albo skrajna - biel/czerń). W trybie auto
  //    najpierw zmieniamy tekst - to najmniej ingeruje w kreację - a tło tylko domyka resztę, najwyżej o 60%.
  let Lt2 = a.Lt;
  const Tt = mode === 'auto' ? T * 1.15 : T;
  if (mode !== 'bg') {
    const need = light ? Tt * (Math.max(a.Lworst, a.Lnear) + 0.05) - 0.05 : (Math.min(a.Lworst, a.Lnear) + 0.05) / Tt - 0.05;
    Lt2 = light ? Math.min(1, Math.max(a.Lt, need)) : Math.max(0, Math.min(a.Lt, need));
  }
  let floor = mode === 'auto' ? 0.4 : 0;
  // 2) tło: współczynnik, który domyka resztę (przyciemnienie dla jasnego tekstu, rozjaśnienie dla ciemnego)
  let f = 1;
  const bgRef = light ? Math.max(a.Lworst, a.Lnear) : Math.min(a.Lworst, a.Lnear);
  if (mode !== 'text' && ratio(Lt2, bgRef) < T) {
    f = light ? ((Lt2 + 0.05) / T - 0.05) / Math.max(1e-4, bgRef) : (1 - (T * (Lt2 + 0.05) - 0.05)) / Math.max(1e-4, 1 - bgRef);
    f = Math.min(1, Math.max(floor, f));
  }

  // rdzeń liter = maska tekstu z top-hatu (bez poświaty i plam tła) - tylko te piksele przemalowujemy
  const letterH = Math.max(4, Math.round(a.textH * 0.95));
  const ring = Math.max(2, Math.round(letterH * 0.12));
  const r0 = ring + Math.max(4, Math.round(letterH * 0.6)), r1 = r0 + Math.max(8, Math.round(letterH * 0.8));
  // obszar roboczy = zaznaczenie + margines na miękkie wygaszenie przyciemnienia
  const X0 = Math.max(0, box.x - r1), Y0 = Math.max(0, box.y - r1);
  const X1 = Math.min(img.width, box.x + w + r1), Y1 = Math.min(img.height, box.y + h + r1);
  const EW = X1 - X0, EH = Y1 - Y0, core = new Uint8Array(EW * EH);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i;
    if (text[k]) core[(box.y - Y0 + j) * EW + (box.x - X0 + i)] = 1;
  }
  const dist = distance(core, EW, EH);
  const tlin = a.textRGB.map(v => LIN[v]);
  // kolor tekstu: miks z bielą (jasny tekst) albo czernią (ciemny) - odcień zostaje, jasność = Lt2
  const targetFor = lt => {
    const mixT = light ? (lt - a.Lt) / Math.max(1e-4, 1 - a.Lt) : 1 - lt / Math.max(1e-4, a.Lt);
    return tlin.map(v => (light ? v + (1 - v) * mixT : v * (1 - mixT)));
  };
  const smooth = x => x * x * (3 - 2 * x);
  // mapa przyciemnienia: pełne do r0, miękko do zera w r1, potem rozmyta (dwa przejścia uśredniania),
  // żeby nie odrysowywała kształtu liter
  let fallMap = new Float32Array(EW * EH);
  for (let e = 0; e < fallMap.length; e++) fallMap[e] = dist[e] <= r0 ? 1 : dist[e] >= r1 ? 0 : 1 - smooth((dist[e] - r0) / (r1 - r0));
  const rb = Math.max(2, Math.round(letterH * 0.35));
  const blur = (src, horiz) => {
    const dst = new Float32Array(src.length), len = horiz ? EW : EH, lines = horiz ? EH : EW;
    for (let l = 0; l < lines; l++) {
      let acc = 0, cnt = 0;
      const at = q => (horiz ? l * EW + q : q * EW + l);
      for (let q = 0; q < Math.min(len, rb); q++) { acc += src[at(q)]; cnt++; }
      for (let q = 0; q < len; q++) {
        if (q + rb < len) { acc += src[at(q + rb)]; cnt++; }
        if (q - rb - 1 >= 0) { acc -= src[at(q - rb - 1)]; cnt--; }
        dst[at(q)] = acc / cnt;
      }
    }
    return dst;
  };
  for (let pass = 0; pass < 2; pass++) fallMap = blur(blur(fallMap, true), false);
  // płytka: tło pod tekstem to zamknięty kształt w jednym kolorze (przycisk, etykieta, pasek) - wtedy zmieniamy
  // równo cały kształt zamiast przyciemniać wzdłuż liter. Kolor odniesienia = mediana pikseli tuż przy literach;
  // jeśli kształt dotyka brzegu obszaru roboczego (tło ciągnie się dalej, np. cała strona), zostaje przyciemnienie.
  let plateRGB = null;
  if (!a.issues.includes('busy')) {
    const ref = [[], [], []];
    for (let e = 0; e < core.length; e++) if (!core[e] && dist[e] > 1 && dist[e] <= ring + 2) {
      const X = X0 + (e % EW), Y = Y0 + ((e / EW) | 0), o = (Y * img.width + X) * 4;
      for (let c = 0; c < 3; c++) ref[c].push(img.data[o + c]);
    }
    const rc = ref.map(median);
    const like = e => {
      const X = X0 + (e % EW), Y = Y0 + ((e / EW) | 0), o = (Y * img.width + X) * 4;
      return Math.hypot(img.data[o] - rc[0], img.data[o + 1] - rc[1], img.data[o + 2] - rc[2]) < 24;
    };
    const plate = new Uint8Array(core.length), stack = [];
    for (let e = 0; e < core.length; e++) if (!core[e] && dist[e] <= ring + 2 && like(e)) { plate[e] = 1; stack.push(e); }
    let open = false;
    while (stack.length && !open) {
      const e = stack.pop(), ex = e % EW, ey = (e / EW) | 0;
      if (ex === 0 || ey === 0 || ex === EW - 1 || ey === EH - 1) { open = true; break; }
      for (const q of [e - 1, e + 1, e - EW, e + EW]) if (!plate[q] && (core[q] || dist[q] <= 1 || like(q))) { plate[q] = 1; stack.push(q); }
    }
    if (!open && ref[0].length) { fallMap = Float32Array.from(plate); plateRGB = rc; }
  }
  const apply = (factor, lt) => {
    const textTarget = targetFor(lt);
    const out = new Uint8ClampedArray(img.data);
    for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) {
      const e = (Y - Y0) * EW + (X - X0), d = dist[e];
      if (fallMap[e] < 0.002 && !core[e]) continue;
      const o = (Y * img.width + X) * 4;
      // tekst: rdzeń w pełni, piksel krawędzi (1 px) częściowo wg jasności
      let t = core[e] ? 1 : 0;
      if (!t && d <= 1) { const l = luminance(img.data[o], img.data[o + 1], img.data[o + 2]); t = Math.min(1, Math.max(0, (l - cBg) / ((cText - cBg) || 1e-4))); }
      // tło: przyciemnienie wzdłuż kształtu liter - pełne do r0, potem miękko do zera w r1
      const bgK = 1 - (1 - factor) * fallMap[e];
      for (let c = 0; c < 3; c++) {
        const v0 = LIN[img.data[o + c]];
        const bgv = light ? v0 * bgK : 1 - (1 - v0) * bgK;
        out[o + c] = gam(mode === 'bg' ? bgv * (1 - t) + v0 * t : bgv * (1 - t) + textTarget[c] * t);
      }
    }
    return out;
  };
  // dostrajanie: najpierw tło (do limitu), potem tekst dalej w stronę bieli/czerni - maks. 8 kroków
  let out = apply(f, Lt2), after = analyze({ data: out, width: img.width, height: img.height }, box, level);
  for (let i = 0; i < 8 && after.score < a.target; i++) {
    if (mode !== 'text' && f > floor + 0.001) {
      const ref = light ? Math.max(after.Lworst, after.Lnear) : Math.min(after.Lworst, after.Lnear);
      const want = light ? (after.Lt + 0.05) / T - 0.05 : T * (after.Lt + 0.05) - 0.05;
      const k = light ? want / Math.max(1e-4, ref) : (1 - want) / Math.max(1e-4, 1 - ref);
      f = Math.max(floor, f * Math.min(0.95, Math.max(0, k)));
    } else if (mode !== 'bg' && Math.abs(Lt2 - (light ? 1 : 0)) > 0.002) {
      Lt2 = light ? Lt2 + (1 - Lt2) * 0.5 : Lt2 * 0.5;
    } else if (floor > 0.1) floor = 0.1;   // tekst już biały/czarny: tło może zmienić się mocniej (np. przycisk)
    else break;
    out = apply(f, Lt2);
    after = analyze({ data: out, width: img.width, height: img.height }, box, level);
  }
  return {
    data: out, before: a, after,
    changes: {
      text: Math.abs(Lt2 - a.Lt) > 0.005 ? { hex: hex(targetFor(Lt2).map(gam)), lighter: light } : null,
      bg: f < 0.995 ? {
        pct: Math.round((1 - f) * 100), darker: light,
        plate: plateRGB ? hex(plateRGB.map(v => gam(light ? LIN[v] * f : 1 - (1 - LIN[v]) * f))) : null,
      } : null,
    },
  };
}

// Propozycje obszarów z tekstem: krawędzie (Sobel) → domknięcie w poziomie → spójne składowe o kształcie wiersza
export function detect(img, maxBoxes = 8) {
  const s = Math.min(1, 640 / Math.max(img.width, img.height));
  const W = Math.max(8, Math.round(img.width * s)), H = Math.max(8, Math.round(img.height * s));
  const G = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const o = (Math.min(img.height - 1, Math.round(j / s)) * img.width + Math.min(img.width - 1, Math.round(i / s))) * 4;
    G[j * W + i] = luminance(img.data[o], img.data[o + 1], img.data[o + 2]) ** (1 / 2.2);
  }
  const E = new Uint8Array(W * H);
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    const k = j * W + i;
    const gx = G[k - W + 1] + 2 * G[k + 1] + G[k + W + 1] - G[k - W - 1] - 2 * G[k - 1] - G[k + W - 1];
    const gy = G[k + W - 1] + 2 * G[k + W] + G[k + W + 1] - G[k - W - 1] - 2 * G[k - W] - G[k - W + 1];
    E[k] = Math.hypot(gx, gy) > 0.45 ? 1 : 0;
  }
  // domknięcie: rozszerzenie w poziomie łączy litery w wiersze
  const R = Math.max(2, Math.round(W * 0.012)), M = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    let last = -1e9;
    for (let i = 0; i < W; i++) if (E[j * W + i]) { if (i - last <= R * 2) for (let q = last + 1; q < i; q++) M[j * W + q] = 1; M[j * W + i] = 1; last = i; }
  }
  const seen = new Uint8Array(W * H), boxes = [];
  for (let k = 0; k < M.length; k++) {
    if (!M[k] || seen[k]) continue;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0, edges = 0;
    const stack = [k]; seen[k] = 1;
    while (stack.length) {
      const p = stack.pop(), px = p % W, py = (p - px) / W;
      area++; edges += E[p];
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < M.length && M[q] && !seen[q] && Math.abs((q % W) - px) <= 1) { seen[q] = 1; stack.push(q); }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (bh < 4 || bh > H * 0.3 || bw < bh * 1.2 || bw < 12) continue;
    const density = edges / (bw * bh);
    if (density < 0.08 || density > 0.7) continue;
    boxes.push({ x: x0, y: y0, w: bw, h: bh, score: edges });
  }
  // sklej wiersze leżące jeden pod drugim (akapit, nagłówek w dwóch liniach)
  boxes.sort((a, b) => a.y - b.y);
  const merged = [];
  for (const b of boxes) {
    const m = merged.find(o => b.y - (o.y + o.h) < Math.max(o.h, b.h) * 0.6 && b.x < o.x + o.w && o.x < b.x + b.w);
    if (m) { const x = Math.min(m.x, b.x), y = Math.min(m.y, b.y); m.w = Math.max(m.x + m.w, b.x + b.w) - x; m.h = Math.max(m.y + m.h, b.y + b.h) - y; m.x = x; m.y = y; m.score += b.score; }
    else merged.push({ ...b });
  }
  return merged.sort((a, b) => b.score - a.score).slice(0, maxBoxes).map(b => {
    const p = Math.max(2, Math.round(b.h * 0.25));
    return clampBox(img, { x: (b.x - p) / s, y: (b.y - p) / s, w: (b.w + 2 * p) / s, h: (b.h + 2 * p) / s });
  });
}
