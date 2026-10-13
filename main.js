// Zachowanie strony: PL/EN, indeks ↔ podgląd, panele, kopiowanie maila.
// Treść i szablony: content.js, render.js. Bez JS strona działa na kotwicach i :target.
import { content } from './content.js';
import { render, REEL_MS } from './render.js';

const root = document.documentElement;
const app = document.getElementById('app');
const LANGS = ['pl', 'en'];

// Asystent AI (stan na górze - panel #agent może być otwarty już przy wejściu na stronę)
const chat = [];        // [{ role: 'user' | 'assistant', content, answer? }]
let agentBusy = false;
let agentMod = null;
const loadAgent = () => (agentMod ??= import('./agent.js'));

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
  restartReel(app.querySelector(`.preview__logo[data-project="${id}"]`)); // plansza zawsze od początku pętli
  if (interacting()) holdAtSeam(); else releaseHold();
}

/* Plansza animowana (reel): cały ruch to CSS; tu tylko start od zera i odczyt fazy pętli.
   Granie / pauzę ustawia CSS (--reel-play): aktywny podgląd albo otwarty panel. */
function restartReel(scope) {
  for (const el of scope?.querySelectorAll('.reel') ?? []) for (const a of el.getAnimations({ subtree: true })) a.currentTime = 0;
}
// Faza pętli (ms) w podglądzie projektu - odczyt z animacji-zegara reel-clock.
function reelPhase(id) {
  const a = app.querySelector(`.preview__logo[data-project="${id}"] .reel`)?.getAnimations().find(x => x.animationName === 'reel-clock');
  return a ? Number(a.currentTime) || 0 : 0;
}

/* WCAG 2.2.2: gdy użytkownik jest przy liście / podglądzie (auto-przewijanie stoi), plansza w podglądzie
   kończy bieżącą pętlę i staje na szwie (klatka 0 = 8000 = plakat). Rusza znów przy zmianie projektu
   albo wznowieniu auto-przewijania. Najwyżej jedna pętla ruchu po rozpoczęciu interakcji. */
let holdTimer;
const interacting = () => {
  const f = document.activeElement;
  return hovering || !!(f?.closest?.('.index') && f.matches(':focus-visible'));
};
function releaseHold() {
  clearTimeout(holdTimer);
  for (const el of app.querySelectorAll('.preview .reel.is-held')) el.classList.remove('is-held');
}
function holdAtSeam() {
  const el = app.querySelector(`.preview__logo[data-project="${active}"] .reel`);
  if (el?.classList.contains('is-held')) return; // już stoi na plakacie
  releaseHold();
  if (!el) return;
  holdTimer = setTimeout(() => el.classList.add('is-held'), REEL_MS - (reelPhase(active) % REEL_MS));
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
let sheetWasOpen = false; // poprzedni stan - plansza w podglądzie rusza od zera dopiero po zamknięciu panelu

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
  if (sheet) restartReel(sheet);                                              // panel: plansza od zera
  else if (sheetWasOpen) restartReel(app.querySelector('.preview__logo.is-active')); // powrót na stronę główną
  sheetWasOpen = !!sheet;
  if (sheet) {
    redraw(sheet.querySelector('.sheet__bar'));
    // Po starcie animacji, żeby przeglądarka nie przewijała do panelu.
    // Czat: od razu pole pytania (na dotykowych - krzyżyk, żeby nie wyskakiwała klawiatura).
    if (sheet.id === 'agent') loadAgent();
    const first = sheet.id === 'agent' && matchMedia('(hover: hover)').matches ? sheet.querySelector('#agent-q') : null;
    requestAnimationFrame(() => (first ?? sheet.querySelector('[data-close]')).focus({ preventScroll: true }));
  } else {
    opener?.focus({ preventScroll: true });
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
  const f = document.activeElement;
  if (sheet && f?.matches('.reel__toggle') && f.offsetParent === null) {
    [...sheet.querySelectorAll('.reel__toggle')].find(t => t.offsetParent !== null)?.focus({ preventScroll: true });
  }
};
matchMedia('(min-width: 768px) and (orientation: portrait)').addEventListener('change', onFormatChange);
matchMedia('(max-width: 767px) and (orientation: portrait)').addEventListener('change', onFormatChange);

/* Pauza planszy animowanej w panelu. Stan niesie aria-pressed; etykieta stała.
   Stan wspólny dla obu formatów panelu (16:9 i 4:5) - obrót tabletu nie wznawia ruchu.
   Po zmianie języka (nowy DOM) plansza znów gra. */
app.addEventListener('click', e => {
  const b = e.target.closest('.reel__toggle');
  if (!b) return;
  const paused = b.getAttribute('aria-pressed') !== 'true';
  for (const f of b.closest('.sheet')?.querySelectorAll('.sheet__video') ?? [b.parentElement]) {
    f.querySelector('.reel')?.classList.toggle('is-paused', paused);
    f.querySelector('.reel__toggle')?.setAttribute('aria-pressed', String(paused));
  }
});

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

/* Brandbook: te same ikony co w hero, ale każde miejsce zmienia się we własnym, losowym rytmie
   (BB_ICON_MS, trochę wolniej niż w hero) i nigdy nie pokazuje tej samej ikony co sąsiad.
   Jedno <img> na miejsce (zmiana src) - pliki są już w pamięci po hero. Tylko przy otwartym panelu. */
const BB_ICON_MS = [500, 1100];
function tickBrandbookIcon(k) {
  const imgs = [...app.querySelectorAll('[data-bb-icon]')];
  const icons = content.shared.icons;
  if (imgs[k] && openSheet()?.id === 'brandbook') {
    const shown = new Set([k - 1, k, k + 1].map(i => imgs[i]?.getAttribute('src')));
    const free = icons.filter(src => !shown.has(src));
    const src = free[Math.floor(Math.random() * free.length)];
    if (src) { imgs[k].src = src; imgs[k].classList.toggle('mono', src.endsWith('.svg')); }
  }
  setTimeout(() => tickBrandbookIcon(k), BB_ICON_MS[0] + Math.random() * (BB_ICON_MS[1] - BB_ICON_MS[0]));
}
if (!reduceMotion.matches && content.shared.icons.length > 3) content.shared.icons.slice(0, 6).forEach((_, k) => tickBrandbookIcon(k));

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
const AUTO_MS = 3000; // = --t-auto (projekty bez planszy animowanej); wiersz z planszą ma data-dwell = REEL_MS
const autoMedia = matchMedia('(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)');
const projectIds = content.shared.projects.map(p => p.id);
let autoTimer = null;
let hovering = false;

function stopAuto() {
  clearTimeout(autoTimer);
  autoTimer = null;
  for (const row of app.querySelectorAll('.index__row.is-playing')) row.classList.remove('is-playing');
}

// resume = true: wznowienie (kursor wyszedł, karta wróciła…) - plansza w podglądzie grała dalej,
// więc kreska i czas do przejścia liczą się od bieżącej fazy pętli, a nie od zera.
function startAuto(resume = false) {
  stopAuto();
  if (openSheet() || document.hidden) return;
  // Bez auto-przewijania (interakcja, ekran dotykowy) plansza w podglądzie kończy pętlę i staje.
  if (!autoMedia.matches || interacting()) { holdAtSeam(); return; }
  const row = app.querySelector(`.index__row[data-project="${active}"]`);
  if (!row) return;
  releaseHold();
  const ms = Number(row.dataset.dwell) || AUTO_MS;
  let done = resume ? reelPhase(active) % ms : 0;
  if (ms - done < 1000) done = 0; // za mało do końca - pełny czas zamiast mignięcia
  row.style.setProperty('--auto-delay', `${-done}ms`); // kreska zaczyna w miejscu fazy
  void row.offsetWidth; // animacja kreski zawsze od nowa
  row.classList.add('is-playing');
  autoTimer = setTimeout(() => {
    activate(projectIds[(projectIds.indexOf(active) + 1) % projectIds.length]);
    startAuto();
  }, ms - done);
}

const inAutoZone = el => !!el?.closest?.('.index, .hero__preview');
app.addEventListener('pointerover', e => {
  if (!hovering && inAutoZone(e.target)) { hovering = true; stopAuto(); holdAtSeam(); }
});
app.addEventListener('pointerout', e => {
  if (hovering && inAutoZone(e.target) && !inAutoZone(e.relatedTarget)) { hovering = false; startAuto(true); }
});
app.addEventListener('focusin', e => { if (e.target.closest('.index') && e.target.matches(':focus-visible')) { stopAuto(); holdAtSeam(); } });
app.addEventListener('focusout', e => { if (e.target.closest('.index') && !inAutoZone(e.relatedTarget)) startAuto(true); });
document.addEventListener('visibilitychange', () => (document.hidden ? stopAuto() : startAuto(true)));
autoMedia.addEventListener('change', () => startAuto(true));

addEventListener('hashchange', syncSheet);
addEventListener('hashchange', () => (openSheet() ? stopAuto() : startAuto()));
syncSheet();
startAuto(true);

// Po zmianie języka DOM jest nowy: przywróć aktywny projekt i stan panelu.
new MutationObserver(() => {
  const id = active;
  active = null;
  activate(id);
  syncSheet();
  syncThemeButton();
  restoreChat();
  if (!openSheet()) startAuto();
}).observe(app, { childList: true });

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
    if (m[0].startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
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
        a.href = l.href;
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
    app.querySelector('.agent__typing')?.remove();
    addMsg('assistant', answer);
  } finally {
    app.querySelector('.agent__typing')?.remove();
    agentBusy = false;
  }
}

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
