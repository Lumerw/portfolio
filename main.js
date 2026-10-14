// Zachowanie strony: PL/EN, indeks ↔ podgląd, panele, kopiowanie maila.
// Treść i szablony: content.js, render.js. Bez JS strona działa na kotwicach i :target.
import { content } from './content.js';
import { render } from './render.js';

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
   i wstawia grafikę nad statyczną planszą (cover) w widocznej ramce otwartego panelu.
   Ponowne pokazanie = pętla od początku. Bez JS i przy ograniczonym ruchu zostaje cover (pierwsza klatka). */
const liveIds = new Set(content.shared.projects.filter(p => p.live).map(p => p.id));
let liveMod = null;
async function showLive(host, id) {
  if (!host || !liveIds.has(id) || reduceMotion.matches || host.offsetParent === null) return;
  const old = host.querySelector('.live');
  if (old) { for (const a of old.getAnimations({ subtree: true })) a.currentTime = 0; return; }
  liveMod ??= import('./live.js');
  const { liveMarkup, startLive, loadCss, toggleMarkup } = await liveMod;
  await loadCss();
  const img = host.querySelector(':scope > img');
  if (!img || host.querySelector('.live') || !host.isConnected) return;
  img.insertAdjacentHTML('afterend', liveMarkup(content.shared.projects.find(p => p.id === id)));
  const el = img.nextElementSibling;
  // Panel: przycisk pauzy; stan wspólny dla formatów (obrót ekranu nie wznawia ruchu)
  const sheet = host.closest('.sheet');
  if (sheet) {
    const paused = !!sheet.querySelector('.reel__toggle[aria-pressed="true"]');
    host.insertAdjacentHTML('beforeend', toggleMarkup(content[root.lang].ui.reelPause, paused));
    el.classList.toggle('is-paused', paused);
  }
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
  if (sheet) restartReel(sheet);                                              // panel: plansza od zera
  if (sheet) showLive(visibleFigure(sheet), sheet.id);
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
  if (sheet) showLive(visibleFigure(sheet), sheet.id);
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
    f.querySelector('.reel, .live')?.classList.toggle('is-paused', paused);
    f.querySelector('.reel__toggle')?.setAttribute('aria-pressed', String(paused));
  }
});

/* Ikony (obok awatara i w brandbooku): każde miejsce zmienia się we własnym, losowym rytmie (ICON_MS)
   i nigdy nie pokazuje tej samej ikony co sąsiad. Hero: w miejscu leżą wszystkie ikony, widoczna ma .is-on.
   Brandbook: jedno <img> na miejsce, zmienia się src. Każdy zestaw rusza tylko, gdy go widać. */
const ICON_MS = [500, 1100];
const ICON_SETS = [
  {
    sel: '.hero__slot',
    live: () => !openSheet(),
    get: slot => slot.querySelector('.is-on')?.getAttribute('src'),
    set: (slot, src) => { for (const img of slot.children) img.classList.toggle('is-on', img.getAttribute('src') === src); },
  },
  {
    sel: '[data-bb-icon]',
    live: () => openSheet()?.id === 'brandbook',
    get: img => img.getAttribute('src'),
    set: (img, src) => { img.src = src; img.classList.toggle('mono', src.endsWith('.svg')); },
  },
];
function tickIcon(set, k) {
  const slots = [...app.querySelectorAll(set.sel)];
  if (slots[k] && set.live()) {
    const shown = new Set([k - 1, k, k + 1].map(i => slots[i] && set.get(slots[i])));
    const free = content.shared.icons.filter(src => !shown.has(src));
    if (free.length) set.set(slots[k], free[Math.floor(Math.random() * free.length)]);
  }
  setTimeout(() => tickIcon(set, k), ICON_MS[0] + Math.random() * (ICON_MS[1] - ICON_MS[0]));
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

addEventListener('hashchange', syncSheet);
syncSheet();
mountSphere();

// Po zmianie języka DOM jest nowy: przywróć aktywny projekt i stan panelu.
new MutationObserver(() => {
  const id = active;
  active = null;
  activate(id);
  syncSheet();
  syncThemeButton();
  restoreChat();
  mountSphere();
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
