// Zachowanie strony: PL/EN, indeks ↔ podgląd, panele, kopiowanie maila.
// Treść i szablony: content.js, render.js. Bez JS strona działa na kotwicach i :target.
import { content } from './content.js';

const root = document.documentElement;
const app = document.getElementById('app');
// Katalog główny strony (main.js leży w nim): polska wersja = /, angielska = /en/. Ścieżki assetów
// z content.js liczone od niego, więc działają z obu adresów.
const SITE = new URL('./', import.meta.url);
const abs = p => new URL(p, SITE).href;

// Asystent AI (stan na górze - panel #agent może być otwarty już przy wejściu na stronę)
// Rozmowa z asystentem: [{ role: 'user' | 'assistant', content, answer? }]. Zapisana w sessionStorage karty,
// więc przetrwa przejście w tej samej karcie na link z odpowiedzi i powrót (albo odświeżenie); znika z kartą.
const CHAT_KEY = 'agent-chat';
const chat = (() => { try { const a = JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })();
const saveChat = () => { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(chat.slice(-40))); } catch { /* bez zapisu */ } };
let agentBusy = false;
let agentMod = null;
const loadAgent = () => (agentMod ??= import('./agent.js'));

// localStorage bywa zablokowany (tryb prywatny, wyłączone dane witryny).
const store = {
  get() { try { return localStorage.getItem('lang'); } catch { return null; } },
  set(v) { try { localStorage.setItem('lang', v); } catch { /* bez zapamiętania */ } },
};

root.classList.add('js');

// Wersje językowe to osobne strony (npm run build: index.html i en/index.html). Zapisany wybór EN
// przenosi ze strony głównej na /en/; adres /en/ zawsze zostaje angielski (można go komuś wysłać).
const langUrl = lang => abs(lang === 'en' ? 'en/' : './') + location.hash;
const saved = store.get();
if (root.lang === 'pl' && saved === 'en') location.replace(langUrl('en'));

/* Tryb ciemny: domyślnie jasny na każdym urządzeniu; przełącznik włącza ciemny, wybór zapisany w localStorage.
   (Zapisany wybór ustawia już mały skrypt w <head>, żeby strona nie mignęła jasno.) */
const isDark = () => root.dataset.theme === 'dark';

function syncThemeButton() {
  const btn = app.querySelector('[data-theme-switch]');
  if (!btn) return;
  btn.setAttribute('aria-label', isDark() ? btn.dataset.labelLight : btn.dataset.labelDark);
}

app.addEventListener('click', e => {
  if (!e.target.closest('[data-theme-switch]')) return;
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* bez zapamiętania */ }
  syncThemeButton();
});
syncThemeButton();

app.addEventListener('click', e => {
  if (!e.target.closest('[data-lang-switch]')) return;
  const next = root.lang === 'pl' ? 'en' : 'pl';
  store.set(next);
  location.href = langUrl(next);
});

/* Kopiowanie maila do schowka + cichy komunikat. */
let copyTimer;
app.addEventListener('click', async e => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const text = btn.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Starsze przeglądarki / brak uprawnień: zaznacz i skopiuj klasycznie.
    const tmp = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(tmp);
    tmp.select();
    try { document.execCommand('copy'); } catch { /* zostaje zaznaczony tekst */ }
    tmp.remove();
  }
  const status = btn.nextElementSibling;
  status.textContent = '';
  requestAnimationFrame(() => { status.textContent = status.dataset.copied; }); // czytnik ogłosi przy każdym kliknięciu
  status.classList.add('is-on');
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => status.classList.remove('is-on'), 2000);
});

/* Indeks → sfera (desktop). Najechanie albo focus z klawiatury na projekcie obraca sferę do jego karty;
   po wyjściu z indeksu sfera znów się powoli kręci. */
let active = content.shared.projects[0].id;

function activate(id) {
  if (id === active) return;
  active = id;
  for (const el of app.querySelectorAll('.index__row[data-project], .sphere__card')) {
    el.classList.toggle('is-active', el.dataset.project === id);
  }
  sphereApi?.focus(id);
  // Karta z przodu gra od początku: plansza teraz albo grafika interaktywna (loom.studio, reh.ab)
  const media = app.querySelector(`.sphere__card[data-project="${id}"] .sphere__media`);
  restartReel(media);
  showLive(media, id);
}

/* Sfera z projektami (desktop, sphere.js - ładowany tylko tam, gdzie sfera jest widoczna). */
let sphereApi = null;
const desktop = matchMedia('(min-width: 1024px)');
async function mountSphere() {
  sphereApi?.stop();
  sphereApi = null;
  const el = app.querySelector('[data-sphere]');
  if (!el || !desktop.matches) return;
  const { initSphere } = await import('./sphere.js');
  if (!el.isConnected) return;
  sphereApi = initSphere(el, { reduce: reduceMotion.matches });
}
desktop.addEventListener('change', mountSphere);
app.addEventListener('pointerout', e => {
  if (e.target.closest?.('.index') && !e.relatedTarget?.closest?.('.index')) sphereApi?.release();
});
app.addEventListener('focusout', e => {
  if (e.target.closest?.('.index') && !e.relatedTarget?.closest?.('.index')) sphereApi?.release();
});

/* Plansza animowana (reel) w panelu: cały ruch to CSS; tu tylko start od zera.
   Granie / pauzę ustawia CSS (--reel-play): otwarty panel. */
function restartReel(scope) {
  for (const el of scope?.querySelectorAll('.reel') ?? []) for (const a of el.getAnimations({ subtree: true })) a.currentTime = 0;
}
/* Interaktywne plansze (projects[].live: loom.studio, reh.ab). live.js ładuje się przy pierwszej potrzebie
   i wstawia grafikę nad statyczną planszą (cover): na karcie z przodu sfery i w widocznej ramce otwartego panelu.
   Ponowne pokazanie = pętla od początku. Bez JS i przy ograniczonym ruchu zostaje cover (pierwsza klatka). */
// Statystyka odwiedzin (Cloudflare Web Analytics, bez ciasteczek) - tylko na stronie produkcyjnej, nie lokalnie i nie w testach
const stats = content.shared.analytics;
if (stats?.cloudflare && stats.hosts.includes(location.hostname)) {
  const s = Object.assign(document.createElement('script'), { defer: true, src: 'https://static.cloudflareinsights.com/beacon.min.js' });
  s.dataset.cfBeacon = JSON.stringify({ token: stats.cloudflare });
  document.head.append(s);
}

const liveIds = new Set(content.shared.projects.filter(p => p.live).map(p => p.id));
let liveMod = null;
async function showLive(host, id) {
  if (!host || !liveIds.has(id) || reduceMotion.matches || host.offsetParent === null) return;
  const old = host.querySelector('.live');
  if (old) { for (const a of old.getAnimations({ subtree: true })) a.currentTime = 0; return; }
  liveMod ??= import('./live.js');
  const { liveMarkup, startLive, loadCss } = await liveMod;
  await loadCss();
  const img = host.querySelector(':scope > img');
  if (!img || host.querySelector('.live') || !host.isConnected) return;
  // Karta na sferze: wersja uproszczona (lite); panel: pełna
  img.insertAdjacentHTML('afterend', liveMarkup(content.shared.projects.find(p => p.id === id), { lite: !!host.closest('.sphere__card'), lang: document.documentElement.lang }));
  const el = img.nextElementSibling;
  startLive(el);
}
const visibleFigure = sheet => [...sheet.querySelectorAll('.sheet__video')].find(f => f.offsetParent !== null);

// Symbol rysuje się na nowo.
function redraw(el) {
  if (!el) return;
  el.classList.remove('is-drawing');
  void el.offsetWidth;
  el.classList.add('is-drawing');
}

// Tryb logo: najechanie na logo na sferze - karta w jego miejscu gra od początku
app.addEventListener('pointerover', e => {
  const card = e.target.closest('.home__sphere:not(.is-cards) .sphere__card');
  if (!card || card.contains(e.relatedTarget)) return;
  const media = card.querySelector('.sphere__media');
  restartReel(media);
  showLive(media, card.dataset.project);
});

const onIndex = e => {
  const row = e.target.closest('.index__row[data-project]');
  if (row) activate(row.dataset.project);
};
app.addEventListener('pointerover', onIndex);
app.addEventListener('focusin', onIndex);

/* Panele. Otwiera je zmiana adresu (#teraz), CSS robi wysunięcie.
   Tu: tło nieaktywne, focus w panelu, Esc, powrót focusu, pauza wideo. */
let opener = null;      // element, który otworzył panel — wraca do niego focus
let keyboardNav = false; // ostatnia interakcja z klawiatury (ramka fokusu przy powrocie do przycisku)
addEventListener('keydown', () => { keyboardNav = true; }, { capture: true });
addEventListener('pointerdown', () => { keyboardNav = false; }, { capture: true });
let openedHere = false; // panel otwarty kliknięciem na stronie → zamknięcie = krok wstecz w historii

const openSheet = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id ? document.getElementById(id) : null;
  return el?.classList.contains('sheet') ? el : null;
};

function syncSheet() {
  const sheet = openSheet();
  for (const el of app.querySelectorAll('.site-header, main, .site-footer, .home__sphere, .skip')) el.inert = !!sheet;
  for (const v of app.querySelectorAll('.sheet video')) if (v.closest('.sheet') !== sheet) v.pause();
  playVisible(sheet);
  if (sheet) restartReel(sheet);                                              // panel: plansza od zera
  if (sheet) showLive(visibleFigure(sheet), sheet.id);
  if (sheet) {
    redraw(sheet.querySelector('.sheet__bar'));
    // Po starcie animacji, żeby przeglądarka nie przewijała do panelu.
    // Czat: od razu pole pytania (na dotykowych - krzyżyk, żeby nie wyskakiwała klawiatura).
    if (sheet.id === 'agent') loadAgent();
    if (sheet.id === 'rozmowa') openBooking(sheet);
    if (sheet.id === 'generator') openGenerator(sheet);
    if (sheet.id === 'ai-act') openChecker(sheet);
    if (sheet.id === 'kontrast') openContrast(sheet);
    const first = sheet.id === 'agent' && matchMedia('(hover: hover)').matches ? sheet.querySelector('#agent-q') : null;
    requestAnimationFrame(() => (first ?? sheet.querySelector('[data-close]')).focus({ preventScroll: true }));
  } else {
    // fokus wraca do przycisku tylko przy obsłudze klawiaturą; po stuknięciu/kliknięciu Safari obrysowałby przycisk ramką
    if (keyboardNav) opener?.focus({ preventScroll: true });
    else document.activeElement?.blur();
    opener = null;
  }
}

// Pętla wideo: gra tylko widoczna wersja (16:9 albo 4:5) w otwartym panelu.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function playVisible(sheet) {
  if (!sheet) return;
  for (const v of sheet.querySelectorAll('video')) {
    const visible = v.offsetParent !== null;
    if (visible && !reduceMotion.matches) v.play().catch(() => {});
    else v.pause();
    v.controls = reduceMotion.matches; // bez ruchu: użytkownik sam włącza
  }
}
// = warunek formatu 4:5 w styles.css (tablet pionowo). Po obrocie focus z ukrytego przełącznika
// pauzy przechodzi na przełącznik widocznego formatu (zamiast na body).
// = warunek formatu 9:16 (telefon pionowo) - ta sama obsługa
const onFormatChange = () => {
  const sheet = openSheet();
  playVisible(sheet);
  if (sheet) showLive(visibleFigure(sheet), sheet.id);
};
matchMedia('(min-width: 768px) and (orientation: portrait)').addEventListener('change', onFormatChange);
matchMedia('(max-width: 767px) and (orientation: portrait)').addEventListener('change', onFormatChange);

/* Kalendarz rezerwacji (panel #rozmowa, Cal.com): booking.js ładuje się przy pierwszym otwarciu panelu,
   każde otwarcie odświeża wolne terminy. */
// Kontrast checker (contrast.js) - wczytywany przy pierwszym otwarciu panelu #kontrast
async function openContrast(sheet) {
  const root = sheet.querySelector('[data-contrast]');
  if (!root || root.__contrast) return;
  const { initContrast } = await import('./contrast.js');
  const lang = document.documentElement.lang === 'en' ? 'en' : 'pl';
  initContrast(root, { copy: content[lang].contrast });
}

// AI Act checker (checker.js) - wczytywany przy pierwszym otwarciu panelu #ai-act
async function openChecker(sheet) {
  const root = sheet.querySelector('[data-checker]');
  if (!root || root.__checker) return;
  const { initChecker } = await import('./checker.js');
  const lang = document.documentElement.lang === 'en' ? 'en' : 'pl';
  initChecker(root, { copy: content[lang].checker, lang });
}

// Generator znaków (generator.js) - wczytywany przy pierwszym otwarciu panelu #generator
let genMod = null;
async function openGenerator(sheet) {
  const root = sheet.querySelector('[data-generator]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  const lang = document.documentElement.lang === 'en' ? 'en' : 'pl';
  const { initGenerator } = await (genMod ??= import('./generator.js'));
  const G = content.shared.generator;
  initGenerator(root, { copy: content[lang].generator, palette: G.palette, color: G.color, endpoint: content.shared.agent?.endpoint, lang });
}

// Zamiar otwarcia (najechanie, fokus, dotyk przycisku „umów rozmowę”) - moduł i wolne terminy pobierają się
// wcześniej, więc panel zwykle od razu pokazuje kalendarz, a gdy nie - szkielet z animacją wczytywania.
let bookMod = null;
const warmBooking = e => {
  if (!e.target.closest?.('a[href="#rozmowa"]')) return;
  const root = document.querySelector('[data-booking]');
  if (root) (bookMod ??= import('./booking.js')).then(m => m.warm(root));
};
for (const type of ['pointerover', 'focusin', 'touchstart']) document.addEventListener(type, warmBooking, { passive: true });

async function openBooking(sheet) {
  const root = sheet.querySelector('[data-booking]');
  if (!root) return;
  const { initBooking } = await (bookMod ??= import('./booking.js'));
  if (root.__booking) { root.__booking.reload(); return; }
  root.__booking = initBooking(root, { lang: root.closest('html')?.lang || 'pl', copy: content[root.closest('html')?.lang || 'pl'].booking, email: content.shared.email, calendly: content.shared.calendly });
}

/* Ikony obok awatara: każde miejsce zmienia się we własnym, losowym rytmie (ICON_MS) i nigdy nie pokazuje tej samej
   ikony co sąsiad. W miejscu zbierają się ikony (dokładane przy pierwszym użyciu, pokazywane dopiero po wczytaniu -
   bez mignięcia), widoczna ma .is-on. Ruszają tylko, gdy żaden panel nie jest otwarty. */
const ICON_MS = [500, 1100];
const ICON_SETS = [
  {
    sel: '.hero__slot',
    live: () => !openSheet(),
    get: slot => slot.querySelector('.is-on')?.src,
    set: (slot, src) => {
      let next = [...slot.children].find(img => img.src === src);
      if (!next) {
        next = Object.assign(new Image(40, 40), { className: `hero__icon${src.endsWith('.svg') ? ' mono' : ''}`, src, alt: '' });
        slot.append(next);
      }
      const show = () => { for (const img of slot.children) img.classList.toggle('is-on', img === next); };
      if (next.complete) show(); else next.addEventListener('load', show, { once: true });
    },
  },
];
function tickIcon(set, k) {
  const slots = [...app.querySelectorAll(set.sel)];
  if (slots[k] && set.live()) {
    const shown = new Set([k - 1, k, k + 1].map(i => slots[i] && set.get(slots[i])));
    const free = content.shared.icons.map(abs).filter(src => !shown.has(src));
    if (free.length) set.set(slots[k], free[Math.floor(Math.random() * free.length)]);
  }
  setTimeout(() => tickIcon(set, k), ICON_MS[0] + Math.random() * (ICON_MS[1] - ICON_MS[0]));
}
// Animacja rysunku awatara (SMIL): bez ruchu w systemie stoi na poważnej minie
if (reduceMotion.matches) for (const svg of app.querySelectorAll('svg.avatar__anim')) { svg.pauseAnimations(); svg.setCurrentTime(0); }

// Kropki (dots.js, shared.effects.dots): wczytywane tylko, gdy są na stronie; stoją, gdy otwarty jest panel
if (app.querySelector('canvas[data-dots]')) {
  import('./dots.js').then(m => m.initDots(app, { reduce: reduceMotion.matches, paused: () => !!openSheet() }));
}
if (!reduceMotion.matches && content.shared.icons.length > 3) {
  for (const set of ICON_SETS) app.querySelectorAll(set.sel).forEach((_, k) => tickIcon(set, k));
}

app.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.getElementById(link.getAttribute('href').slice(1));
  if (target?.classList.contains('sheet')) {
    opener = link;
    openedHere = true;
  } else if (link.matches('[data-close], .sheet__backdrop') && openedHere) {
    e.preventDefault();
    openedHere = false;
    history.back(); // zamknięcie nie dokłada wpisu w historii
  }
});

function close() {
  if (!openSheet()) return;
  if (openedHere) { openedHere = false; history.back(); }
  else location.hash = 'start';
}

addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

/* Telefon pionowo: każdy panel zsuwa się palcem - za kreskę u góry albo pasek z tytułem.
   Ponad 80 px albo szybki ruch w dół zamyka; krócej - panel wraca na miejsce. */
app.addEventListener('pointerdown', e => {
  const handle = e.target.closest('.sheet__grab, .sheet__bar');
  if (!handle || e.pointerType === 'mouse' || e.target.closest('a, button') || !matchMedia('(max-width: 767px) and (orientation: portrait)').matches) return;
  const panel = handle.closest('.sheet__panel');
  const y0 = e.clientY, t0 = performance.now();
  let dy = 0;
  panel.style.transition = 'none';
  const move = ev => { dy = Math.max(0, ev.clientY - y0); panel.style.transform = `translateY(${dy}px)`; };
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    panel.style.transition = '';
    const shut = dy > 80 || dy / (performance.now() - t0) > 0.6;
    panel.style.transform = shut ? 'translateY(100%)' : '';
    if (shut) { close(); setTimeout(() => { panel.style.transform = ''; }, 600); }
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
});

/* Jak pracuję: linia biegnie od środka pierwszego do środka ostatniego kółka; kółka i linia zapełniają się
   tuszem, gdy krok mija 75% wysokości ekranu (przewijanie w obie strony; sekcja na środku = wszystkie). */
const steps = [...app.querySelectorAll('.process__step')];
const pLine = app.querySelector('.process__line');
if (steps.length && pLine) {
  const box = pLine.parentElement;
  const dot = el => { const r = el.getBoundingClientRect(); return r.top + parseFloat(getComputedStyle(el, '::before').top) + 4.5; };
  let queued = false;
  const sync = () => {
    queued = false;
    const b = box.getBoundingClientRect(), ys = steps.map(dot), first = ys[0], last = ys.at(-1);
    pLine.style.setProperty('--top', `${first - b.top}px`);
    pLine.style.setProperty('--bottom', `${b.bottom - last}px`);
    const mark = innerHeight * 0.75;
    pLine.style.setProperty('--p', Math.min(1, Math.max(0, (mark - first) / (last - first || 1))).toFixed(3));
    steps.forEach((st, i) => st.classList.toggle('is-on', ys[i] <= mark));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  document.fonts.ready.then(queue);
  queue();
}

/* PDF do pobrania (indeks i czat): motyw strony (jasny / ciemny) → plik z białym albo czarnym tłem.
   Nazwy jak w tools/build-pdf.mjs (pdfName). Bez JS zostaje adres bazowy: 16:9, jasny.
   Wybór orientacji (telefon albo ekran pionowy z dotykiem → 9:16) jest na razie wyłączony - każdy dostaje 16:9.
   Pliki 9:16 nadal się budują (npm run pdf); żeby włączyć z powrotem, ustaw PDF_PORTRAIT = true. */
const PDF_PORTRAIT = false;
const portrait = () => PDF_PORTRAIT && matchMedia('(max-width: 767px), (orientation: portrait) and (pointer: coarse)').matches;
const pdfVariant = base => base.replace(/\.pdf$/, `${portrait() ? '-9x16' : ''}${isDark() ? '-dark' : ''}.pdf`);
app.addEventListener('click', e => {
  const a = e.target.closest('a[download][href$=".pdf"]');
  if (!a) return;
  a.dataset.pdf ??= a.getAttribute('href');
  a.setAttribute('href', pdfVariant(a.dataset.pdf));
}, true);

/* Pasek na dole (desktop): prawa krawędź © = prawa krawędź podpisu pod sferą (oba w kolumnie sfery, podpis
   wyśrodkowany - wystarczy jego szerokość). Bez JS © stoi wyśrodkowane. */
const hint = app.querySelector('.sphere__hint'), copy = app.querySelector('.colophon__copy');
function alignCopy() {
  const r = document.createRange();
  r.selectNodeContents(hint);
  const w = r.getBoundingClientRect().width;
  if (w) copy.style.setProperty('--hint-w', `${w.toFixed(1)}px`);
}
if (hint && copy) {
  document.fonts.ready.then(alignCopy);
  addEventListener('resize', alignCopy, { passive: true });   // np. z telefonu (sfera ukryta) do desktopu
}

/* Nawigator sekcji (desktop): aktywna sekcja = ta, której środek jest najbliżej środka ekranu;
   linia wypełnia się wraz z przewijaniem. Klik w sekcję (i „kontakt” w hero) przewija bez zmiany adresu. */
function syncScrollnav() {
  const nav = app.querySelector('.scrollnav');
  if (!nav || !nav.getClientRects().length) return;   // ukryty (telefon) - fixed nie ma offsetParent
  const max = document.documentElement.scrollHeight - innerHeight;
  nav.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : '0');
  let best = null, dist = Infinity;
  for (const a of nav.querySelectorAll('[data-section]')) {
    const r = document.getElementById(a.dataset.section)?.getBoundingClientRect();
    if (!r) continue;
    const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
    if (d < dist) { dist = d; best = a; }
  }
  for (const a of nav.querySelectorAll('[data-section]')) {
    if (a === best) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  }
  // Sfera: w sekcji Portfolio karty projektów, w pozostałych same logo (karta po najechaniu)
  const cards = best?.dataset.section === 'portfolio';
  const sph = app.querySelector('.home__sphere');
  if (sph && sph.classList.contains('is-cards') !== cards) {
    sph.classList.toggle('is-cards', cards);
    if (cards) { const m = app.querySelector(`.sphere__card[data-project="${active}"] .sphere__media`); restartReel(m); showLive(m, active); }
  }
}
let navRaf = 0;
addEventListener('scroll', () => { if (!navRaf) navRaf = requestAnimationFrame(() => { navRaf = 0; syncScrollnav(); }); }, { passive: true });
addEventListener('resize', syncScrollnav);
app.addEventListener('click', e => {
  const a = e.target.closest('.scrollnav [data-section], .hero__cta a[href="#kontakt"]');
  if (!a) return;
  const sec = document.getElementById(a.dataset.section || 'kontakt');
  if (!sec) return;
  e.preventDefault();
  scrollToSection(sec);
});
/* Płynne przewijanie do sekcji przy scroll-snap: Safari (iPad) przerywa płynny ruch przez kilka sekcji
   i wraca do najbliższej - na czas ruchu przyciąganie jest wyłączone, wraca po dojechaniu (albo po 2 s). */
function scrollToSection(sec) {
  const html = document.documentElement;
  const top = Math.min(sec.getBoundingClientRect().top + scrollY, html.scrollHeight - innerHeight);
  html.style.scrollSnapType = 'none';
  scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  const t0 = performance.now();
  const done = () => {
    if (Math.abs(scrollY - top) > 1 && performance.now() - t0 < 2000) { requestAnimationFrame(done); return; }
    html.style.scrollSnapType = '';
  };
  requestAnimationFrame(done);
}

addEventListener('hashchange', syncSheet);
syncSheet();
syncScrollnav();
mountSphere();


/* Asystent AI (panel #agent). Rozmowa żyje w pamięci strony (przetrwa zmianę języka),
   silnik agent.js ładuje się przy pierwszym pytaniu: AI przez shared.agent.endpoint albo tryb lokalny.
   Odpowiedzi trafiają do DOM jako tekst (textContent) - żadnego HTML z zewnątrz. */

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
// Adresy www i maile w odpowiedzi AI → linki; reszta zwykłym tekstem.
function appendText(node, text) {
  let i = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s)]*[^\s).,;:!?]|[\w.+-]+@[\w-]+(\.[\w-]+)+/g)) {
    node.append(text.slice(i, m.index));
    const a = el('a', 'link-u', m[0]);
    a.href = m[0].startsWith('http') ? m[0] : `mailto:${m[0]}`;
    // adres tej strony z kotwicą (np. …/#rozmowa) - otwiera panel w tej samej karcie; reszta w nowej
    const own = m[0].startsWith('http') && new URL(m[0]).hostname === location.hostname && new URL(m[0]).hash;
    if (own) a.href = new URL(m[0]).hash;
    else if (m[0].startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
    node.append(a);
    i = m.index + m[0].length;
  }
  node.append(text.slice(i));
}
function addMsg(role, payload) {
  const log = app.querySelector('.agent__log');
  if (!log) return null;
  const li = el('li', `agent__msg agent__msg--${role === 'user' ? 'user' : 'bot'}`);
  if (role === 'user') li.textContent = payload;
  else {
    if (payload.offline) li.append(el('span', 'agent__offline t-meta', content[root.lang].agent.offline));
    appendText(li, payload.text);
    if (payload.items?.length) li.append(listOf(payload.items));
    if (payload.links?.length) {
      const p = el('p', 'agent__links t-meta');
      for (const l of payload.links) {
        const a = el('a', 'link-u', l.label);
        a.href = /^(https?:|mailto:|#)/.test(l.href) ? l.href : abs(l.href);
        if (l.ext) { a.target = '_blank'; a.rel = 'noopener'; }
        if (l.download) a.setAttribute('download', '');
        p.append(a);
      }
      li.append(p);
    }
  }
  log.append(li);
  log.scrollTop = log.scrollHeight;
  return li;
}
function listOf(items) {
  const ul = el('ul');
  for (const it of items) ul.append(el('li', '', it));
  return ul;
}
function restoreChat() {
  if (!chat.length) return;
  app.querySelector('[data-agent]')?.classList.add('has-chat');
  for (const m of chat) addMsg(m.role, m.role === 'user' ? m.content : m.answer);
}

async function askAgent(q) {
  q = q.trim().slice(0, 500);
  if (!q || agentBusy) return;
  agentBusy = true;
  app.querySelector('[data-agent]').classList.add('has-chat');
  chat.push({ role: 'user', content: q });
  saveChat();
  addMsg('user', q);
  const typing = addMsg('typing', { text: '' });
  typing?.classList.add('agent__typing');
  typing?.replaceChildren(el('span', 'visually-hidden', content[root.lang].agent.typing), el('i'), el('i'), el('i'));
  const t0 = performance.now();
  try {
    const { ask } = await loadAgent();
    const answer = await ask(content, root.lang, chat.map(({ role, content: c }) => ({ role, content: c })));
    const wait = 500 - (performance.now() - t0);   // tryb lokalny odpowiada od razu - bez „wskakiwania”
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    chat.push({ role: 'assistant', content: [answer.text, ...(answer.items ?? [])].join('\n'), answer });
    saveChat();
    app.querySelector('.agent__typing')?.remove();
    addMsg('assistant', answer);
  } catch {
    chat.pop();                          // pytanie bez odpowiedzi nie zostaje w historii
    saveChat();
  } finally {
    app.querySelector('.agent__typing')?.remove();
    agentBusy = false;
  }
}
// Po wejściu na stronę: zapisana rozmowa wraca do panelu
restoreChat();

app.addEventListener('submit', e => {
  const form = e.target.closest('[data-agent-form]');
  if (!form) return;
  e.preventDefault();
  if (agentBusy) return;                 // poprzednia odpowiedź jeszcze idzie - tekst zostaje w polu
  askAgent(form.elements.q.value);
  form.elements.q.value = '';
});
app.addEventListener('click', e => {
  const b = e.target.closest('[data-ask]');
  if (!b) return;
  askAgent(b.dataset.ask);
  app.querySelector('#agent-q')?.focus({ preventScroll: true });
});
