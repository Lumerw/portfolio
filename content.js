// Cała treść strony i PDF. Edytujesz tylko ten plik.
// Wszystko w [nawiasach] to miejsca do uzupełnienia albo potwierdzenia.
//
// shared — dane wspólne dla obu języków (linki, lata, obrazy)
// pl / en — teksty

export const shared = {
  name: 'Wojciech Lumer',            // [potwierdź zapis]
  slug: 'lumer',                     // używane w nazwie PDF: portfolio-lumer-pl.pdf
  year: '2026',
  siteUrl: 'https://lumerw.github.io/portfolio', // adres strony — QR w PDF, Open Graph; zmień po podpięciu domeny
  email: 'wojciechlumer@gmail.com',
  // Przycisk „kontakt” — link do kalendarza spotkań. [Wpisz swój link Calendly]
  calendly: 'https://calendly.com/',
  links: [
    { label: 'Behance', href: '[https://behance.net/…]' },
    { label: 'LinkedIn', href: '[https://linkedin.com/in/…]' },
    { label: 'Facebook', href: '[https://facebook.com/…]' },
    { label: 'Instagram', href: '[https://instagram.com/…]' },
    { label: 'GitHub', href: '[https://github.com/…]' },
  ],
  // duotone: true → `npm run images` zamienia zdjęcie na tusz + papier (identycznie na stronie i w PDF).
  portrait: { src: 'assets/me/portrait.svg', w: 1200, h: 1500, duotone: true },

  // Szerokości generowane przez `npm run images` (AVIF + WebP + JPG) do srcset.
  // Obraz .jpg w content.js → strona sama poda warianty 01-640.avif, 01-1280.webp itd.
  imageWidths: [640, 1280, 1920],

  // Ikony obok znaku w hero — zmieniają się szybko, każda kolejna w prawo bardziej przezroczysta.
  // Dowolna liczba plików (SVG/PNG, kwadrat). Na razie placeholdery.
  icons: [
    'assets/icons/01.svg', 'assets/icons/02.svg', 'assets/icons/03.svg',
    'assets/icons/04.svg', 'assets/icons/05.svg', 'assets/icons/06.svg',
  ],

  // Firmy, z którymi pracowałem — karuzela pod indeksem. Logo najlepiej SVG, jednokolorowe.
  clients: [
    { name: '[firma 1]', logo: 'assets/clients/01.svg', w: 160, h: 48 },
    { name: '[firma 2]', logo: 'assets/clients/02.svg', w: 160, h: 48 },
    { name: '[firma 3]', logo: 'assets/clients/03.svg', w: 160, h: 48 },
    { name: '[firma 4]', logo: 'assets/clients/04.svg', w: 160, h: 48 },
    { name: '[firma 5]', logo: 'assets/clients/05.svg', w: 160, h: 48 },
    { name: '[firma 6]', logo: 'assets/clients/06.svg', w: 160, h: 48 },
  ],

  // Projekt:
  //  logo   — na środku podglądu (desktop), najlepiej SVG
  //  sygnet — favicon / sygnet przy opisie zakresu i w panelu (kwadrat)
  //  video  — pętla w panelu: square 1:1 (ekran pionowy) i wide 16:9 (ekran poziomy);
  //           src = plik mp4 (bez dźwięku), poster = kadr; bez src widać poster-placeholder
  //  images — main 16:10, a i b 4:5 — tylko w PDF

  // Kolejność = kolejność na stronie. Numer nadawany automatycznie: 01, 02, 03.
  projects: [
    {
      id: 'teraz',
      title: 'teraz',
      type: 'marketplace',           // typ projektu — po prawej w indeksie
      year: '2026',                  // [potwierdź] — tylko w PDF
      symbol: 'teraz',
      logo:   { src: 'assets/teraz/logo.svg', w: 480, h: 120 },
      sygnet: { src: 'assets/teraz/sygnet.svg' },
      video: {
        square: { src: '', poster: 'assets/teraz/video-1x1.svg', w: 1080, h: 1080 },
        wide:   { src: '', poster: 'assets/teraz/video-16x9.svg', w: 1920, h: 1080 },
      },
      href: 'https://teraz.design',  // [potwierdź]
      images: {
        main:    { src: 'assets/teraz/01.svg',      w: 1600, h: 1000 },
        a:       { src: 'assets/teraz/02.svg',      w: 1200, h: 1500 },
        b:       { src: 'assets/teraz/03.svg',      w: 1200, h: 1500 },
      },
    },
    {
      id: 'loom',
      title: 'loom.studio',
      type: 'studio',
      year: '2026',                  // [potwierdź] — tylko w PDF
      symbol: 'loom',
      logo:   { src: 'assets/loom/logo.svg', w: 480, h: 120 },
      sygnet: { src: 'assets/loom/sygnet.svg' },
      video: {
        square: { src: '', poster: 'assets/loom/video-1x1.svg', w: 1080, h: 1080 },
        wide:   { src: '', poster: 'assets/loom/video-16x9.svg', w: 1920, h: 1080 },
      },
      href: 'https://loom.studio',   // [potwierdź]
      images: {
        main:    { src: 'assets/loom/01.svg',      w: 1600, h: 1000 },
        a:       { src: 'assets/loom/02.svg',      w: 1200, h: 1500 },
        b:       { src: 'assets/loom/03.svg',      w: 1200, h: 1500 },
      },
    },
    {
      id: 'rehab',
      title: 'reh.ab',
      type: 'pitch deck',
      year: '2026',                  // [potwierdź] — tylko w PDF
      symbol: 'rehab',
      logo:   { src: 'assets/rehab/logo.svg', w: 480, h: 120 },
      sygnet: { src: 'assets/rehab/sygnet.svg' },
      video: {
        square: { src: '', poster: 'assets/rehab/video-1x1.svg', w: 1080, h: 1080 },
        wide:   { src: '', poster: 'assets/rehab/video-16x9.svg', w: 1920, h: 1080 },
      },
      href: '[https://domena-reh.ab]',
      images: {
        main:    { src: 'assets/rehab/01.svg',      w: 1600, h: 1000 },
        a:       { src: 'assets/rehab/02.svg',      w: 1200, h: 1500 },
        b:       { src: 'assets/rehab/03.svg',      w: 1200, h: 1500 },
      },
    },
  ],
};

export const pl = {
  meta: {
    title: 'Wojciech Lumer — portfolio',
    description: 'Design to to, jak coś działa. Projektuję identyfikacje, strony i produkty cyfrowe — od pomysłu do wdrożenia.',
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
    contact: 'Kontakt',
    copy: 'kopiuj adres',
    copied: 'skopiowano',
    clients: 'Pracowałem z',
    themeDark: 'Włącz tryb ciemny',
    themeLight: 'Włącz tryb jasny',
    linkedin: 'LinkedIn',
    skip: 'Przejdź do treści',
    next: 'następny',
    backToIndex: 'wróć do indeksu ↑',
    links: 'Profile',
    close: 'zamknij',
    contactButton: 'kontakt',
    qr: 'wersja www',
  },
  hero: {
    role: 'projektant',                                   // podpis przy imieniu nad hasłem
    title: 'Design to to, jak coś działa.',               // hasło (h1)
    line: 'Projektuję identyfikacje, strony i produkty cyfrowe — od pomysłu do wdrożenia. Prowadzę loom.studio.',
  },
  projects: {
    teraz: {
      meta: ['projekt produktu', 'UX/UI', 'identyfikacja', 'development z AI'], // [potwierdź]
      lead: 'Platforma typu marketplace łącząca ekspertów ze słuchaczami, z sekcją społeczności.',
      problem: '[Problem: 2–3 zdania.]',
      solution: '[Rozwiązanie: 2–3 zdania.]',
      result: '[Efekt: 1–2 zdania lub liczby.] W planach: płatności Stripe, ekspansja na Ukrainę i rynek kreatywny Europy Wschodniej.',
      alt: {
        video: 'teraz — [opis wideo promocyjnego]',
        logo: 'teraz — logo',
        main: 'teraz — [opis obrazu głównego]',
        a: 'teraz — [opis obrazu]',
        b: 'teraz — [opis obrazu]',
      },
    },
    loom: {
      meta: ['założyciel', 'identyfikacja', 'projekt strony w Figmie', 'wdrożenie'], // [potwierdź]
      lead: 'Strona-wizytówka i studio projektowe w modelu subskrypcji: stała miesięczna opłata za pracę projektową.',
      problem: '[Problem: 2–3 zdania.]',
      solution: 'Styl inspirowany Bauhausem, font Haus, wersje PL/EN, subskrypcje i panel klienta na Stripe. [Dopisz 1–2 zdania.]',
      result: '[Efekt: 1–2 zdania lub liczby.]',
      alt: {
        video: 'loom.studio — [opis wideo promocyjnego]',
        logo: 'loom.studio — logo',
        main: 'loom.studio — [opis obrazu głównego]',
        a: 'loom.studio — [opis obrazu]',
        b: 'loom.studio — [opis obrazu]',
      },
    },
    rehab: {
      meta: ['koncepcja', 'narracja', 'projekt', 'development'], // [potwierdź]
      lead: 'Strona-pitch deck dla koncepcji platformy łączącej gaming ze zdrowiem psychicznym.',
      problem: '[Problem: 2–3 zdania.]',
      solution: 'Prezentacja inwestorska w formie strony www, bez ciasteczek i zbierania danych. [Dopisz 1–2 zdania.]',
      result: '[Efekt: 1–2 zdania lub liczby.]',
      alt: {
        video: 'reh.ab — [opis wideo promocyjnego]',
        logo: 'reh.ab — logo',
        main: 'reh.ab — [opis obrazu głównego]',
        a: 'reh.ab — [opis obrazu]',
        b: 'reh.ab — [opis obrazu]',
      },
    },
  },
  about: {
    title: 'O mnie',
    portraitAlt: 'Wojciech Lumer — portret', // [potwierdź po dodaniu zdjęcia]
    bio: '[Bio: 3–4 zdania. Kim jesteś, czym się zajmujesz, co cię wyróżnia, czego szukasz.]',
    experience: [
      { year: '2026', place: 'loom.studio', role: 'założyciel, projektant' },
      { year: '[rok]', place: '[miejsce]', role: '[rola]' },
    ],
    education: '[Uniwersytet SWPS — kierunek, lata]',
    languages: '[polski — ojczysty · angielski — poziom]',
    tools: ['Figma', '[Adobe …]', 'Blender', 'Adtron', 'HTML/CSS', '[…]'],
  },
  contact: {
    title: 'Kontakt',
    line: '[Jedno zdanie zaproszenia, np. „Chętnie porozmawiam o projekcie albo pracy.”]',
  },
};

export const en = {
  meta: {
    title: 'Wojciech Lumer — portfolio',
    description: 'Design is how it works. I design identities, websites and digital products — from idea to launch.',
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
    contact: 'Contact',
    copy: 'copy address',
    copied: 'copied',
    clients: 'Worked with',
    themeDark: 'Switch to dark mode',
    themeLight: 'Switch to light mode',
    linkedin: 'LinkedIn',
    skip: 'Skip to content',
    next: 'next',
    backToIndex: 'back to index ↑',
    links: 'Profiles',
    close: 'close',
    contactButton: 'contact',
    qr: 'website',
  },
  hero: {
    role: 'designer',
    title: 'Design is how it works.',
    line: 'I design identities, websites and digital products — from idea to launch. I run loom.studio.',
  },
  projects: {
    teraz: {
      meta: ['product design', 'UX/UI', 'identity', 'AI-assisted development'],
      lead: 'A marketplace platform connecting experts with listeners, with a community section.',
      problem: '[Problem: 2–3 sentences.]',
      solution: '[Solution: 2–3 sentences.]',
      result: '[Result: 1–2 sentences or numbers.] Next: Stripe payments, expansion to Ukraine and the Eastern European creative market.',
      alt: {
        video: 'teraz — [promo video description]',
        logo: 'teraz — logo',
        main: 'teraz — [main image description]',
        a: 'teraz — [image description]',
        b: 'teraz — [image description]',
      },
    },
    loom: {
      meta: ['founder', 'identity', 'website design in Figma', 'build'],
      lead: 'A studio website and a subscription design studio: a fixed monthly fee for design work.',
      problem: '[Problem: 2–3 sentences.]',
      solution: 'Bauhaus-inspired style, the Haus typeface, PL/EN versions, subscriptions and a client panel on Stripe. [Add 1–2 sentences.]',
      result: '[Result: 1–2 sentences or numbers.]',
      alt: {
        video: 'loom.studio — [promo video description]',
        logo: 'loom.studio — logo',
        main: 'loom.studio — [main image description]',
        a: 'loom.studio — [image description]',
        b: 'loom.studio — [image description]',
      },
    },
    rehab: {
      meta: ['concept', 'narrative', 'design', 'development'],
      lead: 'A pitch-deck website for a platform concept connecting gaming and mental health.',
      problem: '[Problem: 2–3 sentences.]',
      solution: 'An investor presentation built as a website, with no cookies and no data collection. [Add 1–2 sentences.]',
      result: '[Result: 1–2 sentences or numbers.]',
      alt: {
        video: 'reh.ab — [promo video description]',
        logo: 'reh.ab — logo',
        main: 'reh.ab — [main image description]',
        a: 'reh.ab — [image description]',
        b: 'reh.ab — [image description]',
      },
    },
  },
  about: {
    title: 'About',
    portraitAlt: 'Wojciech Lumer — portrait',
    bio: '[Bio: 3–4 sentences.]',
    experience: [
      { year: '2026', place: 'loom.studio', role: 'founder, designer' },
      { year: '[year]', place: '[place]', role: '[role]' },
    ],
    education: '[SWPS University — field, years]',
    languages: '[Polish — native · English — level]',
    tools: ['Figma', '[Adobe …]', 'Blender', 'Adtron', 'HTML/CSS', '[…]'],
  },
  contact: {
    title: 'Contact',
    line: '[One inviting sentence, e.g. “Happy to talk about a project or a role.”]',
  },
};

export const content = { shared, pl, en };
