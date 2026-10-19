// Cała treść strony i PDF. Edytujesz tylko ten plik.
// (Assety marki z pola `sync` pobiera automatycznie tools/sync-brands.mjs → brands.generated.js.)
import { synced } from './brands.generated.js';

// Wszystko w [nawiasach] to miejsca do uzupełnienia albo potwierdzenia.
//
// shared - dane wspólne dla obu języków (linki, lata, obrazy)
// pl / en - teksty

export const shared = {
  name: 'Wojciech Lumer',            // [potwierdź zapis]
  slug: 'lumer',                     // używane w nazwie PDF: portfolio-lumer-pl.pdf
  year: '2026',
  siteUrl: 'https://lumerw.com', // adres strony (domena z GoDaddy → GitHub Pages) - QR w PDF, Open Graph, sitemap
  email: 'wojciechlumer@gmail.com',
  // Przycisk „kontakt” - link do kalendarza spotkań. [Wpisz swój link Calendly]
  calendly: 'https://calendly.com/wojciechlumer/30min',  // przycisk „kontakt” (placeholder = mail)
  // Własny kalendarz rezerwacji (panel #rozmowa) na darmowym API Cal.com - bez serwera i klucza.
  // calUsername = <nazwa> z cal.com/<nazwa>, events = typy spotkań z cal.com/<nazwa>/<slug> (pierwszy domyślny).
  // Klucz API NIE jest potrzebny (i nie może trafić na stronę - byłby publiczny).
  booking: { calUsername: 'wojciech-lumer-sxkqby', events: [{ slug: '30min', minutes: 30 }] },   // tylko rozmowy 30-minutowe
  // Profile: stopka, dane dla Google (sameAs), asystent, PDF. LinkedIn = też wiersz „o mnie” w indeksie.
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/wojciechlumer/' },
    { label: 'GitHub', href: 'https://github.com/Lumerw' },
    { label: 'Instagram', href: 'https://www.instagram.com/wojciechlumer/?hl=en' },
    { label: 'Facebook', href: 'https://www.facebook.com/wojtek.lumer/' },
    { label: 'Behance', href: 'https://www.behance.net/wojteklumer' },
  ],
  // Awatar w hero (moneta): zdjęcie i rysunek kreską - koło, przycięte (assets/me/). Klik → asystent AI.
  avatar: { photo: 'assets/me/avatar-photo.webp', drawing: 'assets/me/avatar-drawing.webp' },

  // duotone: true → `npm run images` zamienia zdjęcie na tusz + papier (identycznie na stronie i w PDF).
  portrait: { src: 'assets/me/portrait.svg', w: 1200, h: 1500, duotone: true },

  // Szerokości generowane przez `npm run images` (AVIF + WebP + JPG) do srcset.
  // Obraz .jpg w content.js → strona sama poda warianty 01-640.avif, 01-1280.webp itd.
  imageWidths: [640, 1280, 1920],

  // Ikony obok znaku w hero - zmieniają się szybko, każda kolejna w prawo bardziej przezroczysta.
  // Dowolna liczba plików (SVG/PNG, kwadrat). 01-06: znaki kreską 1 px.
  icons: [
    'assets/icons/01.svg', 'assets/icons/02.svg', 'assets/icons/03.svg',
    'assets/icons/04.svg', 'assets/icons/05.svg', 'assets/icons/06.svg',
    // znaki pełne (paczka z października 2026) - tylko obok awatara i w brandbooku, sfera bierze 01-06
    'assets/icons/07.svg', 'assets/icons/08.svg', 'assets/icons/09.svg', 'assets/icons/10.svg', 'assets/icons/11.svg',
    'assets/icons/12.svg', 'assets/icons/13.svg', 'assets/icons/14.svg', 'assets/icons/15.svg', 'assets/icons/16.svg',
  ],

  // Rekomendacje z LinkedIna (karuzela w pętli po Portfolio): skrócony fragment w PL i EN (tłumaczenie),
  // osoba i rola. Placeholdery = sekcja ukryta.
  // photo: zdjęcie z LinkedIna (96 × 96 webp, za zgodą osób); bez zdjęcia - kółko z inicjałami.
  recommendations: [
    { name: 'Patryk Kurek', photo: 'assets/recs/patryk-kurek.webp', role: { pl: 'Software Engineer · projekt loom.studio, 2025', en: 'Software Engineer · loom.studio project, 2025' },
      quote: { pl: 'Współpraca z Wojciechem przy stronie loom.studio była wyjątkowym doświadczeniem…', en: 'Working with Wojciech on the loom.studio website project was an outstanding experience…' } },
    { name: 'Brendon Zegarlicki', photo: 'assets/recs/brendon-zegarlicki.webp', role: { pl: 'Co-Founder, Interchainly', en: 'Co-Founder, Interchainly' },
      quote: { pl: 'Dostarcza pracę, która jest nie tylko ładna, ale i skuteczna…', en: 'He delivers work that’s not just pretty but effective…' } },
    { name: 'Kacper Ślusarczyk', photo: 'assets/recs/kacper-slusarczyk.webp', role: { pl: 'Developer, IBM', en: 'Developer, IBM' },
      quote: { pl: 'Jego projekty idealnie łączą estetykę z funkcjonalnością…', en: 'His designs strike the perfect balance between aesthetics and functionality…' } },
    { name: 'Damian Badowski', photo: 'assets/recs/damian-badowski.webp', role: { pl: 'Co-Owner, WeedWeek', en: 'Co-Owner, WeedWeek' },
      quote: { pl: 'Praca z nim to prawdziwa przyjemność…', en: 'He is a real pleasure to work with…' } },
    { name: 'Kaja Kaja', photo: 'assets/recs/kaja-kaja.webp', role: { pl: 'Owner, Kaja Kaja Młode Studio', en: 'Owner, Kaja Kaja Młode Studio' },
      quote: { pl: 'Wojciech ma silny zmysł artystyczny i dbałość o szczegóły…', en: 'Wojciech displays a strong artistic flair and attention to detail…' } },
    { name: 'Maciej Szczerba', photo: 'assets/recs/maciej-szczerba.webp', role: { pl: 'Co-Founder, adGen', en: 'Co-Founder, adGen' },
      quote: { pl: 'Konsekwentnie dostarcza kreatywne i skuteczne rozwiązania…', en: 'He consistently delivers creative and effective design solutions…' } },
    { name: 'Kamil Korzec', photo: 'assets/recs/kamil-korzec.webp', role: { pl: 'Content Team Manager', en: 'Content Team Manager' },
      quote: { pl: 'Jego największą siłą są abstrakcyjne koncepcje…', en: 'His greatest strength lies in his abstract concepts…' } },
    { name: 'Mateusz Dworzyński', photo: 'assets/recs/mateusz-dworzynski.webp', role: { pl: 'UX, tworzenie stron www', en: 'UX, websites' },
      quote: { pl: 'Wojtek to bardzo bystry i kontaktowy człowiek…', en: 'Wojtek is a very sharp and approachable person…' } },
  ],

  // Asystent AI („zapytaj AI” obok przycisku kontakt). endpoint = adres Workera z agent/worker.js
  // (odpowiada model Claude na podstawie treści tego pliku - instrukcja w README).
  // Dopóki to placeholder: tryb lokalny - gotowe odpowiedzi z content.js, pytania nie opuszczają strony.
  agent: { endpoint: 'https://portfolio-agent.teraz-platforma.workers.dev' },   // Cloudflare Worker (agent/), Claude Opus 5.5

  // Brandbook (panel pod znakiem w hero): kolory marki osobistej - wartości dosłowne, kontrast z papierem.
  brandbook: {
    colors: [
      { key: 'paper', value: '#FAFAF7' },
      { key: 'ink', value: '#111111', contrast: '18.1:1' },
      { key: 'ink2', value: '#6E6E6A', contrast: '4.9:1' },
      { key: 'ink3', value: '#73736E', contrast: '4.6:1' },
      { key: 'hair', value: 'rgba(17, 17, 17, .14)' },
      { key: 'black', value: '#000000' },
    ],
  },

  // Firmy, z którymi pracowałem - karuzela obok „kontakt”. Logo SVG w jednym kolorze (#111, w trybie ciemnym
  // odwracane), przycięte do krawędzi znaku. h = wysokość w px dobrana na oko, żeby znaki ważyły podobnie
  // (napisy niżej, sygnety wyżej); w = h × proporcje pliku.
  clients: [
    { name: 'promotraffic', logo: 'assets/clients/promotrafic.svg', w: 96, h: 28 },
    { name: 'forkflow', logo: 'assets/clients/forkflow.svg', w: 133, h: 21 },
    { name: '[firma - trzepaczka]', logo: 'assets/clients/whisk.svg', w: 28, h: 30 },
    { name: 'Youniversity', logo: 'assets/clients/youniversity.svg', w: 146, h: 22 },   // logo ze strony youniversity.be
    { name: 'WeedWeek', logo: 'assets/clients/weedweek.svg', w: 126, h: 26 },
    { name: 'freshly', logo: 'assets/clients/freshly.svg', w: 92, h: 28 },
  ],

  // Projekt:
  //  logo   - na środku podglądu (desktop), najlepiej SVG
  //  sygnet - favicon / sygnet przy opisie zakresu i w panelu (kwadrat)
  //  video  - pętla w panelu, dwa formaty (CSS pokazuje jeden):
  //           '16x9' - desktop i każdy ekran poziomy (także telefon obrócony);
  //           '9x16' - telefon pionowo (< 768 px + orientacja pionowa) - kadr na całą wysokość panelu;
  //           '4x5'  - tablet pionowo (min. 768 px + orientacja pionowa) = ta sama proporcja co podgląd na stronie;
  //           src = plik mp4 (bez dźwięku), poster = kadr
  //  reel   - true: zamiast postera animowana plansza marki (8 s, render.js → reel()) - w panelu i w podglądzie.
  //           Kolejność: prawdziwe wideo (src) > reel > plansza marki (brand) > poster
  //  images - main 16:10, a i b 4:5 - tylko w PDF (npm run covers: zrzut desktop, plansza marki, zrzut telefonu)

  // Kolejność = kolejność na stronie. Numer nadawany automatycznie: 01, 02, 03.
  projects: [
    {
      id: 'teraz',
      title: 'teraz',
      type: 'marketplace',           // typ projektu - po prawej w indeksie
      year: '2026',                  // [potwierdź] - tylko w PDF
      symbol: 'teraz',
      // Synchronizacja marki: codziennie pobiera logo, sygnet i kolory z teraz.eu (brand.json / favicon).
      // Poniższe wartości to stan wyjściowy - zsynchronizowane je nadpisują.
      sync: 'https://teraz.eu',
      // Assety marki pobrane z teraz.eu (logo, sygnet, kolory i aurora z ich CSS).
      // mono: false - kolorowe, nie odwracaj w trybie ciemnym.
      logo:   { src: 'assets/teraz/wordmark-white.svg', w: 575, h: 178, mono: false },
      sygnet: { src: 'assets/teraz/sygnet.svg', mono: false },
      // Logo na sferze (strona główna, poza sekcją Portfolio): jednokolorowe, tuszem
      sphereLogo: { src: 'assets/teraz/wordmark-ink.svg', w: 575, h: 178, size: .6 },
      // Tło podglądu w stylu marki: czerń + animowana aurora (gradienty z teraz.eu, 26 s).
      brand: {
        bg: '#000000',
        aurora: ['#1D3E93F2', '#146EF480', '#0A1A3FF2', '#FC8AD31F'],
        speed: '26s',
      },
      video: {
        '16x9': { src: '', poster: 'assets/teraz/video-16x9.svg', w: 1920, h: 1080 }, // desktop i każdy ekran poziomy
        '4x5':  { src: '', poster: 'assets/teraz/video-4x5.svg',  w: 1080, h: 1350 }, // tablet pionowo (>= 768 + pionowo)
        '9x16': { src: '', poster: 'assets/teraz/video-9x16.svg', w: 1080, h: 1920 }, // telefon pionowo (< 768 + pionowo)
      },
      reel: true,                    // animowana plansza „Dwie role, jedna rozmowa” (dopóki nie ma src)
      // Narzędzia i technologie (panel projektu) - z repozytorium projektu
      tools: ['React', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Stripe', 'Daily.co', 'Cloudflare'],
      href: 'https://teraz.eu',      // testowo
      brandbook: 'https://teraz.eu/marka',   // księga marki projektu (panel i PDF)
      images: {
        main:    { src: 'assets/teraz/01.jpg',      w: 1600, h: 1000 },
        a:       { src: 'assets/teraz/02.jpg',      w: 1200, h: 1500 },
        b:       { src: 'assets/teraz/03.jpg',      w: 1200, h: 1500 },
      },
      // PDF 1080 × 1080 (npm run deck): zrzuty prawdziwej strony projektu, desktop 16:10 i telefon.
      deck: { desktop: 'assets/deck/teraz-desktop.jpg', phone: 'assets/deck/teraz-phone.jpg' },
    },
    {
      id: 'loom',
      title: 'loom.studio',
      type: 'studio',
      year: '2026',                  // [potwierdź] - tylko w PDF
      symbol: 'loom',
      // Logo (Haus w krzywych) i sygnet - trzy figury Bauhausu - z brand kitu loom.studio (repozytorium loomstudio)
      logo:   { src: 'assets/loom/logo.svg', w: 453, h: 70 },
      sygnet: { src: 'assets/loom/sygnet.svg', mono: false },
      sphereLogo: { src: 'assets/loom/logo.svg', w: 453, h: 70, size: .78 },
      // Grafika interaktywna (live.js): gradient z hero loom.studio + pływające figury, bez logo i napisów.
      live: true,
      tools: ['Figma', 'Next.js', 'TypeScript', 'Tailwind CSS', 'WebGL', 'Stripe', 'Claude API'],
      // Pierwsza klatka tej grafiki (bez JS / ograniczony ruch): podgląd na stronie głównej i panel. npm run covers
      cover: { '4x5': 'assets/loom/cover-4x5.webp', '16x9': 'assets/loom/cover-16x9.webp', '9x16': 'assets/loom/cover-9x16.webp' },
      video: {
        '16x9': { src: '', poster: 'assets/loom/video-16x9.svg', w: 1920, h: 1080 }, // desktop i każdy ekran poziomy
        '4x5':  { src: '', poster: 'assets/loom/video-4x5.svg',  w: 1080, h: 1350 }, // tablet pionowo (>= 768 + pionowo)
        '9x16': { src: '', poster: 'assets/loom/video-9x16.svg', w: 1080, h: 1920 }, // telefon pionowo (< 768 + pionowo)
      },
      href: '[https://loom.studio]', // [podaj właściwy adres - loom.studio wygląda na domenę zaparkowaną]
      brandbook: '[brandbook loom.studio]',  // [adres księgi marki] - dopóki placeholder, „brandbook” bez linku, z dopiskiem „wkrótce”
      images: {
        main:    { src: 'assets/loom/01.jpg',      w: 1600, h: 1000 },
        a:       { src: 'assets/loom/02.jpg',      w: 1200, h: 1500 },
        b:       { src: 'assets/loom/03.jpg',      w: 1200, h: 1500 },
      },
      // PDF 1080 × 1080 (npm run deck): zrzuty prawdziwej strony projektu, desktop 16:10 i telefon.
      deck: { desktop: 'assets/deck/loom-desktop.jpg', phone: 'assets/deck/loom-phone.jpg' },
    },
    {
      id: 'rehab',
      title: 'reh.ab',
      type: 'pitch deck',
      year: '2026',                  // [potwierdź] - tylko w PDF
      symbol: 'rehab',
      logo:   { src: 'assets/rehab/logo.svg', w: 480, h: 120 },
      sygnet: { src: 'assets/rehab/sygnet.png', mono: false },   // favicon reh.ab: „her” na czerwieni
      sphereLogo: { src: 'assets/rehab/logo-her.svg', w: 48, h: 48, size: .5 },   // to samo „her” (odwrócone), tuszem
      // Grafika interaktywna (live.js): hero reh.ab 1:1 w pętli. Tekst marki - po angielsku w obu wersjach.
      live: {
        title: ['Make an', 'impact', 'toget', 'her', '.'],   // „impact” i „toget” przygasają, za „her” poświata
        lede: [
          ['40% of the world plays games online.', '1'],
          ['Gaming is one of the biggest social spaces on earth - and one of the least supported.'],
        ],
        ticker: ['data.', 'vision.', 'tools - put to use.'],
        quotes: ['this is more helpful than you think', 'we made the safe space you needed', 'someone who gets it is usually online', 'you\'re not alone in this lobby'],
        avatars: ['assets/rehab/live/p1.svg', 'assets/rehab/live/p2.svg', 'assets/rehab/live/p3.svg'],
      },
      tools: ['HTML', 'CSS', 'JavaScript', 'GitHub Pages'],
      // Pierwsza klatka tej grafiki (bez JS / ograniczony ruch): podgląd na stronie głównej i panel. npm run covers
      cover: { card: 'assets/rehab/cover-card.webp', '4x5': 'assets/rehab/cover-4x5.webp', '16x9': 'assets/rehab/cover-16x9.webp', '9x16': 'assets/rehab/cover-9x16.webp' },
      video: {
        '16x9': { src: '', poster: 'assets/rehab/video-16x9.svg', w: 1920, h: 1080 }, // desktop i każdy ekran poziomy
        '4x5':  { src: '', poster: 'assets/rehab/video-4x5.svg',  w: 1080, h: 1350 }, // tablet pionowo (>= 768 + pionowo)
        '9x16': { src: '', poster: 'assets/rehab/video-9x16.svg', w: 1080, h: 1920 }, // telefon pionowo (< 768 + pionowo)
      },
      href: 'https://lumerw.github.io/reh.ab/',
      images: {
        main:    { src: 'assets/rehab/01.jpg',      w: 1600, h: 1000 },
        a:       { src: 'assets/rehab/02.jpg',      w: 1200, h: 1500 },
        b:       { src: 'assets/rehab/03.jpg',      w: 1200, h: 1500 },
      },
      // PDF 1080 × 1080 (npm run deck): zrzuty prawdziwej strony projektu, desktop 16:10 i telefon.
      deck: { desktop: 'assets/deck/rehab-desktop.jpg', phone: 'assets/deck/rehab-phone.jpg' },
    },
  ],
};

export const pl = {
  meta: {
    title: 'Wojciech Lumer - portfolio',
    description: 'Design to to, jak coś działa. Projektuję identyfikacje, strony i produkty cyfrowe - od pomysłu do wdrożenia.',
  },
  ui: {
    langSwitch: 'EN',
    langSwitchLabel: 'Switch to English',
    pdf: 'PDF ↓',
    pdfFile: 'portfolio-lumer-pl.pdf',
    indexLabel: 'Projekty',
    about: 'o mnie',
    download: 'pobierz PDF',
    downloadType: 'portfolio',
    problem: 'Problem',
    solution: 'Rozwiązanie',
    result: 'Efekt',
    view: 'zobacz projekt ↗',
    experience: 'Doświadczenie',
    education: 'Edukacja',
    languages: 'Języki',
    tools: 'Narzędzia',
    scope: 'Zakres',               // panel projektu
    highlights: 'Najważniejsze',   // panel projektu: punkty z deck.projects.<id>.facts
    projectSite: 'strona projektu',   // panel projektu i PDF: link (bez adresu - tekst z „wkrótce”)
    projectBrandbook: 'brandbook',
    soon: 'wkrótce',
    contact: 'Kontakt',
    copy: 'kopiuj adres',
    copied: 'skopiowano',
    clients: 'Współpracowałem z',   // podpis nad karuzelą logo
    themeDark: 'Włącz tryb ciemny',
    themeLight: 'Włącz tryb jasny',
    linkedin: 'LinkedIn',
    skip: 'Przejdź do treści',
    next: 'następny',
    backToIndex: 'wróć do indeksu ↑',
    links: 'Profile',
    close: 'zamknij',
    brandbook: 'Brandbook',
    contactButton: 'umów rozmowę',   // przycisk w sekcji kontakt → Calendly
    work: 'Portfolio',               // tytuł sekcji z linkami
    sectionsLabel: 'Sekcje strony',  // nawigator przewijania (desktop)
    start: 'start',
    nav: { start: 'intro', portfolio: 'portfolio', proces: 'proces', rekomendacje: 'rekomendacje', kontakt: 'kontakt' },   // nawigator przewijania
    contactCta: 'kontakt',           // przycisk w hero → sekcja kontakt
    askAgent: 'zapytaj asystenta',  // przycisk obok „umów rozmowę” → panel asystenta
    recs: 'Rekomendacje',
    prev: 'poprzednia',
    brandbookType: 'zasady marki',
    avatar: 'Zapytaj o mnie - asystent AI',
    sphereHint: 'przeciągnij, żeby obrócić',
    qr: 'wersja www',
    reelPause: 'zatrzymaj animację', // przycisk pauzy planszy w panelu (stan: aria-pressed)
  },
  hero: {
    role: 'projektant',                                   // podpis przy imieniu nad hasłem
    title: 'Design to to, jak coś działa.',               // hasło (h1)
    line: 'Projektuję identyfikacje, strony i produkty cyfrowe - od pomysłu do wdrożenia. Prowadzę loom.studio.',
  },
  projects: {
    teraz: {
      meta: ['projekt produktu', 'UX/UI', 'identyfikacja', 'development z AI'], // [potwierdź]
      tagline: 'marketplace ekspertów dla branży kreatywnej', // krótki opis pod podglądem
      lead: 'Platforma typu marketplace łącząca słuchaczy z ekspertami, z sekcją społeczności.',
      // Plansza animowana (reel, 15 s): plakat → słuchacz → ekspert → społeczność → rozmowa 1:1 → plakat.
      // Te same klucze w pl i en; limity znaków sprawdza `npm run build`.
      reel: {
        label: 'teraz - najpierw jesteś słuchaczem: dostajesz wiedzę od najlepszych ekspertów branży kreatywnej, od razu. Potem sam stajesz się ekspertem: dzielisz się wiedzą i zarabiasz na rozmowach. Jedna społeczność słuchaczy i ekspertów, rozmowy wideo 1:1, 30 albo 60 minut. Porozmawiajmy tu i teraz.',
        stepL: 'Najpierw jesteś słuchaczem.',
        subL: 'Dostajesz wiedzę od najlepszych - od razu, teraz.',
        stepE: 'Potem stajesz się ekspertem.',
        subE: 'Dzielisz się wiedzą i zarabiasz na rozmowach.',
        community: 'Jedna społeczność.',
        communitySub: 'Słuchacze i eksperci - każdy może przejść na drugą stronę.',
        claimA: 'porozmawiajmy',
        claimKey: 'tu i teraz',          // z falką pod spodem
        listener: 'słuchacz',
        listeners: 'słuchacze',
        expert: 'ekspert',
        experts: 'eksperci',
        callTitle: 'słuchacz pyta, ekspert odpowiada',
        call: 'wideo 1:1, 30 albo 60 minut',
      },
      problem: '[Problem: 2-3 zdania.]',
      solution: '[Rozwiązanie: 2-3 zdania.]',
      result: '[Efekt: 1-2 zdania lub liczby.] W planach: płatności Stripe, ekspansja na Ukrainę i rynek kreatywny Europy Wschodniej.',
      alt: {
        video: 'teraz - [opis wideo promocyjnego]',
        logo: 'teraz - logo',
        main: 'teraz - strona główna teraz.eu na desktopie',
        a: 'teraz - plansza marki: logo i hasło porozmawiajmy tu i teraz',
        b: 'teraz - strona teraz.eu na telefonie',
      },
    },
    loom: {
      meta: ['założyciel', 'identyfikacja', 'projekt strony w Figmie', 'wdrożenie'], // [potwierdź]
      tagline: 'studio projektowe w modelu subskrypcji', // krótki opis pod podglądem
      lead: 'Strona-wizytówka i studio projektowe w modelu subskrypcji: stała miesięczna opłata za pracę projektową.',
      problem: '[Problem: 2-3 zdania.]',
      solution: 'Styl inspirowany Bauhausem, font Haus, wersje PL/EN, subskrypcje i panel klienta na Stripe. [Dopisz 1-2 zdania.]',
      result: '[Efekt: 1-2 zdania lub liczby.]',
      alt: {
        video: 'loom.studio - plansza marki: logo na osi czerni i papieru, trzy figury Bauhausu',
        logo: 'loom.studio - logo',
        main: 'loom.studio - strona główna na desktopie',
        a: 'loom.studio - plansza marki: logo na osi czerni i papieru, trzy figury Bauhausu',
        b: 'loom.studio - strona na telefonie',
      },
    },
    rehab: {
      meta: ['koncepcja', 'narracja', 'projekt', 'development'], // [potwierdź]
      tagline: 'pitch deck platformy łączącej gaming ze zdrowiem psychicznym', // krótki opis pod podglądem
      lead: 'Strona-pitch deck dla koncepcji platformy łączącej gaming ze zdrowiem psychicznym.',
      problem: '[Problem: 2-3 zdania.]',
      solution: 'Prezentacja inwestorska w formie strony www, bez ciasteczek i zbierania danych. [Dopisz 1-2 zdania.]',
      result: '[Efekt: 1-2 zdania lub liczby.]',
      alt: {
        video: 'reh.ab - plansza marki: hasło Make an impact together na czerwonym tle',
        logo: 'reh.ab - logo',
        main: 'reh.ab - makieta czatu na serwerze z dyżurem specjalisty',
        a: 'reh.ab - plansza marki: hasło Make an impact together na czerwonym tle',
        b: 'reh.ab - strona na telefonie',
      },
    },
  },
  about: {
    title: 'O mnie',
    portraitAlt: 'Wojciech Lumer - portret', // [potwierdź po dodaniu zdjęcia]
    bio: '[Bio: 3-4 zdania. Kim jesteś, czym się zajmujesz, co cię wyróżnia, czego szukasz.]',
    experience: [
      { year: '2025.05 - teraz', place: 'Promotrafic', role: 'AI designer' },
      { year: '2023.11 - teraz', place: 'loom.studio', role: 'założyciel, projektant' },
    ],
    education: '[Uniwersytet SWPS - kierunek, lata]',
    languages: '[polski - ojczysty · angielski - poziom]',
    tools: ['Figma', '[Adobe …]', 'Blender', 'Adtron', 'HTML/CSS', '[…]'],
  },
  brandbook: {
    intro: 'Zasady mojej marki osobistej: czerń, biel, cienka linia i dużo pustej przestrzeni.',
    sections: { mark: 'Znak', colors: 'Kolory', type: 'Typografia', symbols: 'Symbole i ikony', grid: 'Siatka', motion: 'Ruch', rules: 'Zasady' },
    mark: 'Koło z kropką w środku, kreska 1 px. Pole ochronne równe promieniowi koła. Na jasnym tle tusz, na ciemnym papier - zawsze jeden kolor.',
    markSizes: 'rozmiary: 16, 24 i 40 px',
    colors: {
      paper: 'Papier - tło',
      ink: 'Tusz - tekst, linie, znak',
      ink2: 'Szarość - tekst pomocniczy',
      ink3: 'Szarość - metadane',
      hair: 'Linia - podziały 1 px',
      black: 'Czerń - tło trybu ciemnego',
    },
    contrast: 'kontrast z papierem',
    type: {
      family: 'Helvetica Neue - dwie grubości: 400 i 500. Bez wersalików, bez pogrubień w środku zdania.',
      title: 'nagłówek 28 / 22 px, 500',
      project: 'tytuł 20 / 18 px, 500',
      text: 'tekst 15 px, 400, interlinia 1,6',
      meta: 'metadane 12 px, 400',
      sample: 'Design to to, jak coś działa.',
    },
    symbols: 'Każdy projekt ma własny symbol geometryczny rysowany kreską 1 px, bez wypełnień. Ikony interfejsu w tym samym stylu.',
    grid: '12 kolumn, maks. 1280 px, margines 6vw (na telefonie 24 px), odstęp 24 px, rytm pionowy co 8 px.',
    motion: [
      { name: 'rysowanie znaku', value: '1,8 s' },
      { name: 'pojawianie się tekstu', value: '600 ms, co 80 ms' },
      { name: 'kreska pod wierszem', value: '400 ms' },
      { name: 'auto-przewijanie projektów', value: '3 s (z animacją: 8 s)' },
      { name: 'wysuwanie panelu', value: '700 ms' },
      { name: 'ograniczony ruch w systemie', value: 'wszystko stoi' },
    ],
    motionNote: 'Ruch wolny i cichy: krzywa cubic-bezier(.65, 0, .35, 1), bez sprężyn, odbić i paralaksy.',
    yes: 'Tak',
    no: 'Nie',
    rulesYes: ['dużo pustej przestrzeni', 'podziały wyłącznie liniami 1 px', 'jeden kolor: tusz albo papier', 'małe stopnie pisma, dwie grubości'],
    rulesNo: ['kolory akcentu w mojej marce', 'cienie, gradienty i zaokrąglenia', 'wersaliki i pogrubienia w zdaniu', 'ozdobne ikony i emoji'],
    rulesNote: 'Kolory i gradienty mają tylko marki projektów (np. teraz) - wewnątrz ich ramek. Jedyny wyjątek: tęczowa poświata asystenta AI.',
  },
  // CV 1080 × 1080 do wysyłania (npm run cv → private/, poza repozytorium). Linki klikalne.
  cv: {
    file: 'cv-wojciech-lumer-pl.pdf',
    projects: 'Projekty',
    experience: 'Doświadczenie',
    skills: 'Kompetencje',
    tools: 'Narzędzia',
    view: 'zobacz ↗',
    call: 'umów rozmowę ↗',
    portfolio: 'portfolio',
    skillsList: ['identyfikacja wizualna', 'UX/UI i projekt stron', 'front-end: HTML, CSS, JS, Next.js', 'projektowanie i development z AI', 'dostępność WCAG 2.2'],
  },
  // PDF 1080 × 1080 (npm run deck): karuzela na LinkedIn / Instagram, linki klikalne.
  deck: {
    file: 'portfolio-lumer-1080-pl.pdf',
    label: 'portfolio 2026',
    back: 'spis',                    // link powrotu na każdym slajdzie
    contactRow: 'kontakt',           // ostatni wiersz spisu
    visit: 'zobacz projekt ↗',
    soon: 'strona wkrótce online',
    scope: 'Zakres',
    facts: 'W skrócie',
    contactTitle: 'Porozmawiajmy.',
    site: 'portfolio online',
    projects: {
      teraz: { facts: ['rozmowy wideo 1:1, 30 albo 60 minut', 'eksperci z 5+ lat praktyki', 'darmowe konto, płatność przez Escrow', '0% prowizji w becie'] },
      loom: { facts: ['subskrypcja: jedno zadanie naraz, średnio 48 godzin', 'płatności i panel klienta na Stripe', 'rezerwacje rozmów przez Calendly', 'asystent AI na stronie, wersje PL i EN'] },
      rehab: { facts: ['wsparcie zdrowia psychicznego tam, gdzie są gracze', 'serwery z psychologiem lub psychiatrą, który gra', '12-tygodniowy pilotaż z 4 miarami sukcesu', 'WCAG 2.2 AA, każda liczba ze źródłem'] },
    },
  },

  // Kalendarz rezerwacji (panel #rozmowa, Cal.com)
  // Sekcja „Jak pracuję” (między Portfolio a Rekomendacjami): 3 kroki - nazwa, jedno zdanie, co dostaje klient.
  process: {
    title: 'Jak pracuję',
    get: 'Dostajesz:',
    steps: [
      { title: 'Rozmowa', text: '30 minut online. Poznaję cel, budżet i termin.', result: 'wycenę i plan' },
      { title: 'Projekt', text: 'Research i 2-3 kierunki do wyboru, potem projekt na prawdziwych treściach. AI pomaga mi szybko sprawdzić więcej wariantów.', result: 'gotowe pliki i system' },
      { title: 'Wdrożenie', text: 'Kod, uruchomienie i przekazanie - z instrukcją, jak to dalej rozwijać.', result: 'działającą rzecz, nie tylko makiety' },
    ],
  },
  booking: {
    title: 'Umów rozmowę',
    intro: 'Rozmowa online, 30 minut. Wybierz dzień i godzinę - potwierdzenie i link do spotkania przyjdą na Twój e-mail.',
    length: 'Długość rozmowy',
    loading: 'Wczytuję wolne terminy…',
    empty: 'Brak wolnych terminów w najbliższych tygodniach. Napisz do mnie:',
    day: 'Dzień',
    time: 'Godzina',
    tz: 'Twoja strefa czasowa',
    name: 'Imię i nazwisko',
    email: 'E-mail',
    note: 'O czym chcesz porozmawiać? (opcjonalnie)',
    submit: 'zarezerwuj',
    sending: 'Rezerwuję…',
    change: 'zmień termin',
    done: 'Gotowe - rozmowa zarezerwowana:',
    doneNote: 'Potwierdzenie i link do spotkania są już w drodze na Twój e-mail.',
    error: 'Nie udało się zarezerwować. Spróbuj jeszcze raz albo napisz:',
    taken: 'Ten termin właśnie się zajął - wybierz inny.',
    badEmail: 'Na ten adres nie da się wysłać potwierdzenia - sprawdź e-mail albo podaj inny.',
    nojs: 'Kalendarz działa z włączonym JavaScriptem. Napisz:',
  },
  // Asystent AI: panel #agent. answers = tryb lokalny (bez shared.agent.endpoint).
  agent: {
    button: 'zapytaj AI',
    title: 'Zapytaj mnie',
    hello: 'Cześć! Jestem asystentem AI tego portfolio. Zapytaj o projekty, doświadczenie, narzędzia albo o to, jak się skontaktować z Wojciechem.',
    suggestions: ['Jakie projekty zrobił Wojciech?', 'Jakich narzędzi używa?', 'Jak umówić rozmowę?'],
    // FAQ obok czatu (tylko szerokie ekrany, od 1200 px). Odpowiedzi wyłącznie z treści strony.
    faqTitle: 'Częste pytania',
    faqAsk: 'zapytaj asystenta',
    faq: [
      { q: 'Jak wygląda współpraca?', a: 'W trzech krokach: rozmowa (30 minut online - cel, budżet i termin), projekt (research, 2-3 kierunki do wyboru, potem projekt na prawdziwych treściach) i wdrożenie (kod, uruchomienie i przekazanie z instrukcją).' },
      { q: 'Ile kosztuje projekt?', a: 'To zależy od zakresu. Wycenę i plan dostajesz po pierwszej rozmowie.' },
      { q: 'Czy zajmujesz się też wdrożeniem?', a: 'Tak - projektuję od pomysłu do wdrożenia, żeby powstała działająca rzecz, nie tylko makiety.' },
      { q: 'Jak używasz AI w pracy?', a: 'AI pomaga mi szybko sprawdzić więcej wariantów projektu. Na co dzień pracuję jako AI designer w Promotrafic.' },
      { q: 'Co projektujesz?', a: 'Identyfikacje, strony i produkty cyfrowe. Prowadzę też loom.studio - studio projektowe w modelu subskrypcji.' },
      { q: 'Jak się skontaktować?', a: 'Najszybciej mailem albo przez kalendarz na stronie: rozmowa online, 30 minut.' },
    ],
    label: 'Twoje pytanie',
    placeholder: 'Zadaj pytanie…',
    send: 'wyślij',
    log: 'Rozmowa z asystentem',
    typing: 'asystent pisze',
    note: 'Odpowiedzi powstają z treści tego portfolio i mogą być niepełne. W ważnych sprawach napisz maila.',
    nojs: 'Czat działa z włączonym JavaScriptem. Napisz maila:',
    offline: 'Nie mogę teraz połączyć się z AI - odpowiadam z treści strony.',
    answers: {
      greeting: 'Cześć! O co chcesz zapytać?',
      thanks: 'Proszę bardzo. Jeśli chcesz porozmawiać o współpracy, napisz do Wojciecha.',
      about: 'Ze strony:',
      projects: 'Projekty w portfolio:',
      process: 'Współpraca wygląda tak - 3 kroki:',
      open: 'otwórz projekt',
      site: 'strona projektu ↗',
      contact: 'Najszybciej mailem:',
      call: 'umów rozmowę ↗',
      tools: 'Narzędzia:',
      experience: 'Doświadczenie:',
      education: 'Wykształcenie:',
      languages: 'Języki:',
      brandLink: 'otwórz brandbook',
      pdf: 'Pełne portfolio jest w PDF:',
      pdfLink: 'pobierz PDF',
      unknown: 'Tego nie ma w portfolio. Zapytaj Wojciecha bezpośrednio:',
    },
  },
  contact: {
    title: 'Kontakt',
    line: '[Jedno zdanie zaproszenia, np. „Chętnie porozmawiam o projekcie albo pracy.”]',
  },
};

export const en = {
  meta: {
    title: 'Wojciech Lumer - portfolio',
    description: 'Design is how it works. I design identities, websites and digital products - from idea to launch.',
  },
  ui: {
    langSwitch: 'PL',
    langSwitchLabel: 'Przełącz na polski',
    pdf: 'PDF ↓',
    pdfFile: 'portfolio-lumer-en.pdf',
    indexLabel: 'Projects',
    about: 'about',
    download: 'download PDF',
    downloadType: 'portfolio',
    problem: 'Problem',
    solution: 'Solution',
    result: 'Result',
    view: 'view project ↗',
    experience: 'Experience',
    education: 'Education',
    languages: 'Languages',
    tools: 'Tools',
    scope: 'Scope',
    highlights: 'Highlights',
    projectSite: 'project site',
    projectBrandbook: 'brand book',
    soon: 'soon',
    contact: 'Contact',
    copy: 'copy address',
    copied: 'copied',
    clients: 'I have worked with',
    themeDark: 'Switch to dark mode',
    themeLight: 'Switch to light mode',
    linkedin: 'LinkedIn',
    skip: 'Skip to content',
    next: 'next',
    backToIndex: 'back to index ↑',
    links: 'Profiles',
    close: 'close',
    brandbook: 'Brandbook',
    contactButton: 'book a call',
    work: 'Portfolio',
    sectionsLabel: 'Page sections',
    start: 'start',
    nav: { start: 'intro', portfolio: 'portfolio', proces: 'process', rekomendacje: 'kind words', kontakt: 'contact' },
    contactCta: 'contact',
    askAgent: 'ask my assistant',
    recs: 'Kind words',
    prev: 'previous',
    brandbookType: 'brand rules',
    avatar: 'Ask about me - AI assistant',
    sphereHint: 'drag to rotate',
    qr: 'website',
    reelPause: 'pause animation',
  },
  hero: {
    role: 'designer',
    title: 'Design is how it works.',
    line: 'I design identities, websites and digital products - from idea to launch. I run loom.studio.',
  },
  projects: {
    teraz: {
      meta: ['product design', 'UX/UI', 'identity', 'AI-assisted development'],
      tagline: 'marketplace of experts for the creative industry', // krótki opis pod podglądem
      lead: 'A marketplace platform connecting listeners with experts, plus a community section.',
      // Plansza animowana (reel, 15 s). Słuchacz po angielsku: „listener” (decyzja właściciela; teraz.eu używa „learner”).
      reel: {
        label: 'teraz - first you are a listener: you get knowledge from the best creative industry experts, right away. Then you become an expert yourself: you share what you know and earn from your calls. One community of listeners and experts, 1:1 video calls, 30 or 60 minutes. Let’s talk here and now.',
        stepL: 'First, you are a listener.',
        subL: 'You learn from the best - right away, right now.',
        stepE: 'Then you become an expert.',
        subE: 'You share what you know and earn from your calls.',
        community: 'One community.',
        communitySub: 'Listeners and experts - anyone can switch sides.',
        claimA: 'let’s talk',            // apostrof jak u teraz („Let’s talk”)
        claimKey: 'here and now',
        listener: 'listener',
        listeners: 'listeners',
        expert: 'expert',
        experts: 'experts',
        callTitle: 'a listener asks, an expert answers', // 1:1, jak w PL
        call: '1:1 video, 30 or 60 minutes',
      },
      problem: '[Problem: 2-3 sentences.]',
      solution: '[Solution: 2-3 sentences.]',
      result: '[Result: 1-2 sentences or numbers.] Next: Stripe payments, expansion to Ukraine and the Eastern European creative market.',
      alt: {
        video: 'teraz - [promo video description]',
        logo: 'teraz - logo',
        main: 'teraz - the teraz.eu home page on desktop',
        a: 'teraz - brand board: logo and the line let’s talk here and now',
        b: 'teraz - teraz.eu on a phone',
      },
    },
    loom: {
      meta: ['founder', 'identity', 'website design in Figma', 'build'],
      tagline: 'subscription-based design studio', // krótki opis pod podglądem
      lead: 'A studio website and a subscription design studio: a fixed monthly fee for design work.',
      problem: '[Problem: 2-3 sentences.]',
      solution: 'Bauhaus-inspired style, the Haus typeface, PL/EN versions, subscriptions and a client panel on Stripe. [Add 1-2 sentences.]',
      result: '[Result: 1-2 sentences or numbers.]',
      alt: {
        video: 'loom.studio - brand board: logo on the black and paper axis, three Bauhaus figures',
        logo: 'loom.studio - logo',
        main: 'loom.studio - home page on desktop',
        a: 'loom.studio - brand board: logo on the black and paper axis, three Bauhaus figures',
        b: 'loom.studio - the site on a phone',
      },
    },
    rehab: {
      meta: ['concept', 'narrative', 'design', 'development'],
      tagline: 'pitch deck for a platform connecting gaming and mental health', // krótki opis pod podglądem
      lead: 'A pitch-deck website for a platform concept connecting gaming and mental health.',
      problem: '[Problem: 2-3 sentences.]',
      solution: 'An investor presentation built as a website, with no cookies and no data collection. [Add 1-2 sentences.]',
      result: '[Result: 1-2 sentences or numbers.]',
      alt: {
        video: 'reh.ab - brand board: the line Make an impact together on red',
        logo: 'reh.ab - logo',
        main: 'reh.ab - chat mockup of a server with a specialist on duty',
        a: 'reh.ab - brand board: the line Make an impact together on red',
        b: 'reh.ab - the site on a phone',
      },
    },
  },
  about: {
    title: 'About',
    portraitAlt: 'Wojciech Lumer - portrait',
    bio: '[Bio: 3-4 sentences.]',
    experience: [
      { year: '2025.05 - now', place: 'Promotrafic', role: 'AI designer' },
      { year: '2023.11 - now', place: 'loom.studio', role: 'founder, designer' },
    ],
    education: '[SWPS University - field, years]',
    languages: '[Polish - native · English - level]',
    tools: ['Figma', '[Adobe …]', 'Blender', 'Adtron', 'HTML/CSS', '[…]'],
  },
  brandbook: {
    intro: 'The rules of my personal brand: black, white, a thin line and plenty of empty space.',
    sections: { mark: 'Mark', colors: 'Colours', type: 'Typography', symbols: 'Symbols and icons', grid: 'Grid', motion: 'Motion', rules: 'Rules' },
    mark: 'A circle with a dot in the centre, 1 px stroke. Clear space equals the circle radius. Ink on light backgrounds, paper on dark - always one colour.',
    markSizes: 'sizes: 16, 24 and 40 px',
    colors: {
      paper: 'Paper - background',
      ink: 'Ink - text, lines, mark',
      ink2: 'Grey - secondary text',
      ink3: 'Grey - metadata',
      hair: 'Line - 1 px dividers',
      black: 'Black - dark mode background',
    },
    contrast: 'contrast on paper',
    type: {
      family: 'Helvetica Neue - two weights: 400 and 500. No all caps, no bold inside a sentence.',
      title: 'heading 28 / 22 px, 500',
      project: 'title 20 / 18 px, 500',
      text: 'body 15 px, 400, line height 1.6',
      meta: 'metadata 12 px, 400',
      sample: 'Design is how it works.',
    },
    symbols: 'Every project has its own geometric symbol drawn with a 1 px stroke, no fills. Interface icons follow the same style.',
    grid: '12 columns, max 1280 px, 6vw margin (24 px on phones), 24 px gutter, 8 px vertical rhythm.',
    motion: [
      { name: 'drawing the mark', value: '1.8 s' },
      { name: 'text fade-in', value: '600 ms, 80 ms apart' },
      { name: 'row underline', value: '400 ms' },
      { name: 'project auto-advance', value: '3 s (with animation: 8 s)' },
      { name: 'sheet slide-up', value: '700 ms' },
      { name: 'reduced motion in the system', value: 'everything stops' },
    ],
    motionNote: 'Slow and quiet motion: cubic-bezier(.65, 0, .35, 1), no springs, bounces or parallax.',
    yes: 'Yes',
    no: 'No',
    rulesYes: ['plenty of empty space', 'dividers only as 1 px lines', 'one colour: ink or paper', 'small type sizes, two weights'],
    rulesNo: ['accent colours in my brand', 'shadows, gradients and rounded corners', 'all caps and bold inside a sentence', 'decorative icons and emoji'],
    rulesNote: 'Colours and gradients belong only to project brands (e.g. teraz) - inside their frames. The one exception: the rainbow glow of the AI assistant.',
  },
  cv: {
    file: 'cv-wojciech-lumer-en.pdf',
    projects: 'Projects',
    experience: 'Experience',
    skills: 'Skills',
    tools: 'Tools',
    view: 'view ↗',
    call: 'book a call ↗',
    portfolio: 'portfolio',
    skillsList: ['visual identity', 'UX/UI and web design', 'front-end: HTML, CSS, JS, Next.js', 'AI-assisted design and development', 'accessibility, WCAG 2.2'],
  },
  deck: {
    file: 'portfolio-lumer-1080-en.pdf',
    label: 'portfolio 2026',
    back: 'contents',
    contactRow: 'contact',
    visit: 'view project ↗',
    soon: 'site coming soon',
    scope: 'Scope',
    facts: 'In short',
    contactTitle: 'Let’s talk.',
    site: 'portfolio online',
    projects: {
      teraz: { facts: ['1:1 video calls, 30 or 60 minutes', 'experts with 5+ years of practice', 'free account, payment via Escrow', '0% commission in beta'] },
      loom: { facts: ['subscription: one task at a time, 48 hours on average', 'Stripe payments and client portal', 'calls booked through Calendly', 'AI assistant on the site, PL and EN versions'] },
      rehab: { facts: ['mental-health support where players already are', 'servers with a psychologist or psychiatrist who plays', 'a 12-week pilot with 4 success measures', 'WCAG 2.2 AA, every number sourced'] },
    },
  },

  process: {
    title: 'How I work',
    get: 'You get:',
    steps: [
      { title: 'Call', text: '30 minutes online. I learn the goal, budget and deadline.', result: 'a quote and a plan' },
      { title: 'Design', text: 'Research and 2-3 directions to choose from, then the design on real content. AI helps me test more options, faster.', result: 'final files and a system' },
      { title: 'Launch', text: 'Code, launch and handover - with notes on how to grow it further.', result: 'a working thing, not just mockups' },
    ],
  },
  booking: {
    title: 'Book a call',
    intro: 'A 30-minute online call. Pick the day and time - the confirmation and meeting link will arrive by e-mail.',
    length: 'Call length',
    loading: 'Loading free slots…',
    empty: 'No free slots in the coming weeks. Write to me:',
    day: 'Day',
    time: 'Time',
    tz: 'your time zone',
    name: 'Name',
    email: 'E-mail',
    note: 'What would you like to talk about? (optional)',
    submit: 'book',
    sending: 'Booking…',
    change: 'change time',
    done: 'Done - your call is booked:',
    doneNote: 'The confirmation and meeting link are on their way to your e-mail.',
    error: 'The booking did not go through. Try again or write to me:',
    taken: 'This slot has just been taken - pick another one.',
    badEmail: 'The confirmation cannot be sent to this address - check the e-mail or use another one.',
    nojs: 'The calendar needs JavaScript. Write to me:',
  },
  agent: {
    button: 'ask AI',
    title: 'Ask me',
    hello: 'Hi! I am the AI assistant of this portfolio. Ask about Wojciech\'s projects, experience, tools or how to get in touch.',
    suggestions: ['What has Wojciech worked on?', 'Which tools does Wojciech use?', 'How can I book a call?'],
    faqTitle: 'FAQ',
    faqAsk: 'ask the assistant',
    faq: [
      { q: 'What does working together look like?', a: 'Three steps: a call (30 minutes online - goal, budget and deadline), design (research, 2-3 directions to choose from, then the design on real content) and launch (code, launch and handover with notes).' },
      { q: 'How much does a project cost?', a: 'It depends on the scope. You get a quote and a plan after the first call.' },
      { q: 'Do you also build what you design?', a: 'Yes - I design from idea to launch, so you get a working thing, not just mockups.' },
      { q: 'How do you use AI?', a: 'AI helps me test more design options, faster. Day to day I work as an AI designer at Promotrafic.' },
      { q: 'What do you design?', a: 'Identities, websites and digital products. I also run loom.studio - a subscription-based design studio.' },
      { q: 'How can I get in touch?', a: 'Email is the fastest, or book a call in the calendar on the site: an online call, 30 minutes.' },
    ],
    label: 'Your question',
    placeholder: 'Ask a question…',
    send: 'send',
    log: 'Conversation with the assistant',
    typing: 'assistant is typing',
    note: 'Answers come from this portfolio and may be incomplete. For anything important, send an email.',
    nojs: 'The chat needs JavaScript. Send an email:',
    offline: 'I cannot reach the AI right now - answering from the site content.',
    answers: {
      greeting: 'Hi! What would you like to know?',
      thanks: 'You are welcome. If you would like to talk about working together, write to Wojciech.',
      about: 'From the site:',
      projects: 'Projects in the portfolio:',
      process: 'Working together looks like this - 3 steps:',
      open: 'open project',
      site: 'project site ↗',
      contact: 'Email is the fastest:',
      call: 'book a call ↗',
      tools: 'Tools:',
      experience: 'Experience:',
      education: 'Education:',
      languages: 'Languages:',
      brandLink: 'open brandbook',
      pdf: 'The full portfolio is in the PDF:',
      pdfLink: 'download PDF',
      unknown: 'That is not in the portfolio. Ask Wojciech directly:',
    },
  },
  contact: {
    title: 'Contact',
    line: '[One inviting sentence, e.g. “Happy to talk about a project or a role.”]',
  },
};

// Assety zsynchronizowane ze stron projektów nadpisują wartości z `shared.projects`.
for (const p of shared.projects) {
  const s = synced[p.id];
  if (!s) continue;
  if (s.logo) p.logo = s.logo;
  if (s.sygnet) p.sygnet = s.sygnet;
  if (s.brand) p.brand = { ...p.brand, ...s.brand };
}

export const content = { shared, pl, en };
