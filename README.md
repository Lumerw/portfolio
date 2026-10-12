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
| `npm run audit` | Lighthouse (telefon + desktop) i lista kontrolna z briefu (sekcja 10), w tym zero zewnętrznych żądań z otwartym `#loom` i `#teraz`. Testy akceptacyjne planszy teraz: `npm run check-reel` |
| `npm run check-reel` | testy akceptacyjne planszy animowanej teraz (ok. 2 min, port 8601): klatki PL/EN w 13 kadrach, szew i matematyka pętli, formaty paneli, bramka, auto-przewijanie 8 s, PL/EN, przełącznik pauzy, ograniczony ruch, błyski, budżet DOM, sieć, bez JS, tryb ciemny; zrzuty błędów w `/private/tmp/claude-501/reel-qa/check/`. Wybrane grupy: `-- --only=visual,gate --lang=pl` |
| `npm run shots -- index.html` | zrzuty 375 / 768 / 1440 px do `screenshots/` |

`specimen.html` to strona robocza z tokenami, siatką i symbolami (klawisz G = siatka). Nie jest częścią portfolio (`noindex`).

## Układ

- **Strona główna = jeden ekran:** przełącznik trybu ciemnego (lewy górny róg) i PL/EN; znak + trzy zmieniające się ikony, imię z rolą, hasło, akapit, indeks projektów, karuzela firm „Pracowałem z”; na desktopie podgląd z logo projektu po prawej; na dole stopka z kontaktem (na telefonie jako odwrócony blok: czarny w trybie jasnym, jasny w ciemnym).
- **Tryb ciemny:** domyślnie wg systemu, wybór zapamiętany. Grafiki z klasą `mono` (SVG: ikony, sygnety, logo, logo firm, placeholdery) są w nim odwracane — jeśli wgrasz kolorowe logo, zamień je na PNG/JPG albo usuń `mono` w `render.js`. PDF zawsze jasny.
- **Panele wysuwane od dołu:** kliknięcie projektu otwiera `#teraz` / `#loom` / `#rehab` z wideo w pętli (albo planszą animowaną); „o mnie” otwiera `#o-mnie`. Ramka ma zawsze pełny kadr, bez przycinania: 16:9 na desktopie, telefonie i każdym ekranie poziomym, 4:5 na tablecie pionowo. Na telefonie pionowo panel „tuli się” do treści od dołu (ramka na całą szerokość + podpis z nazwą i opisem); na niskim ekranie poziomym (≤ 500 px wysokości) pasek panelu jest cieńszy, a odstęp od góry mniejszy. Działają przez CSS `:target`, więc także bez JS, a każdy projekt ma własny link (np. `…/#loom`). Przycisk „wstecz” zamyka panel. `main.js` dokłada focus w panelu, Esc, nieaktywne tło (`inert`), powrót focusu i sterowanie wideo.
- **Auto-przewijanie (desktop):** kreska pod aktywnym projektem wypełnia się przez 3 s (`--t-auto` w `styles.css`, `AUTO_MS` w `main.js`), potem podgląd przechodzi do następnego projektu. Projekt z planszą animowaną (`reel`) trwa jedną pełną pętlę - 8 s (`REEL_MS` w `render.js` → `data-dwell` wiersza), a kreska jest zsynchronizowana z pętlą także po wznowieniu (zjechanie kursorem, powrót karty). Pauza po najechaniu kursorem na listę lub podgląd, przy otwartym panelu i przy ograniczonym ruchu w systemie. W czasie pauzy (i bez auto-przewijania, np. na ekranie dotykowym) plansza w podglądzie kończy bieżącą pętlę i staje na plakacie (`.is-held`, WCAG 2.2.2); rusza znów przy zmianie projektu albo wznowieniu.
- **Plansza animowana teraz („Dwie role, jedna rozmowa”):** 8 s w pętli, sam CSS (sekcja „Reel” w `styles.css`, szablon `reel()` w `render.js`). Plakat (znak + „porozmawiajmy tu i teraz” z falką) → słuchacz (róż, „?”, trzy potrzeby) → ekspert (błękit, „!”) → rozmowa wideo 1:1 → plakat; ostatnia klatka = pierwsza. Gra tylko aktywny podgląd albo otwarty panel; w panelu jest przycisk pauzy. Na telefonie (ramka 16:9 węższa niż 480 px) wersja kompaktowa: jeden blok roli naraz, bez logo w nagłówku. Przy ograniczonym ruchu - stała klatka (oba kafelki, tytuł rozmowy, hasło). Kolory i logo z `projects[].brand` / `.logo`, więc synchronizacja marki działa także tu; w trybie ciemnym plansza wygląda tak samo.
- **Brandbook:** klik w znak z ikonami otwiera panel `#brandbook` — na razie pusty, treść dodasz w `render.js` (funkcja `brandbook`). Nie trafia do PDF.
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
| `projects[].video['16x9']`, `['4x5']` | wideo w panelu, zawsze w całości (patrz tabela formatów niżej): `src` mp4 bez dźwięku, `poster` kadr. Kolejność: prawdziwe wideo (`src`) > `reel` > plansza marki (`brand`) > poster |
| `projects[].reel` | `true` = plansza animowana zamiast postera, w panelu i w podglądzie na stronie głównej (teraz). Teksty w `pl/en.projects.<id>.reel` (te same klucze w obu językach; limity znaków i brak długich myślników sprawdza `npm run build`), etykieta pauzy w `ui.reelPause` |
| `projects[].images` | `main` 16:10, `a`, `b` 4:5 — tylko w PDF |
| `pl/en.projects.*` | zakres prac, opis, problem / rozwiązanie / efekt (PDF; limit 120 słów sprawdza build) |
| `pl/en.about` | panel „o mnie” i strona 2 PDF |

### Obrazy

1. Wrzuć plik do `assets/<projekt>/` (np. `assets/teraz/01.jpg`), portret do `assets/me/portrait.jpg`.
2. W `content.js` zmień `src` na nową ścieżkę i ustaw `w`, `h` na wymiary oryginału.
3. `npm run images` — warianty do `srcset` (portret od razu w duotonie tusz + papier).
4. `npm run build`.

### Wideo

| Format | Gdzie | Plik |
|---|---|---|
| `'16x9'` (1920 × 1080) | telefon, desktop, każdy ekran poziomy | `promo-16x9.mp4` |
| `'4x5'` (1080 × 1350) | min. 768 px szerokości + orientacja pionowa (tablet) = proporcja podglądu na stronie głównej | `promo-4x5.mp4` |

Wrzuć `assets/<projekt>/promo-16x9.mp4` i `promo-4x5.mp4` (H.264, bez ścieżki dźwiękowej, krótka pętla, najlepiej < 4 MB) i wpisz je w `video['16x9'].src` / `video['4x5'].src`. Kadr nigdy nie jest przycinany - ramka ma dokładnie proporcję pliku. Prawdziwe wideo zastępuje planszę animowaną (`reel`) w tym formacie. Jako `poster` daj pierwszy kadr (`.jpg`); bez niego `npm run assets` generuje placeholdery `video-16x9.svg` i `video-4x5.svg`. Przykład kompresji i wycięcia 4:5 ze środka kadru 16:9:

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
- **Formaty panelu: tylko 16:9 i 4:5.** Dawne 9:16 (wypełnianie ekranu z przycinaniem) zastąpiła ramka zawsze w całości. Tablet pionowo dostaje 4:5, nie kwadrat - ta sama proporcja co podgląd na stronie głównej, więc wystarczą dwa pliki. O formacie decyduje orientacja (min. 768 px + pionowo), nie sama szerokość: tablet obrócony poziomo dostaje 16:9 jak desktop. Warunek jest w `styles.css` i w `main.js` (matchMedia) - trzymaj je w zgodzie.
- **Plansza teraz: Open Sans - krój marki teraz** (decyzja właściciela). Open Sans 3.003 (to samo wydanie co na teraz.eu), okrojony do znaków PL/EN (3 × ~11 KB: 400, 600, 700, `assets/fonts/`), hostowany lokalnie, licencja SIL OFL 1.1 w `assets/fonts/OFL.txt`. Wagi i odstępy jak w teraz: 700 + `tracking-tight` (-.025em) dla hasła i nagłówków, 600 + odstęp 0 dla pigułek, chipów, legendy i podpisów, 400 dla opisów. `font-display: block` + preload 700 i 600 na desktopie (`renderMeta` w `render.js`) - plansza nigdy nie pokazuje zastępczej Helvetiki. Na telefonie zamknięty panel ma `content-visibility: hidden`, więc fonty pobierają się dopiero przy otwarciu `#teraz`. Po zmianie zestawu znaków: `python3 tools/subset-fonts.py <OpenSans-Regular> <OpenSans-Bold> <OpenSans-SemiBold>` (wymaga `pip install fonttools brotli`). Reszta portfolio zostaje w Helvetice.
- **EN: „listener”** (decyzja właściciela; teraz.eu używa „learner”). Zmiana terminu = 4 klucze w `en.projects.teraz.reel` (`listener`, `listeners`, `callTitle`, `label`) + `en.projects.teraz.lead`. PL lead: najpierw słuchacze, potem eksperci („łącząca słuchaczy z ekspertami”; brief miał odwrotnie) - ta sama kolejność w `reel.label`. EN: „Escrow” wielką literą, jak w teraz („payment via Escrow”).
- **Niskie ekrany desktopowe** (`max-height: 840px` / `780px` w `styles.css`): niższe wiersze indeksu i ciaśniejszy hero, żeby strona mieściła się na jednym ekranie (1024×768, 1280×800, 1366×768). Podgląd idzie za wysokością lewej kolumny, więc jest mniejszy: 455×569 przy 1280×800, 423×529 przy 1024×768 i 1366×768 (`tools/reel-check.mjs`, FRAMES). Przy 780 px odstęp w podpisie podglądu jest mniejszy (`--s-1`), żeby polskie podpisy mieściły się bez wielokropka.
- **Falka pod „tu i teraz” to wycieranie przesunięciem** (opakowanie z `overflow: hidden` jedzie w jedną stronę, SVG w drugą), nie `stroke-dashoffset` - animowana jest tylko kompozycja (`translate`), bez przeliczania rysunku w każdej klatce.
- **Marka portfolio zostaje czarno-biała także przy planszy teraz:** kolory różowy / niebieski są tylko wewnątrz planszy, bez kolorowych kropek w indeksie.
- **Plansza teraz: krycie pól kolorów zmienia się w rytmie pętli 8 s** - świadomy wyjątek od zasady marki „ruch wolny (co najmniej 14 s na cykl)”: sam ruch pól (dryf 17-31 s) i aurora (26 s) są wolne, a 8-sekundowa zmiana krycia oznacza scenę (słuchacz / ekspert / rozmowa). Kontrast tekstu zostaje powyżej 4.5:1.
- **Plansza teraz bez JS gra trzy pętle (24 s) i staje na plakacie** (WCAG 2.2.2 - bez JS nie ma przycisku pauzy). Ponowne otwarcie `#teraz` bez JS pokazuje stały plakat.
- **Przełącznik pauzy na telefonie pionowo ma 32 × 32 px** (desktop i tablet 40 × 40) i stoi 6 px od rogu, żeby nie zasłaniał kafelka słuchacza w ramce 272-382 px. Nadal powyżej 24 px (WCAG 2.5.8).
- **Znak teraz bez zmiennej falki:** jedna stała falka zamiast nowego kształtu przy każdym powtórzeniu (decyzja domyślna ze specyfikacji; `falka-generator.js` można podpiąć później).
- **CSS i JS nie są minifikowane** (brief: bez bundlera). Lighthouse to sugeruje, ale wynik i tak jest 99–100.
