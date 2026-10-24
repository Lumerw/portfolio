// Szablony strony. Czyste funkcje: dane z content.js → HTML.
// Układ: jeden ekran (nagłówek, hero z indeksem, stopka z kontaktem) + panele wysuwane od dołu
// (projekty, o mnie). Panele działają przez :target — także bez JS; main.js dokłada focus, Esc, inert.
// Używane w przeglądarce (main.js, przełączanie PL/EN) i przy buildzie (tools/build-html.mjs),
// dzięki czemu index.html ma gotową treść także bez JS.

import { symbol } from './symbols.js';

// Plansza animowana teraz (reel): jedna pętla. Trafia do --t-reel oraz do data-dwell / --t-auto wiersza indeksu.
export const REEL_MS = 15000;
// Ścieżki wpisane w HTML (bez dodatkowych plików): ikony ról, pauza / start.
export const RP = {
  headphones: 'M2.5 12A9.5 9.5 0 0 1 21.5 12V20A1.5 1.5 0 0 1 20 21.5H17A1.5 1.5 0 0 1 15.5 20V14.5A1.5 1.5 0 0 1 17 13H18.5V12A6.5 6.5 0 0 0 5.5 12V13H7A1.5 1.5 0 0 1 8.5 14.5V20A1.5 1.5 0 0 1 7 21.5H4A1.5 1.5 0 0 1 2.5 20Z',
  presentation: 'M3 3.5A1 1 0 0 1 4 2.5H20A1 1 0 0 1 21 3.5V14.5H13.5L18 21.5H14.75L12 17.1 9.25 21.5H6L10.5 14.5H3ZM7.13 11.75L9.52 9.36 12.52 12.11 18.63 6 16.37 6 12.48 9.89 9.48 7.14 4.87 11.75Z',
  video: 'M3.5 5.5H13.5A1.5 1.5 0 0 1 15 7V17A1.5 1.5 0 0 1 13.5 18.5H3.5A1.5 1.5 0 0 1 2 17V7A1.5 1.5 0 0 1 3.5 5.5ZM16.5 9.17L22 5.5V18.5L16.5 14.83Z',
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

// Język renderowanej strony (render) - okładki z napisem PL / EN (live.perLang) mają osobny plik dla EN.
let LANG = 'pl';
export const coverSrc = (p, fmt, lang = LANG) => {
  const src = p.cover?.[fmt];
  return src && lang === 'en' && p.live?.perLang ? src.replace(/(\.\w+)$/, '-en$1') : src;
};

// Tło w stylu marki projektu (projects[].brand): kolor + animowana aurora.
const brandStyle = b => `--brand-bg:${esc(b.bg)};${b.aurora.map((c, i) => `--a${i + 1}:${esc(c)}`).join(';')};--brand-speed:${esc(b.speed || '26s')}`;

/* Plansza animowana teraz (projects[].reel): 15 s w pętli, sam CSS (styles.css → Reel). fmt: '4x5'. Kolory i logo z p.brand / p.logo, więc synchronizacja marki działa także tu.
   decorative: kopia na stronie głównej (tekst niesie podpis pod ramką); w panelu role=img + aria-label.
   Glify ruszają się na opakowaniach <span>, nie na <svg>: Chromium nie przenosi animacji
   elementu <svg> na kompozytor i przelicza wtedy styl w każdej klatce. */
// lite (karta na sferze): tylko tło, logo i dwa kafelki (Ty / ekspert) - bez tekstów.
function reel(p, tp, fmt, { eager = false, decorative = false, lite = false } = {}) {
  const r = tp.reel;
  const a11y = decorative ? 'aria-hidden="true"' : `role="img" aria-label="${esc(r.label)}"`;
  const img = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  // --lr = połowa proporcji logo (wysokość / szerokość / 2) - środek znaku w osi pionowej
  const lr = (p.logo.h / p.logo.w / 2).toFixed(5);
  const tiles = `
      <div class="reel__tiles">
        <div class="reel__tile reel__tile--l"><span class="reel__avatar">${svgi(RP.headphones)}</span><span class="reel__chip">${esc(r.you)}</span><span class="reel__ring"></span></div>
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
  // Pełna plansza 15 s (render: 4:5): plakat (logo tylko tu) → szukasz eksperta (dziedziny wpadają jedna po drugiej)
  // → albo nim zostań (terminy rozmów się rezerwują) → dwie społeczności i trzecia w planach (kółka przerywaną linią
  // między nimi) → rozmowa 1:1 (dwa okna, mówiący z obwódką) → plakat. Pod spodem duże pola różu i błękitu (plamy z Figmy).
  const pillL = `<span class="reel__pill reel__pill--l">${svgi(RP.headphones)}${esc(r.listener)}</span>`;
  const pillE = `<span class="reel__pill reel__pill--e">${svgi(RP.presentation, '', '0 0 24 24', true)}${esc(r.expert)}</span>`;
  const crowd = ['l', 'l', 'l', 'n', 'n', 'e', 'e', 'e'].map((k, i) => `<i class="reel__dot reel__dot--${k}" style="--k:${i}"></i>`).join('');
  const tags = r.tags.map(x => `<span class="reel__tag">${esc(x)}</span>`).join('');
  const slots = r.slots.map(x => `<span class="reel__slot">${esc(x)}</span>`).join('');
  return `<div class="reel reel--${fmt} brand" style="${brandStyle(p.brand)};--t-reel:${REEL_MS}ms;--lr:${lr}" ${a11y}>
  <span class="reel__field reel__field--l"></span><span class="reel__field reel__field--e"></span><span class="reel__field reel__field--m"></span>
  <div class="reel__stage">
    <img class="reel__logo" src="${esc(p.logo.src)}" width="${p.logo.w}" height="${p.logo.h}" alt="" ${img}>
    <p class="reel__claim">${esc(r.claimA)} <span class="reel__key">${esc(r.claimKey)}</span></p>
    <p class="reel__legend"><span>${esc(r.listeners)}</span><span>${esc(r.experts)}</span></p>
    <div class="reel__scene reel__scene--l">
      <p class="reel__row">${pillL}</p>
      <p class="reel__head">${esc(r.stepL)}</p>
      <p class="reel__sub">${esc(r.subL)}</p>
      <p class="reel__chips">${tags}</p>
    </div>
    <div class="reel__scene reel__scene--e">
      <p class="reel__row">${pillE}</p>
      <p class="reel__head">${esc(r.stepE)}</p>
      <p class="reel__sub">${esc(r.subE)}</p>
      <p class="reel__chips">${slots}</p>
    </div>
    <div class="reel__scene reel__scene--c">
      <p class="reel__row reel__crowd">${crowd}</p>
      <p class="reel__head">${esc(r.community)}</p>
      <p class="reel__sub">${esc(r.communitySub)}</p>
    </div>
    <div class="reel__call">${tiles}
      <p class="reel__title">${esc(r.callTitle)}</p>
      <p class="reel__cap">${svgi(RP.video, '', '0 0 24 24', true)}<span>${esc(r.call)}</span></p>
    </div>
  </div></div>`;
}

// Wiersz projektu: otwiera panel; najechanie / focus obraca sferę do karty projektu (main.js).
function indexRow(p, i) {
  return `
        <li ${reveal(i + 3)}>
          <a class="index__row${i === 0 ? ' is-active' : ''}" href="#${p.id}" data-project="${p.id}" aria-haspopup="dialog">
            <span class="index__no t-meta">${num(i)}</span>
            <span class="index__title">${esc(p.title)}${betaTag(p)}</span>
            <span class="index__year t-meta">${esc(p.type)}</span>
          </a>
        </li>`;
}

// Znacznik „beta” przy nazwie projektu (projects[].beta) - ramka 1 px, mały stopień pisma
const betaTag = p => (p.beta ? ' <span class="beta">beta</span>' : '');

// Ikonka LinkedIn kreską 1 px: ramka + „in” (przy imieniu w hero).
const liIcon = `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x=".5" y=".5" width="15" height="15"/><path d="M4.5 7v5M7.5 12V7M7.5 9.2c0-1.5.9-2.2 2-2.2s2 .7 2 2.2V12"/><circle cx="4.5" cy="4.6" r=".5" fill="currentColor" stroke="none"/></svg>`;

// Ikonki w kolumnie numerów: archiwum (Google Drive) i pobieranie (PDF).
// Logo Google Drive jednym kolorem (Simple Icons, CC0) - w kolorze pozostałych ikon wiersza
// Znak Google Drive (Simple Icons) - też w PDF portfolio i CV (tools/)
export const DRIVE_D = 'M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z';
const driveIcon = `<svg class="icon index__glyph index__glyph--fill" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${DRIVE_D}"/></svg>`;
const downloadIcon = `<svg class="icon index__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v8.5M4.5 7L8 10.5L11.5 7M2.5 13.5h11"/></svg>`;

// Karuzela firm „Współpracowałem z”: lista + jej kopia (aria-hidden) dla płynnej pętli.
// Logo-placeholdery też się pokazują (tekst alternatywny dopiero z prawdziwą nazwą) - podmienisz je w content.js.
function clients(c, t) {
  if (!c.clients.length) return '';
  const items = hidden => c.clients.map(k => `
          <li><img class="${mono(k.logo).trim()}" src="${esc(k.logo)}" width="${k.w}" height="${k.h}" style="--h:${k.h}px" alt="${hidden ? '' : esc(clean(k.name))}" decoding="async" fetchpriority="low"></li>`).join('');
  return `
      <section class="clients" aria-labelledby="clients-title">
        <h2 id="clients-title" class="visually-hidden">${esc(t.ui.clients)}</h2>
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
  // Trzy miejsca na ikony obok awatara. W HTML tylko ikona startowa (0, ostatnia, przedostatnia);
  // kolejne main.js dokłada do miejsca, gdy się wczytają - każde miejsce zmienia się we własnym rytmie.
  const L = c.icons.length;
  const icons = [0, 1, 2].map(slot => {
    const src = c.icons[(L - slot) % L];
    return `
          <span class="hero__slot"><img class="hero__icon${mono(src)} is-on" src="${esc(src)}" width="40" height="40" alt=""></span>`;
  }).join('');
  return `
  <section id="start" class="hero" aria-labelledby="hero-title">
    <div class="hero__top">${avatar(c, t)}
      <a class="hero__icons" href="#brandbook" aria-haspopup="dialog" aria-label="${esc(t.ui.brandbook)}">${icons}
      </a>
    </div>
    <p class="hero__name"><span ${reveal(0)}>${liHref !== '#'
      ? `<a class="hero__li" href="${esc(liHref)}" target="_blank" rel="me noopener">${esc(c.name)} ${liIcon}<span class="visually-hidden"> - ${esc(t.ui.linkedin)}</span></a>`
      : esc(c.name)}</span></p>
    <h1 id="hero-title" class="t-name hero__title"><span ${reveal(1)}>${esc(t.hero.title)}</span></h1>
    <p class="hero__line t-text t-muted"><span ${reveal(2)}>${esc(t.hero.line)}</span></p>
    <div class="hero__row">
      <p class="hero__cta"><span ${reveal(3)}><a class="button button--primary" href="#kontakt">${esc(t.ui.contactCta)}</a></span></p>${clients(c, t)}
    </div>
    <p class="hero__year t-meta print-only">${esc(c.year)}</p>
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
${url(c.drive) !== '#' ? `
        <li ${reveal(n + 4)}>
          <a class="index__row index__row--sub" href="${esc(c.drive)}" target="_blank" rel="noopener"><span class="index__no">${driveIcon}</span><span class="index__title">${esc(t.ui.drive)}</span><span class="index__year t-meta">${esc(t.ui.driveType)}</span></a>
        </li>` : ''}
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
  // Trzy osie (X, Y, Z) przez środek - cienkie linie zaznaczające trójwymiarowość. Każda oś = dwa paski
  // obrócone o 90° wokół własnej długości, więc nie znika, gdy patrzy się na nią z boku.
  const axes = ['', 'rotateZ(90deg) ', 'rotateY(90deg) '].flatMap(dir => [dir, `${dir}rotateX(90deg)`]).map(t => `
          <span class="sphere__axis" style="--t:${t.trim() || 'none'}"></span>`).join('');
  // Znaki kreską z brandbooka (shared.icons) rozsiane między kartami - sfera „z moich linii”
  const marks = SPHERE_MARKS.map(([lon, lat], i) => {
    const src = c.icons[i % Math.min(6, c.icons.length)];   // tylko znaki kreską 01-06
    return `
          <span class="sphere__mark" style="--lon:${lon}deg;--lat:${lat}deg"><img class="${mono(src).trim()}" src="${esc(src)}" width="40" height="40" alt=""></span>`;
  }).join('');
  // Karty: okładka projektu (cover, pierwsza klatka okładki z live.js), nad którą main.js wstawia żywą
  // mikroanimację; bez okładki - plansza reel (lite). Gra tylko karta z przodu.
  // Na karcie leży też logo projektu (sphereLogo): poza sekcją Portfolio sfera pokazuje same logo,
  // karta pojawia się po najechaniu (main.js: .home__sphere.is-cards w sekcji Portfolio).
  const cards = c.projects.map((p, i) => {
    const inner = p.cover
      ? `<img src="${esc(coverSrc(p, 'card') ?? coverSrc(p, '4x5'))}" width="1080" height="1350" alt="" loading="lazy" decoding="async">`
      : p.reel
        ? reel(p, t.projects[p.id], '4x5', { decorative: true, lite: true })
        : image(p.images.a, '', '240px', { widths: c.imageWidths });
    return `
          <a class="sphere__card${i === 0 ? ' is-active' : ''}" href="#${p.id}" data-project="${p.id}" tabindex="-1" style="--lon:${Math.round((360 / n) * i)}deg;--lat:${CARD_LAT[i % CARD_LAT.length]}deg">
            <span class="sphere__media">${inner}</span>${p.sphereLogo ? `
            <span class="sphere__logo" style="--ls:${p.sphereLogo.size ?? .8}"><img class="mono" src="${esc(p.sphereLogo.src)}" width="${p.sphereLogo.w}" height="${p.sphereLogo.h}" alt="" loading="lazy" decoding="async"></span>` : ''}
            <span class="sphere__tag t-meta">${esc(p.title)}${betaTag(p)}</span>
          </a>`;
  }).join('');
  return `
  <div class="home__sphere" aria-hidden="true">
    <div class="sphere" data-sphere>
      <div class="sphere__world" style="--rx:-12deg;--ry:0deg">${meridians}${parallels}
${axes}${marks}${cards}
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
    <span class="sheet__grab" aria-hidden="true"></span>
    <div class="sheet__bar wrap">${bar}
      <a class="sheet__close" href="#start" data-close aria-label="${esc(t.ui.close)}"><svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 2.5l11 11M13.5 2.5l-11 11"/></svg></a>
    </div>
    <div class="sheet__body wrap">${body}
    </div>
  </div>
</section>`;
}

// Kadr projektu 4:5 (desktop i telefon): prawdziwe wideo (src) > plansza animowana (reel) > grafika
// interaktywna na statycznej planszy (cover, live.js) > plansza marki (brand) > poster-placeholder.
// Odtwarzaniem wideo steruje main.js; reel ma obok przycisk pauzy (rodzeństwo role=img, nie w środku).
const SHEET_FMT = '4x5';
function promo(p, tp, t) {
  const fmt = SHEET_FMT, v = p.video[fmt];
  const ratio = `--ratio:${v.w} / ${v.h}; --ar:${(v.w / v.h).toFixed(4)}`;
  const real = v.src && isReal(v.src);
  const open = url(p.href) !== '#'
    ? `
          <a class="sheet__open" href="${esc(p.href)}" target="_blank" rel="noopener" aria-label="${esc(`${p.title} - ${t.ui.view}`)}"></a>`
    : '';
  if (!real && p.reel) {
    return `
        <figure class="sheet__video sheet__video--${fmt} media" style="${ratio}">
          ${reel(p, tp, fmt)}${open}
        </figure>`;
  }
  const cover = coverSrc(p, fmt);
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
          ${media}${open}
        </figure>`;
}

// Panel projektu: po lewej kadr 4:5 (wideo / animacja), po prawej opis - numer i typ, nazwa, hasło, opis,
// zakres, narzędzia, najważniejsze punkty i link. Telefon: kadr na całą szerokość, opis pod spodem.
// Tekst i obrazy case study (problem / rozwiązanie / efekt) zostają w PDF (.case.print-only).
function project(p, i, c, t) {
  const tp = t.projects[p.id];
  const opts = { widths: c.imageWidths };
  const fact = key => clean(tp[key]) ? `
            <div class="case__fact">
              <dt class="t-meta">${esc(t.ui[key])}</dt>
              <dd class="t-text">${esc(clean(tp[key]))}</dd>
            </div>` : '';
  const scope = (tp.meta ?? []).map(clean).filter(Boolean);
  const tools = (p.tools ?? []).map(clean).filter(Boolean);
  const points = (t.deck?.projects?.[p.id]?.facts ?? []).map(clean).filter(Boolean);
  const row = (label, value) => value ? `
            <div class="pj__row"><dt class="t-meta">${esc(label)}</dt><dd>${value}</dd></div>` : '';
  // Linki projektu: strona i brandbook. Bez prawdziwego adresu - sama nazwa z dopiskiem „wkrótce” (nieklikalna).
  const pjLink = (href, label) => (url(href) !== '#'
    ? `<a class="link-u" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} ↗\uFE0E</a>`
    : `<span class="pj__soon">${esc(label)} <span class="t-meta">${esc(t.ui.soon)}</span></span>`);
  const link = `
          <p class="pj__link">${[pjLink(p.href, t.ui.projectSite), ...(p.brandbook ? [pjLink(p.brandbook, t.ui.projectBrandbook)] : [])].join('')}</p>`;

  const bar = `
      <img class="sygnet sheet__sygnet${mono(p.sygnet)}" src="${esc(p.sygnet.src)}" width="20" height="20" alt="">
      <span class="t-meta sheet__no">${num(i)}</span>
      <span class="t-meta sheet__year">${esc(p.type)}</span>`;

  const body = `
      <div class="pj">
        <div class="pj__media">${promo(p, tp, t)}
        </div>
        <div class="pj__info">
          <h2 id="${p.id}-title" class="t-name pj__title">${esc(p.title)}${betaTag(p)}</h2>
          <p class="t-text pj__tagline">${esc(tp.tagline)}</p>
          <p class="t-text t-muted pj__lead">${esc(tp.lead)}</p>
          <dl class="pj__rows">${row(t.ui.scope, esc(scope.join(' · ')))}${row(t.ui.tools, esc(tools.join(' · ')))}${points.length ? row(t.ui.highlights, `<ul class="pj__points">${points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`) : ''}
          </dl>${link}
        </div>
      </div>
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
      <div class="bb">${generator(c, t)}
        <p class="bb__intro t-text">${esc(b.intro)}</p>${mark}${colors}${type}${symbols}${grid}${motion}${rules}
      </div>`;
  return sheet({ id: 'brandbook', cls: 'sheet--brandbook', bar, body, t });
}

// Generator znaków (generator.js) - jak blobmaker.app w stylu strony: pole ze znakiem i pasek: kolor (HEX + próbnik),
// złożoność (trójkąt → wielokąt), styl (kwadrat → koło), pobierz SVG, kopiuj kod, losuj. Bez JS - samo pole z opisem.
const genIcon = {
  low: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3 13.5 12.5H2.5Z"/></svg>',
  high: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 13.6 6.3 11.5 12.9H4.5L2.4 6.3Z" stroke-dasharray="2 1.6"/></svg>',
  square: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="10"/></svg>',
  round: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/></svg>',
  download: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8.5M4.5 7L8 10.5L11.5 7M2.5 13.5h11"/></svg>',
  code: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5"/></svg>',
  dice: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11"/><circle cx="5.5" cy="5.5" r=".9" fill="currentColor" stroke="none"/><circle cx="10.5" cy="5.5" r=".9" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="5.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/><circle cx="10.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/></svg>',
};
function generator(c, t) {
  const g = t.brandbook.gen, G = c.generator;
  if (!G?.bases?.length) return '';
  return `
        <section class="gen" aria-labelledby="gen-title" data-generator style="--gen-c:${esc(G.color)}">
          <h3 id="gen-title" class="t-project gen__title">${esc(g.title)}</h3>
          <p class="t-text t-muted gen__intro">${esc(g.intro)}</p>
          <div class="gen__stage" data-gen-stage role="img" aria-label="${esc(g.title)}"></div>
          <div class="gen__bar">
            <label class="gen__color"><span class="visually-hidden">${esc(g.hex)}</span><input data-gen="hex" type="text" value="${esc(G.color.toUpperCase())}" maxlength="7" spellcheck="false" autocomplete="off"><span class="gen__swatch"><input data-gen="color" type="color" value="${esc(G.color)}" aria-label="${esc(g.color)}"></span></label>
            <label class="gen__range">${genIcon.low}<span class="visually-hidden">${esc(g.complexity)}</span><input data-gen="complexity" type="range" min="0" max="100" value="45">${genIcon.high}</label>
            <label class="gen__range">${genIcon.square}<span class="visually-hidden">${esc(g.style)}</span><input data-gen="style" type="range" min="0" max="100" value="75">${genIcon.round}</label>
            <div class="gen__actions">
              <button class="gen__btn" type="button" data-gen="download" aria-label="${esc(g.download)}">${genIcon.download}</button>
              <button class="gen__btn" type="button" data-gen="code" aria-label="${esc(g.code)}">${genIcon.code}</button>
              <button class="gen__btn gen__btn--roll" type="button" data-gen="roll">${genIcon.dice}<span>${esc(g.roll)}</span></button>
            </div>
          </div>
          <p class="t-meta gen__info" data-gen="info" aria-live="polite"></p>
        </section>`;
}

// Ikonka kopiowania: dwa przesunięte kwadraty, kreska 1 px — w stylu symboli.
const copyIcon = `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="2.5" y="4.5" width="9" height="9"/><path d="M5.5 2.5h8v8"/></svg>`;

// Stopka = kontakt (brief 5.4, uproszczony): mail + kopiowanie, profile, przycisk „kontakt”.
// W PDF ta sama stopka jest stroną 6 (tytuł, zdanie i QR tylko w druku).
// Kalendarz kreską 1 px (przycisk „umów rozmowę”)
const calendarIcon = `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="2.5" y="3.5" width="11" height="10"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/><path d="M5 9h1.5M7.25 9h1.5M9.5 9H11M5 11h1.5M7.25 11h1.5" /></svg>`;

// Rekomendacje z LinkedIna: karuzela w pętli (lista + kopia aria-hidden, jak karuzela logo), karty bez linków.
// Fragment i rola w języku strony; awatar = inicjały w kole kreską 1 px. Placeholdery - sekcja ukryta.
function recommendations(c, t, lang) {
  const items = (c.recommendations ?? []).filter(r => clean(r.name) && clean(r.quote?.[lang]));
  if (!items.length) return '';
  const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('');
  const cards = hidden => items.map(r => `
          <li class="recs__card"${hidden ? ' aria-hidden="true"' : ''}>
            <blockquote class="recs__quote">${lang === 'pl' ? '„' : '“'}${esc(clean(r.quote[lang]))}”</blockquote>
            <p class="recs__who">${r.photo
              ? `<img class="recs__avatar" src="${esc(r.photo)}" width="36" height="36" alt="" loading="lazy" decoding="async">`
              : `<span class="recs__avatar" aria-hidden="true">${esc(initials(r.name))}</span>`}<span><span class="recs__name">${esc(r.name)}</span><span class="recs__role t-meta">${esc(clean(r.role?.[lang]))}</span></span></p>
          </li>`).join('');
  return `
  <section id="rekomendacje" class="recs" aria-labelledby="recs-title">
    <h2 id="recs-title" class="t-name section-title recs__title">${esc(t.ui.recs)}</h2>
    <div class="recs__marquee" tabindex="0" role="region" aria-label="${esc(t.ui.recs)}">
      <ul class="recs__track">${cards(false)}${cards(true)}
      </ul>
    </div>
  </section>`;
}

// „Jak pracuję”: kroki na pionowej linii 1 px z kółkami (jak nawigator sekcji). main.js zapełnia kółka
// i linię tuszem w miarę przewijania (.is-on); bez JS wszystkie kółka puste, treść ta sama.
function process(t) {
  const P = t.process;
  if (!P?.steps?.length) return '';
  return `
  <section id="proces" class="process" aria-labelledby="process-title">
    <h2 id="process-title" class="t-name section-title process__title">${esc(P.title)}</h2>
    <div class="process__steps">
      <span class="process__line" aria-hidden="true"><span class="process__fill"></span></span>
      <ol>${P.steps.map((st, i) => `
      <li class="process__step">
        <p class="process__head"><span class="process__no t-meta">${num(i)}</span><span class="process__name">${esc(st.title)}</span></p>
        <p class="process__text t-text t-muted">${esc(st.text)}</p>
        <p class="process__result t-meta">${esc(P.get)} <span>${esc(st.result)}</span></p>
      </li>`).join('')}
      </ol>
    </div>
  </section>`;
}

// Kalendarz rezerwacji w panelu #rozmowa (Cal.com, booking.js). Tylko gdy shared.booking ma prawdziwą nazwę.
const hasBooking = c => !!c.booking && isReal(c.booking.calUsername) && (c.booking.events ?? []).some(e => isReal(e.slug));
function booking(c, t) {
  if (!hasBooking(c)) return '';
  const g = t.booking;
  const bar = `
      ${calendarIcon}
      <h2 id="rozmowa-title" class="t-project">${esc(g.title)}</h2>`;
  const body = `
      <div class="book" data-booking data-user="${esc(c.booking.calUsername)}" data-events="${esc(c.booking.events.filter(e => isReal(e.slug)).map(e => `${e.slug}:${e.minutes}`).join(','))}">
        <div class="book__info">
          <p class="book__who"><img src="${esc(c.avatar.photo)}" width="256" height="256" alt="" loading="lazy" decoding="async"><span>${esc(c.name)}</span></p>
          <p class="book__intro t-text">${esc(g.intro)}</p>
          <ul class="book__facts t-text t-muted">${(g.facts ?? []).map(f => `<li>${esc(f)}</li>`).join('')}
            <li>${esc(g.tz)}: <span data-book-tz>Europe/Warsaw</span></li>
          </ul>
          <p class="book__nojs t-text">${esc(g.nojs)} <a class="link-u" href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
        </div>
        <div class="book__ui" data-booking-ui></div>
      </div>`;
  return sheet({ id: 'rozmowa', cls: 'sheet--booking', bar, body, t });
}

function footer(c, t) {
  const mailHref = isReal(c.email) ? `mailto:${esc(c.email)}` : '#kontakt';
  // Przycisk „umów rozmowę”: własny kalendarz (#rozmowa, Cal.com) → strona rezerwacji (shared.calendly) → mail.
  const cal = url(c.calendly) !== '#' && new URL(c.calendly).pathname.length > 1 ? c.calendly : '';
  const book = hasBooking(c);
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
    ${links.length ? `<ul class="contact__links t-meta print-only" aria-label="${esc(t.ui.links)}">${links.map(l => `
      <li><a href="${esc(l.href)}" rel="me noopener" target="_blank">${esc(l.label)}</a></li>`).join('')}
    </ul>` : ''}
  </div>
  <div class="site-footer__actions">
    <a class="button button--primary site-footer__button" href="${book ? '#rozmowa' : cal ? esc(cal) : mailHref}"${book ? ' aria-haspopup="dialog"' : cal ? ' target="_blank" rel="noopener"' : ''}>${book || cal ? calendarIcon : ''}${esc(t.ui.contactButton)}</a>
    <a class="button site-footer__agent" href="#agent" aria-haspopup="dialog"><span class="agent-glow" aria-hidden="true"></span><img class="agent-btn-face" src="${esc(c.avatar.drawing)}" width="256" height="256" alt="" loading="lazy" decoding="async">${esc(t.ui.askAgent)}</a>
  </div>
  <figure class="contact__qr print-only">
    <img src="assets/qr.svg" width="96" height="96" alt="QR - ${esc(c.siteUrl)}">
    <figcaption class="t-meta">${esc(t.ui.qr)} - ${esc(c.siteUrl.replace(/^https?:\/\//, ''))}</figcaption>
  </figure>
 </div>
 <p class="site-footer__copy t-meta print-only">© ${esc(c.year)} ${esc(c.name)}</p>
</footer>`;
}

// Nawigator przewijania (desktop): pionowa linia 1 px z kółkami i nazwami sekcji (intro, portfolio…);
// gdy obok sfery brakuje miejsca - same numery. Klik przewija. Zastępuje systemowy pasek przewijania
// strony (main.js: aktywna sekcja i postęp).
function scrollnav(c, t) {
  const ids = ['start', 'portfolio', ...(t.process?.steps?.length ? ['proces'] : []), ...((c.recommendations ?? []).some(r => clean(r.name)) ? ['rekomendacje'] : []), 'kontakt'];
  const items = ids.map(id => [id, t.ui.nav[id]]);
  return `
<nav class="scrollnav" aria-label="${esc(t.ui.sectionsLabel)}">
  <span class="scrollnav__line" aria-hidden="true"><span class="scrollnav__fill"></span></span>
  <ol>${items.map(([id, label], i) => `
    <li><a href="#${id}" data-section="${id}"${i === 0 ? ' aria-current="true"' : ''}><span class="scrollnav__label">${esc(label)}</span><span class="scrollnav__no t-meta">${num(i)}</span></a></li>`).join('')}
  </ol>
</nav>`;
}

// Pasek na samym dole strony: profile (Instagram, LinkedIn…) po lewej, © pod sferą po prawej.
function colophon(c, t) {
  const links = c.links.filter(l => url(l.href) !== '#');
  return `
<div class="colophon">
  ${links.length ? `<ul class="colophon__links t-meta" aria-label="${esc(t.ui.links)}">${links.map(l => `
    <li><a href="${esc(l.href)}" rel="me noopener" target="_blank">${esc(l.label)}</a></li>`).join('')}
  </ul>` : ''}
  <p class="colophon__copy t-meta">© ${esc(c.year)} ${esc(c.name)}</p>
</div>`;
}

// Asystent AI: czat w panelu #agent. Bez JS panel pokazuje powitanie i mail (formularz ukryty).
// Rozmową steruje main.js, odpowiedzi daje agent.js (AI przez shared.agent.endpoint albo tryb lokalny).
function agent(c, t) {
  const g = t.agent;
  const bar = `
      <span class="agent-face" aria-hidden="true"><img src="${esc(c.avatar.drawing)}" width="256" height="256" alt=""></span>
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
      </div>${g.faq?.length ? `
      <aside class="agent-faq" aria-labelledby="agent-faq-title">
        <h3 id="agent-faq-title" class="t-meta agent-faq__title">${esc(g.faqTitle)}</h3>
        <div class="agent-faq__list">${g.faq.map(f => `
          <details class="agent-faq__item">
            <summary>${esc(f.q)}</summary>
            <p class="t-text t-muted">${esc(f.a)}</p>
            <button class="link-u agent-faq__ask" type="button" data-ask="${esc(f.q)}">${esc(g.faqAsk)} →</button>
          </details>`).join('')}
        </div>
      </aside>` : ''}`;
  return sheet({ id: 'agent', cls: 'sheet--agent', bar, body, t });
}

export function render(content, lang) {
  LANG = lang;
  const c = content.shared, t = content[lang];
  return `${header(c, t)}
<div class="home wrap">
<main id="tresc" class="home__main">${hero(c, t)}${work(c, t)}${process(t)}${recommendations(c, t, lang)}
</main>${footer(c, t)}${sphere(c, t)}${colophon(c, t)}
</div>${scrollnav(c, t)}
<div class="sheets">${c.projects.map((p, i) => project(p, i, c, t)).join('')}${brandbook(c, t)}${agent(c, t)}${booking(c, t)}
</div>
`;
}

// <head>: tytuł, opis, Open Graph. Adresy bezwzględne dopiero po ustaleniu domeny (shared.siteUrl).
export function renderMeta(content, lang) {
  const c = content.shared, m = content[lang].meta;
  const site = isReal(c.siteUrl) ? c.siteUrl.replace(/\/$/, '') : '';
  const abs = path => (site ? `${site}/${path}` : path);
  // Wersje językowe: / (pl) i /en/ (en) - canonical do własnej, hreflang do obu
  const page = l => `${site}/${l === 'en' ? 'en/' : ''}`;
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    site && `<link rel="canonical" href="${esc(page(lang))}">`,
    site && `<link rel="alternate" hreflang="pl" href="${esc(page('pl'))}">`,
    site && `<link rel="alternate" hreflang="en" href="${esc(page('en'))}">`,
    site && `<link rel="alternate" hreflang="x-default" href="${esc(page('pl'))}">`,
    `<meta property="og:type" content="website">`,
    site && `<meta property="og:url" content="${esc(page(lang))}">`,
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
