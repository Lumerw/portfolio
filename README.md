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
| `npm run pdf` | `portfolio-lumer-pl.pdf` i `-en.pdf` + QR; sprawdza 6 stron i rozmiar < 8 MB |
| `npm run og` | `assets/og.jpg` 1200×630 (obraz do linków w mailu / na LinkedInie) |
| `npm run assets` | symbole, favicony i wektorowe placeholdery |
| `npm run audit` | Lighthouse (telefon + desktop) i lista kontrolna z briefu (sekcja 10) |
| `npm run shots -- index.html` | zrzuty 375 / 768 / 1440 px do `screenshots/` |

`specimen.html` to strona robocza z tokenami, siatką i symbolami (klawisz G = siatka). Nie jest częścią portfolio (`noindex`).

## Układ

- **Strona główna = jeden ekran:** przełącznik trybu ciemnego (lewy górny róg) i PL/EN; znak + trzy zmieniające się ikony, imię z rolą, hasło, akapit, indeks projektów, karuzela firm „Pracowałem z”; na desktopie podgląd z logo projektu po prawej; na dole stopka z kontaktem (na telefonie jako odwrócony blok: czarny w trybie jasnym, jasny w ciemnym).
- **Tryb ciemny:** domyślnie wg systemu, wybór zapamiętany. Grafiki z klasą `mono` (SVG: ikony, sygnety, logo, logo firm, placeholdery) są w nim odwracane — jeśli wgrasz kolorowe logo, zamień je na PNG/JPG albo usuń `mono` w `render.js`. PDF zawsze jasny.
- **Panele wysuwane od dołu:** kliknięcie projektu otwiera `#teraz` / `#loom` / `#rehab` z wideo w pętli; „o mnie” otwiera `#o-mnie`. Działają przez CSS `:target`, więc także bez JS, a każdy projekt ma własny link (np. `…/#loom`). Przycisk „wstecz” zamyka panel. `main.js` dokłada focus w panelu, Esc, nieaktywne tło (`inert`), powrót focusu i sterowanie wideo.
- **PDF** ma pełne case study (tekst + obrazy) — na stronie te treści są ukryte (`.print-only`).

## Jak podmienić treść

Wszystko jest w **`content.js`** — layout nie zawiera tekstu. `[nawiasy]` = miejsca do uzupełnienia; linki z nawiasami nie są klikalne, dopóki nie wpiszesz prawdziwego adresu.

| Pole | Gdzie się pokazuje |
|---|---|
| `shared.name` + `pl/en.hero.role` | podpis nad hasłem („Wojciech Lumer — projektant”) |
| `pl/en.hero.title`, `.line` | hasło (h1: „Design is how it works.” / „Design to to, jak coś działa.”) i akapit pod nim; też okładka PDF i `og.jpg` |
| `shared.calendly` | przycisk „kontakt” — **wpisz swój link Calendly** |
| `shared.email`, `shared.links` | stopka, przycisk „kontakt”, ikonka LinkedIn przy „o mnie” |
| `shared.siteUrl` | QR w PDF, adresy Open Graph i `canonical` — **wpisz po ustaleniu domeny** |
| `shared.icons` | trzy miejsca obok znaku (zmiana co 450 ms — `ICON_MS` w `main.js`) |
| `shared.clients` | karuzela firm: `name` (tekst alternatywny), `logo` (najlepiej SVG, jeden kolor) |
| `projects[].logo`, `.sygnet` | logo na środku podglądu; sygnet / favicon przy zakresie prac i w panelu. `mono: false` = kolorowy asset marki (bez odwracania w trybie ciemnym) |
| `projects[].brand` | opcjonalnie: plansza w stylu marki — `bg` (tło), `aurora` (4 kolory rozmytych gradientów), `speed` (czas animacji). Używana w podglądzie i w panelu, dopóki nie ma wideo. Przykład: teraz (assety z teraz.eu) |
| `projects[].video.vertical`, `.wide` | wideo 9:16 (ekran pionowy — wypełnia cały wolny ekran, brzegi mogą się lekko przyciąć) i 16:9 (poziomy): `src` mp4 bez dźwięku, `poster` kadr |
| `projects[].images` | `main` 16:10, `a`, `b` 4:5 — tylko w PDF |
| `pl/en.projects.*` | zakres prac, opis, problem / rozwiązanie / efekt (PDF; limit 120 słów sprawdza build) |
| `pl/en.about` | panel „o mnie” i strona 2 PDF |

### Obrazy

1. Wrzuć plik do `assets/<projekt>/` (np. `assets/teraz/01.jpg`), portret do `assets/me/portrait.jpg`.
2. W `content.js` zmień `src` na nową ścieżkę i ustaw `w`, `h` na wymiary oryginału.
3. `npm run images` — warianty do `srcset` (portret od razu w duotonie tusz + papier).
4. `npm run build`.

### Wideo

Wrzuć `assets/<projekt>/promo-9x16.mp4` i `promo-16x9.mp4` (H.264, bez ścieżki dźwiękowej, krótka pętla, najlepiej < 4 MB) i wpisz je w `video.vertical.src` / `video.wide.src`. Na telefonie kadr dopasowuje się do ekranu (cover), więc ważne treści trzymaj w środkowych ~80% kadru. Jako `poster` daj pierwszy kadr (`.jpg`). Przykład kompresji:

```bash
ffmpeg -i wejscie.mov -an -vf scale=1920:-2 -c:v libx264 -crf 26 -preset slow -movflags +faststart promo-16x9.mp4
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

## Gdzie co jest

| Plik | Zawartość |
|---|---|
| `content.js` | cała treść: `shared`, `pl`, `en` |
| `render.js` | szablony HTML — wspólne dla przeglądarki i buildu |
| `styles.css` | tokeny na górze, potem reset, siatka, typografia, komponenty, ruch |
| `print.css` | PDF: A4 poziomo, 6 stron |
| `main.js` | PL/EN, indeks ↔ podgląd, panele, ikony, wideo, kopiowanie maila |
| `symbols.js` | geometria symboli — jedno źródło dla strony i plików SVG |
| `tools/` | serwer, build, PDF, QR, OG, obrazy, assety, audyt, zrzuty |

## Decyzje odbiegające od briefu

- **Kontrast `--ink-3`.** `#A8A8A3` z briefu ma 2.28:1 na papierze, a kryterium „Accessibility = 100” wymaga 4.5:1 także dla 12 px. Metadane używają `--ink-3: #73736E` (4.56:1); wartość z briefu została jako `--ink-4`, tylko dla elementów nietekstowych.
- **Układ jednego ekranu z panelami, karuzela firm i szybkie ikony** — decyzja właściciela (11.10.2026); brief mówił o długim przewijaniu, bez karuzel i z wolnym ruchem. Przy `prefers-reduced-motion` ikony i karuzela stoją.
- **Symbole bez `vector-effect: non-scaling-stroke`.** W Chrome ta właściwość psuje `pathLength` (symbol > 48 px rysował się w części). Grubość 1 px trzyma `stroke-width` liczony z `--size`.
- **Animowane linie symboli** mają klasę `.stroke`, a CSS nie wybiera ich przez `[pathLength]` — Chrome nie przeliczał stylu po takim selektorze i animacja nie ruszała.
- **Portret w duotonie** robi `npm run images` (sharp), nie filtr CSS — wygląda tak samo na stronie i w PDF.
- **Marka czarno-biała:** bez koloru akcentu (zamiast czerwonej/niebieskiej kropki z briefu). Kropka w znaku osobistym ma kolor tuszu; aktywny wiersz indeksu oznacza tylko podkreślenie. Kolory mają wyłącznie marki projektów (np. teraz).
- **PDF:** strona drukowana ma margines 0, a 14 mm to wewnętrzny odstęp (inaczej Chrome zostawia białe marginesy zamiast papieru). Kolejność stron ustawia `order` w `print.css`.
- **CSS i JS nie są minifikowane** (brief: bez bundlera). Lighthouse to sugeruje, ale wynik i tak jest 99–100.
