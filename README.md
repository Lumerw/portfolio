# Portfolio — one-pager + PDF

Strona: czysty HTML / CSS / vanilla JS, bez frameworka i bundlera. Node służy tylko do narzędzi (podgląd, PDF, QR, obrazy, audyt).
Źródło prawdy dla projektu: `BRIEF.md` (trzymany lokalnie, poza repozytorium).

## Szybki start

```bash
npm install
npm run dev        # http://localhost:8080 — index.html renderowany z content.js przy każdym odświeżeniu
```

| Polecenie | Co robi |
|---|---|
| `npm run dev` | serwer podglądu; zmiany w `content.js` widać po odświeżeniu |
| `npm run build` | wpisuje polską treść z `content.js` do `index.html` (strona działa bez JS, szybciej się ładuje). **Przed wdrożeniem.** |
| `npm run images` | AVIF/WebP/JPG 640/1280/1920 z obrazów `.jpg`/`.png` wpisanych w `content.js`; portret od razu w duotonie |
| `npm run pdf` | PDF do pobrania, po 4 na język: `portfolio-lumer-<pl|en>.pdf` (16:9, jasny), `-dark.pdf` (16:9, ciemny), `-9x16.pdf` i `-9x16-dark.pdf` (telefon); własny szablon `tools/pdf.css`, kadry projektów zrzucane z paneli strony do `private/pdf/`; sprawdza 5 stron, kadr i rozmiar < 8 MB |
| `npm run covers` | plansze marek na stronę (`cover-4x5/16x9/9x16.webp` dla projektów z polem `cover`) i obrazy case study do PDF A4 (`01-03.jpg` ze zrzutów i planszy); potem `npm run images` |
| `npm run cv` | CV na jedną stronę 1080 × 1080 (PL i EN) do wysyłania → `private/` (poza repozytorium); projekty, doświadczenie, kompetencje, narzędzia, kontakt z Calendly i QR |
| `npm run deck` | `portfolio-lumer-1080-pl.pdf` i `-en.pdf`: karuzela 1080 × 1080 na LinkedIn / Instagram (8 slajdów, klikalny spis i linki); sprawdza liczbę stron, kadr i linki |
| `npm run og` | `assets/og.jpg` 1200×630 (obraz do linków w mailu / na LinkedInie) |
| `npm run assets` | symbole, favicony i wektorowe placeholdery |
| `npm run audit` | Lighthouse (telefon + desktop) i lista kontrolna z briefu (sekcja 10), w tym zero zewnętrznych żądań z otwartym `#loom` i `#teraz`. Testy akceptacyjne planszy teraz: `npm run check-reel` |
| `npm run check-reel` | testy akceptacyjne planszy animowanej teraz (ok. 2 min, port 8601): klatki PL/EN w 12 kadrach 4:5, szew i matematyka pętli 15 s, format panelu, bramka, PL/EN, przełącznik pauzy, ograniczony ruch, błyski, budżet DOM, sieć, bez JS, tryb ciemny; zrzuty błędów w `/private/tmp/claude-501/reel-qa/check/`. Wybrane grupy: `-- --only=visual,gate --lang=pl` |
| `npm run check-agent` | testy asystenta AI bez sieci: tryb lokalny (PL/EN) i Worker z podstawionym Claude API |
| `npm run shots -- index.html` | zrzuty 375 / 768 / 1440 px do `screenshots/` |

`specimen.html` to strona robocza z tokenami, siatką i symbolami (klawisz G = siatka). Nie jest częścią portfolio (`noindex`).

## Układ

- **Strona główna (przewija się normalnie):** na samej górze PL/EN (lewo) i przełącznik trybu (prawo), bez paska nawigacji → hero: awatar-moneta z trzema zmieniającymi się ikonami kreską (klik w ikony → brandbook), imię z ikoną LinkedIn, hasło, akapit, przycisk „kontakt” (przewija do kontaktu), karuzela logo firm w jednej linii z przyciskiem (50% krycia) → sekcja **Portfolio** (projekty, brandbook, PDF) → **Jak pracuję** (3 kroki na linii 1 px z kółkami, które zapełniają się tuszem przy przewijaniu; `pl/en.process`) → **Rekomendacje** z LinkedIna (karuzela w pętli bez końca, jedzie cały czas; skrócone fragmenty po polsku i angielsku, zdjęcie z LinkedIna (za zgodą, `assets/recs/`, 96 × 96) albo kółko z inicjałami; `shared.recommendations`) → sekcja **Kontakt** (mail, „umów rozmowę” z ikoną kalendarza → Calendly i obok „zapytaj asystenta AI” → panel asystenta) → pasek na samym dole: profile (Instagram, LinkedIn, Facebook, GitHub, Behance) po lewej, © pod sferą. Na desktopie kontakt ma wysokość ekranu minus pasek - na końcu strony stoi na wysokości środka sfery. Odstęp między sekcjami: desktop 96 px, telefon 128 px - na telefonie i tablecie czarny blok, na desktopie trzecia sekcja w kolumnie jak hero i portfolio. Tytuły sekcji mają tę samą wielkość co hasło w hero (`.section-title`). Na desktopie sekcje zajmują kolumny 1-5, kolumna 6 to stała przerwa, po prawej **sfera** z projektami - przyklejona (sticky) przez całą stronę.
- **Awatar-moneta** (`shared.avatar`, `assets/me/`): zdjęcie co ~4,5 s obraca się na drugą stronę - rysunek kreską; tęczowy pierścień i poświata (wyjątek kolorystyczny marki). Klik → panel asystenta AI (wysuwa się od dołu jak wszystkie panele). Przy ograniczonym ruchu stoi zdjęcie.
- **Sfera** (`sphere()` w `render.js`, `sphere.js`, sekcja „Sfera” w `styles.css`): CSS 3D - 6 południków i 5 równoleżników kreską 1 px, znaki z brandbooka (`shared.icons`) i karty projektów 4:5 w wersjach uproszczonych: teraz - tło, animacja logo i kafelki słuchacz / ekspert (`reel(..., { lite: true })`), loom.studio - gradient reagujący na kursor na całej karcie i figury, reh.ab - nagłówek, taśma słów i płynący gradient (`liveMarkup(p, { lite: true })`, statyczna klatka `cover.card`). Gra tylko karta z przodu; w panelach pełne wersje. Obrót myszką z bezwładnością (karta po przeciągnięciu nie otwiera panelu), powolne samoczynne kręcenie (`AUTO` w `sphere.js`), najechanie / focus na projekcie w indeksie obraca sferę do jego karty, klik w kartę otwiera panel. Bez JS stoi w pozycji startowej; przy ograniczonym ruchu nie kręci się sama.
- **Tryb ciemny:** domyślnie wg systemu, wybór zapamiętany. Grafiki z klasą `mono` (SVG: ikony, sygnety, logo, logo firm, placeholdery) są w nim odwracane — jeśli wgrasz kolorowe logo, zamień je na PNG/JPG albo usuń `mono` w `render.js`. PDF zawsze jasny.
- **Panele wysuwane od dołu:** kliknięcie projektu otwiera `#teraz` / `#loom` / `#rehab`: kadr 4:5 (wideo w pętli, plansza animowana albo grafika interaktywna) i opis projektu - obok kadru na ekranie poziomym, pod nim na telefonie (szczegóły: „Panel projektu”). Działają przez CSS `:target`, więc także bez JS, a każdy projekt ma własny link (np. `…/#loom`). Przycisk „wstecz” zamyka panel. `main.js` dokłada focus w panelu, Esc, nieaktywne tło (`inert`), powrót focusu i sterowanie wideo.
- **Plansza animowana teraz:** 15 s w pętli, sam CSS (sekcja „Reel” w `styles.css`, szablon `reel()` w `render.js`), format 4:5. Plakat (znak wyżej niż środek + „porozmawiajmy tu i teraz” z falką) → „najpierw jesteś słuchaczem” (róż, „?”) → „potem stajesz się ekspertem” (błękit, „!”, słuchacz → ekspert) → społeczność (kropki ról, dwie zmieniają rolę) → rozmowa wideo 1:1 → plakat; ostatnia klatka = pierwsza. Gra tylko w otwartym panelu; jest przycisk pauzy. Przy ograniczonym ruchu - stała klatka (oba kafelki, tytuł rozmowy, hasło). Kolory i logo z `projects[].brand` / `.logo`; w trybie ciemnym plansza wygląda tak samo.
- **Brandbook:** klik w znak z ikonami otwiera panel `#brandbook` z zasadami marki osobistej: znak (jasny / ciemny, rozmiary), kolory z kontrastem, typografia, symbole i ikony, siatka, ruch, zasady tak / nie. Ikony zmieniają się tak jak w hero; tylko przy otwartym panelu. Wartości kolorów w `shared.brandbook.colors`, teksty w `pl/en.brandbook`, szablon `brandbook()` w `render.js`. Nie trafia do PDF.
- **PDF** ma pełne case study (tekst + obrazy) — na stronie te treści są ukryte (`.print-only`).

## Jak podmienić treść

Wszystko jest w **`content.js`** — layout nie zawiera tekstu. `[nawiasy]` = miejsca do uzupełnienia. **Strona i PDF ich nie pokazują:** pusty wiersz doświadczenia, link profilu, karuzela firm czy ikonka LinkedIn znikają, dopóki nie wpiszesz prawdziwej wartości, a w zdaniu z nawiasem zostaje tylko reszta tekstu. `npm run build` wypisuje pełną listę rzeczy do uzupełnienia.

| Pole | Gdzie się pokazuje |
|---|---|
| `shared.name` | imię nad hasłem (bez roli) |
| `pl/en.hero.role` | rola - tylko w CV, danych dla Google i asystencie (na stronie nad hasłem jest samo imię) |
| `pl/en.hero.title`, `.line` | hasło (h1: „Design is how it works.” / „Design to to, jak coś działa.”) i akapit pod nim; też okładka PDF i `og.jpg` |
| `shared.calendly` | przycisk „kontakt” → kalendarz Calendly (30 min); też w CV, PDF 1080 i u asystenta |
| `shared.email`, `shared.links` | stopka (profile: Instagram, LinkedIn, Facebook, GitHub, Behance), przycisk „kontakt”, dane dla Google, asystent, PDF; LinkedIn = wiersz „o mnie” w indeksie |
| `shared.siteUrl` | QR w PDF, adresy Open Graph, `canonical`, dane strukturalne, `sitemap.xml` i `robots.txt` — **zmień po podpięciu domeny** |
| `shared.icons` | znaki kreską: trzy miejsca obok awatara i sześć w brandbooku (każde zmienia się we własnym, losowym rytmie 0,5-1,1 s - `ICON_MS` w `main.js`) i drobne znaki na sferze |
| `shared.avatar` | awatar-moneta w hero: `photo` i `drawing` (koła, WebP 256 px) |
| `shared.clients` | karuzela firm obok „kontakt”: `name` (tekst alternatywny), `logo` (SVG w jednym kolorze #111, przycięty do krawędzi znaku - w trybie ciemnym odwracany), `h` (wysokość w px - napisy ~20, sygnety ~28, żeby znaki ważyły podobnie), `w` = h × proporcje |
| `projects[].logo`, `.sygnet` | logo planszy marki; sygnet / favicon przy zakresie prac i w panelu. `mono: false` = kolorowy asset marki (bez odwracania w trybie ciemnym) |
| `projects[].brand` | opcjonalnie: plansza w stylu marki — `bg` (tło), `aurora` (4 kolory rozmytych gradientów), `speed` (czas animacji). Używana w panelu, dopóki nie ma wideo. Przykład: teraz (assety z teraz.eu) |
| `projects[].video['16x9']`, `['4x5']`, `['9x16']` | wideo w panelu, zawsze w całości (patrz tabela formatów niżej): `src` mp4 bez dźwięku, `poster` kadr. Kolejność: prawdziwe wideo (`src`) > `reel` > plansza statyczna (`cover`) > plansza marki (`brand`) > poster |
| `projects[].live` | grafika interaktywna zamiast wideo (`live.js`): loom.studio - płynny gradient WebGL z hero loom.studio (reaguje na kursor) i trzy figury Bauhausu pływające na sprężynach; reh.ab - hero reh.ab w pętli 21 s ze wszystkimi mikroanimacjami (teksty w `live` przy projekcie). Wstawiana tylko w otwartym panelu, z pauzą |
| `projects[].cover` | plansza statyczna w stylu marki (loom.studio, reh.ab): panel w trzech formatach, zanim powstanie wideo. Generuje `npm run covers` z `tools/covers.mjs` - te same plansze co w PDF 1080 × 1080 |
| `projects[].reel` | `true` = plansza animowana zamiast postera w panelu (teraz). Teksty w `pl/en.projects.<id>.reel` (te same klucze w obu językach; limity znaków i brak długich myślników sprawdza `npm run build`), etykieta pauzy w `ui.reelPause` |
| `projects[].images` | `main` 16:10, `a`, `b` 4:5 — tylko w PDF |
| `pl/en.projects.*` | zakres prac, opis, problem / rozwiązanie / efekt (PDF; limit 120 słów sprawdza build) |
| `pl/en.about` | doświadczenie i narzędzia - CV i asystent (panel „o mnie” jest na razie wyłączony na stronie i w PDF - wiersz „o mnie” prowadzi na LinkedIn) |

### Obrazy

1. Wrzuć plik do `assets/<projekt>/` (np. `assets/teraz/01.jpg`), portret do `assets/me/portrait.jpg`.
2. W `content.js` zmień `src` na nową ścieżkę i ustaw `w`, `h` na wymiary oryginału.
3. `npm run images` — warianty do `srcset` (portret od razu w duotonie tusz + papier).
4. `npm run build`.

### Wideo

| Format | Gdzie | Plik |
|---|---|---|
| `'16x9'` (1920 × 1080) | desktop, każdy ekran poziomy (także telefon obrócony) | `promo-16x9.mp4` |
| `'4x5'` (1080 × 1350) | min. 768 px szerokości + orientacja pionowa (tablet) | `promo-4x5.mp4` |
| `'9x16'` (1080 × 1920) | telefon pionowo (< 768 px), kadr na pełną wysokość panelu | `promo-9x16.mp4` |

Wrzuć `assets/<projekt>/promo-16x9.mp4`, `promo-4x5.mp4` i `promo-9x16.mp4` (H.264, bez ścieżki dźwiękowej, krótka pętla, najlepiej < 4 MB) i wpisz je w `video['16x9'].src` / `video['4x5'].src` / `video['9x16'].src`. Kadr nigdy nie jest przycinany - ramka ma dokładnie proporcję pliku. Prawdziwe wideo zastępuje planszę animowaną (`reel`) w tym formacie. Jako `poster` daj pierwszy kadr (`.jpg`); bez niego `npm run assets` generuje placeholdery `video-16x9.svg`, `video-4x5.svg` i `video-9x16.svg`. Przykład kompresji i wycięcia 4:5 ze środka kadru 16:9:

```bash
ffmpeg -i wejscie.mov -an -vf scale=1920:-2 -c:v libx264 -crf 26 -preset slow -movflags +faststart promo-16x9.mp4
ffmpeg -i wejscie.mov -an -vf "crop=ih*4/5:ih,scale=1080:1350" -c:v libx264 -crf 26 -preset slow -movflags +faststart promo-4x5.mp4
```

## Synchronizacja marek projektów

Projekt z polem `sync: 'https://…'` w `content.js` ma logo, sygnet i kolory pobierane automatycznie ze swojej strony:

- **codziennie** (GitHub Actions, `.github/workflows/sync-brands.yml`) albo ręcznie: zakładka *Actions* → „Synchronizacja marek projektów” → *Run workflow*, lokalnie `npm run sync-brands`;
- gdy coś się zmieniło: przebudowa `index.html`, commit, publikacja — zmiana logo na stronie projektu pojawia się w portfolio najpóźniej po dobie;
- PDF automat nie przebudowuje (serwer GitHuba nie ma Helvetiki) — po zmianie marki odśwież go na Macu: `git pull && npm run pdf`, commit i push;
- pliki zapisywane są w repozytorium (`assets/<projekt>/*-sync.svg`, `brands.generated.js`) — odwiedzający nie łączą się ze stronami projektów;
- gdy strona projektu nie działa albo plik jest podejrzany (SVG ze skryptem, zły kolor), zostaje ostatnia dobra wersja.

Strona projektu powinna wystawić stały plik **`/brand.json`**:

```json
{
  "logo": "/brand/logo-white.svg",
  "sygnet": "/brand/sygnet.svg",
  "bg": "#000000",
  "aurora": ["#1D3E93F2", "#146EF480", "#0A1A3FF2", "#FC8AD31F"],
  "speed": "26s"
}
```

Bez `brand.json` synchronizowany jest tylko sygnet (z favicony SVG strony).

## Wdrożenie: GitHub Pages z własną domeną

1. `npm run build && npm run pdf && npm run og` — zbudowany `index.html`, PDF-y i obraz OG trafiają do repozytorium.
2. Utwórz repozytorium na GitHubie i wypchnij projekt (`node_modules/` i `screenshots/` są w `.gitignore`).
3. **Settings → Pages:** *Deploy from a branch*, gałąź `main`, folder `/ (root)`.
4. **Własna domena:** w tym samym miejscu wpisz domenę (np. `lumer.pl`) — GitHub doda plik `CNAME`. U rejestratora ustaw DNS:
   - domena główna: rekordy `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (opcjonalnie `AAAA` → `2606:50c0:8000::153` … `8003::153`),
   - `www`: rekord `CNAME` → `<twoj-login>.github.io`.
5. Po propagacji DNS zaznacz **Enforce HTTPS**.
6. Wpisz domenę w `shared.siteUrl`, potem `npm run build && npm run pdf` (QR i Open Graph wskażą właściwy adres) i wypchnij zmiany.

Plik `.nojekyll` wyłącza przetwarzanie Jekyllem — GitHub serwuje pliki dokładnie tak, jak są.

## PDF 1080 × 1080 (karuzela)

`npm run deck` (`tools/build-deck.mjs` + `tools/deck.css`) składa 8 kwadratowych slajdów w stylu strony:

1. start - hasło, akapit i spis projektów (klik przenosi do slajdu);
2. dla każdego projektu dwa slajdy: **plansza marki** w ramce, i **szczegóły** - lead, zrzut desktop + telefon, zakres i 4 fakty;
3. kontakt - odwrócony blok jak stopka: mail, www, QR.

Plansze (`tools/covers.mjs` + `covers.css`, wspólne ze stroną - `npm run covers`) są zbudowane z komunikacji wizualnej projektów:
- **teraz** - aurora i logo z teraz.eu, hasło w Open Sans z falką;
- **loom.studio** - oś czerń / papier, logo na osi i trzy figury Bauhausu, wszystko z brand kitu w repozytorium `loomstudio`;
- **reh.ab** - głęboka czerwień, hasło Helvetica Bold i gradient „her” z CSS projektu.

Font Haus (loom) jest na licencji, więc w PDF jest tylko logo w krzywych i zrzuty ekranu.

- Teksty: `pl/en.deck` w `content.js` (fakty o projektach: `deck.projects.<id>.facts`).
- Zrzuty: `shared.projects[].deck` → `assets/deck/` (desktop 1600 × 1000, telefon 480 × 1039, JPG).
- Nowy zrzut: zrób go w 1440 × 900 (2x) i 390 × 844 (3x), bez banera cookies, i podmień plik.

## Sfera: logo i karty

Na stronie głównej (desktop) sfera pokazuje na miejscu kart same logo projektów tuszem (`shared.projects[].sphereLogo`: teraz, loom.studio, „her” reh.ab). Po najechaniu na logo w jego miejscu pojawia się karta projektu (gra jej animacja), klik otwiera panel. W sekcji Portfolio sfera przechodzi w karty jak wcześniej (`.home__sphere.is-cards`, ustawia `main.js` razem z nawigatorem sekcji).

## Panel projektu

Kadr 4:5 (wideo / plansza animowana / grafika interaktywna) i opis: nazwa, hasło, opis, zakres (`meta`), narzędzia (`shared.projects[].tools`), najważniejsze punkty (`deck.projects.<id>.facts`) i link. Ekran poziomy od 560 px: kadr po lewej na całą wysokość panelu, opis obok. Telefon i tablet pionowo: kadr na całą szerokość, opis pod spodem. Formaty 16:9 i 9:16 (`video`, `cover`) zostają w danych, strona ich nie używa.

Plansza teraz (`reel`, 15 s, sam CSS): plakat → „najpierw jesteś słuchaczem” → „potem stajesz się ekspertem” → społeczność → rozmowa 1:1 → plakat. Na karcie sfery wersja lite: znak i dwa kafelki mówiące na zmianę.

## Kalendarz rezerwacji (własny, w stylu strony)

Przycisk „umów rozmowę” otwiera panel `#rozmowa` z kalendarzem: wybór długości (30 / 15 min), siatka 4 tygodni (pn-nd, aktywne tylko dni z wolnymi terminami), godziny w strefie odwiedzającego, formularz (imię, e-mail, notatka) i rezerwacja. Działa na **darmowym API Cal.com** prosto z przeglądarki - bez serwera i **bez klucza API** (wolne terminy i tworzenie rezerwacji są w Cal.com publiczne, API wpuszcza zapytania z każdej strony). Cal.com sam wysyła potwierdzenie z linkiem do spotkania i wpisuje rozmowę do Twojego kalendarza. Kod: `booking.js`, teksty: `pl/en.booking`, ustawienia: `shared.booking`.

Calendly tego nie umożliwia za darmo: rezerwacja przez API (`POST /invitees`) wymaga planu Standard lub wyższego, na darmowym zwraca 403.

Ustawienia: `shared.booking = { calUsername: 'wojciech-lumer-sxkqby', events: [{ slug: '30min', minutes: 30 }, { slug: '15min', minutes: 15 }] }` (adresy `cal.com/<calUsername>/<slug>`, pierwszy typ jest domyślny). Dostępność, przerwy i miejsce spotkania ustawiasz w Cal.com (Availability / Event Types) - strona pokazuje to, co zwraca API. Gdy Cal.com nie odpowie, panel pokazuje mail i link do Calendly (`shared.calendly`).

**Klucz API Cal.com nie trafia na stronę** - wszystko w przeglądarce jest publiczne. Do tego kalendarza nie jest potrzebny; gdyby kiedyś był (np. odwoływanie rezerwacji), trzymaj go tylko jako sekret Workera (`npx wrangler secret put CAL_API_KEY`).

## Asystent AI

Awatar-moneta w hero (tęczowa poświata) otwiera panel `#agent` z czatem (telefon: panel od dołu z przyciemnionym pasem u góry - klik w niego zamyka - i kreską-uchwytem: panel można zsunąć palcem; od 768 px wąska kolumna w prawym dolnym rogu). Teksty: `pl/en.agent` w `content.js`, silnik: `agent.js`, obsługa czatu: `main.js`.

- **Tryb lokalny (teraz):** dopóki `shared.agent.endpoint` jest placeholderem, asystent odpowiada gotowymi zdaniami z `content.js` (projekty, kontakt, narzędzia, doświadczenie, marka, PDF). Pytania nie opuszczają strony.
- **Tryb AI:** odpowiada Claude, wyłącznie na podstawie treści portfolio (`knowledge()` w `agent.js` - wszystko z `content.js` bez [placeholderów]). Klucz API nie może być w przeglądarce, dlatego pośredniczy darmowy Cloudflare Worker (`agent/worker.js`): sprawdza adres strony (CORS), limituje 10 pytań na minutę z IP i przycina rozmowę. Gdy AI nie odpowiada, czat wraca do trybu lokalnego.

Włączenie trybu AI (raz, ok. 10 min):

1. Klucz API: [console.anthropic.com](https://console.anthropic.com) → API Keys. Ustaw tam też miesięczny limit wydatków.
2. Konto Cloudflare (darmowe), potem w folderze projektu:
   ```bash
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY -c agent/wrangler.toml
   npx wrangler deploy -c agent/wrangler.toml
   ```
3. Adres z wyniku (`https://portfolio-agent.<konto>.workers.dev`) wpisz w `shared.agent.endpoint`, potem `npm run build` i wypchnij zmiany.
4. Po każdej zmianie `content.js` wdroż Workera ponownie (`npx wrangler deploy -c agent/wrangler.toml`) - wiedza jest w nim wbudowana.

Model ustawia `MODEL` w `agent/wrangler.toml` (domyślnie `claude-opus-5-5`; taniej: `claude-sonnet-5-5`, `claude-haiku-5-5`). Własna domena: dopisz ją w `ALLOWED_ORIGINS`.

## Przewijanie na desktopie

Każda sekcja (start, Portfolio, Jak pracuję, Rekomendacje, Kontakt) zajmuje jeden ekran, a jej treść stoi na wysokości środka sfery; przewijanie zatrzymuje się na każdej sekcji (`scroll-snap-type: y mandatory`, tylko od 1024 px i 640 px wysokości). Systemowy pasek przewijania strony jest tam ukryty - zastępuje go nawigator sekcji po prawej (`.scrollnav`): linia 1 px wypełniająca się tuszem, same kółka jak znak (nazwy sekcji tylko dla czytników ekranu), aktywne wypełnione; klik przewija. Pozostałe paski (panele, czat) są cienkie i w kolorze linii. Na telefonie zwykłe przewijanie.

## Wyszukiwarki

`npm run build` dopisuje do `<head>` dane strukturalne schema.org `Person` (imię, rola, opis, mail, adres strony, `sameAs` tylko z prawdziwych linków profili) i tworzy `sitemap.xml` + `robots.txt` z `shared.siteUrl`. Na adresie `lumerw.github.io/portfolio` roboty czytają `robots.txt` tylko z głównej domeny, więc mapę strony zgłoś ręcznie w Google Search Console; po podpięciu własnej domeny zadziała sama.

## Testy na GitHubie

`.github/workflows/checks.yml` uruchamia się przy każdym pushu na `main` i przy pull requeście (runner macOS - ma Helveticę, więc układ jest jak na Macu):

1. `npm run build` i sprawdzenie, czy `index.html`, `sitemap.xml` i `robots.txt` w repozytorium są aktualne - jeśli nie, uruchom lokalnie `npm run build` i wypchnij zmiany;
2. `tools/reel-check.mjs` - te same testy co `npm run check-reel`. Przy błędzie zrzuty ekranu są do pobrania w zakładce Actions (artefakt `reel-qa`).

Wynik widać w zakładce **Actions** repozytorium; GitHub wyśle maila, gdy coś nie przejdzie.

## Gdzie co jest

| Plik | Zawartość |
|---|---|
| `content.js` | cała treść: `shared`, `pl`, `en` |
| `render.js` | szablony HTML — wspólne dla przeglądarki i buildu |
| `styles.css` | tokeny na górze, potem reset, siatka, typografia, komponenty, ruch |
| `print.css` | wydruk strony z przeglądarki (A4 poziomo); PDF do pobrania ma własny szablon `tools/pdf.css` |
| `main.js` | PL/EN, indeks ↔ sfera, panele, ikony brandbooka, wideo, kopiowanie maila, czat asystenta, wstawianie grafik interaktywnych |
| `sphere.js` | ruch sfery: przeciąganie, bezwładność, samoczynny obrót, obrót do karty |
| `live.js` | grafiki interaktywne loom.studio i reh.ab (znaczniki + gradient WebGL i fizyka figur) |
| `agent.js` | silnik asystenta AI: odpowiedzi lokalne, wiedza i instrukcja dla modelu, zapytanie do Workera |
| `agent/` | Cloudflare Worker (pośrednik do Claude API) i jego konfiguracja |
| `symbols.js` | geometria symboli — jedno źródło dla strony i plików SVG |
| `tools/` | serwer, build, PDF (16:9 / 9:16, jasny / ciemny i 1080 × 1080), QR, OG, obrazy, assety, audyt, zrzuty |
| `assets/deck/` | zrzuty stron projektów i assety marek do PDF 1080 × 1080 |

## Decyzje odbiegające od briefu

- **Kontrast `--ink-3`.** `#A8A8A3` z briefu ma 2.28:1 na papierze, a kryterium „Accessibility = 100” wymaga 4.5:1 także dla 12 px. Metadane używają `--ink-3: #73736E` (4.56:1); wartość z briefu została jako `--ink-4`, tylko dla elementów nietekstowych.
- **Układ jednego ekranu z panelami, karuzela firm i szybkie ikony** — decyzja właściciela (11.10.2026); brief mówił o długim przewijaniu, bez karuzel i z wolnym ruchem. Przy `prefers-reduced-motion` ikony i karuzela stoją.
- **Symbole bez `vector-effect: non-scaling-stroke`.** W Chrome ta właściwość psuje `pathLength` (symbol > 48 px rysował się w części). Grubość 1 px trzyma `stroke-width` liczony z `--size`.
- **Animowane linie symboli** mają klasę `.stroke`, a CSS nie wybiera ich przez `[pathLength]` — Chrome nie przeliczał stylu po takim selektorze i animacja nie ruszała.
- **Portret w duotonie** robi `npm run images` (sharp), nie filtr CSS — wygląda tak samo na stronie i w PDF.
- **Grafiki interaktywne loom.studio i reh.ab zamiast wideo** (decyzja właściciela, 13.10.2026). Przeniesione z kodu projektów: shader `flow-gl.ts` i fizyka `hero-physics.ts` z loom.studio, hero reh.ab z `css/style.css` i `js/main.js` (pisanie, taśma i cytaty w czystym CSS). Bez logo i napisów w loom. Żeby strona startowała lekko (DOM ≤ 1000, Lighthouse), grafika jest wstawiana dopiero w otwartym panelu nad statyczną planszą (`cover`), która jest jej pierwszą klatką - bez JS i przy ograniczonym ruchu zostaje plansza. W panelu przycisk pauzy (WCAG 2.2.2). Tekst reh.ab po angielsku w obu wersjach (to tekst marki), długie myślniki zamienione na „-”.
- **„O mnie” → LinkedIn** (decyzja właściciela, 13.10.2026): panel „o mnie” wyłączony na stronie i w PDF A4 (5 stron: okładka, 3 projekty, kontakt; szablon `about()` zostaje w `render.js`), w indeksie wiersz z ikoną LinkedIn. Nad hasłem samo imię, bez roli.
- **CV poza repozytorium:** `npm run cv` zapisuje do `private/` (w `.gitignore`) - CV jest do wysyłania, nie do publikacji.
- **Tęczowa poświata asystenta AI** (decyzja właściciela, 13.10.2026) - jedyny kolor marki osobistej, zapisany jako wyjątek w brandbooku. Gradient obraca się przez `transform` (bez przemalowywania), przy ograniczonym ruchu stoi. Od 14.10.2026 poświata jest na awatarze w hero (przycisk „zapytaj AI” usunięty).
- **Marka czarno-biała:** bez koloru akcentu (zamiast czerwonej/niebieskiej kropki z briefu). Kropka w znaku osobistym ma kolor tuszu; aktywny wiersz indeksu oznacza tylko podkreślenie. Kolory mają wyłącznie marki projektów (np. teraz).
- **PDF do pobrania** (decyzja właściciela, 15.10.2026): telefon albo ekran pionowy z dotykiem dostaje 9:16 (1080 × 1920), reszta 16:9 (1920 × 1080); motyw strony wybiera tło (jasne / czarne) - `pdfVariant()` w `main.js` podmienia adres przy kliknięciu, bez JS zostaje 16:9 jasny. Strony: okładka (awatar z tęczową poświatą, hasło, „kontakt” → mail, „umów rozmowę” → Cal.com, zarys sfery w rogu), 3 projekty (kadr 4:5 + opis jak panel projektu), kontakt (sfera przycięta krawędzią).
- **Wydruk strony (print.css):** strona drukowana ma margines 0, a 14 mm to wewnętrzny odstęp (inaczej Chrome zostawia białe marginesy zamiast papieru). Kolejność stron ustawia `order` w `print.css`.
- **Format panelu: 4:5 wszędzie** (decyzja właściciela, 15.10.2026): ten sam kadr co karta na sferze, obok opis projektu. Wcześniejsze 16:9 / 9:16 zostają tylko w danych (`video`, `cover`).
- **Plansza teraz: Open Sans - krój marki teraz** (decyzja właściciela). Open Sans 3.003 (to samo wydanie co na teraz.eu), okrojony do znaków PL/EN (3 × ~11 KB: 400, 600, 700, `assets/fonts/`), hostowany lokalnie, licencja SIL OFL 1.1 w `assets/fonts/OFL.txt`. Wagi i odstępy jak w teraz: 700 + `tracking-tight` (-.025em) dla hasła i nagłówków, 600 + odstęp 0 dla pigułek, chipów, legendy i podpisów, 400 dla opisów. `font-display: block` + preload 700 i 600 na desktopie (`renderMeta` w `render.js`) - plansza nigdy nie pokazuje zastępczej Helvetiki. Na telefonie zamknięty panel ma `content-visibility: hidden`, więc fonty pobierają się dopiero przy otwarciu `#teraz`. Po zmianie zestawu znaków: `python3 tools/subset-fonts.py <OpenSans-Regular> <OpenSans-Bold> <OpenSans-SemiBold>` (wymaga `pip install fonttools brotli`). Reszta portfolio zostaje w Helvetice.
- **EN: „listener”** (decyzja właściciela; teraz.eu używa „learner”). Zmiana terminu = 4 klucze w `en.projects.teraz.reel` (`listener`, `listeners`, `callTitle`, `label`) + `en.projects.teraz.lead`. PL lead: najpierw słuchacze, potem eksperci („łącząca słuchaczy z ekspertami”; brief miał odwrotnie) - ta sama kolejność w `reel.label`. EN: „Escrow” wielką literą, jak w teraz („payment via Escrow”).
- **Falka pod „tu i teraz” to wycieranie przesunięciem** (opakowanie z `overflow: hidden` jedzie w jedną stronę, SVG w drugą), nie `stroke-dashoffset` - animowana jest tylko kompozycja (`translate`), bez przeliczania rysunku w każdej klatce.
- **Marka portfolio zostaje czarno-biała także przy planszy teraz:** kolory różowy / niebieski są tylko wewnątrz planszy, bez kolorowych kropek w indeksie.
- **Plansza teraz: krycie pól kolorów zmienia się w rytmie pętli 15 s** - sam ruch pól (dryf 17-31 s) i aurora (26 s) są wolne, a zmiana krycia oznacza scenę (słuchacz / ekspert / społeczność / rozmowa). Kontrast tekstu zostaje powyżej 4.5:1.
- **Plansza teraz bez JS gra trzy pętle (24 s) i staje na plakacie** (WCAG 2.2.2 - bez JS nie ma przycisku pauzy). Ponowne otwarcie `#teraz` bez JS pokazuje stały plakat.
- **Przełącznik pauzy na telefonie pionowo ma 32 × 32 px** (desktop i tablet 40 × 40) i stoi 6 px od rogu, żeby nie zasłaniał kafelka słuchacza w ramce 272-382 px. Nadal powyżej 24 px (WCAG 2.5.8).
- **Znak teraz bez zmiennej falki:** jedna stała falka zamiast nowego kształtu przy każdym powtórzeniu (decyzja domyślna ze specyfikacji; `falka-generator.js` można podpiąć później).
- **CSS i JS nie są minifikowane** (brief: bez bundlera). Lighthouse to sugeruje, ale wynik i tak jest 99–100.
