// Kontrast checker (panel #kontrast): grafika (plik, przeciągnięcie albo wklejony zrzut ekranu) → zaznaczenia tekstu
// (wykryte albo narysowane) → analiza i poprawka (contrast-core.js) → przed/po, karty tekstów, pobranie PNG.
// Wszystko w przeglądarce. Teksty: content[lang].contrast.
import { analyze, fix, detect, hex } from './contrast-core.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const MAX = 2400;   // dłuższy bok analizowanej grafiki

export function initContrast(root, { copy: C }) {
  if (root.__contrast) return;
  root.__contrast = true;
  const zone = root.querySelector('[data-ct="zone"]'), input = root.querySelector('[data-ct="input"]');
  const work = root.querySelector('[data-ct="work"]');
  let name = 'grafika', src = null, out = null, regions = [], level = 'AA', mode = 'auto', view = 'after', seq = 0;

  // --- wczytanie --------------------------------------------------------------------------------------------
  async function load(file) {
    if (!file?.type.startsWith('image/')) return;
    name = (file.name || 'grafika').replace(/\.[^.]+$/, '');
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return;
    const s = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const c = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    src = { data: d.data, width: c.width, height: c.height };
    regions = detect(src).map(box => ({ id: ++seq, box }));
    zone.hidden = true;
    work.hidden = false;
    compute();
    build();
  }
  input.addEventListener('change', () => { load(input.files[0]); input.value = ''; });
  for (const ev of ['dragenter', 'dragover']) zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('is-over'); });
  for (const ev of ['dragleave', 'drop']) zone.addEventListener(ev, () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', e => { e.preventDefault(); load(e.dataTransfer.files[0]); });
  document.addEventListener('paste', e => {
    if (location.hash !== '#kontrast') return;
    const item = [...(e.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); load(item.getAsFile()); }
  });

  // --- analiza: poprawki nakładane po kolei na kopię, każda strefa ma wynik przed i po -----------------------
  function compute() {
    let cur = src;
    for (const r of regions) {
      r.res = fix(cur, r.box, { level, mode });
      r.before = analyze(src, r.box, level);
      cur = { data: r.res.data, width: src.width, height: src.height };
    }
    out = cur;
  }

  // --- widok ---------------------------------------------------------------------------------------------------
  const seg = (key, opts, current) => `<span class="ct__seg" role="group">${Object.entries(opts).map(([v, label]) => `
          <button class="ck__chip-btn${v === current ? ' is-on' : ''}" type="button" data-${key}="${v}" aria-pressed="${v === current}">${esc(label)}</button>`).join('')}</span>`;

  function build() {
    work.innerHTML = `
      <div class="ct__bar">
        <span class="t-meta">${esc(C.level)}</span>${seg('level', { AA: 'AA', AAA: 'AAA' }, level)}
        <span class="t-meta">${esc(C.mode)}</span>${seg('mode', C.modes, mode)}
        ${seg('view', { before: C.before, after: C.after }, view)}
      </div>
      <div class="ct__stage" data-ct="stage">
        <canvas class="ct__canvas" data-ct="canvas"></canvas>
        <div class="ct__boxes" data-ct="boxes"></div>
      </div>
      <p class="t-meta ct__hint" data-ct="hint"></p>
      <div class="ck__row">
        <button class="ck__opt ck__opt--go" type="button" data-act="download">${esc(C.download)}</button>
        <button class="ck__opt" type="button" data-act="detect">${esc(C.detect)}</button>
        <button class="ck__link" type="button" data-act="another">${esc(C.another)}</button>
      </div>
      <ul class="ct__list" data-ct="list"></ul>`;
    paint();
  }

  function paint() {
    const canvas = work.querySelector('[data-ct="canvas"]');
    canvas.width = src.width; canvas.height = src.height;
    const show = view === 'after' ? out : src;
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(show.data), src.width, src.height), 0, 0);
    work.querySelector('[data-ct="boxes"]').innerHTML = regions.map((r, i) => {
      const b = r.box, ok = (view === 'after' ? r.res.after : r.before).pass;
      return `<span class="ct__box${ok ? ' is-ok' : ''}" style="left:${(b.x / src.width) * 100}%;top:${(b.y / src.height) * 100}%;width:${(b.w / src.width) * 100}%;height:${(b.h / src.height) * 100}%"><i>${i + 1}</i></span>`;
    }).join('');
    work.querySelector('[data-ct="hint"]').textContent = regions.length ? C.hint : `${C.none} ${C.hint}`;
    work.querySelector('[data-ct="list"]').innerHTML = regions.map(card).join('');
    for (const r of regions) crops(r);
  }

  const comma = document.documentElement.lang !== 'en';
  const fmt = v => (Math.round(v * 10) / 10).toString().replace('.', comma ? ',' : '.');
  function card(r, i) {
    const a = r.before, f = r.res, ch = f.changes;
    const verdict = a.pass ? fill(C.pass, { level }) : fill(C.fail, { level, min: fmt(a.target) });
    const changes = [
      ch.text && fill(C.changes.text, { dir: ch.text.lighter ? C.changes.lighter : C.changes.darker, hex: ch.text.hex }),
      ch.bg && fill(ch.bg.plate ? C.changes.plate : C.changes.bg, { dir: ch.bg.darker ? C.changes.bgDarker : C.changes.bgLighter, pct: ch.bg.pct, hex: ch.bg.plate }),
    ].filter(Boolean);
    return `
        <li class="ct__item${a.pass ? ' is-ok' : ''}" data-id="${r.id}">
          <div class="ct__head">
            <p><span class="ct__no">${i + 1}</span> ${esc(fill(C.region, { n: i + 1 }))} <span class="t-meta">${esc(fill(C.size, { px: a.textH }))} · ${esc(a.large ? C.large : C.normal)} · ${esc(C.textColor)} <span class="ct__sw" style="background:${hex(a.textRGB)}"></span>${hex(a.textRGB)}</span></p>
            <button class="ck__link" type="button" data-act="remove">${esc(C.remove)}</button>
          </div>
          <div class="ct__crops"><figure><canvas data-crop="before"></canvas><figcaption class="t-meta">${esc(C.before)}</figcaption></figure><figure><canvas data-crop="after"></canvas><figcaption class="t-meta">${esc(C.after)}</figcaption></figure></div>
          <dl class="ct__nums">
            <div><dt class="t-meta">${esc(C.typical)}</dt><dd>${fmt(a.typical)}:1</dd></div>
            <div><dt class="t-meta">${esc(C.worst)}</dt><dd>${fmt(a.worst)}:1</dd></div>
            <div><dt class="t-meta">${esc(C.edge)}</dt><dd>${fmt(a.edge)}:1</dd></div>
          </dl>
          <p class="ct__verdict">${esc(verdict)}${a.pass ? '' : ` <span class="t-meta">${esc(fill(C.afterFix, { r: fmt(f.after.score) }))}</span>`}</p>
          <ul class="ck__list">${a.issues.map(k => `<li>${esc(C.issues[k])}</li>`).join('')}${(a.pass ? [] : changes.length ? changes : [C.changes.none]).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        </li>`;
  }

  // wycinek zaznaczenia przed i po (z zapasem wokół)
  function crops(r) {
    const li = work.querySelector(`[data-id="${r.id}"]`);
    const p = Math.round(r.box.h * 0.3), b = r.box;
    const x = Math.max(0, b.x - p), y = Math.max(0, b.y - p), w = Math.min(src.width - x, b.w + 2 * p), h = Math.min(src.height - y, b.h + 2 * p);
    for (const [kind, img] of [['before', src], ['after', out]]) {
      const c = li.querySelector(`[data-crop="${kind}"]`);
      c.width = w; c.height = h;
      const tmp = new ImageData(new Uint8ClampedArray(img.data), src.width, src.height);
      c.getContext('2d').putImageData(tmp, -x, -y, x, y, w, h);
    }
  }

  // --- rysowanie zaznaczeń ------------------------------------------------------------------------------------
  let drag = null;
  work.addEventListener('pointerdown', e => {
    const stage = e.target.closest('[data-ct="stage"]');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const pt = ev => ({ x: Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)) * src.width, y: Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height)) * src.height });
    drag = { start: pt(e), pt, el: Object.assign(document.createElement('span'), { className: 'ct__box ct__box--draw' }) };
    stage.querySelector('[data-ct="boxes"]').append(drag.el);
    stage.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  work.addEventListener('pointermove', e => {
    if (!drag) return;
    const a = drag.start, b = drag.pt(e);
    drag.box = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
    Object.assign(drag.el.style, { left: `${(drag.box.x / src.width) * 100}%`, top: `${(drag.box.y / src.height) * 100}%`, width: `${(drag.box.w / src.width) * 100}%`, height: `${(drag.box.h / src.height) * 100}%` });
  });
  work.addEventListener('pointerup', () => {
    if (!drag) return;
    const box = drag.box; drag = null;
    if (box && box.w > 8 && box.h > 6) { regions.push({ id: ++seq, box }); compute(); }
    paint();
  });

  work.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const d = btn.dataset;
    if (d.level) { level = d.level; compute(); build(); }
    else if (d.mode) { mode = d.mode; compute(); build(); }
    else if (d.view) { view = d.view; build(); }
    else if (d.act === 'remove') { regions = regions.filter(r => r.id !== Number(btn.closest('[data-id]').dataset.id)); compute(); paint(); }
    else if (d.act === 'detect') { regions = detect(src).map(box => ({ id: ++seq, box })); compute(); paint(); }
    else if (d.act === 'another') { work.hidden = true; zone.hidden = false; src = out = null; regions = []; work.innerHTML = ''; }
    else if (d.act === 'download') {
      const c = Object.assign(document.createElement('canvas'), { width: src.width, height: src.height });
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(out.data), src.width, src.height), 0, 0);
      c.toBlob(blob => {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name}-kontrast.png` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    }
  });
}
