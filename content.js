// Cała treść strony i PDF. Edytujesz tylko ten plik.
// (Assety marki z pola `sync` pobiera automatycznie tools/sync-brands.mjs → brands.generated.js.)
import { synced } from './brands.generated.js';

// Wszystko w [nawiasach] to miejsca do uzupełnienia albo potwierdzenia.
//
// shared - dane wspólne dla obu języków (linki, lata, obrazy)
// pl / en - teksty

export const shared = {
  name: 'Wojciech Lumer',            // [potwierdź zapis]
  slug: 'lumer',
  year: '2026',
  siteUrl: 'https://lumerw.com', // adres strony (domena z GoDaddy → GitHub Pages) - QR w PDF, Open Graph, sitemap
  email: 'kontakt@lumerw.com',         // przekierowanie Cloudflare Email Routing → gmail
  // Zewnętrzna strona rezerwacji rozmowy (zapas dla kalendarza na stronie, CV i deck)
  // Archiwum prac (kampanie, KV, wideo) - publiczny folder Google Drive; wiersz w sekcji Portfolio
  drive: 'https://drive.google.com/drive/folders/1oHAvj983Vswnud6h8LEDwE2bzd2_Og__?usp=sharing',
  // PDF portfolio, okładka na dole: wykształcenie, certyfikaty i firmy (tylko PDF; w CV i na stronie bez wykształcenia).
  // Loga przefarbowane w PDF na kolor tekstu; h = wysokość w px przy 16:9 (optycznie równe loga).
  pdfAbout: {
    education: [
      { logo: 'assets/logos/swps.svg', h: 30, name: 'Uniwersytet SWPS', text: { pl: 'psychologia i informatyka', en: 'Psychology and Computer Science' }, year: { pl: '2026.10 - teraz', en: '2026.10 - now' } },
      { logo: 'assets/logos/asp-lodz.svg', h: 26, name: 'ASP w Łodzi' },
    ],
    certificates: [
      { logo: 'assets/logos/preply.svg', h: 22, name: 'Preply' },
      { logo: 'assets/logos/google.svg', h: 24, name: 'Google' },
      { logo: 'assets/logos/design-practice.png', h: 44, name: 'Design Practice' },   // litery z logo (bez kuli i tła)
    ],
    // Doświadczenie: 3 punkty na osi - Promotraffic (rola i daty), potem same loga
    work: [
      { logo: 'assets/clients/promotrafic.svg', h: 26, name: 'Promotraffic', role: 'AI designer', year: { pl: '2025.05 - teraz', en: '2025.05 - now' } },
      { logo: 'assets/clients/youniversity.svg', h: 18, name: 'Youniversity' },
      { logo: 'assets/logos/ancy.svg', h: 18, name: 'Ancy' },
    ],
    skipSkills: ['dostępność WCAG 2.2', 'accessibility, WCAG 2.2'],   // w PDF 5 kompetencji
  },
  calendly: 'https://cal.com/wojciech-lumer-sxkqby/30min',  // zewnętrzna strona rezerwacji (Cal.com, 30 min) - zapas, gdy kalendarz na stronie nie działa
  // Własny kalendarz rezerwacji (panel #rozmowa) na darmowym API Cal.com - bez serwera i klucza.
  // calUsername = <nazwa> z cal.com/<nazwa>, events = typy spotkań z cal.com/<nazwa>/<slug> (pierwszy domyślny).
  // Klucz API NIE jest potrzebny (i nie może trafić na stronę - byłby publiczny).
  booking: { calUsername: 'wojciech-lumer-sxkqby', events: [{ slug: '30min', minutes: 30 }] },   // tylko rozmowy 30-minutowe
  // Statystyka odwiedzin: Cloudflare Web Analytics (bez ciasteczek i banera), token strony jest publiczny; ładowana tylko na tych hostach
  analytics: { cloudflare: '87b049ba426c4d3cb5c4e1ef739d6275', hosts: ['lumerw.com', 'www.lumerw.com'] },
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
    // znaki pełne (paczka z października 2026) - tylko obok awatara (otwierają generator znaków), sfera bierze 01-06
    'assets/icons/07.svg', 'assets/icons/08.svg', 'assets/icons/09.svg', 'assets/icons/10.svg', 'assets/icons/11.svg',
    'assets/icons/12.svg', 'assets/icons/13.svg', 'assets/icons/14.svg', 'assets/icons/15.svg', 'assets/icons/16.svg',
  ],

  // Rekomendacje z LinkedIna (karuzela w pętli po Portfolio): skrócony fragment w PL i EN (tłumaczenie),
  // osoba i rola. Placeholdery = sekcja ukryta.
  // photo: zdjęcie z LinkedIna (96 × 96 webp, czarno-białe, za zgodą osób); bez zdjęcia - kółko z inicjałami.
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

  // Generator znaków (panel #generator - otwierają go znaki obok awatara): algorytm w generator.js składa nowe
  // sygnety (domyślnie czarne), kolor do wyboru z palety albo HEX. Moje znaki są tylko wzorem stylu - nie trafiają na stronę.
  generator: {
    color: '#111111',
    palette: ['#111111', '#6E6E6A', '#ED3434', '#E8590C', '#F0CA42', '#1E7F5C', '#0E7490',
      '#146EF4', '#4F59DB', '#7C3AED', '#FC8AD3', '#BE185D', '#CA002A', '#8A5A2B'],
  },

  // Firmy, z którymi pracowałem - karuzela obok „kontakt”. Logo SVG w jednym kolorze (#111, w trybie ciemnym
  // odwracane), przycięte do krawędzi znaku. h = wysokość w px dobrana na oko, żeby znaki ważyły podobnie
  // (napisy niżej, sygnety wyżej); w = h × proporcje pliku.
  clients: [
    { name: 'promotraffic', logo: 'assets/clients/promotrafic.svg', w: 96, h: 28 },
    { name: 'Youniversity', logo: 'assets/clients/youniversity.svg', w: 146, h: 22 },   // logo ze strony youniversity.be
    { name: 'Ancy', logo: 'assets/clients/ancy.svg', w: 68, h: 18 },
    { name: 'forkflow', logo: 'assets/clients/forkflow.svg', w: 133, h: 21 },
    { name: '[firma - trzepaczka]', logo: 'assets/clients/whisk.svg', w: 28, h: 30 },
    { name: 'depilacja.pl', logo: 'assets/clients/depilacja.svg', w: 120, h: 28 },   // fala + napis i podpis „depilacja laserowa”
    { name: 'WeedWeek', logo: 'assets/clients/weedweek.svg', w: 126, h: 26 },
    { name: 'freshly', logo: 'assets/clients/freshly.svg', w: 92, h: 28 },
  ],

  // Projekt:
  //  logo   - na środku podglądu (desktop), najlepiej SVG
  //  sygnet - favicon / sygnet przy opisie zakresu i w panelu (kwadrat)
  //  video  - kadr panelu projektu, format 4:5 (desktop obok opisu, telefon nad opisem):
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
      beta: true,                    // wersja beta - znacznik „beta” przy nazwie (indeks, panel, sfera, PDF)
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
      sphereLogo: { src: 'assets/teraz/wordmark-ink-sphere.svg', w: 635, h: 238, size: .663 },   // z przezroczystym marginesem w pliku (bez pasków przy obrocie sfery)
      // Tło podglądu w stylu marki: czerń + animowana aurora (gradienty z teraz.eu, 26 s).
      brand: {
        bg: '#000000',
        aurora: ['#1D3E93F2', '#146EF480', '#0A1A3FF2', '#FC8AD31F'],
        speed: '26s',
      },
      video: {
        '4x5':  { src: '', poster: 'assets/teraz/video-4x5.svg',  w: 1080, h: 1350 }, // tablet pionowo (>= 768 + pionowo)
      },
      reel: true,                    // animowana plansza „Dwie role, jedna rozmowa” w panelu projektu (dopóki nie ma src)
      // Okładka (live.js): czerń, organicznie płynąca niebieska łuna, logo na środku - karta na sferze i PDF.
      live: true,
      cover: { card: 'assets/teraz/cover-card.webp', '4x5': 'assets/teraz/cover-4x5.webp' },
      // Narzędzia i technologie (panel projektu) - z repozytorium projektu
      tools: ['Claude', 'React', 'TypeScript', 'Supabase', 'Stripe'],
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
      beta: true,
      year: '2026',                  // [potwierdź] - tylko w PDF
      symbol: 'loom',
      // Logo (Haus w krzywych) i sygnet - trzy figury Bauhausu - z brand kitu loom.studio (repozytorium loomstudio)
      logo:   { src: 'assets/loom/logo.svg', w: 453, h: 70 },
      sygnet: { src: 'assets/loom/sygnet.svg', mono: false },
      sphereLogo: { src: 'assets/loom/logo-sphere.svg', w: 481, h: 98, size: .828 },   // z przezroczystym marginesem w pliku (bez pasków przy obrocie sfery)
      // Okładka (live.js): papier, trzy figury Bauhausu na środku (fizyka z loom.studio), na dole pas gradientu
      // z hero, z boku pionowe logo, u góry PL / EN (język strony) i znak trybu. perLang: osobna klatka PL i EN.
      live: { perLang: true },
      tools: ['Figma', 'Next.js', 'TypeScript', 'Stripe', 'Claude API'],
      // Pierwsza klatka tej grafiki (bez JS / ograniczony ruch): podgląd na stronie głównej i panel. npm run covers
      cover: { card: 'assets/loom/cover-card.webp', '4x5': 'assets/loom/cover-4x5.webp' },
      video: {
        '4x5':  { src: '', poster: 'assets/loom/video-4x5.svg',  w: 1080, h: 1350 }, // tablet pionowo (>= 768 + pionowo)
      },
      href: 'https://loomstudio.pl/pl/',
      brandbook: 'https://loomstudio.pl/pl/marka/',
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
      // Okładka (live.js): nagłówek w jednej linii z ciasnym odstępem (przycięty krawędzią), wielkie „her”
      // z poświatą przy lewej krawędzi, zmieniające się słowa w prawym dolnym rogu. Tekst marki - po angielsku.
      live: {
        title: ['Make an', 'impact', 'toget', 'her', '.'],   // „impact” i „toget” przygasają, za „her” poświata
        ticker: ['data.', 'vision.', 'tools - put to use.'],
      },
      tools: ['HTML', 'CSS', 'JavaScript', 'Claude', 'Figma'],
      // Pierwsza klatka tej grafiki (bez JS / ograniczony ruch): podgląd na stronie głównej i panel. npm run covers
      cover: { card: 'assets/rehab/cover-card.webp', '4x5': 'assets/rehab/cover-4x5.webp' },
      video: {
        '4x5':  { src: '', poster: 'assets/rehab/video-4x5.svg',  w: 1080, h: 1350 }, // tablet pionowo (>= 768 + pionowo)
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
    description: 'Design to to, jak coś działa. Projektuję identyfikacje, strony i produkty cyfrowe - od pomysłu, przez ciągłe testowanie, do wdrożenia.',
  },
  ui: {
    langSwitch: 'EN',
    langSwitchLabel: 'Switch to English',
    pdf: 'PDF ↓',
    pdfFile: 'Wojciech-Lumer-Portfolio-PL.pdf',
    indexLabel: 'Projekty',
    about: 'o mnie',
    download: 'pobierz PDF',
    downloadType: 'portfolio',
    problem: 'Problem',
    solution: 'Rozwiązanie',
    result: 'Efekt',
    view: 'zobacz projekt ↗\uFE0E',
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
    links: 'Profile',
    close: 'zamknij',
    generator: 'Generator znaków',
    contactButton: 'umów rozmowę',   // przycisk w sekcji kontakt → kalendarz (#rozmowa)
    work: 'Portfolio',               // tytuł sekcji z linkami
    sectionsLabel: 'Sekcje strony',  // nawigator przewijania (desktop)
    start: 'start',
    nav: { start: 'intro', portfolio: 'portfolio', proces: 'proces', rekomendacje: 'rekomendacje', kontakt: 'kontakt' },   // nawigator przewijania
    contactCta: 'kontakt',           // przycisk w hero → sekcja kontakt
    askAgent: 'zapytaj asystenta',  // przycisk obok „umów rozmowę” → panel asystenta
    recs: 'Rekomendacje',
    drive: 'Archiwum prac',         // wiersz w Portfolio → folder Google Drive
    education: 'Wykształcenie', certificates: 'Certyfikaty',   // PDF portfolio, okładka
    driveType: 'Google Drive',
    avatar: 'Zapytaj o mnie - asystent AI',
    sphereHint: 'przeciągnij, żeby obrócić',
    qr: 'wersja www',
  },
  hero: {
    role: 'projektant',                                   // podpis przy imieniu nad hasłem
    title: 'Design to to, jak coś działa.',               // hasło (h1)
    line: 'Od pomysłu, przez ciągłe testowanie, aż do finalnego wdrożenia.',
    // telefon: hasło i zdanie zawsze w dwóch liniach - złamane po tym fragmencie (render.js, mobileBreak)
    breaks: { title: 'Design to to,', line: 'przez ciągłe testowanie,' },
  },
  projects: {
    teraz: {
      meta: ['produkt', 'UX/UI', 'identyfikacja', 'kod z AI'], // [potwierdź] - zakres w jednej linii panelu
      tagline: 'marketplace dla ekspertów z branży kreatywnej', // krótki opis pod podglądem
      lead: 'Tu i teraz znajdziesz eksperta z Twojej branży.',
      // Plansza animowana (reel, 15 s): plakat → słuchacz → ekspert → społeczność → rozmowa 1:1 → plakat.
      // Te same klucze w pl i en; limity znaków sprawdza `npm run build`.
      reel: {
        label: 'teraz - baza ekspertów z branży kreatywnej. Szukasz eksperta? Znajdziesz go tu, z 5+ lat praktyki. Albo sam nim zostań: dzielisz się wiedzą i zarabiasz na rozmowach. Dwie społeczności - słuchacze i eksperci - a wkrótce trzecia, łącząca obie. Rozmowa 1:1 z ekspertem, wideo 30 albo 60 minut. Porozmawiajmy tu i teraz.',
        stepL: 'Szukasz eksperta?',
        subL: 'Eksperci z branży kreatywnej z 5+ lat praktyki.',
        stepE: 'Albo sam nim zostań.',
        subE: 'Dzielisz się wiedzą i zarabiasz na rozmowach.',
        tags: ['branding', 'UX/UI', 'motion', '3D'],          // dziedziny ekspertów (scena „Szukasz eksperta?”)
        slots: ['pn 10:00', 'śr 14:30', 'pt 18:00'],          // zarezerwowane rozmowy (scena „Albo sam nim zostań”)
        community: 'Dwie społeczności.',
        communitySub: 'Słuchacze i eksperci - a wkrótce trzecia, łącząca obie.',
        claimA: 'porozmawiajmy',
        claimKey: 'tu i teraz',          // z falką pod spodem
        listener: 'słuchacz',
        listeners: 'słuchacze',
        expert: 'ekspert',
        experts: 'eksperci',
        you: 'Ty',                       // kafelek rozmowy
        callTitle: 'rozmowa 1:1 z ekspertem',
        call: 'wideo, 30 albo 60 minut',
      },
      problem: '[Problem: 2-3 zdania.]',
      solution: 'Rozmowy wideo 1:1 (30 albo 60 minut) słuchaczy z ekspertami z 5+ lat praktyki. Darmowe konto i płatność przez Escrow.',
      result: '[Efekt: 1-2 zdania lub liczby.] W planach: płatności Stripe, ekspansja na Ukrainę i rynek kreatywny Europy Wschodniej.',
      alt: {
        video: 'teraz - animacja: baza ekspertów z branży kreatywnej - szukasz eksperta albo sam nim zostajesz; społeczność i rozmowa wideo 1:1',
        logo: 'teraz - logo',
        main: 'teraz - strona główna teraz.eu na desktopie',
        a: 'teraz - plansza marki: logo i hasło porozmawiajmy tu i teraz',
        b: 'teraz - strona teraz.eu na telefonie',
      },
    },
    loom: {
      meta: ['identyfikacja', 'strona', 'wdrożenie'], // [potwierdź] - zakres w jednej linii panelu
      tagline: 'zautomatyzowane studio projektowe z AI', // krótki opis pod podglądem
      lead: 'Projektowanie wspierane przez AI i automatyzacje. Klient ma własny panel z tablicą zadań, statusami i plikami w jednym miejscu.',
      problem: '[Problem: 2-3 zdania.]',
      solution: 'Styl inspirowany Bauhausem, font Haus, wersje PL/EN, elastyczne płatności i panel klienta z tablicą zadań. [Dopisz 1-2 zdania.]',
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
      tagline: 'platforma łącząca gaming z psychologami i psychiatrami', // krótki opis pod podglądem
      lead: 'Pitch deck w formie strony: gracze dostają wsparcie psychologów i psychiatrów tam, gdzie już są - na serwerach gier.',
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
    bio: 'Projektuję identyfikacje, strony i produkty cyfrowe - od pomysłu, przez ciągłe testowanie, do wdrożenia. Prowadzę loom.studio, a od 2025 roku pracuję jako AI designer w Promotraffic.',
    experience: [
      { year: '2025.05 - teraz', place: 'Promotraffic', role: 'AI designer' },
      { year: '2023.11 - teraz', place: 'loom.studio', role: 'projektant' },
    ],
    education: '',                   // celowo puste - nie pokazujemy (CV, asystent)
    languages: '',
    tools: ['Figma', 'Adobe CC', 'Claude', 'Magnific', 'Cavalry', 'Blender', 'Adtron', 'ClickUp', 'HTML/CSS'],
  },
  // Marka osobista w jednym zdaniu - asystent AI (pytania o markę, kolory, fonty)
  brand: 'Moja marka osobista: czerń, biel, cienka linia 1 px, Helvetica i dużo pustej przestrzeni. Kolory i gradienty mają tylko marki projektów, wyjątek - tęczowa poświata asystenta AI.',
  generator: {
    title: 'Generator znaków',
    intro: 'Algorytm składa za każdym razem nowy sygnet - z zasad, na których projektuję: geometria, negatyw, siatka, rytm. Opisz markę, a dobiorę kierunek.',
    brief: 'opisz markę, np. kawiarnia, ciepło, rzemiosło', briefLabel: 'opis marki',
    ai: 'wygeneruj ze mną', thinking: 'projektuję…', picking: 'wybieram z {n} wersji…', aiError: 'nie mogę teraz odpowiedzieć - wylosowałem znak algorytmem.',
    color: 'kolor znaku', hex: 'kolor w zapisie HEX', palette: 'paleta kolorów',
    complexity: 'złożoność', style: 'styl: kwadratowy - obły',
    roll: 'losuj', download: 'pobierz SVG', code: 'kopiuj kod SVG', copied: 'skopiowano kod SVG',
    no: 'znak nr',
  },

  cv: {
    file: 'Wojciech-Lumer-CV-PL.pdf',
    projects: 'Projekty',
    experience: 'Doświadczenie',
    skills: 'Kompetencje',
    tools: 'Narzędzia',
    view: 'zobacz ↗\uFE0E',
    call: 'umów rozmowę ↗\uFE0E',
    portfolio: 'portfolio',
    skillsList: ['identyfikacja wizualna', 'UX/UI i projekt stron', 'front-end: HTML, CSS, JS, Next.js', 'projektowanie i development z AI', 'dostępność WCAG 2.2', 'grafika i motion generowane z AI'],
    line: ['Od pomysłu, przez ciągłe testowanie, aż do finalnego wdrożenia.'],   // CV: skrócone zdanie z hero w dwóch liniach
  },
  // PDF 1080 × 1080 (npm run deck): karuzela na LinkedIn / Instagram, linki klikalne.
  deck: {
    file: 'Wojciech-Lumer-Portfolio-1080-PL.pdf',
    label: 'portfolio 2026',
    back: 'spis',                    // link powrotu na każdym slajdzie
    contactRow: 'kontakt',           // ostatni wiersz spisu
    visit: 'zobacz projekt ↗\uFE0E',
    soon: 'strona wkrótce online',
    scope: 'Zakres',
    facts: 'W skrócie',
    contactTitle: 'Porozmawiajmy.',
    site: 'portfolio online',
    projects: {
      teraz: { facts: ['rozmowy wideo 1:1', 'doświadczeni eksperci', '0% prowizji w becie'] },
      loom: { facts: ['panel klienta z tablicą zadań', 'elastyczne płatności', 'asystent AI na stronie, wersje PL i EN'] },
      rehab: { facts: ['wsparcie psychiczne tam, gdzie są gracze', 'serwery z psychologiem, który sam gra', '12-tygodniowy pilotaż z 4 miarami sukcesu'] },
    },
  },

  // Kalendarz rezerwacji (panel #rozmowa, Cal.com)
  // Sekcja „Jak pracuję” (między Portfolio a Rekomendacjami): 3 kroki - nazwa, jedno zdanie, co dostaje klient.
  process: {
    title: 'Jak pracuję',
    get: 'Dostajesz:',
    steps: [
      { title: 'Discovery', text: '30 minut rozmowy, w czasie której ustalimy, jak rozwiązać Twój problem.', result: 'feedback, wycenę i plan' },
      { title: 'Projektowanie', text: 'Moodboard i projekty zgodne z briefem.', result: 'gotowy design i spójny system' },
      { title: 'Wdrożenie', text: 'Testowanie kreacji w wybranej technologii.', result: 'w pełni działający design' },
    ],
  },
  booking: {
    title: 'Umów rozmowę',
    intro: 'Porozmawiajmy o Twoim projekcie. Wybierz dzień i godzinę.',
    // kolumna informacji obok kalendarza (desktop: po lewej, telefon: nad kalendarzem)
    facts: ['30 minut', 'online - potwierdzenie i link do spotkania od razu na e-mail'],
    length: 'Długość rozmowy',
    loading: 'sprawdzam wolne terminy',
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
      { q: 'Jak wygląda współpraca?', a: 'W trzech krokach: discovery (30 minut rozmowy, w czasie której ustalimy, jak rozwiązać Twój problem), projektowanie (moodboard i projekty zgodne z briefem) i wdrożenie (testowanie kreacji w wybranej technologii). Na końcu dostajesz w pełni działający design.' },
      { q: 'Ile kosztuje projekt?', a: 'To zależy od zakresu. Wycenę i plan dostajesz po pierwszej rozmowie.' },
      { q: 'Czy zajmujesz się też wdrożeniem?', a: 'Tak - projektuję od pomysłu do wdrożenia, żeby powstała działająca rzecz, nie tylko makiety.' },
      { q: 'Jak używasz AI w pracy?', a: 'AI pomaga mi szybko sprawdzić więcej wariantów projektu. Na co dzień pracuję jako AI designer w Promotraffic.' },
      { q: 'Co projektujesz?', a: 'Identyfikacje, strony i produkty cyfrowe. Prowadzę też loom.studio - zautomatyzowane studio projektowe z AI.' },
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
      site: 'strona projektu ↗\uFE0E',
      contact: 'Najszybciej mailem:',
      call: 'umów rozmowę',
      tools: 'Narzędzia:',
      experience: 'Doświadczenie:',
      education: 'Wykształcenie:',
      languages: 'Języki:',
      brandLink: 'otwórz generator znaków',
      pdf: 'Pełne portfolio jest w PDF:',
      pdfLink: 'pobierz PDF',
      unknown: 'Tego nie ma w portfolio. Zapytaj Wojciecha bezpośrednio:',
    },
  },
  contact: {
    title: 'Kontakt',
    line: 'Chętnie porozmawiam o Twoim projekcie.',
  },
};

export const en = {
  meta: {
    title: 'Wojciech Lumer - portfolio',
    description: 'Design is how it works. I design identities, websites and digital products - from idea, through continuous testing, to launch.',
  },
  ui: {
    langSwitch: 'PL',
    langSwitchLabel: 'Przełącz na polski',
    pdf: 'PDF ↓',
    pdfFile: 'Wojciech-Lumer-Portfolio-EN.pdf',
    indexLabel: 'Projects',
    about: 'about',
    download: 'download PDF',
    downloadType: 'portfolio',
    problem: 'Problem',
    solution: 'Solution',
    result: 'Result',
    view: 'view project ↗\uFE0E',
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
    links: 'Profiles',
    close: 'close',
    generator: 'Mark generator',
    contactButton: 'book a call',
    work: 'Portfolio',
    sectionsLabel: 'Page sections',
    start: 'start',
    nav: { start: 'intro', portfolio: 'portfolio', proces: 'process', rekomendacje: 'kind words', kontakt: 'contact' },
    contactCta: 'contact',
    askAgent: 'ask my assistant',
    recs: 'Kind words',
    drive: 'Work archive',
    education: 'Education', certificates: 'Certificates',
    driveType: 'Google Drive',
    avatar: 'Ask about me - AI assistant',
    sphereHint: 'drag to rotate',
    qr: 'website',
  },
  hero: {
    role: 'designer',
    title: 'Design is how it works.',
    line: 'From idea, through continuous testing, all the way to final launch.',
    breaks: { title: 'Design is how', line: 'through continuous testing,' },
  },
  projects: {
    teraz: {
      meta: ['product', 'UX/UI', 'identity', 'AI-assisted build'],   // zakres w jednej linii panelu
      tagline: 'a marketplace for experts from the creative industry', // krótki opis pod podglądem
      lead: 'Find an expert from your industry, here and now.',
      // Plansza animowana (reel, 15 s). Słuchacz po angielsku: „listener” (decyzja właściciela; teraz.eu używa „learner”).
      reel: {
        label: 'teraz - a base of creative industry experts. Looking for an expert? Find one here, with 5+ years of practice. Or become one yourself: share what you know and earn from your calls. Two communities - listeners and experts - and soon a third that joins them. A 1:1 call with an expert, video, 30 or 60 minutes. Let’s talk here and now.',
        stepL: 'Looking for an expert?',
        subL: 'Creative industry experts with 5+ years of practice.',
        stepE: 'Or become one yourself.',
        subE: 'Share what you know and earn from your calls.',
        tags: ['branding', 'UX/UI', 'motion', '3D'],
        slots: ['Mon 10:00', 'Wed 14:30', 'Fri 18:00'],
        community: 'Two communities.',
        communitySub: 'Listeners and experts - and soon a third that joins them.',
        claimA: 'let’s talk',            // apostrof jak u teraz („Let’s talk”)
        claimKey: 'here and now',
        listener: 'listener',
        listeners: 'listeners',
        expert: 'expert',
        experts: 'experts',
        you: 'you',
        callTitle: '1:1 call with an expert',
        call: 'video, 30 or 60 minutes',
      },
      problem: '[Problem: 2-3 sentences.]',
      solution: '1:1 video calls (30 or 60 minutes) between listeners and experts with 5+ years of practice. A free account and payment via Escrow.',
      result: '[Result: 1-2 sentences or numbers.] Next: Stripe payments, expansion to Ukraine and the Eastern European creative market.',
      alt: {
        video: 'teraz - animation: a base of creative industry experts - look for an expert or become one; the community and a 1:1 video call',
        logo: 'teraz - logo',
        main: 'teraz - the teraz.eu home page on desktop',
        a: 'teraz - brand board: logo and the line let’s talk here and now',
        b: 'teraz - teraz.eu on a phone',
      },
    },
    loom: {
      meta: ['identity', 'website', 'build'],
      tagline: 'an automated, AI-driven design studio', // krótki opis pod podglądem
      lead: 'Design powered by AI and automation. Each client gets their own portal with a task board, statuses and files in one place.',
      problem: '[Problem: 2-3 sentences.]',
      solution: 'Bauhaus-inspired style, the Haus typeface, PL/EN versions, flexible payments and a client portal with a task board. [Add 1-2 sentences.]',
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
      tagline: 'a platform connecting gaming with psychologists and psychiatrists', // krótki opis pod podglądem
      lead: 'A pitch deck as a website: players get support from psychologists and psychiatrists where they already are - on game servers.',
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
    bio: 'I design identities, websites and digital products - from idea, through continuous testing, to launch. I run loom.studio, and since 2025 I have worked as an AI designer at Promotraffic.',
    experience: [
      { year: '2025.05 - now', place: 'Promotraffic', role: 'AI designer' },
      { year: '2023.11 - now', place: 'loom.studio', role: 'designer' },
    ],
    education: '',                   // intentionally empty
    languages: '',
    tools: ['Figma', 'Adobe CC', 'Claude', 'Magnific', 'Cavalry', 'Blender', 'Adtron', 'ClickUp', 'HTML/CSS'],
  },
  brand: 'My personal brand: black, white, a 1 px line, Helvetica and plenty of empty space. Colour and gradients belong only to project brands, the one exception being the rainbow glow of the AI assistant.',
  generator: {
    title: 'Mark generator',
    intro: 'An algorithm builds a brand-new signet every time - from the principles I design by: geometry, negative space, grid, rhythm. Describe a brand and I will pick the direction.',
    brief: 'describe a brand, e.g. café, warmth, craft', briefLabel: 'brand brief',
    ai: 'generate with me', thinking: 'designing…', picking: 'choosing from {n} versions…', aiError: 'I cannot answer right now - the algorithm rolled a mark instead.',
    color: 'mark colour', hex: 'colour as HEX', palette: 'colour palette',
    complexity: 'complexity', style: 'style: square - round',
    roll: 'roll', download: 'download SVG', code: 'copy SVG code', copied: 'SVG code copied',
    no: 'mark no.',
  },

  cv: {
    file: 'Wojciech-Lumer-CV-EN.pdf',
    projects: 'Projects',
    experience: 'Experience',
    skills: 'Skills',
    tools: 'Tools',
    view: 'view ↗\uFE0E',
    call: 'book a call ↗\uFE0E',
    portfolio: 'portfolio',
    skillsList: ['visual identity', 'UX/UI and web design', 'front-end: HTML, CSS, JS, Next.js', 'AI-assisted design and development', 'accessibility, WCAG 2.2', 'generative AI visuals and motion'],
    line: ['From idea, through continuous testing, all the way to final launch.'],
  },
  deck: {
    file: 'Wojciech-Lumer-Portfolio-1080-EN.pdf',
    label: 'portfolio 2026',
    back: 'contents',
    contactRow: 'contact',
    visit: 'view project ↗\uFE0E',
    soon: 'site coming soon',
    scope: 'Scope',
    facts: 'In short',
    contactTitle: 'Let’s talk.',
    site: 'portfolio online',
    projects: {
      teraz: { facts: ['1:1 video calls', 'experienced experts', '0% commission in beta'] },
      loom: { facts: ['client portal with a task board', 'flexible payments', 'AI assistant on the site, PL and EN versions'] },
      rehab: { facts: ['mental-health support where players already are', 'servers with a psychologist who plays', 'a 12-week pilot with 4 success measures'] },
    },
  },

  process: {
    title: 'How I work',
    get: 'You get:',
    steps: [
      { title: 'Discovery', text: 'A 30-minute call where we figure out how to solve your problem.', result: 'feedback, a quote and a plan' },
      { title: 'Design', text: 'A moodboard and designs that follow the brief.', result: 'finished design and a consistent system' },
      { title: 'Launch', text: 'Testing the creative in your chosen technology.', result: 'a fully working design' },
    ],
  },
  booking: {
    title: 'Book a call',
    intro: 'Let’s talk about your project. Pick a day and time.',
    facts: ['30 minutes', 'online - confirmation and meeting link sent to your e-mail right away'],
    length: 'Call length',
    loading: 'checking free slots',
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
      { q: 'What does working together look like?', a: 'Three steps: discovery (a 30-minute call where we figure out how to solve your problem), design (a moodboard and designs that follow the brief) and launch (testing the creative in your chosen technology). You end up with a fully working design.' },
      { q: 'How much does a project cost?', a: 'It depends on the scope. You get a quote and a plan after the first call.' },
      { q: 'Do you also build what you design?', a: 'Yes - I design from idea to launch, so you get a working thing, not just mockups.' },
      { q: 'How do you use AI?', a: 'AI helps me test more design options, faster. Day to day I work as an AI designer at Promotraffic.' },
      { q: 'What do you design?', a: 'Identities, websites and digital products. I also run loom.studio - an automated, AI-driven design studio.' },
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
      site: 'project site ↗\uFE0E',
      contact: 'Email is the fastest:',
      call: 'book a call',
      tools: 'Tools:',
      experience: 'Experience:',
      education: 'Education:',
      languages: 'Languages:',
      brandLink: 'open the mark generator',
      pdf: 'The full portfolio is in the PDF:',
      pdfLink: 'download PDF',
      unknown: 'That is not in the portfolio. Ask Wojciech directly:',
    },
  },
  contact: {
    title: 'Contact',
    line: 'Happy to talk about your project.',
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
