// Kalendarz rezerwacji w panelu #rozmowa - darmowe API Cal.com (v2), prosto z przeglądarki:
// bez serwera i bez klucza API (wolne terminy i tworzenie rezerwacji są publiczne, CORS dla każdej strony).
//   GET  /v2/slots     (cal-api-version 2024-09-04)  - wolne terminy na 4 tygodnie, w strefie odwiedzającego
//   POST /v2/bookings  (cal-api-version 2024-08-13)  - rezerwacja: imię, e-mail, strefa, opcjonalna notatka
// Cal.com sam wysyła potwierdzenie z linkiem do spotkania i wpisuje je do kalendarza właściciela.
// Kroki: dzień (siatka tygodni pn-nd) → godzina → formularz w miejscu listy godzin → potwierdzenie.
// main.js ładuje ten moduł przy pierwszym otwarciu panelu. Teksty: pl/en.booking w content.js.

const API = 'https://api.cal.com/v2';
const WEEKS = 4;
const DAY = 864e5;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const button = (cls, text, pressed, onClick) => {
  const b = el('button', cls, text);
  b.type = 'button';
  if (pressed != null) b.setAttribute('aria-pressed', String(pressed));
  b.addEventListener('click', onClick);
  return b;
};
const group = (cls, label) => {
  const g = el('div', cls);
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  return g;
};

export function initBooking(root, { lang, copy, email, calendly = '' }) {
  const ui = root.querySelector('[data-booking-ui]');
  const user = root.dataset.user;
  // „30min:30,15min:15” → [{ slug, minutes }], pierwszy domyślny
  const events = (root.dataset.events || '').split(',').filter(Boolean)
    .map(x => { const [slug, m] = x.split(':'); return { slug, minutes: Number(m) || 30 }; });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw';
  const locale = lang === 'pl' ? 'pl-PL' : 'en-GB';
  const fmtTime = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const fmtDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtDay = fmtDate;
  const fmtFull = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: 'long' });
  const fmtWeekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  let ev = events[0], slots = {}, day = null, slot = null, seq = 0;
  const tzOut = root.querySelector('[data-book-tz]');
  if (tzOut) tzOut.textContent = tz;

  const mailLink = () => Object.assign(el('a', 'link-u', email), { href: `mailto:${email}` });
  const status = (text, withMail = false) => {
    const p = el('p', 'book__status t-text');
    p.append(text);
    if (withMail) p.append(' ', mailLink());
    return p;
  };

  // Siatka zaczyna się w poniedziałek bieżącego tygodnia (południe - bez kłopotów ze zmianą czasu)
  const gridStart = new Date();
  gridStart.setHours(12, 0, 0, 0);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
  const at = i => new Date(gridStart.getTime() + i * DAY);

  async function load() {
    const my = ++seq;
    slots = {}; day = null; slot = null;
    render(copy.loading);
    const q = new URLSearchParams({ username: user, eventTypeSlug: ev.slug, start: ymd(new Date()), end: ymd(at(WEEKS * 7 - 1)), timeZone: tz });
    try {
      const res = await fetch(`${API}/slots?${q}`, { headers: { 'cal-api-version': '2024-09-04' } });
      const json = await res.json();
      if (my !== seq) return;                       // w międzyczasie zmieniono długość rozmowy
      if (!res.ok || json.status !== 'success') throw new Error(res.status);
      slots = Object.fromEntries(Object.entries(json.data || {})
        .map(([d, list]) => [d, list.map(x => (typeof x === 'string' ? x : x.start)).filter(Boolean)])
        .filter(([, list]) => list.length));
      day = Object.keys(slots).sort()[0] ?? null;
      render();
    } catch {
      if (my !== seq) return;
      // Cal.com nie odpowiada / brak typu spotkania - zapasowo strona rezerwacji Cal.com i mail
      const st = status(copy.error, true);
      if (calendly) st.append(' · ', Object.assign(el('a', 'link-u', 'Cal.com ↗\uFE0E'), { href: calendly, target: '_blank', rel: 'noopener' }));
      ui.replaceChildren(st);
    }
  }

  function render(loading) {
    const parts = [];
    // 1. Długość rozmowy (gdy jest więcej niż jeden typ spotkania)
    if (events.length > 1) {
      const lens = group('book__lens', copy.length);
      for (const e of events) lens.append(button('book__len', `${e.minutes} min`, e === ev, () => { if (e !== ev) { ev = e; load(); } }));
      parts.push(el('p', 'book__label t-meta', copy.length), lens);
    }
    if (loading) { ui.replaceChildren(...parts, status(loading)); return; }
    if (!Object.keys(slots).length) { ui.replaceChildren(...parts, status(copy.empty, true)); return; }

    // 2. Dzień: siatka 4 tygodni pn-nd, aktywne tylko dni z wolnymi terminami
    const cal = group('book__cal', copy.day);
    for (let i = 0; i < 7; i++) cal.append(el('span', 'book__wd t-meta', fmtWeekday.format(at(i)).replace('.', '')));
    const today = ymd(new Date());
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = at(i), key = ymd(d);
      if (slots[key]) {
        const b = button('book__date', String(d.getDate()), key === day, () => { day = key; slot = null; render(); });
        b.setAttribute('aria-label', fmtDate.format(d));
        cal.append(b);
      } else {
        const off = el('span', `book__date is-off${key === today ? ' is-today' : ''}`, String(d.getDate()));
        off.setAttribute('aria-hidden', 'true');
        cal.append(off);
      }
    }
    const months = [...new Set([at(0), at(WEEKS * 7 - 1)].map(d => fmtMonth.format(d)))].join(' / ');
    const left = el('div', 'book__col');
    left.append(el('p', 'book__label t-meta', `${copy.day} · ${months}`), cal);

    // 3. Prawa kolumna: godziny wybranego dnia, a po wyborze godziny - w tym samym miejscu formularz
    // (jak w Calendly: wszystko na jednym ekranie, bez przewijania na desktopie)
    const right = el('div', 'book__col book__col--side');
    if (slot) {
      right.append(form());
    } else {
      const times = group('book__times', copy.time);
      for (const iso of slots[day] || []) {
        times.append(button('book__time', fmtTime.format(new Date(iso)), false, () => {
          slot = iso; render();
          const name = ui.querySelector('#book-name');
          name?.focus({ preventScroll: true });
          name?.closest('.book__form')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }));
      }
      right.append(el('p', 'book__label t-meta', `${copy.time} · ${fmtDay.format(new Date(`${day}T12:00:00`))}`), times);
    }
    const pick = el('div', 'book__pick');
    pick.append(left, right);
    parts.push(pick);

    ui.replaceChildren(...parts);
  }

  function form() {
    const f = el('form', 'book__form');
    // wybrany termin + powrót do listy godzin
    const when = el('div', 'book__when');
    when.append(el('p', 't-text', `${fmtFull.format(new Date(slot))} · ${ev.minutes} min`), button('book__back link-u t-meta', `← ${copy.change}`, null, () => { slot = null; render(); }));
    f.append(when);
    const field = (id, label, type, required) => {
      const l = el('label', 'book__field');
      l.append(el('span', 't-meta', label));
      const i = el(type === 'textarea' ? 'textarea' : 'input');
      i.id = id;
      i.name = id;
      if (type !== 'textarea') i.type = type;
      i.required = required;
      i.maxLength = type === 'textarea' ? 500 : 120;
      if (type === 'email') i.autocomplete = 'email';
      if (id === 'book-name') i.autocomplete = 'name';
      l.append(i);
      return l;
    };
    f.append(field('book-name', copy.name, 'text', true), field('book-email', copy.email, 'email', true), field('book-note', copy.note, 'textarea', false));
    const actions = el('div', 'book__actions');
    const submit = el('button', 'button button--primary', copy.submit);
    submit.type = 'submit';
    actions.append(submit);
    f.append(actions);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      submit.disabled = true;
      submit.textContent = copy.sending;
      const note = f.elements['book-note'].value.trim();
      const body = {
        start: new Date(slot).toISOString(),
        eventTypeSlug: ev.slug,
        username: user,
        attendee: { name: f.elements['book-name'].value.trim(), email: f.elements['book-email'].value.trim(), timeZone: tz, language: lang },
        ...(note && { bookingFieldsResponses: { notes: note } }),
      };
      try {
        const res = await fetch(`${API}/bookings`, {
          method: 'POST',
          headers: { 'cal-api-version': '2024-08-13', 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.status !== 'success') throw Object.assign(new Error(json.error?.message || res.status), { status: res.status });
        const done = el('div', 'book__done');
        done.append(el('p', 'book__status t-text', `${copy.done} ${fmtFull.format(new Date(slot))} (${ev.minutes} min).`), el('p', 't-text t-muted', copy.doneNote));
        ui.replaceChildren(done);
        done.setAttribute('tabindex', '-1');
        done.focus();
      } catch (er) {
        // Powód z Cal.com: zajęty termin (409) → odśwież listę; adres, na który nie da się wysłać maila
        // (np. domena bez skrzynek) → popraw e-mail; reszta → ogólny komunikat z mailem.
        console.warn('Cal.com:', er.message);
        if (er.status === 409) { load().then(() => ui.prepend(status(copy.taken))); return; }
        submit.disabled = false;
        submit.textContent = copy.submit;
        f.querySelector('.book__error')?.remove();
        const bad = /e-?mail|deliverab|domain|address/i.test(er.message);
        const err = status(bad ? copy.badEmail : copy.error, !bad);
        err.classList.add('book__error');
        err.setAttribute('role', 'alert');
        f.append(err);
      }
    });
    return f;
  }

  load();
  return { reload: load };
}
