// Zachowanie strony: PL/EN, indeks ↔ podgląd, panele, kopiowanie maila.
// Treść i szablony: content.js, render.js. Bez JS strona działa na kotwicach i :target.
import { content } from './content.js';
import { render } from './render.js';

const root = document.documentElement;
const app = document.getElementById('app');
const LANGS = ['pl', 'en'];

// localStorage bywa zablokowany (tryb prywatny, wyłączone dane witryny).
const store = {
  get() { try { return localStorage.getItem('lang'); } catch { return null; } },
  set(v) { try { localStorage.setItem('lang', v); } catch { /* bez zapamiętania */ } },
};

root.classList.add('js');

function setLang(lang) {
  const t = content[lang];
  app.innerHTML = render(content, lang);
  root.lang = lang;
  document.title = t.meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description);
}

// index.html ma już polską treść (npm run build). Render tylko, gdy zapisany jest inny język.
const saved = store.get();
if (LANGS.includes(saved) && saved !== root.lang) setLang(saved);

/* Tryb ciemny: domyślnie wg systemu; wybór z przełącznika zapisany w localStorage.
   (Zapisany wybór ustawia już mały skrypt w <head>, żeby strona nie mignęła jasno.) */
const darkSystem = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : darkSystem.matches);

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
darkSystem.addEventListener('change', syncThemeButton);
syncThemeButton();

app.addEventListener('click', e => {
  if (!e.target.closest('[data-lang-switch]')) return;
  const next = root.lang === 'pl' ? 'en' : 'pl';
  root.classList.add('no-intro'); // bez powtórnej animacji wejścia
  setLang(next);
  store.set(next);
  app.querySelector('[data-lang-switch]').focus();
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

/* Indeks → podgląd (desktop). Najechanie albo focus z klawiatury zmienia aktywny projekt. */
let active = content.shared.projects[0].id;

function activate(id) {
  if (id === active) return;
  active = id;
  for (const el of app.querySelectorAll('.index__row[data-project], .preview__logo, .preview__caption')) {
    el.classList.toggle('is-active', el.dataset.project === id);
  }
}

// Symbol rysuje się na nowo.
function redraw(el) {
  if (!el) return;
  el.classList.remove('is-drawing');
  void el.offsetWidth;
  el.classList.add('is-drawing');
}

const onIndex = e => {
  const row = e.target.closest('.index__row[data-project]');
  if (row) activate(row.dataset.project);
};
app.addEventListener('pointerover', onIndex);
app.addEventListener('focusin', onIndex);

/* Panele. Otwiera je zmiana adresu (#teraz), CSS robi wysunięcie.
   Tu: tło nieaktywne, focus w panelu, Esc, powrót focusu, pauza wideo. */
let opener = null;      // element, który otworzył panel — wraca do niego focus
let openedHere = false; // panel otwarty kliknięciem na stronie → zamknięcie = krok wstecz w historii

const openSheet = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id ? document.getElementById(id) : null;
  return el?.classList.contains('sheet') ? el : null;
};

function syncSheet() {
  const sheet = openSheet();
  for (const el of app.querySelectorAll('.site-header, main, .site-footer, .skip')) el.inert = !!sheet;
  for (const v of app.querySelectorAll('.sheet video')) if (v.closest('.sheet') !== sheet) v.pause();
  playVisible(sheet);
  if (sheet) {
    redraw(sheet.querySelector('.sheet__bar'));
    // Po starcie animacji, żeby przeglądarka nie przewijała do panelu.
    requestAnimationFrame(() => sheet.querySelector('[data-close]').focus({ preventScroll: true }));
  } else {
    opener?.focus({ preventScroll: true });
    opener = null;
  }
}

// Pętla wideo: gra tylko widoczna wersja (kwadrat albo 16:9) w otwartym panelu.
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
matchMedia('(orientation: landscape)').addEventListener('change', () => playVisible(openSheet()));

/* Ikony obok znaku: szybka zmiana, każda pozycja przejmuje ikonę z lewej. */
const ICON_MS = 450;
let iconStep = 0;
function tickIcons() {
  const slots = app.querySelectorAll('.hero__slot');
  const n = content.shared.icons.length;
  if (!slots.length || n < 2) return;
  iconStep = (iconStep + 1) % n;
  slots.forEach((slot, i) => {
    const on = (iconStep - i + n) % n;
    [...slot.children].forEach((img, k) => img.classList.toggle('is-on', k === on));
  });
}
if (!reduceMotion.matches) setInterval(tickIcons, ICON_MS);

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

/* Auto-przewijanie projektów (desktop): kreska pod aktywnym wierszem wypełnia się przez AUTO_MS,
   potem podgląd przechodzi do następnego projektu. Pauza: kursor na liście lub podglądzie,
   focus z klawiatury w liście, otwarty panel, karta w tle. Bez ruchu w systemie — wyłączone. */
const AUTO_MS = 3000; // = --t-auto w styles.css
const autoMedia = matchMedia('(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)');
const projectIds = content.shared.projects.map(p => p.id);
let autoTimer = null;
let hovering = false;

function stopAuto() {
  clearTimeout(autoTimer);
  autoTimer = null;
  for (const row of app.querySelectorAll('.index__row.is-playing')) row.classList.remove('is-playing');
}

function startAuto() {
  stopAuto();
  if (!autoMedia.matches || hovering || openSheet() || document.hidden) return;
  const focused = document.activeElement;
  if (focused?.closest?.('.index') && focused.matches(':focus-visible')) return;
  const row = app.querySelector(`.index__row[data-project="${active}"]`);
  if (!row) return;
  void row.offsetWidth; // animacja kreski zawsze od zera
  row.classList.add('is-playing');
  autoTimer = setTimeout(() => {
    activate(projectIds[(projectIds.indexOf(active) + 1) % projectIds.length]);
    startAuto();
  }, AUTO_MS);
}

const inAutoZone = el => !!el?.closest?.('.index, .hero__preview');
app.addEventListener('pointerover', e => {
  if (!hovering && inAutoZone(e.target)) { hovering = true; stopAuto(); }
});
app.addEventListener('pointerout', e => {
  if (hovering && inAutoZone(e.target) && !inAutoZone(e.relatedTarget)) { hovering = false; startAuto(); }
});
app.addEventListener('focusin', e => { if (e.target.closest('.index') && e.target.matches(':focus-visible')) stopAuto(); });
app.addEventListener('focusout', e => { if (e.target.closest('.index') && !inAutoZone(e.relatedTarget)) startAuto(); });
document.addEventListener('visibilitychange', () => (document.hidden ? stopAuto() : startAuto()));
autoMedia.addEventListener('change', startAuto);

addEventListener('hashchange', syncSheet);
addEventListener('hashchange', () => (openSheet() ? stopAuto() : startAuto()));
syncSheet();
startAuto();

// Po zmianie języka DOM jest nowy: przywróć aktywny projekt i stan panelu.
new MutationObserver(() => {
  const id = active;
  active = null;
  activate(id);
  syncSheet();
  syncThemeButton();
  if (!openSheet()) startAuto();
}).observe(app, { childList: true });
