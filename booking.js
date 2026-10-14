// Kalendarz rezerwacji w panelu #rozmowa - darmowe API Cal.com (v2), prosto z przeglądarki:
// bez serwera i bez klucza (wolne terminy i tworzenie rezerwacji są publiczne, CORS dla każdej strony).
//   GET  /v2/slots     (cal-api-version 2024-09-04)  - wolne terminy na 3 tygodnie, w strefie odwiedzającego
//   POST /v2/bookings  (cal-api-version 2024-08-13)  - rezerwacja: imię, e-mail, strefa, opcjonalna notatka
// Cal.com sam wysyła potwierdzenie z linkiem do spotkania i wpisuje je do Twojego kalendarza.
// main.js ładuje ten moduł przy pierwszym otwarciu panelu. Teksty: pl/en.booking w content.js.

const API = 'https://api.cal.com/v2';
const DAYS = 21;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function initBooking(root, { lang, copy, email, calendly = '' }) {
  const ui = root.querySelector('[data-booking-ui]');
  const { user, event, minutes } = root.dataset;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw';
  const locale = lang === 'pl' ? 'pl-PL' : 'en-GB';
  const fmtDay = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const fmtFull = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  let slots = {};       // „2026-10-20” → [ISO start, …]
  let day = null, slot = null;

  const mailLink = () => Object.assign(el('a', 'link-u', email), { href: `mailto:${email}` });
  const status = (text, withMail = false) => {
    const p = el('p', 'book__status t-text');
    p.append(text);
    if (withMail) p.append(' ', mailLink());
    return p;
  };

  async function load() {
    ui.replaceChildren(status(copy.loading));
    const start = new Date(), end = new Date(Date.now() + DAYS * 864e5);
    const q = new URLSearchParams({ username: user, eventTypeSlug: event, start: ymd(start), end: ymd(end), timeZone: tz });
    try {
      const res = await fetch(`${API}/slots?${q}`, { headers: { 'cal-api-version': '2024-09-04' } });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(res.status);
      slots = Object.fromEntries(Object.entries(json.data || {})
        .map(([d, list]) => [d, list.map(x => (typeof x === 'string' ? x : x.start)).filter(Boolean)])
        .filter(([, list]) => list.length));
      day = Object.keys(slots).sort()[0] ?? null;
      render();
    } catch {
      // Cal.com nie odpowiada / brak typu spotkania - zapasowo Calendly (jeśli jest) i mail
      const st = status(copy.error, true);
      if (calendly) st.append(' · ', Object.assign(el('a', 'link-u', 'Calendly ↗'), { href: calendly, target: '_blank', rel: 'noopener' }));
      ui.replaceChildren(st);
    }
  }

  function render() {
    const dates = Object.keys(slots).sort();
    if (!dates.length) { ui.replaceChildren(status(copy.empty, true)); return; }
    const wrap = el('div', 'book__pick');
    // Dni z wolnymi terminami
    const days = el('div', 'book__days');
    days.setAttribute('role', 'group');
    days.setAttribute('aria-label', copy.day);
    for (const d of dates) {
      const b = el('button', 'book__day', fmtDay.format(new Date(`${d}T12:00:00`)));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(d === day));
      b.addEventListener('click', () => { day = d; slot = null; render(); });
      days.append(b);
    }
    // Godziny wybranego dnia
    const times = el('div', 'book__times');
    times.setAttribute('role', 'group');
    times.setAttribute('aria-label', copy.time);
    for (const iso of slots[day] || []) {
      const b = el('button', 'book__time', fmtTime.format(new Date(iso)));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(iso === slot));
      b.addEventListener('click', () => { slot = iso; render(); ui.querySelector('#book-name')?.focus(); });
      times.append(b);
    }
    wrap.append(el('p', 'book__label t-meta', copy.day), days, el('p', 'book__label t-meta', `${copy.time} · ${copy.tz}: ${tz}`), times);
    ui.replaceChildren(wrap);
    if (slot) ui.append(form());
  }

  function form() {
    const f = el('form', 'book__form');
    f.append(el('p', 'book__when t-text', `${fmtFull.format(new Date(slot))} · ${minutes} min`));
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
    const submit = el('button', 'button', copy.submit);
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
        eventTypeSlug: event,
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
        if (!res.ok || json.status !== 'success') throw new Error(res.status);
        const done = el('div', 'book__done');
        done.append(el('p', 'book__status t-text', `${copy.done} ${fmtFull.format(new Date(slot))}.`), el('p', 't-text t-muted', copy.doneNote));
        ui.replaceChildren(done);
        done.setAttribute('tabindex', '-1');
        done.focus();
      } catch {
        submit.disabled = false;
        submit.textContent = copy.submit;
        f.querySelector('.book__error')?.remove();
        const err = status(copy.error, true);
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
