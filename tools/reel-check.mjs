// Testy akceptacyjne planszy animowanej teraz („Dwie role, jedna rozmowa”) - specyfikacja, sekcja 10.
//   npm run check-reel                                   wszystko (ok. 2 min)
//   npm run check-reel -- --only=visual,gate --lang=pl   wybrane grupy / język
//   npm run check-reel -- --only=visual --frames=sheet-375x667,home-1440x900
// Grupy: visual (klatki, szew, pętla, formaty, rozmiary), gate, dwell, lang, toggle, reduced, flash,
//        budget, network, nojs, dark, layout.
// Własny serwer (port 8601, dev: index.html renderowany na żywo z content.js) i Chromium z Playwright.
// Przewijanie czasu: wszystkie animacje stoją; ścieżki reela dostają currentTime = t,
// aurora i dryf pól (aurora, reel-drift-*, reel-swell) zawsze 9000 ms - kadr jest powtarzalny.
// Zrzuty z błędami: /private/tmp/claude-501/reel-qa/check/ (zmienna REEL_QA_DIR zmienia katalog).
// Kod wyjścia 1 = któryś test nie przeszedł.
// Test testów: REEL_CHECK_INJECT='.reel__chip{font-size:10px!important}' dokleja CSS do każdej strony z JS
// - asercja, która ma złapać taki błąd, musi pokazać ✗.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { serve } from './serve.mjs';

const PORT = Number(process.env.REEL_CHECK_PORT) || 8601;
const BASE = `http://localhost:${PORT}/`;
const OUT = process.env.REEL_QA_DIR || '/private/tmp/claude-501/reel-qa/check';
const SNAP = join(OUT, 'snapshots');
const REEL_MS = 8000;
const INJECT = process.env.REEL_CHECK_INJECT || '';

const args = process.argv.slice(2);
const opt = k => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ONLY = opt('only')?.split(',').filter(Boolean);
const LANGS = opt('lang')?.split(',').filter(Boolean) ?? ['pl', 'en'];
const FRAME_IDS = opt('frames')?.split(',').filter(Boolean);
const run = key => !ONLY || ONLY.includes(key);

// Czasy klatek (ms) i kadry ze specyfikacji: [szer. okna, wys. okna] → oczekiwany rozmiar reela.
const TIMES = [0, 500, 1000, 1500, 2200, 3000, 3800, 4500, 5000, 5600, 6300, 7000, 7300, 7900];
const FRAMES = [
  { id: 'home-1440x900', vw: 1440, vh: 900, kind: 'home', fmt: '4x5', size: [487, 609] },
  { id: 'home-1024x768', vw: 1024, vh: 768, kind: 'home', fmt: '4x5', size: [423, 529] },   // niski desktop (max-height 780px)
  { id: 'home-1366x768', vw: 1366, vh: 768, kind: 'home', fmt: '4x5', size: [423, 529] },
  { id: 'home-1280x800', vw: 1280, vh: 800, kind: 'home', fmt: '4x5', size: [455, 569] },  // niski desktop (max-height 840px)
  { id: 'sheet-768x1024', vw: 768, vh: 1024, kind: 'sheet', fmt: '4x5', size: [676, 845] },
  { id: 'sheet-1024x1366', vw: 1024, vh: 1366, kind: 'sheet', fmt: '4x5', size: [901, 1126] },
  { id: 'sheet-1440x900', vw: 1440, vh: 900, kind: 'sheet', fmt: '16x9', size: [1243, 699] },
  { id: 'sheet-1920x1080', vw: 1920, vh: 1080, kind: 'sheet', fmt: '16x9', size: [1280, 720] },
  { id: 'sheet-1024x768', vw: 1024, vh: 768, kind: 'sheet', fmt: '16x9', size: [901, 507] },
  { id: 'sheet-844x390', vw: 844, vh: 390, kind: 'sheet', fmt: '16x9', size: [564, 317], minH: 300 },
  { id: 'sheet-667x375', vw: 667, vh: 375, kind: 'sheet', fmt: '16x9', size: [537, 302] },
  { id: 'sheet-568x320', vw: 568, vh: 320, kind: 'sheet', fmt: '16x9', size: [439, 247], compact: true },
  { id: 'sheet-430x932', vw: 430, vh: 932, kind: 'sheet', fmt: '16x9', size: [382, 215], compact: true },
  { id: 'sheet-375x667', vw: 375, vh: 667, kind: 'sheet', fmt: '16x9', size: [327, 184], compact: true, panelH: 331 },
  { id: 'sheet-320x568', vw: 320, vh: 568, kind: 'sheet', fmt: '16x9', size: [272, 153], compact: true },
];
const frame = id => FRAMES.find(f => f.id === id);

/* ---------- Raport ---------- */
const results = [];
const check = (name, ok, note = '') => {
  results.push({ name, ok, note });
  console.error(`  ${ok ? '✓' : '✗'} ${name}`);
};
const progress = s => console.error(`  … ${s}`);
const list = (a, n = 6) => (a.length <= n ? a.join('; ') : `${a.slice(0, n).join('; ')}; … +${a.length - n}`);
const consoleErrors = [];
let shots = 0;
const MAX_SHOTS = 80;

/* ---------- Pomocnicze w przeglądarce (wstrzykiwane przed skryptami strony) ---------- */
function helpers() {
  if (window.__reel) return;
  const AMB = /^(aurora|reel-drift-[ab]|reel-swell)$/;
  // Teksty ze specyfikacji, które nie mogą wejść na znaki ? i !
  const TEXT_SEL = '.reel__pill, .reel__need, .reel__line, .reel__short, .reel__sub, .reel__claim, .reel__title, .reel__cap, .reel__legend';
  // Elementy z własnym tłem: liczy się całe pole, nie tylko litery
  const BG_SEL = '.reel__pill, .reel__cap, .reel__legend > span, .reel__chip';
  const frames = (n = 2) => new Promise(res => { const f = () => (--n > 0 ? requestAnimationFrame(f) : res()); requestAnimationFrame(f); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = el => !!el && (el.checkVisibility
    ? el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true })
    : el.getClientRects().length > 0);
  const opOf = (el, stop) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      o *= parseFloat(getComputedStyle(n).opacity) || 0;
      if (n === stop) break;
    }
    return o;
  };
  const box = r => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  const hit = (a, b) => !!a && !!b
    && Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1
    && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
  const clipTo = (a, f) => {
    const x = Math.max(a.x, f.x), y = Math.max(a.y, f.y);
    const w = Math.min(a.x + a.w, f.x + f.w) - x, h = Math.min(a.y + a.h, f.y + f.h) - y;
    return w > 0 && h > 0 ? { x, y, w, h } : null;
  };
  const name = el => {
    const c = [...(el?.classList || [])].filter(k => k.startsWith('reel__'));
    return c.length ? `.${c.join('.')}` : String(el?.tagName || '?').toLowerCase();
  };
  const fmtOf = el => (String(el?.getAttribute?.('class') || '').match(/(?:reel|sheet__video)--(\w+)/) || [])[1] || null;
  const clock = reel => reel?.getAnimations().find(a => a.animationName === 'reel-clock') ?? null;
  const figures = () => [...(document.getElementById('teraz')?.querySelectorAll('.sheet__video') ?? [])];
  const previewReel = () => document.querySelector('.preview__logo[data-project="teraz"] .reel') || document.querySelector('.preview .reel');

  function target(kind) {
    if (kind === 'home') return previewReel();
    for (const f of figures()) if (vis(f) && f.querySelector('.reel')) return f.querySelector('.reel');
    return null;
  }

  const over = el => el?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  function activate(id) { over(document.querySelector(`.index__row[data-project="${id}"]`)); }

  async function ready(kind) {
    await document.fonts.ready;
    if (kind === 'home') {
      const layer = document.querySelector('.preview__logo[data-project="teraz"]');
      if (layer && !layer.classList.contains('is-active')) activate('teraz');
      over(document.querySelector('.hero__preview')); // „kursor nad podglądem” = auto-przewijanie stoi
    }
    for (let i = 0; i < 80; i++) {
      if ([...document.querySelectorAll('.reel__logo')].filter(vis).every(im => im.complete && im.naturalWidth > 0)) break;
      await sleep(50);
    }
    await frames(2);
  }

  // Przewinięcie czasu: reel → t, tło → 9000 ms, reszta strony stoi albo jest dokończona.
  async function seek(t, n = 2) {
    for (const a of document.getAnimations()) {
      try {
        if (typeof CSSTransition !== 'undefined' && a instanceof CSSTransition) { a.finish(); continue; }
        const nm = a.animationName || '';
        const el = a.effect && a.effect.target;
        if ((el && el.closest && el.closest('.reel')) || nm === 'aurora') {
          a.pause();
          a.currentTime = AMB.test(nm) ? 9000 : t;
          continue;
        }
        if (a.effect.getComputedTiming().endTime === Infinity) a.pause(); else a.finish();
      } catch { /* animacja zniknęła w trakcie */ }
    }
    await frames(n);
  }

  function textItems(reel) {
    const items = [];
    const w = document.createTreeWalker(reel, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const s = n.data.replace(/\s+/g, ' ').trim();
      const el = n.parentElement;
      if (!s || !el || !vis(el)) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const rects = [...rg.getClientRects()].filter(r => r.width > .5 && r.height > .5).map(box);
      if (!rects.length) continue;
      const host = el.closest(TEXT_SEL);
      items.push({ el, host, name: name(host || el), text: s.slice(0, 32), rects, op: opOf(el, reel), fs: parseFloat(getComputedStyle(el).fontSize) });
    }
    for (const el of reel.querySelectorAll(BG_SEL)) {
      if (!vis(el)) continue;
      const r = box(el.getBoundingClientRect());
      if (r.w < .5 || r.h < .5) continue;
      items.push({ el, host: el.closest(TEXT_SEL), name: `${name(el)} (pole)`, text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 32), rects: [r], op: opOf(el, reel), fs: null });
    }
    return items;
  }

  function measure(kind, t) {
    const reel = target(kind);
    if (!reel) return { found: false };
    const F = box(reel.getBoundingClientRect());
    const compact = F.w < 480 && F.w > F.h; // = @container reel (max-width: 479px) and (aspect-ratio > 1)
    const issues = [];
    const add = (k, msg, rects = []) => issues.push({ kind: k, msg, rects: rects.filter(Boolean) });
    const items = textItems(reel);
    const shown = items.filter(i => i.op > .05);
    const solid = items.filter(i => i.op > .5);
    const glyphs = [...reel.querySelectorAll('.reel__glyph')].filter(vis)
      .map(g => ({ name: name(g), r: clipTo(box(g.getBoundingClientRect()), F), op: opOf(g, reel) }))
      .filter(g => g.r && g.op > .1);
    const logoEl = reel.querySelector('.reel__logo');
    const logo = logoEl && vis(logoEl)
      ? { r: clipTo(box(logoEl.getBoundingClientRect()), F), op: opOf(logoEl, reel), w: logoEl.getBoundingClientRect().width }
      : null;

    // 1. Tekst (krycie > .5) nie nachodzi na widoczny znak ? / ! ani na znak teraz.
    for (const i of solid) {
      if (!i.host) continue;
      for (const r of i.rects) {
        for (const g of glyphs) if (hit(r, g.r)) add('overlap', `${i.name} „${i.text}” (${i.op.toFixed(2)}) na ${g.name} (${g.op.toFixed(2)})`, [r, g.r]);
        if (logo && logo.op > .5 && hit(r, logo.r)) add('overlap', `${i.name} „${i.text}” na .reel__logo`, [r, logo.r]);
      }
    }
    // 2. Widoczny tekst w całości w kadrze.
    for (const i of shown) {
      for (const r of i.rects) {
        if (r.x < F.x - .5 || r.y < F.y - .5 || r.x + r.w > F.x + F.w + .5 || r.y + r.h > F.y + F.h + .5) {
          add('outside', `${i.name} „${i.text}” poza kadrem`, [r, F]);
        }
      }
    }
    // 3. Najmniejszy widoczny tekst >= 12 px.
    const fsi = shown.filter(i => i.fs != null);
    const minFs = fsi.length ? Math.min(...fsi.map(i => i.fs)) : null;
    for (const i of fsi) if (i.fs < 11.99) add('font', `${i.name} „${i.text}” ${i.fs.toFixed(1)} px`, i.rects);
    // 4. Znak w nagłówku >= 72 px (4:5 i 16:9 >= 480 px, 1500-6300 ms oraz kadr stały).
    if (!compact && (t === 'rm' || (t >= 1500 && t <= 6300)) && (!logo || logo.w < 71.5)) {
      add('logo', `znak w nagłówku ${logo ? logo.w.toFixed(1) : 0} px`, logo ? [logo.r] : []);
    }
    // 5. Kompakt: najwyżej jeden blok roli naraz (w środku obu scen dokładnie jeden).
    const roles = [...reel.querySelectorAll('.reel__role')].filter(role => shown.some(i => role.contains(i.el)));
    if (compact && (roles.length > 1 || ([2200, 3800, 4500].includes(t) && roles.length !== 1))) {
      add('roles', `widoczne bloki ról: ${roles.length}`, roles.map(r => box(r.getBoundingClientRect())));
    }
    // 6. Przełącznik pauzy nie zasłania tekstu ani znaku.
    const tg = reel.parentElement?.querySelector(':scope > .reel__toggle');
    if (tg && vis(tg)) {
      const T = box(tg.getBoundingClientRect());
      for (const i of solid) for (const r of i.rects) if (hit(r, T)) add('toggle', `przełącznik na ${i.name} „${i.text}”`, [r, T]);
      if (logo && logo.op > .5 && hit(logo.r, T)) add('toggle', 'przełącznik na .reel__logo', [logo.r, T]);
      // ... ani kafelka rozmowy (obwódka mówiącego w rogu)
      for (const tl of reel.querySelectorAll('.reel__tile')) {
        if (!vis(tl) || opOf(tl, reel) <= .5) continue;
        const r = clipTo(box(tl.getBoundingClientRect()), F);
        if (r && hit(r, T)) add('toggle', `przełącznik na ${name(tl)}`, [r, T]);
      }
    }
    // 7. Strona bez poziomego przewijania.
    const sw = document.documentElement.scrollWidth;
    if (sw > innerWidth) add('overflow', `scrollWidth ${sw} > ${innerWidth}`);
    return { found: true, F, compact, fmt: fmtOf(reel), minFs, logoW: logo ? logo.w : null, issues };
  }

  async function at(kind, t, n = 2) {
    if (t === 'rm') await frames(2); else await seek(t, n);
    return measure(kind, t);
  }

  function formats() {
    const sheet = document.getElementById('teraz');
    if (!sheet) return null;
    const panel = sheet.querySelector('.sheet__panel');
    const cap = sheet.querySelector('.sheet__caption');
    return {
      figs: figures().map(f => {
        const r = f.getBoundingClientRect();
        return { fmt: fmtOf(f), visible: vis(f) && r.width > 0, w: r.width, h: r.height, reelFmt: fmtOf(f.querySelector('.reel')) };
      }),
      panel: panel ? box(panel.getBoundingClientRect()) : null,
      caption: !!cap && vis(cap) && cap.getBoundingClientRect().height > 0,
    };
  }

  // Ścieżki reela: czas 8000 ms (reel-speak 2000), opóźnienie 0, nieskończone, 0% = 100%.
  function loopMath(kind) {
    const reel = target(kind);
    if (!reel) return null;
    const issues = [];
    let n = 0;
    const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g;
    const strip = v => String(v).replace(/\s+/g, ' ').trim().replace(/(^|[\s(,])-?0(?:\.0+)?(?:px|em|%|deg|cqw|cqh)?(?=$|[\s),])/g, '$10');
    const close = (a, b) => {
      const x = (String(a).match(NUM) || []).map(Number), y = (String(b).match(NUM) || []).map(Number);
      return String(a).replace(NUM, '#') === String(b).replace(NUM, '#') && x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) < .02);
    };
    for (const a of reel.getAnimations({ subtree: true })) {
      if (typeof CSSAnimation === 'undefined' || !(a instanceof CSSAnimation)) continue;
      n++;
      const nm = a.animationName, eff = a.effect, tm = eff.getTiming();
      const where = `${nm} @ ${name(eff.target)}${eff.pseudoElement || ''}`;
      if (AMB.test(nm)) {
        if (!(tm.duration >= 14000)) issues.push(`${where}: ${tm.duration} ms (tło: min. 14 s)`);
        continue;
      }
      const want = nm === 'reel-speak' ? 2000 : 8000;
      if (tm.duration !== want) issues.push(`${where}: czas ${tm.duration} ms, ma być ${want}`);
      if (tm.delay !== 0) issues.push(`${where}: opóźnienie ${tm.delay} ms`);
      if (tm.iterations !== Infinity) issues.push(`${where}: powtórzenia ${tm.iterations}`);
      // reel-speak to puls 0.5 Hz (pierścień ma krycie 0 poza rozmową) - z założenia wraca skokiem; 4 pulsy = 1 pętla.
      if (nm === 'reel-speak') continue;
      const kf = eff.getKeyframes();
      const end = o => Object.assign({}, ...kf.filter(k => k.computedOffset === o));
      const k0 = end(0), k1 = end(1);
      const skip = new Set(['offset', 'computedOffset', 'easing', 'composite']);
      const props = new Set([...Object.keys(k0), ...Object.keys(k1)].filter(p => !skip.has(p)));
      if (!props.size) issues.push(`${where}: brak klatek 0% / 100%`);
      for (const p of props) {
        if (k0[p] !== undefined && strip(k0[p]) === strip(k1[p])) continue;
        // Inny zapis tej samej wartości? Porównanie wartości wyliczonych na początku i tuż przed końcem iteracji.
        let c0 = null, c1 = null;
        try {
          const keep = a.currentTime;
          a.pause();
          a.currentTime = 0;
          c0 = getComputedStyle(eff.target, eff.pseudoElement || null)[p];
          a.currentTime = want - .01;
          c1 = getComputedStyle(eff.target, eff.pseudoElement || null)[p];
          a.currentTime = keep;
        } catch { /* bez porównania wyliczonych */ }
        if (c0 != null && c1 != null && close(c0, c1)) continue;
        issues.push(`${where}: ${p} 0% „${k0[p] ?? '-'}” ≠ 100% „${k1[p] ?? '-'}”`);
      }
    }
    return { tracks: n, issues };
  }

  function st(reel) {
    if (!reel) return null;
    const all = reel.getAnimations({ subtree: true });
    const c = clock(reel);
    return { total: all.length, running: all.filter(a => a.playState === 'running').length, clock: c ? c.playState : null, t: c ? Number(c.currentTime) : null };
  }
  function gate() {
    const figs = figures();
    return {
      preview: st(previewReel()),
      visible: figs.filter(vis).map(f => ({ fmt: fmtOf(f), ...st(f.querySelector('.reel')) })),
      hidden: figs.filter(f => !vis(f)).map(f => ({ fmt: fmtOf(f), ...st(f.querySelector('.reel')) })),
    };
  }
  // Zegar reela tuż po otwarciu panelu (po obsłudze hashchange w main.js i po 2 klatkach).
  function hookOpen() {
    window.__reelOpen = new Promise(res => addEventListener('hashchange', async () => {
      const sync = clock(target('sheet'))?.currentTime ?? null;
      await frames(2);
      const c = clock(target('sheet'));
      res({ sync: sync == null ? null : Number(sync), t: c ? Number(c.currentTime) : null, state: c ? c.playState : null });
    }, { once: true }));
  }
  // Dziennik klas wierszy indeksu: start kreski (is-playing) i wyjście z projektu (is-active), z fazą reela.
  function watchRows() {
    const log = window.__reelRows = [];
    const app = document.getElementById('app') || document.body;
    new MutationObserver(recs => {
      const now = performance.now();
      for (const r of recs) {
        const el = r.target;
        if (!el.matches?.('.index__row[data-project]')) continue;
        const was = String(r.oldValue || '').split(/\s+/);
        const id = el.dataset.project;
        if (!was.includes('is-playing') && el.classList.contains('is-playing')) {
          log.push({ ev: 'play', id, t: now, delay: el.style.getPropertyValue('--auto-delay').trim() });
        }
        if (was.includes('is-active') && !el.classList.contains('is-active')) {
          const c = clock(document.querySelector(`.preview__logo[data-project="${id}"] .reel`));
          log.push({ ev: 'leave', id, t: now, phase: c ? Number(c.currentTime) : null });
        }
      }
    }).observe(app, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }

  function still(kind) {
    const reel = target(kind);
    if (!reel) return null;
    const F = box(reel.getBoundingClientRect());
    const q = s => [...reel.querySelectorAll(s)];
    const on = el => vis(el) && opOf(el, reel) > .9;
    const logo = reel.querySelector('.reel__logo');
    const tg = reel.parentElement?.querySelector(':scope > .reel__toggle');
    return {
      w: F.w,
      compact: F.w < 480 && F.w > F.h,
      anims: [...document.querySelectorAll('.reel')].reduce((s, r) => s + r.getAnimations({ subtree: true }).length, 0),
      tiles: q('.reel__tile').filter(on).length,
      rings: q('.reel__ring').filter(on).length,
      cap: q('.reel__cap').some(on),
      title: q('.reel__title').some(on),
      claim: q('.reel__claim').some(on),
      logo: logo && on(logo) ? logo.getBoundingClientRect().width : 0,
      extra: q('.reel__glyph, .reel__role, .reel__legend').filter(vis).map(name),
      toggle: !!tg && vis(tg),
    };
  }

  function budget() {
    return {
      per: [...document.querySelectorAll('.reel')].map(r => ({
        where: `${r.closest('.sheet__video') ? 'panel' : 'podgląd'} ${fmtOf(r)}`,
        n: r.querySelectorAll('*').length + 1,
        bytes: new Blob([r.outerHTML]).size,
      })),
      total: document.getElementsByTagName('*').length,
    };
  }

  // Ramki na zrzucie z błędem (czerwona = tekst, niebieska = przeszkoda).
  function overlay(rects) {
    document.getElementById('__reel_ov')?.remove();
    if (!rects || !rects.length) return;
    const ov = document.createElement('div');
    ov.id = '__reel_ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    for (const [r, c] of rects) {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;outline:2px solid ${c};outline-offset:-1px`;
      ov.append(d);
    }
    document.body.append(ov);
  }

  window.__reel = { frames, ready, seek, at, measure, target, clock, activate, formats, loopMath, gate, hookOpen, watchRows, still, budget, overlay };
}

/* ---------- Pomocnicze w Node ---------- */
async function newCtx(browser, { lang = 'pl', ...o } = {}) {
  const ctx = await browser.newContext({ deviceScaleFactor: 1, colorScheme: 'light', ...o });
  if (o.javaScriptEnabled !== false) {
    await ctx.addInitScript(l => { try { localStorage.setItem('lang', l); localStorage.removeItem('theme'); } catch { /* bez pamięci */ } }, lang);
    await ctx.addInitScript(helpers);
    if (INJECT) {
      await ctx.addInitScript(css => addEventListener('DOMContentLoaded', () => {
        document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
      }), INJECT);
    }
  }
  return ctx;
}

function watch(page, tag) {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${tag}: ${m.text()}`); });
  page.on('pageerror', e => consoleErrors.push(`${tag}: ${e.message}`));
}

async function newPage(ctx, { vw, vh }, tag) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await page.setViewportSize({ width: vw, height: vh });
  watch(page, tag);
  return page;
}

async function go(page, path, kind) {
  const res = await page.goto(BASE + path, { waitUntil: 'load' });
  if (!res?.ok()) throw new Error(`HTTP ${res?.status()} dla /${path}`);
  await page.evaluate(k => window.__reel.ready(k), kind);
}

const clipOf = (F, inset = 0) => {
  const x = Math.ceil(F.x + inset), y = Math.ceil(F.y + inset);
  return { x, y, width: Math.floor(F.x + F.w - inset) - x, height: Math.floor(F.y + F.h - inset) - y };
};

async function shot(page, file, rects = []) {
  if (shots >= MAX_SHOTS) return;
  shots++;
  try {
    if (rects.length) await page.evaluate(l => window.__reel?.overlay(l), rects);
    await page.screenshot({ path: join(OUT, `${file}.png`) });
  } catch { /* zrzut nie jest testem */ }
  await page.evaluate(() => window.__reel?.overlay(null)).catch(() => {});
}
async function save(buf, file) {
  if (shots >= MAX_SHOTS) return;
  shots++;
  await writeFile(join(OUT, `${file}.png`), buf);
}

// Odsetek pikseli, które różnią się o więcej niż `tol` w którymś kanale.
async function diffRatio(a, b, tol = 8) {
  const [A, B] = await Promise.all([a, b].map(x => sharp(x).raw().toBuffer({ resolveWithObject: true })));
  if (A.info.width !== B.info.width || A.info.height !== B.info.height || A.info.channels !== B.info.channels) return 1;
  const ch = A.info.channels, d = A.data, e = B.data;
  let bad = 0;
  for (let i = 0; i < d.length; i += ch) {
    if (Math.abs(d[i] - e[i]) > tol || Math.abs(d[i + 1] - e[i + 1]) > tol || Math.abs(d[i + 2] - e[i + 2]) > tol) bad++;
  }
  return bad / (A.info.width * A.info.height);
}

// Średnia luminancja względna (WCAG, sRGB → liniowe).
const LIN = Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
async function luminance(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let s = 0;
  for (let i = 0; i < data.length; i += ch) s += .2126 * LIN[data[i]] + .7152 * LIN[data[i + 1]] + .0722 * LIN[data[i + 2]];
  return s / (info.width * info.height);
}
// Błysk (WCAG 2.3.1): para przeciwnych zmian luminancji >= 10%, ciemniejszy stan < 0.8; liczone w oknie 1 s.
function flashCount(L, step) {
  const runs = [];
  let s = 0, dir = 0;
  for (let i = 1; i < L.length; i++) {
    const d = L[i] - L[i - 1];
    const sd = Math.abs(d) < .005 ? 0 : Math.sign(d);
    if (sd && dir && sd !== dir) { runs.push({ s, e: i - 1, dir }); s = i - 1; }
    if (sd) dir = sd;
  }
  runs.push({ s, e: L.length - 1, dir });
  const big = runs.filter(r => r.dir && Math.abs(L[r.e] - L[r.s]) >= .1 && Math.min(L[r.e], L[r.s]) < .8);
  let flashes = 0;
  for (let k = 1; k < big.length; k++) if (big[k].dir !== big[k - 1].dir && (big[k].e - big[k - 1].s) * step <= 1000) flashes++;
  return { transitions: big.length, flashes };
}

const parseMs = v => {
  const m = String(v ?? '').match(/(-?[\d.]+)\s*(ms|s)\b/);
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : null;
};

/* ---------- Klatki: kolizje, kadr, czcionki, znak, kompakt, szew, pętla, formaty ---------- */
async function visualGroup(browser) {
  const KIND = {
    overlap: 'Tekst (krycie > .5) nie nachodzi na ? i ! ani na znak teraz',
    outside: 'Widoczny tekst w całości w kadrze',
    font: 'Najmniejszy widoczny tekst >= 12 px',
    logo: 'Znak teraz w nagłówku >= 72 px (1500-6300 ms; 4:5 i 16:9 od 480 px)',
    roles: 'Kompakt: jeden blok roli naraz',
    toggle: 'Przełącznik pauzy nie zasłania tekstu',
    overflow: 'Brak poziomego przewijania w kadrach',
  };
  const found = Object.fromEntries(Object.keys(KIND).map(k => [k, new Set()]));
  const missing = [], sizes = [], sizeNotes = [], fmts = [], fmtNotes = [], seam = [], loop = new Set();
  let minFs = Infinity, minLogo = Infinity, tracks = 0, seamMax = 0, seamN = 0, loopFrames = 0;
  const frames = FRAME_IDS ? FRAMES.filter(f => FRAME_IDS.includes(f.id)) : FRAMES;

  for (const [li, lang] of LANGS.entries()) {
    const ctx = await newCtx(browser, { lang });
    for (const f of frames) {
      const tag = `${lang} ${f.id}`;
      progress(`klatki ${tag}`);
      const page = await newPage(ctx, f, tag);
      try {
        await go(page, f.kind === 'sheet' ? '#teraz' : '', f.kind);
        const first = li === 0;

        // Pierwsze przewinięcie kończy też przejścia (wysuwanie panelu) - pomiary dopiero po nim.
        const m0 = await page.evaluate(k => window.__reel.at(k, 0), f.kind);
        if (first && f.kind === 'sheet') {
          const fi = await page.evaluate(() => window.__reel.formats());
          if (!fi) fmts.push(`${f.id}: brak #teraz`);
          else {
            const shown = fi.figs.filter(x => x.visible);
            fmtNotes.push(`${f.id.replace('sheet-', '')} → ${shown.map(x => `${x.fmt} ${Math.round(x.w)}x${Math.round(x.h)}`).join('+') || 'nic'}`);
            if (shown.length !== 1 || shown[0].fmt !== f.fmt) fmts.push(`${f.id}: widoczne ${shown.map(x => x.fmt).join('+') || 'nic'}, ma być ${f.fmt}`);
            else if (shown[0].reelFmt && shown[0].reelFmt !== f.fmt) fmts.push(`${f.id}: .sheet__video--${f.fmt} zawiera .reel--${shown[0].reelFmt}`);
            if (f.minH && shown[0] && shown[0].h < f.minH) fmts.push(`${f.id}: wysokość ${Math.round(shown[0].h)} px < ${f.minH}`);
            const phonePortrait = f.vw < 768 && f.vh > f.vw;
            if (phonePortrait) {
              if (!fi.caption) fmts.push(`${f.id}: brak widocznego .sheet__caption`);
              const p = fi.panel;
              if (!p || Math.abs(p.y + p.h - f.vh) > 1.5 || p.h > f.vh - 60) fmts.push(`${f.id}: panel nie przylega do dołu (góra ${Math.round(p?.y)}, wys. ${Math.round(p?.h)})`);
              else if (f.panelH && Math.abs(p.h - f.panelH) > 15) fmts.push(`${f.id}: panel ${Math.round(p.h)} px, ma być ok. ${f.panelH}`);
            } else if (fi.caption) fmts.push(`${f.id}: .sheet__caption widoczny poza telefonem w pionie`);
          }
        }

        if (!m0.found) { missing.push(tag); continue; }

        if (first) {
          const [ew, eh] = f.size;
          sizeNotes.push(`${f.id.replace(/^(home|sheet)-/, '$1 ')} ${Math.round(m0.F.w)}x${Math.round(m0.F.h)}`);
          if (Math.abs(m0.F.w - ew) > Math.max(3, ew * .01) || Math.abs(m0.F.h - eh) > Math.max(3, eh * .01)) {
            sizes.push(`${f.id}: ${Math.round(m0.F.w)}x${Math.round(m0.F.h)}, ma być ${ew}x${eh}`);
          }
          if (m0.fmt !== f.fmt) sizes.push(`${f.id}: .reel--${m0.fmt}, ma być .reel--${f.fmt}`);
          if (m0.compact !== !!f.compact) sizes.push(`${f.id}: kompakt ${m0.compact ? 'tak' : 'nie'}, ma być ${f.compact ? 'tak' : 'nie'}`);
          const lm = await page.evaluate(k => window.__reel.loopMath(k), f.kind);
          if (lm) {
            loopFrames++;
            tracks = Math.max(tracks, lm.tracks);
            if (!lm.tracks) loop.add(`${f.id}: brak animacji w .reel`);
            for (const s of lm.issues) loop.add(s);
          }
        }

        const record = async (t, m) => {
          if (!m.found) { missing.push(`${tag} t=${t}`); return; }
          if (m.minFs != null) minFs = Math.min(minFs, m.minFs);
          if (!m.compact && (t === 'rm' || (t >= 1500 && t <= 6300)) && m.logoW != null) minLogo = Math.min(minLogo, m.logoW);
          const seen = new Set();
          for (const is of m.issues) {
            const line = `${tag} t=${t}: ${is.msg}`;
            if (seen.has(line)) continue;
            seen.add(line);
            found[is.kind]?.add(line);
          }
          if (m.issues.length) {
            await shot(page, `${lang}-${f.id}-t${t}`, m.issues.flatMap(is => is.rects.map((r, j) => [r, j ? '#00b7ff' : '#ff2d2d'])));
          }
        };

        for (const t of TIMES) await record(t, t === 0 ? m0 : await page.evaluate(([k, t]) => window.__reel.at(k, t), [f.kind, t]));

        // Szew: t=0 i t=7999 (aurora i dryf zamrożone) - ten sam obraz.
        const clip = clipOf(m0.F);
        await page.evaluate(() => window.__reel.seek(0));
        const a = await page.screenshot({ clip });
        await page.evaluate(() => window.__reel.seek(7999));
        const b = await page.screenshot({ clip });
        const ratio = await diffRatio(a, b);
        seamMax = Math.max(seamMax, ratio);
        seamN++;
        if (ratio >= .005) {
          seam.push(`${tag}: ${(ratio * 100).toFixed(2)}%`);
          await save(a, `seam-${lang}-${f.id}-t0`);
          await save(b, `seam-${lang}-${f.id}-t7999`);
        }

        // Kadr stały (prefers-reduced-motion) - te same asercje.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await record('rm', await page.evaluate(k => window.__reel.at(k, 'rm'), f.kind));
      } catch (e) {
        missing.push(`${tag}: ${e.message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
    await ctx.close();
  }

  const n = frames.length * LANGS.length;
  const blind = missing.length ? ` (bez .reel / błąd: ${missing.length})` : '';
  check('Reel jest w każdym kadrze', !missing.length, missing.length ? list(missing) : `kadry: ${frames.length} × ${LANGS.join('+')} × ${TIMES.length} czasów + kadr stały`);
  const okNote = {
    font: Number.isFinite(minFs) ? `min. ${minFs.toFixed(1)} px` : '',
    logo: Number.isFinite(minLogo) ? `min. ${minLogo.toFixed(1)} px` : '',
  };
  for (const [k, label] of Object.entries(KIND)) {
    const arr = [...found[k]];
    check(label, !arr.length && !missing.length, (arr.length ? `${arr.length}: ${list(arr)}` : okNote[k] || `kadry: ${n}`) + blind);
  }
  check('Rozmiary kadrów zgodne ze specyfikacją (± 1%)', !sizes.length && sizeNotes.length > 0, sizes.length ? list(sizes, 13) : sizeNotes.join(', ') || 'nie zmierzono');
  if (frames.some(f => f.kind === 'sheet')) {
    check('Formaty paneli (16:9 / 4:5, panel telefonu przy dole, podpis)', !fmts.length && fmtNotes.length > 0, fmts.length ? list(fmts, 13) : fmtNotes.join(', '));
  }
  check('Szew pętli: t=0 i t=7999 różnią się na < 0.5% pikseli', !seam.length && seamN > 0 && !missing.length,
    seam.length ? list(seam) : `porównania: ${seamN}, maks. ${(seamMax * 100).toFixed(3)}%${blind}`);
  check('Matematyka pętli (8000 ms / reel-speak 2000 ms, opóźnienie 0, 0% = 100%)', !loop.size && loopFrames > 0,
    loop.size ? list([...loop], 10) : `ścieżki: ${tracks} (najwięcej w kadrze), kadry: ${loopFrames}`);
}

/* ---------- Bramka: gra tylko aktywny podgląd / otwarty panel; zegar od zera ---------- */
async function gateGroup(browser) {
  const ctx = await newCtx(browser, { lang: LANGS[0] });
  const page = await newPage(ctx, { vw: 1440, vh: 900 }, 'gate');
  const bad1 = [], notes1 = [], bad2 = [], notes2 = [], bad3 = [], notes3 = [];
  try {
    await go(page, '', 'home');
    const gate = () => page.evaluate(async () => { await window.__reel.frames(2); return window.__reel.gate(); });
    let s = await gate();
    if (!s.preview) bad1.push('brak .reel w podglądzie teraz');
    else {
      if (s.preview.clock !== 'running' || !s.preview.running) bad1.push(`aktywny podgląd: reel-clock ${s.preview.clock}, gra ${s.preview.running}/${s.preview.total}`);
      else notes1.push(`aktywny gra (${s.preview.running}/${s.preview.total})`);
    }
    const closed = [...s.visible, ...s.hidden].filter(x => x.running);
    if (closed.length) bad1.push(`zamknięty panel gra (${closed.map(x => `${x.fmt} ${x.running}`).join(', ')})`);
    else notes1.push('zamknięty panel stoi');

    await page.evaluate(() => {
      const other = [...document.querySelectorAll('.index__row[data-project]')].find(r => r.dataset.project !== 'teraz');
      window.__reel.activate(other?.dataset.project);
    });
    s = await gate();
    if (s.preview && s.preview.running) bad1.push(`nieaktywny podgląd gra (${s.preview.running}/${s.preview.total})`);
    else if (s.preview) notes1.push('nieaktywny stoi');
    await page.evaluate(() => window.__reel.activate('teraz'));
    s = await gate();
    if (s.preview && s.preview.clock !== 'running') bad1.push(`po powrocie: reel-clock ${s.preview.clock}`);

    // Otwarcie #teraz kliknięciem w wiersz.
    await page.evaluate(() => window.__reel.hookOpen());
    await page.click('.index__row[data-project="teraz"]');
    const open1 = await page.evaluate(() => window.__reelOpen);
    s = await gate();
    if (s.preview && s.preview.running) bad2.push(`podgląd gra pod panelem (${s.preview.running})`);
    if (s.visible.length !== 1) bad2.push(`widoczne formaty: ${s.visible.length}`);
    for (const v of s.visible) {
      if (v.clock !== 'running' || !v.running) bad2.push(`panel ${v.fmt}: reel-clock ${v.clock}, gra ${v.running}/${v.total}`);
      else notes2.push(`panel ${v.fmt} gra (${v.running}/${v.total})`);
    }
    for (const h of s.hidden) {
      if (h.running) bad2.push(`ukryty ${h.fmt} gra (${h.running})`);
      else notes2.push(`ukryty ${h.fmt}: ${h.total} animacji`);
    }
    if (s.preview && !s.preview.running) notes2.push('podgląd stoi');

    // Zamknięcie (Esc) po 1.5 s i ponowne otwarcie - zegar znów od zera.
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__reel.hookOpen());
    await page.click('.index__row[data-project="teraz"]');
    const open2 = await page.evaluate(() => window.__reelOpen);
    for (const [label, o] of [['pierwsze otwarcie', open1], ['ponowne otwarcie', open2]]) {
      if (o.t == null) bad3.push(`${label}: brak reel-clock`);
      else if (o.t >= 100 || o.state !== 'running') bad3.push(`${label}: ${Math.round(o.t)} ms (${o.state})`);
      else notes3.push(`${label}: ${Math.round(o.t)} ms`);
    }
    if (bad1.length || bad2.length || bad3.length) await shot(page, 'gate');
  } catch (e) {
    bad1.push(`błąd: ${e.message.split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
  check('Bramka: aktywny podgląd gra, nieaktywny i zamknięty panel stoją', !bad1.length, list(bad1.length ? bad1 : notes1));
  check('Bramka: otwarty #teraz - podgląd stoi, widoczny panel gra, ukryty format stoi', !bad1.some(b => b.startsWith('błąd')) && !bad2.length && notes2.length > 0, list(bad2.length ? bad2 : notes2));
  check('Otwarcie panelu zeruje zegar (< 100 ms po 2 klatkach)', !bad3.length && notes3.length > 0, list(bad3.length ? bad3 : notes3));
}

/* ---------- Auto-przewijanie: teraz = jedna pętla 8 s, kreska zsynchronizowana z fazą ---------- */
async function dwellGroup(browser) {
  const ctx = await newCtx(browser, { lang: LANGS[0] });
  const page = await newPage(ctx, { vw: 1440, vh: 900 }, 'dwell');
  const bad = [], notes = [], bad2 = [], notes2 = [];
  try {
    await page.goto(BASE, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.index__row[data-project]')].map(r => r.dataset.project));
    const i = ids.indexOf('teraz');
    if (i < 0) throw new Error('brak wiersza teraz');
    const prev = ids[(i - 1 + ids.length) % ids.length];
    const attr = await page.getAttribute('.index__row[data-project="teraz"]', 'data-dwell');
    if (attr !== String(REEL_MS)) bad.push(`data-dwell="${attr}"`);
    else notes.push('data-dwell="8000"');
    await page.evaluate(() => window.__reel.watchRows());

    // Kursor na poprzednim projekcie, potem poza listę → jego 3 s → teraz → 8 s → następny.
    await page.hover(`.index__row[data-project="${prev}"]`);
    await page.waitForTimeout(300);
    await page.mouse.move(720, 4);
    const handle = await page.waitForFunction(() => {
      const l = window.__reelRows || [];
      const k = l.findIndex(e => e.ev === 'play' && e.id === 'teraz');
      return k >= 0 && l.slice(k).some(e => e.ev === 'leave' && e.id === 'teraz') ? l : null;
    }, null, { timeout: 16000, polling: 100 });
    const log = await handle.jsonValue();
    const pPlay = log.find(e => e.ev === 'play' && e.id === prev);
    const tPlay = log.find(e => e.ev === 'play' && e.id === 'teraz' && (!pPlay || e.t > pPlay.t));
    const tLeave = log.find(e => e.ev === 'leave' && e.id === 'teraz' && e.t > tPlay.t);
    const dwell = tLeave.t - tPlay.t;
    if (Math.abs(dwell - REEL_MS) > 150) bad.push(`teraz: ${Math.round(dwell)} ms`);
    else notes.push(`teraz: ${Math.round(dwell)} ms`);
    if (pPlay) {
      const d = tPlay.t - pPlay.t;
      if (Math.abs(d - 3000) > 150) bad.push(`${prev}: ${Math.round(d)} ms (ma być 3000)`);
      else notes.push(`${prev}: ${Math.round(d)} ms`);
    }
    if (tLeave.phase == null) bad.push('brak reel-clock w podglądzie');
    else {
      const ph = tLeave.phase % REEL_MS;
      const off = Math.min(ph, REEL_MS - ph);
      if (off > 150) bad.push(`wyjście w fazie ${Math.round(ph)} ms pętli`);
      else notes.push(`wyjście na granicy pętli (± ${Math.round(off)} ms)`);
    }

    // Kursor na teraz przez 2.5 s, potem poza listę: kreska zaczyna od fazy pętli.
    await page.hover('.index__row[data-project="teraz"]');
    await page.waitForTimeout(2500);
    await page.mouse.move(720, 4);
    const r = await page.evaluate(() => {
      const row = document.querySelector('.index__row[data-project="teraz"]');
      const c = window.__reel.clock(document.querySelector('.preview__logo[data-project="teraz"] .reel'));
      return {
        v: row.style.getPropertyValue('--auto-delay').trim(),
        playing: row.classList.contains('is-playing'),
        phase: c ? Number(c.currentTime) % 8000 : null,
        after: getComputedStyle(row, '::after').animationDelay,
      };
    });
    const delay = parseMs(r.v);
    if (!r.playing) bad2.push('kreska nie wystartowała');
    if (delay == null || r.phase == null) bad2.push(`--auto-delay „${r.v}”, faza ${r.phase}`);
    else if (Math.abs(-delay - r.phase) > 100) bad2.push(`opóźnienie ${Math.round(delay)} ms, faza ${Math.round(r.phase)} ms`);
    else notes2.push(`opóźnienie ${Math.round(delay)} ms, faza ${Math.round(r.phase)} ms, ::after ${r.after}`);
    if (delay != null && parseMs(r.after) != null && Math.abs(parseMs(r.after) - delay) > 1) bad2.push(`::after animation-delay ${r.after} ≠ ${r.v}`);
  } catch (e) {
    bad.push(`błąd: ${e.message.split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
  check('Auto-przewijanie: teraz 8000 ± 150 ms, granica pętli; pozostałe 3 s', !bad.length, list(bad.length ? bad : notes));
  check('Kreska po zjechaniu kursorem = -faza pętli (± 100 ms)', !bad2.length && notes2.length > 0 && !bad.some(b => b.startsWith('błąd')), list(bad2.length ? bad2 : notes2));
}

/* ---------- PL ↔ EN: tekst reela, restart od zera ---------- */
async function langGroup(browser, content) {
  const ctx = await newCtx(browser, { lang: 'pl' });
  const page = await newPage(ctx, { vw: 1440, vh: 900 }, 'lang');
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  const bad = [], notes = [];
  try {
    await go(page, '', 'home');
    const read = () => page.evaluate(() => {
      const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
      const sheet = [...document.querySelectorAll('#teraz .reel')];
      return {
        lang: document.documentElement.lang,
        preview: norm(document.querySelector('.preview__logo[data-project="teraz"] .reel')?.textContent),
        sheet: sheet.map(r => norm(r.textContent)),
        label: sheet[0]?.getAttribute('aria-label') ?? null,
      };
    });
    const flip = () => page.evaluate(async () => {
      document.querySelector('[data-lang-switch]').click();
      await window.__reel.frames(2);
      const c = window.__reel.clock(document.querySelector('.preview__logo[data-project="teraz"] .reel'));
      return c ? Number(c.currentTime) : null;
    });
    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    const expect = (state, lang) => {
      const r = content?.[lang]?.projects?.teraz?.reel;
      if (state.lang !== lang) bad.push(`html lang="${state.lang}", ma być ${lang}`);
      if (!state.preview || !state.sheet.length) { bad.push(`${lang}: brak .reel`); return; }
      if (!r) { notes.push(`${lang}: brak content.${lang}.projects.teraz.reel - porównuję tylko zmianę`); return; }
      const want = Object.entries(r).filter(([k]) => k !== 'label').map(([, v]) => norm(v));
      for (const [where, txt] of [['podgląd', state.preview], ...state.sheet.map((t, i) => [`panel ${i + 1}`, t])]) {
        const miss = want.filter(v => !txt.includes(v));
        if (miss.length) bad.push(`${lang} ${where}: brak „${miss.slice(0, 3).join('”, „')}”${miss.length > 3 ? ` +${miss.length - 3}` : ''}`);
      }
      if (r.label && state.label !== r.label) bad.push(`${lang}: aria-label inny niż reel.label`);
    };
    const pl = await read();
    expect(pl, 'pl');
    const t1 = await flip();
    const en = await read();
    expect(en, 'en');
    if (en.preview && en.preview === pl.preview) bad.push('tekst podglądu się nie zmienił');
    const t2 = await flip();
    const back = await read();
    expect(back, 'pl');
    if (back.preview !== pl.preview || back.sheet.join('|') !== pl.sheet.join('|')) bad.push('po powrocie do PL tekst inny niż na starcie');
    for (const [label, t] of [['PL→EN', t1], ['EN→PL', t2]]) {
      if (t == null) bad.push(`${label}: brak reel-clock`);
      else if (t >= 150) bad.push(`${label}: zegar ${Math.round(t)} ms (ma ruszyć od 0)`);
      else notes.push(`${label}: zegar ${Math.round(t)} ms`);
    }
    if (errs.length) bad.push(`konsola: ${list(errs, 3)}`);
    else notes.push('konsola czysta');
    if (bad.length) await shot(page, 'lang');
  } catch (e) {
    bad.push(`błąd: ${e.message.split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
  check('Zmiana języka PL → EN → PL: tekst reela, restart od 0, bez błędów w konsoli', !bad.length, list(bad.length ? bad : notes));
}

/* ---------- Przełącznik pauzy ---------- */
async function toggleGroup(browser) {
  const ctx = await newCtx(browser, { lang: LANGS[0] });
  const page = await newPage(ctx, { vw: 1440, vh: 900 }, 'toggle');
  const bad = [], notes = [];
  try {
    await go(page, '#teraz', 'sheet');
    const info = await page.evaluate(() => {
      const reel = window.__reel.target('sheet');
      const tg = reel?.parentElement?.querySelector(':scope > .reel__toggle');
      if (!reel || !tg) return { reel: !!reel, tg: !!tg };
      const r = tg.getBoundingClientRect();
      return {
        reel: true, tg: true, role: reel.getAttribute('role'), sibling: tg.parentElement === reel.parentElement,
        inImg: !!tg.closest('[role="img"]'), w: r.width, h: r.height, tag: tg.tagName, type: tg.getAttribute('type'),
        pressed: tg.getAttribute('aria-pressed'), label: tg.getAttribute('aria-label'),
      };
    });
    if (!info.reel || !info.tg) throw new Error(info.reel ? 'brak .reel__toggle obok widocznego .reel' : 'brak widocznego .reel w #teraz');
    if (info.role !== 'img') bad.push(`.reel role="${info.role}"`);
    if (!info.sibling || info.inImg) bad.push('przełącznik nie jest rodzeństwem role=img');
    if (Math.abs(info.w - 40) > .5 || Math.abs(info.h - 40) > .5) bad.push(`rozmiar ${info.w}x${info.h}`);
    if (info.tag !== 'BUTTON' || info.type !== 'button') bad.push(`<${info.tag.toLowerCase()} type=${info.type}>`);
    if (info.pressed !== 'false') bad.push(`na starcie aria-pressed="${info.pressed}"`);
    if (!info.label) bad.push('brak aria-label');
    const state = () => page.evaluate(async () => {
      await window.__reel.frames(2);
      const reel = window.__reel.target('sheet');
      const tg = reel.parentElement.querySelector(':scope > .reel__toggle');
      return { paused: reel.classList.contains('is-paused'), pressed: tg.getAttribute('aria-pressed'), clock: window.__reel.clock(reel)?.playState ?? null };
    });
    const tg = page.locator('#teraz .reel__toggle >> visible=true').first();
    const expectState = (s, on, how) => {
      const ok = s.paused === on && s.pressed === String(on) && s.clock === (on ? 'paused' : 'running');
      if (!ok) bad.push(`${how}: .is-paused ${s.paused}, aria-pressed ${s.pressed}, reel-clock ${s.clock}`);
      return ok;
    };
    await tg.click();
    const okA = expectState(await state(), true, 'klik 1');
    await tg.click();
    const okB = expectState(await state(), false, 'klik 2');
    await tg.focus();
    await page.keyboard.press('Enter');
    const okC = expectState(await state(), true, 'Enter');
    await page.keyboard.press('Space');
    const okD = expectState(await state(), false, 'Spacja');
    if (okA && okB && okC && okD) notes.push('klik i klawiatura przełączają .is-paused, aria-pressed i zegar');
    notes.unshift(`rodzeństwo role=img, ${info.w}x${info.h}`);
    if (bad.length) await shot(page, 'toggle');
  } catch (e) {
    bad.push(`błąd: ${e.message.split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
  check('Przełącznik pauzy: rodzeństwo role=img, 40x40, klik i Enter/Spacja', !bad.length, list(bad.length ? bad : notes));
}

/* ---------- prefers-reduced-motion: zero animacji, kadr stały z sekcji 9 ---------- */
async function reducedGroup(browser) {
  const ctx = await newCtx(browser, { lang: LANGS[0], reducedMotion: 'reduce' });
  const bad = [], notes = [];
  await mkdir(SNAP, { recursive: true });
  for (const id of ['home-1440x900', 'sheet-1440x900', 'sheet-768x1024', 'sheet-375x667']) {
    const f = frame(id);
    const page = await newPage(ctx, f, `reduced ${id}`);
    try {
      await go(page, f.kind === 'sheet' ? '#teraz' : '', f.kind);
      const s = await page.evaluate(k => window.__reel.still(k), f.kind);
      await page.screenshot({ path: join(SNAP, `reduced-${id}.png`) });
      if (!s) { bad.push(`${id}: brak .reel`); continue; }
      const err = [];
      if (s.anims) err.push(`${s.anims} animacji w .reel`);
      if (s.tiles !== 2) err.push(`kafle ${s.tiles}/2`);
      if (s.rings !== 2) err.push(`pierścienie ${s.rings}/2`);
      if (!s.cap) err.push('brak podpisu wideo');
      if (s.extra.length) err.push(`widoczne: ${[...new Set(s.extra)].join(', ')}`);
      if (s.toggle) err.push('widoczny przełącznik');
      if (s.compact) {
        if (s.claim) err.push('hasło widoczne w kompakcie');
        if (s.logo) err.push('znak widoczny w kompakcie');
      } else {
        if (!s.title) err.push('brak tytułu rozmowy');
        if (!s.claim) err.push('brak hasła');
        if (!s.logo) err.push('brak znaku');
        else if (s.logo < 71.5 || s.logo > s.w * .5) err.push(`znak ${Math.round(s.logo)} px (ma być w nagłówku)`);
      }
      if (err.length) bad.push(`${id}: ${err.join(', ')}`);
      else notes.push(`${id} ok`);
    } catch (e) {
      bad.push(`${id}: błąd: ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
  await ctx.close();
  check('prefers-reduced-motion: zero animacji w .reel, kadr stały z sekcji 9', !bad.length, `${list(bad.length ? bad : notes)} · zrzuty: ${SNAP}`);
}

/* ---------- Błyski: średnia luminancja co 40 ms przez 8 s ---------- */
async function flashGroup(browser) {
  const ctx = await newCtx(browser, { lang: LANGS[0] });
  const bad = [], notes = [];
  const STEP = 40;
  for (const id of ['home-1440x900', 'sheet-1440x900', 'sheet-375x667']) {
    const f = frame(id);
    progress(`błyski ${id}`);
    const page = await newPage(ctx, f, `flash ${id}`);
    try {
      await go(page, f.kind === 'sheet' ? '#teraz' : '', f.kind);
      const m = await page.evaluate(k => window.__reel.at(k, 0), f.kind);
      if (!m.found) { bad.push(`${id}: brak .reel`); continue; }
      const clip = clipOf(m.F);
      const L = [];
      for (let t = 0; t < REEL_MS; t += STEP) {
        await page.evaluate(t => window.__reel.seek(t, 1), t);
        L.push(await luminance(await page.screenshot({ clip, type: 'jpeg', quality: 92 })));
      }
      let max = 0, at = 0;
      for (let i = 0; i < L.length; i++) {
        const d = Math.abs(L[(i + 1) % L.length] - L[i]); // z przejściem przez szew
        if (d > max) { max = d; at = i * STEP; }
      }
      const { transitions, flashes } = flashCount([...L, L[0]], STEP);
      const line = `${id}: maks. Δ ${(max * 100).toFixed(2)}% przy ${at} ms, luminancja ${(Math.min(...L) * 100).toFixed(1)}-${(Math.max(...L) * 100).toFixed(1)}%, zmiany >= 10%: ${transitions}, błyski: ${flashes}`;
      if (max > .1 || flashes) {
        bad.push(line);
        for (const t of [at, (at + STEP) % REEL_MS]) {
          await page.evaluate(t => window.__reel.seek(t), t);
          await save(await page.screenshot({ clip }), `flash-${id}-t${t}`);
        }
      } else notes.push(line);
    } catch (e) {
      bad.push(`${id}: błąd: ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
  await ctx.close();
  check('Brak błysków: luminancja co 40 ms, Δ między klatkami <= 10%, 0 błysków', !bad.length, list(bad.length ? bad : notes));
}

/* ---------- Budżet DOM ---------- */
async function budgetGroup(browser) {
  const bad = [], notes = [];
  for (const lang of LANGS) {
    const ctx = await newCtx(browser, { lang });
    const page = await newPage(ctx, { vw: 1440, vh: 900 }, `budget ${lang}`);
    try {
      await go(page, '', 'home');
      const b = await page.evaluate(() => window.__reel.budget());
      if (!b.per.length) bad.push(`${lang}: brak .reel`);
      for (const r of b.per) if (r.n > 60) bad.push(`${lang} ${r.where}: ${r.n} elementów`);
      if (b.total > 800) bad.push(`${lang}: DOM ${b.total} elementów`);
      const bytes = b.per.reduce((s, r) => s + r.bytes, 0);
      if (bytes > 15 * 1024) bad.push(`${lang}: HTML reeli ${(bytes / 1024).toFixed(1)} KB`);
      notes.push(`${lang}: reel ${[...new Set(b.per.map(r => r.n))].join('/')} el. × ${b.per.length}, DOM ${b.total}, HTML ${(bytes / 1024).toFixed(1)} KB`);
    } catch (e) {
      bad.push(`${lang}: błąd: ${e.message.split('\n')[0]}`);
    } finally {
      await ctx.close();
    }
  }
  check('Budżet: <= 60 elementów na .reel, DOM <= 800, HTML reeli <= 15 KB', !bad.length, list(bad.length ? bad : notes));
}

/* ---------- Sieć: zero zewnętrznych requestów i ciasteczek ---------- */
async function networkGroup(browser) {
  const ctx = await newCtx(browser, { lang: LANGS[0] });
  const external = new Set(), broken = new Set();
  let cookies = [];
  let err = '';
  try {
    const page = await newPage(ctx, { vw: 1440, vh: 900 }, 'network');
    page.on('request', r => {
      const u = new URL(r.url());
      if (/^(https?|wss?):$/.test(u.protocol) && u.host !== `localhost:${PORT}`) external.add(u.host);
    });
    page.on('response', r => { if (r.status() >= 400) broken.add(`${r.status()} ${new URL(r.url()).pathname}`); });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.click('.index__row[data-project="teraz"]');
    await page.waitForTimeout(1500);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}?n=1#teraz`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(800);
    cookies = await ctx.cookies();
  } catch (e) {
    err = `błąd: ${e.message.split('\n')[0]} · `;
  } finally {
    await ctx.close();
  }
  check('Sieć: zero zewnętrznych requestów i ciasteczek (strona + #teraz), bez 404', !err && !external.size && !cookies.length && !broken.size,
    `${err}zewnętrzne: ${[...external].join(', ') || 'brak'}, ciasteczka: ${cookies.length}, błędy: ${[...broken].join(', ') || 'brak'}`);
}

/* ---------- Bez JS ---------- */
async function nojsGroup(browser) {
  const ctx = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 1, colorScheme: 'light' });
  const bad = [], notes = [];
  try {
    const page = await newPage(ctx, { vw: 1440, vh: 900 }, 'nojs');
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const read = () => page.evaluate(() => {
      const vis = el => !!el && el.checkVisibility({ visibilityProperty: true });
      const clk = r => r?.getAnimations().find(a => a.animationName === 'reel-clock') ?? null;
      const prev = document.querySelector('.preview__logo.is-active .reel');
      const figs = [...document.querySelectorAll('#teraz .sheet__video')];
      const vf = figs.find(vis);
      const sc = clk(vf?.querySelector('.reel'));
      return {
        js: document.documentElement.classList.contains('js'),
        prev: prev ? clk(prev)?.playState ?? 'brak zegara' : null,
        toggles: [...document.querySelectorAll('.reel__toggle')].map(t => getComputedStyle(t).display),
        sheetT: [...document.querySelectorAll('#teraz .reel')].map(r => { const c = clk(r); return c ? Number(c.currentTime) : null; }),
        open: sc ? { state: sc.playState, t: Number(sc.currentTime) } : null,
        fmts: figs.filter(vis).map(f => (f.className.match(/sheet__video--(\w+)/) || [])[1]),
      };
    });
    const a = await read();
    if (a.js) bad.push('klasa .js bez JS');
    if (a.prev !== 'running') bad.push(`podgląd teraz: ${a.prev ?? 'brak .reel'}`);
    else notes.push('podgląd gra (is-active z buildu)');
    if (!a.toggles.length) bad.push('brak .reel__toggle w HTML');
    else if (a.toggles.some(d => d !== 'none')) bad.push(`przełącznik widoczny (${a.toggles.join(', ')})`);
    else notes.push('przełącznik ukryty');
    const closedT = a.sheetT.filter(t => t != null); // ukryty format (display: none) nie ma animacji
    if (!closedT.length || closedT.some(t => t > 100)) bad.push(`zamknięty panel: zegar ${a.sheetT.map(t => (t == null ? '-' : Math.round(t))).join('/')} ms`);
    await page.click('.index__row[data-project="teraz"]');
    await page.waitForTimeout(150);
    const b = await read();
    if (!b.open || b.open.state !== 'running' || b.open.t > 1000) bad.push(`#teraz: ${b.open ? `${b.open.state} ${Math.round(b.open.t)} ms` : 'brak widocznego reela'}`);
    else notes.push(`#teraz gra od 0 (${Math.round(b.open.t)} ms po otwarciu)`);
    if (b.fmts.join() !== '16x9') bad.push(`1440x900: widoczne ${b.fmts.join('+') || 'nic'}`);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE}?n=1#teraz`, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const c = await read();
    if (c.fmts.join() !== '4x5') bad.push(`768x1024: widoczne ${c.fmts.join('+') || 'nic'}`);
    else notes.push('format z CSS (768x1024 → 4x5)');
  } catch (e) {
    bad.push(`błąd: ${e.message.split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
  check('Bez JS: podgląd gra, #teraz od 0, przełącznik ukryty, format z CSS', !bad.length, list(bad.length ? bad : notes));
}

/* ---------- Tryb ciemny: reel identyczny w obu motywach ---------- */
async function darkGroup(browser) {
  const ctx = await newCtx(browser, { lang: LANGS[0] });
  const bad = [];
  let max = 0, n = 0;
  for (const id of ['home-1440x900', 'sheet-1440x900', 'sheet-375x667']) {
    const f = frame(id);
    const page = await newPage(ctx, f, `dark ${id}`);
    try {
      await go(page, f.kind === 'sheet' ? '#teraz' : '', f.kind);
      for (const t of [0, 2200, 5600]) {
        const pic = async theme => {
          await page.evaluate(th => { document.documentElement.dataset.theme = th; }, theme);
          const m = await page.evaluate(([k, t]) => window.__reel.at(k, t), [f.kind, t]);
          if (!m.found) throw new Error('brak .reel');
          return page.screenshot({ clip: clipOf(m.F, 2) }); // bez cienkiej ramki --hair
        };
        const a = await pic('light');
        const b = await pic('dark');
        const r = await diffRatio(a, b);
        max = Math.max(max, r);
        n++;
        if (r >= .005) {
          bad.push(`${id} t=${t}: ${(r * 100).toFixed(2)}%`);
          await save(a, `dark-${id}-t${t}-light`);
          await save(b, `dark-${id}-t${t}-dark`);
        }
      }
    } catch (e) {
      bad.push(`${id}: błąd: ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
  await ctx.close();
  check('Tryb ciemny: reel identyczny w obu motywach (< 0.5% pikseli)', !bad.length && n > 0, bad.length ? list(bad) : `porównania: ${n}, maks. ${(max * 100).toFixed(3)}%`);
}

/* ---------- Jeden ekran na desktopie ---------- */
async function layoutGroup(browser) {
  const bad = [], notes = [];
  for (const lang of LANGS) {
    const ctx = await newCtx(browser, { lang });
    for (const [vw, vh] of [[1440, 900], [1536, 864]]) {
      const page = await newPage(ctx, { vw, vh }, `layout ${lang}`);
      try {
        await go(page, '', 'home');
        await page.evaluate(() => window.__reel.seek(0));
        const r = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth }));
        if (r.sh > r.ih + 1 || r.sw > r.iw) bad.push(`${lang} ${vw}x${vh}: ${r.sw}x${r.sh}`);
        else notes.push(`${lang} ${vw}x${vh}`);
      } catch (e) {
        bad.push(`${lang} ${vw}x${vh}: błąd: ${e.message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
    await ctx.close();
  }
  check('Jeden ekran na desktopie: bez przewijania (1440x900, 1536x864)', !bad.length, list(bad.length ? bad : notes));
}

/* ---------- Start ---------- */
await mkdir(OUT, { recursive: true });
for (const dir of [OUT, SNAP]) {
  for (const f of await readdir(dir).catch(() => [])) if (f.endsWith('.png')) await rm(join(dir, f), { force: true });
}

let content = null;
try {
  ({ content } = await import(`../content.js?t=${Date.now()}`));
} catch (e) {
  check('content.js się wczytuje', false, e.message.split('\n')[0]);
}

const server = await serve(PORT, { dev: true });
let browser;
try {
  // Strona musi się renderować (dev: index.html z content.js przy każdym żądaniu).
  const res = await fetch(BASE).catch(e => ({ ok: false, status: e.message }));
  if (!res.ok) {
    let why = `HTTP ${res.status}`;
    try { const { renderIndex } = await import('./build-html.mjs'); await renderIndex(); } catch (e) { why += ` - ${e.message.split('\n')[0]}`; }
    check('Strona renderuje się z content.js', false, why);
  } else {
    browser = await chromium.launch();
    const groups = [
      ['visual', () => visualGroup(browser)],
      ['gate', () => gateGroup(browser)],
      ['dwell', () => dwellGroup(browser)],
      ['lang', () => langGroup(browser, content)],
      ['toggle', () => toggleGroup(browser)],
      ['reduced', () => reducedGroup(browser)],
      ['flash', () => flashGroup(browser)],
      ['budget', () => budgetGroup(browser)],
      ['network', () => networkGroup(browser)],
      ['nojs', () => nojsGroup(browser)],
      ['dark', () => darkGroup(browser)],
      ['layout', () => layoutGroup(browser)],
    ];
    for (const [key, fn] of groups) {
      if (!run(key)) continue;
      progress(`grupa ${key}`);
      try { await fn(); } catch (e) { check(`${key}: błąd skryptu`, false, e.stack?.split('\n').slice(0, 2).join(' ') || String(e)); }
    }
    const errs = [...new Set(consoleErrors)];
    check('Brak błędów w konsoli i błędów JS (wszystkie strony)', !errs.length, errs.length ? list(errs, 5) : '');
  }
} finally {
  await browser?.close();
  server.close();
}

for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.note ? ` - ${r.note}` : ''}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} ok${shots ? ` · zrzuty błędów: ${OUT}` : ''}`);
process.exit(failed ? 1 : 0);
