// Audyt: Lighthouse (telefon + desktop) i lista kontrolna z briefu (sekcja 10).
//   npm run audit
// Sprawdza zbudowany index.html — najpierw `npm run build`.
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const PORT = 8094;
const URL = `http://localhost:${PORT}/`;
const server = await serve(PORT);
const results = [];
const check = (name, ok, note = '') => { results.push({ name, ok, note }); console.error(`  … ${name}: ${ok ? 'ok' : 'NIE'}`); };

/* ---------- Lighthouse ---------- */
const MIN = { performance: 95, accessibility: 100, 'best-practices': 95, seo: 95 };
for (const [label, config] of [['telefon', undefined], ['desktop', desktopConfig]]) {
  // Świeża przeglądarka na każdy przebieg — dwa przebiegi w jednej potrafiły się zawiesić.
  const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new'] });
  const { lhr } = await lighthouse(URL, { port: chrome.port, output: 'json', logLevel: 'error', maxWaitForLoad: 20000 }, config);
  await chrome.kill();
  const scores = Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const ok = Object.entries(MIN).every(([k, min]) => scores[k] >= min);
  const failing = Object.values(lhr.audits)
    .filter(a => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
    .map(a => a.id);
  check(`Lighthouse ${label}`, ok,
    `Perf ${scores.performance} · A11y ${scores.accessibility} · BP ${scores['best-practices']} · SEO ${scores.seo}` +
    (failing.length ? ` · do poprawy: ${failing.join(', ')}` : ''));
}
/* ---------- Lista kontrolna ---------- */
const browser = await chromium.launch();

// Brak poziomego przewijania od 320 px — strona i otwarty panel.
{
  const bad = [];
  for (const w of [320, 375, 768, 1024, 1440]) {
    const p = await browser.newPage({ viewport: { width: w, height: 800 } });
    for (const hash of ['', '#teraz', '#o-mnie']) {
      await p.goto(URL + hash);
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) bad.push(`${w}${hash}`);
    }
    await p.close();
  }
  check('Brak poziomego przewijania od 320 px', !bad.length, bad.join(', '));
}

// Bez JS: treść widoczna, indeks i panele działają jako kotwice.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(2000);
  const rows = await p.locator('.index__row').count();
  const h1 = await p.locator('h1').isVisible();
  await p.click('.index__row[data-project="loom"]');
  await p.waitForTimeout(1000);
  const sheet = await p.locator('#loom').isVisible();
  check('Działa bez JS', rows >= 5 && h1 && sheet, `${rows} wierszy indeksu, panel z kotwicy: ${sheet ? 'tak' : 'nie'}`);
  await ctx.close();
}

// Klawiatura: każdy element z focusem ma widoczny znacznik (cienka linia).
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL);
  const missing = [];
  for (let i = 0; i < 20; i++) {
    await p.keyboard.press('Tab');
    await p.waitForTimeout(450); // kreska pod wierszem rośnie 400 ms
    const r = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el), after = getComputedStyle(el, '::after');
      const visible = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
        || after.transform !== 'none' && after.transform !== 'matrix(0, 0, 0, 1, 0, 0)'
        || cs.backgroundColor === 'rgb(17, 17, 17)';
      return { label: (el.getAttribute('aria-label') || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 24), visible };
    });
    if (r && !r.visible) missing.push(r.label);
  }
  // Panel: focus w środku, Esc zamyka i wraca do wiersza.
  await p.click('.index__row[data-project="teraz"]');
  await p.waitForTimeout(900);
  const inSheet = await p.evaluate(() => !!document.activeElement.closest('#teraz'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(900);
  const back = await p.evaluate(() => document.activeElement.dataset.project === 'teraz' && !location.hash);
  check('Klawiatura + widoczny focus', !missing.length && inSheet && back,
    (missing.length ? `bez znacznika: ${missing.join(', ')} · ` : '') + `focus w panelu: ${inSheet ? 'tak' : 'nie'}, Esc wraca do wiersza: ${back ? 'tak' : 'nie'}`);
  await p.close();
}

// prefers-reduced-motion: ikony stoją, karuzela stoi, tekst widoczny od razu.
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(URL);
  const icons = () => p.evaluate(() => [...document.querySelectorAll('.hero__icon.is-on')].map(i => i.src).join());
  const a = await icons();
  await p.waitForTimeout(1200);
  const still = a === await icons();
  const marquee = await p.evaluate(() => { const t = document.querySelector('.clients__track'); return !t || getComputedStyle(t).animationName === 'none'; });   // bez firm karuzeli nie ma
  const text = await p.evaluate(() => getComputedStyle(document.querySelector('h1 .reveal')).opacity === '1');
  check('prefers-reduced-motion wyłącza ruch', still && marquee && text, `ikony stoją: ${still}, karuzela stoi: ${marquee}, tekst od razu: ${text}`);
  await ctx.close();
}

// Zero ciasteczek, zero zewnętrznych requestów (strona + otwarty panel z wideo i panel z planszą teraz).
// Pozostałe testy planszy teraz (formaty, bramka, 8 s, ruch, bez JS): npm run check-reel.
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const external = new Set();
  p.on('request', r => { if (!r.url().startsWith(`http://localhost:${PORT}`)) external.add(new URL(r.url()).host); });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.click('.index__row[data-project="loom"]');
  await p.waitForTimeout(1200);
  await p.evaluate(() => { location.hash = 'teraz'; });
  await p.waitForTimeout(1200);
  const cookies = await ctx.cookies();
  check('Zero ciasteczek i zewnętrznych requestów', !cookies.length && !external.size,
    `ciasteczka: ${cookies.length}, zewnętrzne hosty: ${[...external].join(', ') || 'brak'}`);
  await ctx.close();
}

await browser.close();
server.close();

/* ---------- Raport ---------- */
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.note ? ` — ${r.note}` : ''}`);
if (results.some(r => !r.ok)) process.exitCode = 1;
