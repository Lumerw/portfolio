// Szablony strony. Czyste funkcje: dane z content.js → HTML.
// Układ: jeden ekran (nagłówek, hero z indeksem, stopka z kontaktem) + panele wysuwane od dołu
// (projekty, o mnie). Panele działają przez :target — także bez JS; main.js dokłada focus, Esc, inert.
// Używane w przeglądarce (main.js, przełączanie PL/EN) i przy buildzie (tools/build-html.mjs),
// dzięki czemu index.html ma gotową treść także bez JS.

import { symbol } from './symbols.js';

// Plansza animowana teraz (reel): jedna pętla. Trafia do --t-reel oraz do data-dwell / --t-auto wiersza indeksu.
export const REEL_MS = 8000;
// Ścieżki wpisane w HTML (bez dodatkowych plików): glify „?” i „!” z teraz, ikony ról, falka, pauza / start.
export const RP = {
  q: 'M66.3 152.1C49.2 105.6 94.5 85.2 94.5 47.7C94.5 36.6 89.7 18.9 68.4 14.4L41.1 55.8L0 34.5C17.7 11.1 43.5 0 83.1 0C126.3 0 158.7 15.9 158.7 49.2C158.7 100.8 80.7 106.2 80.7 152.1H66.3ZM75.3 233.4C59.1 233.4 45.3 219.3 45.3 203.1C45.3 186.9 59.1 173.1 75.3 173.1C91.5 173.1 105.6 186.9 105.6 203.1C105.6 219.3 91.5 233.4 75.3 233.4Z',
  x: 'M71.4 0 42.9 149.1H28.5L0 0H71.4ZM36 230.4C19.8 230.4 6 216.3 6 200.1C6 183.9 19.8 170.1 36 170.1C52.2 170.1 66.3 183.9 66.3 200.1C66.3 216.3 52.2 230.4 36 230.4Z',
  headphones: 'M2.5 12A9.5 9.5 0 0 1 21.5 12V20A1.5 1.5 0 0 1 20 21.5H17A1.5 1.5 0 0 1 15.5 20V14.5A1.5 1.5 0 0 1 17 13H18.5V12A6.5 6.5 0 0 0 5.5 12V13H7A1.5 1.5 0 0 1 8.5 14.5V20A1.5 1.5 0 0 1 7 21.5H4A1.5 1.5 0 0 1 2.5 20Z',
  presentation: 'M3 3.5A1 1 0 0 1 4 2.5H20A1 1 0 0 1 21 3.5V14.5H13.5L18 21.5H14.75L12 17.1 9.25 21.5H6L10.5 14.5H3ZM7.13 11.75L9.52 9.36 12.52 12.11 18.63 6 16.37 6 12.48 9.89 9.48 7.14 4.87 11.75Z',
  video: 'M3.5 5.5H13.5A1.5 1.5 0 0 1 15 7V17A1.5 1.5 0 0 1 13.5 18.5H3.5A1.5 1.5 0 0 1 2 17V7A1.5 1.5 0 0 1 3.5 5.5ZM16.5 9.17L22 5.5V18.5L16.5 14.83Z',
  falka: 'M2.7 21.4 C14.9 21.7, 48.2 23.1, 76.1 22.9 C104.1 22.7, 146.3 22.4, 170.7 20.2 C195 18, 212.1 12.2, 222.4 9.7 C232.8 7.1, 232.9 5, 232.8 4.8 C232.8 4.6, 224.1 7.9, 222.4 8.5',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z', play: 'M7 4l13 8-13 8z',
};
export const svgi = (d, cls = '', vb = '0 0 24 24', eo = false) =>
  `<svg${cls ? ` class="${cls}"` : ''} viewBox="${vb}" aria-hidden="true" focusable="false"><path${eo ? ' fill-rule="evenodd"' : ''} d="${d}"/></svg>`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const num = i => String(i + 1).padStart(2, '0');
// Placeholdery typu „[https://…]” nie trafiają do href.
const isReal = v => !String(v).includes('[');
// Placeholdery: fragmenty w [nawiasach] nie trafiają na stronę ani do PDF. Pusty wynik = element znika.
// (Lista rzeczy do uzupełnienia: npm run build.)
export const clean = v => String(v ?? '')
  .replace(/\[[^\]]*\]/g, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/^[\s\-·,.]+|[\s\-·,]+$/g, '')
  .trim();
const url = h => (/^(https?:|mailto:)/.test(h) && isReal(h) ? h : '#');

// Szerokości wariantów obrazu (wspólne z tools/optimize-images.mjs).
export function variantWidths(img, widths) {
  const ws = widths.filter(w => w <= img.w);
  return ws.length ? ws : [img.w];
}

// Kolejność pojawiania się elementów hero (opóźnienie = --n × 80 ms).
const reveal = n => `class="reveal" style="--n:${n}"`;

// Ikonka trybu ciemnego: okrąg z wypełnioną połową, kreska 1 px.
const themeIcon = `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.5"/><path d="M8 1.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" stroke="none"/></svg>`;

function header(c, t) {
  return `
<a class="skip" href="#tresc">${esc(t.ui.skip)}</a>
<header class="site-header">
  <div class="wrap site-header__in">
    <button class="theme" type="button" data-theme-switch aria-label="${esc(t.ui.themeDark)}" data-label-dark="${esc(t.ui.themeDark)}" data-label-light="${esc(t.ui.themeLight)}">${themeIcon}</button>
    <div class="site-header__nav t-meta">
      <button class="lang" type="button" data-lang-switch aria-label="PL / EN - ${esc(t.ui.langSwitchLabel)}">
        <span data-lang="pl">PL</span> / <span data-lang="en">EN</span>
      </button>
    </div>
  </div>
</header>`;
}

// Grafiki jednokolorowe (ikony, sygnety, logo, placeholdery SVG) — w trybie ciemnym odwracane.
// Przyjmuje ścieżkę albo obiekt obrazu; `mono: false` wyłącza odwracanie (kolorowe assety marki).
const mono = img => {
  const src = typeof img === 'string' ? img : img.src;
  const on = typeof img === 'object' && 'mono' in img ? img.mono : String(src).endsWith('.svg');
  return on ? ' mono' : '';
};

// Tło w stylu marki projektu (projects[].brand): kolor + animowana aurora.
const brandStyle = b => `--brand-bg:${esc(b.bg)};${b.aurora.map((c, i) => `--a${i + 1}:${esc(c)}`).join(';')};--brand-speed:${esc(b.speed || '26s')}`;

/* Plansza animowana „Dwie role, jedna rozmowa” (projects[].reel): 8 s w pętli, sam CSS (styles.css → Reel).
   fmt: '16x9' | '4x5' | '9x16'. Kolory i logo z p.brand / p.logo, więc synchronizacja marki działa także tu.
   decorative: kopia na stronie głównej (tekst niesie podpis pod ramką); w panelu role=img + aria-label.
   Glify i falka ruszają się na opakowaniach <span>, nie na <svg>: Chromium nie przenosi animacji
   elementu <svg> na kompozytor i przelicza wtedy styl w każdej klatce. */
// lite (karta na sferze): tylko tło, animacja logo i dwa kafelki słuchacz / ekspert - bez tekstów.
function reel(p, tp, fmt, { eager = false, decorative = false, lite = false } = {}) {
  const r = tp.reel;
  const a11y = decorative ? 'aria-hidden="true"' : `role="img" aria-label="${esc(r.label)}"`;
  const img = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  // --lr = połowa proporcji logo (wysokość / szerokość / 2) - środek znaku w osi pionowej
  const lr = (p.logo.h / p.logo.w / 2).toFixed(5);
  const tiles = `
      <div class="reel__tiles">
        <div class="reel__tile reel__tile--l"><span class="reel__avatar">${svgi(RP.headphones)}</span><span class="reel__chip">${esc(r.listener)}</span><span class="reel__ring"></span></div>
        <div class="reel__tile reel__tile--e"><span class="reel__avatar">${svgi(RP.presentation, '', '0 0 24 24', true)}</span><span class="reel__chip">${esc(r.expert)}</span><span class="reel__ring"></span></div>
      </div>`;
  if (lite) {
    return `<div class="reel reel--${fmt} reel--lite brand" style="${brandStyle(p.brand)};--t-reel:${REEL_MS}ms;--lr:${lr}" ${a11y}>
  <span class="reel__field reel__field--l"></span><span class="reel__field reel__field--e"></span><span class="reel__field reel__field--m"></span>
  <div class="reel__stage">
    <img class="reel__logo" src="${esc(p.logo.src)}" width="${p.logo.w}" height="${p.logo.h}" alt="" ${img}>
    <div class="reel__call">${tiles}
    </div>
  </div></div>`;
  }
  return `<div class="reel reel--${fmt} brand" style="${brandStyle(p.brand)};--t-reel:${REEL_MS}ms;--lr:${lr}" ${a11y}>
  <span class="reel__field reel__field--l"></span><span class="reel__field reel__field--e"></span><span class="reel__field reel__field--m"></span>
  <div class="reel__stage">
    <span class="reel__glyph reel__glyph--q">${svgi(RP.q, '', '0 0 158.7 233.4')}</span>
    <span class="reel__glyph reel__glyph--x">${svgi(RP.x, '', '0 0 71.4 230.4')}</span>
    <img class="reel__logo" src="${esc(p.logo.src)}" width="${p.logo.w}" height="${p.logo.h}" alt="" ${img}>
    <p class="reel__claim">${esc(r.claimA)} <span class="reel__key">${esc(r.claimKey)}<span class="reel__falka"><span class="reel__falka-in"><svg viewBox="0 0 240 32" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${RP.falka}"/></svg></span></span></span></p>
    <p class="reel__legend"><span>${esc(r.listeners)}</span><span>${esc(r.experts)}</span></p>
    <p class="reel__role reel__role--l">
      <span class="reel__pill">${svgi(RP.headphones)}${esc(r.listener)}</span>
      <span class="reel__needs"><span class="reel__need">${esc(r.need1)}</span><span class="reel__need">${esc(r.need2)}</span><span class="reel__need">${esc(r.need3)}</span></span>
      <span class="reel__short">${esc(r.listenerShort)}</span>
      <span class="reel__sub">${esc(r.listenerSub)}</span></p>
    <p class="reel__role reel__role--e">
      <span class="reel__pill">${svgi(RP.presentation, '', '0 0 24 24', true)}${esc(r.expert)}</span>
      <span class="reel__line">${esc(r.expertLine)}</span>
      <span class="reel__short">${esc(r.expertShort)}</span>
      <span class="reel__sub">${esc(r.expertSub)}</span></p>
    <div class="reel__call">${tiles}
      <p class="reel__title">${esc(r.callTitle)}</p>
      <p class="reel__cap">${svgi(RP.video, '', '0 0 24 24', true)}<span class="reel__cap-long">${esc(r.call)}</span><span class="reel__cap-short">${esc(r.callShort)}</span></p>
    </div>
  </div></div>`;
}

// Wiersz projektu: otwiera panel; najechanie / focus obraca sferę do karty projektu (main.js).
function indexRow(p, i) {
  return `
        <li ${reveal(i + 3)}>
          <a class="index__row${i === 0 ? ' is-active' : ''}" href="#${p.id}" data-project="${p.id}" aria-haspopup="dialog">
            <span class="index__no t-meta">${num(i)}</span>
            <span class="index__title">${esc(p.title)}</span>
            <span class="index__year t-meta">${esc(p.type)}</span>
          </a>
        </li>`;
}

// Ikonka LinkedIn kreską 1 px: ramka + „in” (przy imieniu w hero).
const liIcon = `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x=".5" y=".5" width="15" height="15"/><path d="M4.5 7v5M7.5 12V7M7.5 9.2c0-1.5.9-2.2 2-2.2s2 .7 2 2.2V12"/><circle cx="4.5" cy="4.6" r=".5" fill="currentColor" stroke="none"/></svg>`;

// Ikonki w kolumnie numerów: „i” (o mnie) i pobieranie (PDF), kreska 1 px.
const downloadIcon = `<svg class="icon index__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v8.5M4.5 7L8 10.5L11.5 7M2.5 13.5h11"/></svg>`;

// Karuzela firm „Współpracowałem z”: lista + jej kopia (aria-hidden) dla płynnej pętli.
// Logo-placeholdery też się pokazują (tekst alternatywny dopiero z prawdziwą nazwą) - podmienisz je w content.js.
function clients(c, t) {
  if (!c.clients.length) return '';
  const items = hidden => c.clients.map(k => `
          <li><img class="${mono(k.logo).trim()}" src="${esc(k.logo)}" width="${k.w}" height="${k.h}" alt="${hidden ? '' : esc(clean(k.name))}" loading="lazy" decoding="async"></li>`).join('');
  return `
      <section class="clients" aria-labelledby="clients-title">
        <h2 id="clients-title" class="clients__label t-meta">${esc(t.ui.clients)}</h2>
        <div class="clients__marquee">
        <div class="clients__track">
          <ul class="clients__list">${items(false)}
          </ul>
          <ul class="clients__list" aria-hidden="true">${items(true)}
          </ul>
        </div>
        </div>
      </section>`;
}

// Awatar-moneta: zdjęcie, co kilka sekund obraca się na drugą stronę - rysunek kreską.
// Tęczowa poświata jak dawny przycisk „zapytaj AI”; klik otwiera panel asystenta (#agent).
function avatar(c, t) {
  const face = (src, cls) => `<img class="avatar__face ${cls}" src="${esc(src)}" width="256" height="256" alt="" decoding="async">`;
  return `
      <a class="avatar" href="#agent" aria-haspopup="dialog" aria-label="${esc(t.ui.avatar)}">
        <span class="avatar__halo" aria-hidden="true"></span>
        <span class="avatar__coin">${face(c.avatar.photo, 'avatar__face--photo')}${face(c.avatar.drawing, 'avatar__face--drawing')}</span>
      </a>`;
}

function hero(c, t) {
  const linkedin = c.links.find(l => l.label === 'LinkedIn');
  const liHref = linkedin ? url(linkedin.href) : '#';
  // Trzy miejsca na ikony obok awatara. Każde ma wszystkie ikony (ładowane raz); widoczna jest jedna.
  // Start: 0, ostatnia, przedostatnia; dalej każde miejsce zmienia się we własnym rytmie (main.js).
  const L = c.icons.length;
  const icons = [0, 1, 2].map(slot => `
          <span class="hero__slot">${c.icons.map((src, k) => `<img class="hero__icon${mono(src)}${k === (L - slot) % L ? ' is-on' : ''}" src="${esc(src)}" width="40" height="40" alt="">`).join('')}</span>`).join('');
  return `
  <section id="start" class="hero" aria-labelledby="hero-title">
    <div class="hero__top">${avatar(c, t)}
      <a class="hero__icons" href="#brandbook" aria-haspopup="dialog" aria-label="${esc(t.ui.brandbook)}">${icons}
      </a>
    </div>
    <p class="hero__name"><span ${reveal(0)}>${esc(c.name)}${liHref !== '#' ? ` <a class="hero__li" href="${esc(liHref)}" target="_blank" rel="me noopener" aria-label="${esc(t.ui.linkedin)}">${liIcon}</a>` : ''}</span></p>
    <h1 id="hero-title" class="t-name hero__title"><span ${reveal(1)}>${esc(t.hero.title)}</span></h1>
    <p class="hero__line t-text t-muted"><span ${reveal(2)}>${esc(t.hero.line)}</span></p>
    <p class="hero__cta"><span ${reveal(3)}><a class="button" href="#kontakt">${esc(t.ui.contactCta)}</a></span></p>
    <p class="hero__year t-meta print-only">${esc(c.year)}</p>${clients(c, t)}
  </section>`;
}

// Sekcja „Portfolio”: projekty (panele), brandbook (panel), PDF. LinkedIn jest przy imieniu w hero.
function work(c, t) {
  const n = c.projects.length;
  return `
  <section id="portfolio" class="work" aria-labelledby="work-title">
    <h2 id="work-title" class="work__title t-name section-title">${esc(t.ui.work)}</h2>
    <nav class="index" aria-label="${esc(t.ui.indexLabel)}">
      <ul>${c.projects.map(indexRow).join('')}
        <li ${reveal(n + 4)}>
          <a class="index__row index__row--sub" href="#brandbook" aria-haspopup="dialog"><span class="index__no">${symbol('personal', { cls: 'index__glyph index__mark' })}</span><span class="index__title">${esc(t.ui.brandbook)}</span><span class="index__year t-meta">${esc(t.ui.brandbookType)}</span></a>
        </li>
        <li ${reveal(n + 5)}>
          <a class="index__row index__row--sub" href="${esc(t.ui.pdfFile)}" download><span class="index__no">${downloadIcon}</span><span class="index__title">${esc(t.ui.download)}</span><span class="index__year t-meta">${esc(t.ui.downloadType)}</span></a>
        </li>
      </ul>
    </nav>
  </section>`;
}

// Sfera (desktop): siatka z okręgów kreską 1 px (6 południków, 5 równoleżników) i karty projektów 4:5
// (plansze marek - images.a) rozłożone na powierzchni. Ruch: sphere.js. Duplikat linków z indeksu,
// więc dla czytników ekranu ukryta, karty poza kolejnością tabulacji.
const CARD_LAT = [10, -14, 6, -8, 14, -4];
const SPHERE_MARKS = [[60, 4], [180, -2], [300, -6], [36, 42], [84, -40], [156, 44], [204, -46], [276, 40], [324, -38], [0, 64], [120, 58], [240, -62]];
function sphere(c, t) {
  const n = c.projects.length;
  const meridians = [0, 30, 60, 90, 120, 150].map(d => `
          <span class="sphere__ring" style="--t:rotateY(${d}deg)"></span>`).join('');
  const parallels = [-60, -30, 0, 30, 60].map(lat => {
    const r = Math.cos((lat * Math.PI) / 180), y = -Math.sin((lat * Math.PI) / 180);
    return `
          <span class="sphere__ring sphere__ring--lat${lat === 0 ? ' sphere__ring--eq' : ''}" style="--r:${r.toFixed(4)};--y:${y.toFixed(4)}"></span>`;
  }).join('');
  // Znaki kreską z brandbooka (shared.icons) rozsiane między kartami - sfera „z moich linii”
  const marks = SPHERE_MARKS.map(([lon, lat], i) => {
    const src = c.icons[i % c.icons.length];
    return `
          <span class="sphere__mark" style="--lon:${lon}deg;--lat:${lat}deg"><img class="${mono(src).trim()}" src="${esc(src)}" width="40" height="40" alt=""></span>`;
  }).join('');
  // Karty jak dawny podgląd: teraz - plansza animowana (reel 4:5), loom.studio / reh.ab - pierwsza klatka
  // grafiki interaktywnej (cover), nad którą main.js wstawia żywą grafikę. Gra tylko karta z przodu.
  const cards = c.projects.map((p, i) => {
    const inner = p.reel
      ? reel(p, t.projects[p.id], '4x5', { decorative: true, lite: true })
      : p.cover
        ? `<img src="${esc(p.cover.card ?? p.cover['4x5'])}" width="1080" height="1350" alt="" loading="lazy" decoding="async">`
        : image(p.images.a, '', '240px', { widths: c.imageWidths });
    return `
          <a class="sphere__card${i === 0 ? ' is-active' : ''}" href="#${p.id}" data-project="${p.id}" tabindex="-1" style="--lon:${Math.round((360 / n) * i)}deg;--lat:${CARD_LAT[i % CARD_LAT.length]}deg">
            <span class="sphere__media">${inner}</span>
            <span class="sphere__tag t-meta">${esc(p.title)}</span>
          </a>`;
  }).join('');
  return `
  <div class="home__sphere" aria-hidden="true">
    <div class="sphere" data-sphere>
      <div class="sphere__world" style="--rx:-12deg;--ry:0deg">${meridians}${parallels}
          <span class="sphere__dot"></span>${marks}${cards}
      </div>
    </div>
    <p class="sphere__hint t-meta">${esc(t.ui.sphereHint)}</p>
  </div>`;
}

/* Obrazy: SVG (placeholder) jako zwykły <img>; raster jako <picture> z AVIF/WebP/JPG w kilku szerokościach. */
function image(img, alt, sizes, { eager = false, widths = [] } = {}) {
  alt = clean(alt);
  const dims = `width="${img.w}" height="${img.h}"`;
  const load = eager ? '' : ' loading="lazy" decoding="async"';
  if (img.src.endsWith('.svg') || !widths.length) {
    return `<img class="${mono(img.src).trim()}" src="${esc(img.src)}" alt="${esc(alt)}" ${dims}${load}>`;
  }
  const base = img.src.replace(/\.\w+$/, '');
  const ws = variantWidths(img, widths);
  const set = ext => ws.map(w => `${esc(base)}-${w}.${ext} ${w}w`).join(', ');
  return `<picture>
          <source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">
          <source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">
          <img src="${esc(base)}-${ws.at(-1)}.jpg" srcset="${set('jpg')}" sizes="${sizes}" alt="${esc(alt)}" ${dims}${load}>
        </picture>`;
}

// Szerokość obrazów w układzie (dla przeglądarki przy wyborze z srcset) — obrazy case study są tylko w PDF.
const SIZES_MAIN = '50vw';
const SIZES_HALF = '15vw';

/* Panel wysuwany od dołu. Otwiera go kotwica #id (CSS :target), zamyka link do #start. */
function sheet({ id, cls, bar, body, t }) {
  return `
<section id="${id}" class="sheet ${cls}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
  <a class="sheet__backdrop" href="#start" tabindex="-1" aria-hidden="true"></a>
  <div class="sheet__panel">
    <div class="sheet__bar wrap">${bar}
      <a class="sheet__close" href="#start" data-close aria-label="${esc(t.ui.close)}"><svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 2.5l11 11M13.5 2.5l-11 11"/></svg></a>
    </div>
    <div class="sheet__body wrap">${body}
    </div>
  </div>
</section>`;
}

// Wideo promocyjne w pętli: 16:9 (desktop, ekran poziomy), 4:5 (tablet pionowo) i 9:16 (telefon pionowo) - CSS wybiera jedno.
// Kolejność: prawdziwe wideo (src) > plansza animowana (reel) > plansza statyczna (cover) > plansza marki (brand) > poster-placeholder.
// Odtwarzaniem wideo steruje main.js; reel ma obok przycisk pauzy (rodzeństwo role=img, nie w środku).
// Pod ramką podpis (nazwa - opis) - widoczny tylko na telefonie pionowo.
function promo(p, tp, t) {
  const figures = Object.entries(p.video).map(([fmt, v]) => {
    const ratio = `--ratio:${v.w} / ${v.h}; --ar:${(v.w / v.h).toFixed(4)}`;
    const real = v.src && isReal(v.src);
    if (!real && p.reel) {
      return `
      <figure class="sheet__video sheet__video--${fmt} media" style="${ratio}">
        ${reel(p, tp, fmt)}
        <button class="reel__toggle" type="button" aria-pressed="false" aria-label="${esc(t.ui.reelPause)}">${svgi(RP.pause, 'reel__ico-pause')}${svgi(RP.play, 'reel__ico-play')}</button>
      </figure>`;
    }
    // Bez wideo: plansza statyczna w formacie ramki (cover), potem plansza z aurorą (brand), potem placeholder.
    const cover = p.cover?.[fmt];
    const brandPoster = p.brand
      ? `<div class="brand" style="${brandStyle(p.brand)}" role="img" aria-label="${esc(tp.alt.video)}"><img class="brand__logo${mono(p.logo)}" src="${esc(p.logo.src)}" width="${p.logo.w}" height="${p.logo.h}" alt=""></div>`
      : null;
    const media = real
      ? `<video src="${esc(v.src)}" poster="${esc(v.poster)}" width="${v.w}" height="${v.h}" muted loop playsinline preload="none" aria-label="${esc(tp.alt.video)}"></video>`
      : cover
        ? `<img src="${esc(cover)}" width="${v.w}" height="${v.h}" alt="${esc(clean(tp.alt.video))}" loading="lazy" decoding="async">`
        : brandPoster || `<img class="${mono(v.poster).trim()}" src="${esc(v.poster)}" width="${v.w}" height="${v.h}" alt="${esc(tp.alt.video)}" loading="lazy" decoding="async">`;
    return `
      <figure class="sheet__video sheet__video--${fmt} media" style="${ratio}">
        ${media}
      </figure>`;
  }).join('');
  return `${figures}
      <p class="sheet__caption t-meta"><span>${esc(p.title)} - ${esc(tp.tagline)}</span></p>`;
}

// Projekt: na ekranie tylko wideo albo plansza animowana (+ podpis na telefonie). Tekst i obrazy case study (brief 5.2) zostają w PDF.
function project(p, i, c, t) {
  const tp = t.projects[p.id];
  const opts = { widths: c.imageWidths };
  const link = url(p.href) !== '#'
    ? `<a class="sheet__link link-u t-meta" href="${esc(p.href)}" target="_blank" rel="noopener">${esc(t.ui.view)}</a>`
    : '';
  const fact = key => clean(tp[key]) ? `
            <div class="case__fact">
              <dt class="t-meta">${esc(t.ui[key])}</dt>
              <dd class="t-text">${esc(clean(tp[key]))}</dd>
            </div>` : '';

  const bar = `
      <img class="sygnet sheet__sygnet${mono(p.sygnet)}" src="${esc(p.sygnet.src)}" width="20" height="20" alt="">
      <span class="t-meta sheet__no">${num(i)}</span>
      <h2 id="${p.id}-title" class="t-project">${esc(p.title)}</h2>
      <span class="t-meta sheet__year">${esc(p.type)}</span>
      ${link}`;

  const body = `${promo(p, tp, t)}
      <div class="case print-only">
        <p class="t-meta case__meta">${esc(tp.meta.join(' · '))}</p>
        <div class="case__body grid">
          <div class="case__text">
            <p class="t-text case__lead">${esc(tp.lead)}</p>
            <dl class="case__facts">${fact('problem')}${fact('solution')}${fact('result')}
            </dl>
          </div>
          <div class="case__media">
            <figure class="media media--16x10">${image(p.images.main, tp.alt.main, SIZES_MAIN, opts)}</figure>
            <div class="case__pair">
              <figure class="media media--4x5">${image(p.images.a, tp.alt.a, SIZES_HALF, opts)}</figure>
              <figure class="media media--4x5">${image(p.images.b, tp.alt.b, SIZES_HALF, opts)}</figure>
            </div>
          </div>
        </div>
      </div>`;

  return sheet({ id: p.id, cls: 'sheet--project', bar, body, t });
}

// O mnie (brief 5.3) — w panelu.
// Panel „o mnie” - na razie wyłączony (na stronie i w PDF); dane about zasilają asystenta i CV (npm run cv).
function about(c, t) {
  const a = t.about;
  const rows = a.experience.filter(e => clean(e.place)).map(e => `
            <li class="row">
              <span class="row__year t-meta">${esc(clean(e.year))}</span>
              <span class="row__place">${esc(clean(e.place))}</span>
              <span class="row__role t-muted">${esc(clean(e.role))}</span>
            </li>`).join('');
  const detail = (label, value) => clean(value) ? `
            <div class="detail">
              <dt class="t-meta">${esc(label)}</dt>
              <dd>${esc(clean(value))}</dd>
            </div>` : '';
  const tools = a.tools.map(clean).filter(Boolean).join(' · ');
  const details = detail(t.ui.education, a.education) + detail(t.ui.languages, a.languages) + detail(t.ui.tools, tools);

  const bar = `
      ${symbol('personal', { cls: 'sheet__symbol', small: true })}
      <h2 id="o-mnie-title" class="t-project">${esc(a.title)}</h2>`;

  const body = `
      <div class="about grid">
        <figure class="about__portrait media media--4x5">
          ${image(c.portrait, a.portraitAlt, '(min-width: 1024px) 25vw, 66vw', { widths: c.imageWidths })}
        </figure>
        <div class="about__text">
          ${clean(a.bio) ? `<p class="t-text">${esc(clean(a.bio))}</p>` : ''}
          ${rows ? `<h3 class="t-meta about__label">${esc(t.ui.experience)}</h3>
          <ul class="rows">${rows}
          </ul>` : ''}
          ${details ? `<dl class="details">${details}
          </dl>` : ''}
        </div>
      </div>`;

  return sheet({ id: 'o-mnie', cls: 'sheet--about', bar, body, t });
}

// Brandbook - księga znaku marki osobistej (otwiera ją znak z ikonami w hero). Treść w content.js,
// wartości kolorów w shared.brandbook. Kolory pokazane dosłownie - te same w obu motywach.
function brandbook(c, t) {
  const b = t.brandbook, S = b.sections;
  const sec = (label, inner) => `
      <section class="bb__sec grid">
        <h3 class="bb__label t-meta">${esc(label)}</h3>
        <div class="bb__body">${inner}
        </div>
      </section>`;

  const mark = sec(S.mark, `
          <div class="bb__tiles">
            <div class="bb__tile bb__tile--paper">${symbol('personal', { cls: 'bb__mark' })}</div>
            <div class="bb__tile bb__tile--ink">${symbol('personal', { cls: 'bb__mark' })}</div>
          </div>
          <p class="bb__sizes">${[16, 24, 40].map(n => symbol('personal', { cls: `bb__mark bb__mark--${n}`, small: n === 16 })).join('')}<span class="t-meta">${esc(b.markSizes)}</span></p>
          <p class="t-text t-muted">${esc(b.mark)}</p>`);

  const colors = sec(S.colors, `
          <ul class="bb__swatches">${c.brandbook.colors.map(k => `
            <li><span class="bb__chip" style="background:${esc(k.value)}"></span>
              <span class="bb__name">${esc(b.colors[k.key])}</span>
              <span class="t-meta">${esc(k.value)}${k.contrast ? ` · ${esc(b.contrast)} ${esc(k.contrast)}` : ''}</span></li>`).join('')}
          </ul>`);

  const type = sec(S.type, `
          <p class="t-text t-muted">${esc(b.type.family)}</p>
          <ul class="bb__type">
            <li><span class="t-meta">${esc(b.type.title)}</span><span class="t-name">${esc(b.type.sample)}</span></li>
            <li><span class="t-meta">${esc(b.type.project)}</span><span class="t-project">teraz · loom.studio · reh.ab</span></li>
            <li><span class="t-meta">${esc(b.type.text)}</span><span class="t-text">${esc(t.hero.line)}</span></li>
            <li><span class="t-meta">${esc(b.type.meta)}</span><span class="t-meta">01 · 02 · 03 · marketplace · studio · pitch deck</span></li>
          </ul>`);

  const symbols = sec(S.symbols, `
          <ul class="bb__symbols">${['personal', ...c.projects.map(p => p.symbol)].map(n => `
            <li>${symbol(n, { cls: 'bb__sym' })}</li>`).join('')}${c.icons.slice(0, 6).map(src => `
            <li><img class="bb__icon${mono(src)}" src="${esc(src)}" width="40" height="40" alt="" loading="lazy" data-bb-icon></li>`).join('')}
          </ul>
          <p class="t-text t-muted">${esc(b.symbols)}</p>`);

  const grid = sec(S.grid, `
          <div class="bb__grid" aria-hidden="true">${'<span></span>'.repeat(12)}</div>
          <p class="t-text t-muted">${esc(b.grid)}</p>`);

  const motion = sec(S.motion, `
          <ul class="rows">${b.motion.map(m => `
            <li class="row bb__row"><span class="row__place">${esc(m.name)}</span><span class="row__role t-muted">${esc(m.value)}</span></li>`).join('')}
          </ul>
          <p class="t-text t-muted bb__note">${esc(b.motionNote)}</p>`);

  const rules = sec(S.rules, `
          <div class="bb__rules">
            <div><p class="t-meta">${esc(b.yes)}</p><ul>${b.rulesYes.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
            <div><p class="t-meta">${esc(b.no)}</p><ul class="bb__no">${b.rulesNo.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
          </div>
          <p class="t-text t-muted bb__note">${esc(b.rulesNote)}</p>`);

  const bar = `
      ${symbol('personal', { cls: 'sheet__symbol', small: true })}
      <h2 id="brandbook-title" class="t-project">${esc(t.ui.brandbook)}</h2>`;
  const body = `
      <div class="bb">
        <p class="bb__intro t-text">${esc(b.intro)}</p>${mark}${colors}${type}${symbols}${grid}${motion}${rules}
      </div>`;
  return sheet({ id: 'brandbook', cls: 'sheet--brandbook', bar, body, t });
}

// Ikonka kopiowania: dwa przesunięte kwadraty, kreska 1 px — w stylu symboli.
const copyIcon = `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="2.5" y="4.5" width="9" height="9"/><path d="M5.5 2.5h8v8"/></svg>`;

// Stopka = kontakt (brief 5.4, uproszczony): mail + kopiowanie, profile, przycisk „kontakt”.
// W PDF ta sama stopka jest stroną 6 (tytuł, zdanie i QR tylko w druku).
// Kalendarz kreską 1 px (przycisk „umów rozmowę” → Calendly)
const calendarIcon = `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="2.5" y="3.5" width="11" height="10"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/><path d="M5 9h1.5M7.25 9h1.5M9.5 9H11M5 11h1.5M7.25 11h1.5" /></svg>`;
const plusIcon = `<svg class="icon faq__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 3v10M3 8h10"/></svg>`;

// FAQ w kontakcie: pytania rozwijane (<details> - działa bez JS) i przejście do asystenta AI:
// przy odpowiedzi „zapytaj asystenta” (ten sam temat w czacie), pod listą pole na własne pytanie.
function faq(c, t) {
  const f = t.faq;
  if (!f?.items?.length) return '';
  return `
  <section class="faq" aria-labelledby="faq-title">
    <h3 id="faq-title" class="faq__title">${esc(f.title)}</h3>
    <div class="faq__list">${f.items.map(it => `
      <details class="faq__item">
        <summary class="faq__q"><span>${esc(it.q)}</span>${plusIcon}</summary>
        <div class="faq__a t-text">
          <p>${esc(it.a)}</p>
          <button class="faq__more link-u t-meta" type="button" data-ask-agent="${esc(it.q)}">${esc(f.more)}</button>
        </div>
      </details>`).join('')}
    </div>
    <form class="faq__ask" data-ask-form>
      <label class="visually-hidden" for="faq-q">${esc(f.askLabel)}</label>
      <input id="faq-q" name="q" type="text" autocomplete="off" maxlength="500" placeholder="${esc(f.askPlaceholder)}" required>
      <button class="button" type="submit">${esc(f.askButton)}</button>
    </form>
  </section>`;
}

// Rekomendacje z LinkedIna: krótkie cytaty w karuzeli (przewijanie w bok, strzałki z JS).
// Wpisy w shared.recommendations; dopóki są placeholdery - sekcja się nie pokazuje.
function recommendations(c, t) {
  const items = (c.recommendations ?? []).filter(r => clean(r.quote) && clean(r.name));
  if (!items.length) return '';
  const all = c.recommendationsUrl && url(c.recommendationsUrl) !== '#' ? c.recommendationsUrl : '';
  return `
  <section id="rekomendacje" class="recs" aria-labelledby="recs-title">
    <div class="recs__head">
      <h2 id="recs-title" class="t-name section-title">${esc(t.ui.recs)}</h2>
      <div class="recs__nav">
        <button class="recs__btn" type="button" data-recs="-1" aria-label="${esc(t.ui.prev)}"><svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5"/></svg></button>
        <button class="recs__btn" type="button" data-recs="1" aria-label="${esc(t.ui.next)}"><svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5"/></svg></button>
      </div>
    </div>
    <ul class="recs__track" tabindex="0" aria-label="${esc(t.ui.recs)}">${items.map(r => `
      <li class="recs__card">
        <blockquote class="recs__quote t-text">„${esc(clean(r.quote))}”</blockquote>
        <p class="recs__who"><span>${esc(clean(r.name))}</span><span class="t-meta">${esc(clean(r.role))}</span></p>
      </li>`).join('')}
    </ul>
    ${all ? `<p class="recs__all t-meta"><a class="link-u" href="${esc(all)}" target="_blank" rel="noopener">${esc(t.ui.recsAll)}</a></p>` : ''}
  </section>`;
}

function footer(c, t) {
  const mailHref = isReal(c.email) ? `mailto:${esc(c.email)}` : '#kontakt';
  // Przycisk „kontakt” → Calendly (shared.calendly); dopóki to placeholder - mail.
  const cal = url(c.calendly) !== '#' && new URL(c.calendly).pathname.length > 1 ? c.calendly : '';
  const links = c.links.filter(l => url(l.href) !== '#');
  return `
<footer id="kontakt" class="site-footer" aria-labelledby="contact-title">
 <div class="site-footer__in">
  <h2 id="contact-title" class="site-footer__title t-name section-title">${esc(t.contact.title)}</h2>
  ${clean(t.contact.line) ? `<p class="site-footer__line t-text t-muted print-only">${esc(clean(t.contact.line))}</p>` : ''}
  <div class="site-footer__contact">
    <p class="contact__mail">
      <a class="mail" href="${mailHref}">${esc(c.email)}</a>
      <button class="copy" type="button" data-copy="${esc(c.email)}" aria-label="${esc(t.ui.copy)}">${copyIcon}</button>
      <span class="copy__status t-meta" role="status" aria-live="polite" data-copied="${esc(t.ui.copied)}"></span>
    </p>
    ${links.length ? `<ul class="contact__links t-meta" aria-label="${esc(t.ui.links)}">${links.map(l => `
      <li><a href="${esc(l.href)}" rel="me noopener" target="_blank">${esc(l.label)}</a></li>`).join('')}
    </ul>` : ''}
  </div>
  <div class="site-footer__actions">
    <a class="button site-footer__button" href="${cal ? esc(cal) : mailHref}"${cal ? ' target="_blank" rel="noopener"' : ''}>${cal ? calendarIcon : ''}${esc(t.ui.contactButton)}</a>
  </div>${faq(c, t)}
  <figure class="contact__qr print-only">
    <img src="assets/qr.svg" width="96" height="96" alt="QR - ${esc(c.siteUrl)}">
    <figcaption class="t-meta">${esc(t.ui.qr)} - ${esc(c.siteUrl.replace(/^https?:\/\//, ''))}</figcaption>
  </figure>
 </div>
 <p class="site-footer__copy t-meta">© ${esc(c.year)} ${esc(c.name)}</p>
</footer>`;
}

// Asystent AI: czat w panelu #agent. Bez JS panel pokazuje powitanie i mail (formularz ukryty).
// Rozmową steruje main.js, odpowiedzi daje agent.js (AI przez shared.agent.endpoint albo tryb lokalny).
function agent(c, t) {
  const g = t.agent;
  const bar = `
      <span class="agent-dot" aria-hidden="true"></span>
      <h2 id="agent-title" class="t-project">${esc(g.title)}</h2>`;
  const body = `
      <div class="agent" data-agent>
        <ol class="agent__log" role="log" aria-live="polite" aria-label="${esc(g.log)}">
          <li class="agent__msg agent__msg--bot">${esc(g.hello)}</li>
        </ol>
        <p class="agent__nojs t-text">${esc(g.nojs)} <a class="link-u" href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
        <ul class="agent__chips">${g.suggestions.map(q => `
          <li><button class="button button--small" type="button" data-ask="${esc(q)}">${esc(q)}</button></li>`).join('')}
        </ul>
        <form class="agent__form" data-agent-form>
          <label class="visually-hidden" for="agent-q">${esc(g.label)}</label>
          <input id="agent-q" name="q" type="text" autocomplete="off" maxlength="500" placeholder="${esc(g.placeholder)}" required>
          <button class="button" type="submit">${esc(g.send)}</button>
        </form>
        <p class="agent__note t-meta">${esc(g.note)}</p>
      </div>`;
  return sheet({ id: 'agent', cls: 'sheet--agent', bar, body, t });
}

export function render(content, lang) {
  const c = content.shared, t = content[lang];
  return `${header(c, t)}
<div class="home wrap">
<main id="tresc" class="home__main">${hero(c, t)}${work(c, t)}${recommendations(c, t)}
</main>${footer(c, t)}${sphere(c, t)}
</div>
<div class="sheets">${c.projects.map((p, i) => project(p, i, c, t)).join('')}${brandbook(c, t)}${agent(c, t)}
</div>
`;
}

// <head>: tytuł, opis, Open Graph. Adresy bezwzględne dopiero po ustaleniu domeny (shared.siteUrl).
export function renderMeta(content, lang) {
  const c = content.shared, m = content[lang].meta;
  const site = isReal(c.siteUrl) ? c.siteUrl.replace(/\/$/, '') : '';
  const abs = path => (site ? `${site}/${path}` : path);
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    site && `<link rel="canonical" href="${esc(site)}/">`,
    `<meta property="og:type" content="website">`,
    site && `<meta property="og:url" content="${esc(site)}/">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:image" content="${esc(abs('assets/og.jpg'))}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(c.name)} - ${esc(m.description)}">`,
    `<meta property="og:locale" content="${lang === 'pl' ? 'pl_PL' : 'en_US'}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    // Open Sans planszy teraz (700 hasło, 600 legenda): plakat w podglądzie desktopu widać od razu.
    // Tylko desktop - na telefonie nie ma podglądu, fonty pobierają się przy otwarciu panelu.
    ...(c.projects.some(p => p.reel) ? [700, 600].map(w =>
      `<link rel="preload" href="assets/fonts/open-sans-${w}-sub.woff2" as="font" type="font/woff2" crossorigin media="(min-width: 1024px)">`) : []),
    personLd(content, lang, site),
  ].filter(Boolean).join('\n  ');
}

// Dane strukturalne (schema.org Person) dla wyszukiwarek. sameAs tylko z prawdziwych linków.
function personLd(content, lang, site) {
  const c = content.shared, t = content[lang];
  const sameAs = c.links.map(l => l.href).filter(h => url(h) !== '#');
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: clean(c.name),
    jobTitle: clean(t.hero.role),
    description: clean(t.hero.line),
    email: `mailto:${c.email}`,
    ...(site && { url: `${site}/`, image: `${site}/assets/og.jpg` }),
    ...(sameAs.length && { sameAs }),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
