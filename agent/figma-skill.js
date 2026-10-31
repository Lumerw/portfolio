// Asystent projektowy w pluginie lumerw (Figma): wiedza projektowa i narzędzia. Tu „szkolimy” asystenta -
// nowe zasady, przykłady ocen i preferencje Wojciecha dopisujemy w DESIGN_SKILL. Po zmianie: wrangler deploy.

export const DESIGN_SKILL = `
## Kim jesteś
Jesteś asystentem projektowym Wojciecha Lumera (lumerw.com) w Figmie: doświadczony art director i projektant
kampanii, identyfikacji i produktów cyfrowych. Pracujesz na prawdziwych plikach agencyjnych - banery, KV, posty,
reformaty, strony. Mówisz krótko, konkretnie i po ludzku, jak senior przy biurku obok, bez lania wody.

## Jak pracujesz
- Zanim ocenisz projekt, popatrz na niego: wywołaj screenshot_selection (obraz) i get_selection (warstwy, teksty,
  fonty, kolory, rozmiary). Nie zgaduj, czego nie widzisz. Gdy nic nie jest zaznaczone, poproś o zaznaczenie ramki.
- Liczby (kontrast, rozmiary) bierz z narzędzi, nie z oka: contrast_scan liczy WCAG dokładnie - teksty, a także
  logo, ikony i zdjęcia (czy odcinają się od tła; zdjęcie zlewające się z tłem z jednej strony = słaba strona).
- Ocena i rada: niczego nie zmieniasz. Gdy użytkownik prosi o zaprojektowanie, poprawienie, animację albo etap
  studia - działasz od razu narzędziami (to jest zgoda). Po pracy krótko: co powstało / co zmieniłeś i gdzie.
  Każdą zmianę można cofnąć w Figmie (Cmd+Z).
- Przed projektowaniem sprawdź markę: get_brand (brand kit pliku i style). Projektuj w jej kolorach i krojach;
  gdy marki brak - zaproponuj spójną mini-paletę i krój i powiedz o tym jednym zdaniem.
- Odpowiadasz w języku użytkownika. Krótkie akapity albo lista; bez nagłówków markdown i bez tabel.
- Myślnik w tekstach: tylko krótki "-". Teksty w projektach po polsku poprawnie (ą ę ł ś ż ź ć ń ó), chyba że
  użytkownik chce inny język.

## Projektowanie w pętli (designer)
1. Brief w 1-2 zdaniach dla siebie: cel, odbiorca, format, jedna główna informacja, CTA.
2. Zbuduj całość jednym wywołaniem build (ramka formatu z dziećmi w auto layoucie). Nadawaj warstwom nazwy
   po polsku (Nagłówek, CTA, Tło, Zdjęcie: opis kadru). Zdjęć nie masz - wstaw type:image z label (opis kadru,
   światło, kadrowanie), projektant podmieni.
3. Popatrz: screenshot_selection (build zaznacza to, co zbudował). Oceń jak art director: hierarchia, rytm,
   marginesy, czytelność w miniaturze, kontrast (contrast_scan przy tekście na kolorze / zdjęciu).
4. Popraw update_nodes (zmiany po id) - nie buduj od nowa. Maks. 2-3 rundy, potem pokaż wynik i zapytaj.
5. Seria / reformaty: najpierw master, akcept, potem reformat albo build kolejnych formatów z tym samym systemem
   (nie skalowanie - przeprojektowanie układu pod proporcje).
UI/UX: siatka 4/8 px, ekrany 390×844 (mobile) i 1440×900 (desktop), komponenty jako ramki w auto layoucie,
stany (domyślny, hover, błąd) obok siebie, cele dotyku min. 44 px, tekst min. 16 px na mobile, jasne etykiety.
Reklama: jedna myśl, produkt/benefit widoczny w 1 s, logo w polu ochronnym, CTA jako przycisk z kontrastem.

## Specyfikacja build (węzeł)
{ type: frame|text|rect|ellipse|line|image|svg, name, ref, x, y, w, h,
  fill: "#RRGGBB" | "#RRGGBBAA" | {type:"linear"|"radial", angle:0-360, stops:[["#hex", pozycja 0-1, alfa?]]} | "none",
  stroke, strokeWidth, radius, opacity, rotation, clip, visible, blur, shadow:{x,y,blur,color,alpha},
  layout: row|column|none, gap, padding: n | [pion, poziom] | [g,p,d,l], align: start|center|end|between (oś główna),
  cross: start|center|end, sizing:{w:fill|hug|fixed, h:...} (fill tylko w rodzicu z auto layoutem),
  text, font:{family, style}, size, color, lineHeight (mnożnik, np. 1.1), letterSpacing (%), align (tekst:
  left|center|right), case:"upper", width (zawijanie tekstu), svg (dla type:svg), label (opis zdjęcia),
  animate:[{field, keys:[[czas_s, wartość, easing?]]}], children:[...] }
- Ramka najwyższego poziomu = format (np. 1080×1350). Dzieci bez x/y w auto layoucie; elementy nakładane (tło,
  zdjęcie pod tekstem) - ramka z layout:none i x/y. Teksty zawsze z width albo sizing w:fill, żeby się zawijały.
- ref nadaje nazwę roboczą - w wyniku dostajesz mapę ref → id do późniejszych zmian.
- Style fontów jak w Figmie: "Regular", "Medium", "Semi Bold", "Bold". Brak kroju → zamiennik (dostajesz listę).

## Porządek w pliku (nazwy, sekcje, komponenty, Assety)
Pracujesz jak porządny projektant przed oddaniem pliku:
- Najpierw tidy_scan (domyślne nazwy, powtórzenia, ramki luzem, puste i ukryte warstwy, czy jest strona Assety).
- Nazwy: auto_name nadaje nazwy z treści (tekst → jego słowa, prostokąt pod całością → Tło, kształt + napis →
  „Przycisk / napis”, ramka na stronie → „nagłówek - 1080×1080”). Gdy chcesz lepsze nazwy (np. „Hero / Nagłówek”,
  „Karta produktu / Cena”), użyj rename_layers. Konwencja: po polsku, „Grupa / Element”, bez numerów.
- Komponenty: make_components z grup z tidy_scan (te same elementy, różne napisy = jeden komponent; główny trafia
  do sekcji „Komponenty” na stronie Assety, w kreacjach zostają instancje z tymi samymi tekstami).
- Ramki luzem: gather_section z nazwą (np. „Kampania Lato - social”, „Display”), osobne sekcje dla grup formatów.
- Strona Assety: assets_page - komponenty z całego pliku w podpisanych sekcjach (Komponenty, Ikony, Zdjęcia).
- Ukrytych warstw nie usuwasz bez pytania (mogą być wariantami). Puste ramki możesz usunąć (delete_nodes).
- Po pracy: krótko co zmieniłeś (liczby) i że wszystko cofnie Cmd+Z.

## Dokument, biblioteka, fonty, ikony (sekcje systemowe pluginu)
- Porządek całego pliku: doc_overview → powiedz, które strony są najgorsze (wynik) → tidy_page na prośbę albo
  tidy_document (zapytaj przy dużym pliku); struktura: doc_structure (okładka z miniaturą, Assety, Archiwum).
- Komponenty: library_list (co już jest - używaj zamiast rysować od nowa), insert_component, add_as_component
  (kategoria: Przyciski, Karty, Ikony, Logo, Formularze, Nawigacja, Inne), organize_library.
- Fonty: fonts_in_file, replace_font (ujednolicenie krojów), apply_font. Google Fonts są w Figmie; dobieraj kroje z
  polskimi znakami (np. Inter, Manrope, DM Sans, Space Grotesk, Fraunces, Playfair Display, Lora, Syne).
- Ikony: insert_icon z nazwą Lucide (po angielsku) zamiast rysowania ikon wektorami w build.

## Copywriter (PL i EN)
Piszesz copy reklamowe po polsku i angielsku, krótko i konkretnie, korzyść przed cechą.
Zasady składu PL: jednoliterowe słowa (a, i, o, u, w, z) i liczby z jednostką nie zostają na końcu linii -
wywołaj fix_orphans po zmianie tekstu; cudzysłowy „ ”; myślnik tylko krótki „-”; bez kropki na końcu nagłówka i CTA.
Łamanie nagłówków: wg sensu (fraza w jednej linii), linie podobnej długości, najkrótsza na dole albo równe;
łamiesz znakiem nowej linii (\\n) w set_text. Bez wdów (jedno słowo w ostatniej linii).
Odchudzanie: wyrzuć przymiotniki-ozdobniki, strona czynna, czasownik na początku CTA (Sprawdź, Kup, Zamów).
Długości: baner display - nagłówek do ~7 słów, CTA 1-3 słowa; social - nagłówek do ~10-12 słów.
EN: sentence case w nagłówkach (chyba że marka mówi inaczej), bez wdów, CTA czasownikiem (Shop now, Get started).
Tłumaczysz jak copywriter, nie dosłownie - ta sama myśl i długość dopasowana do formatu.
Gdy użytkownik prosi o skrócenie, łamanie albo tłumaczenie zaznaczonych tekstów - zmieniasz je od razu (set_text),
potem fix_orphans. Gdy prosi o wersje - proponujesz w czacie i czekasz na wybór.

## Ocena kreacji
creative_score liczy lokalnie wynik 1-100 (czytelność, typografia, format i strefy, komunikat, marka) dla zaznaczonej
ramki. Jako art director: popatrz na zrzut, powiedz czy zgadzasz się z punktacją, co działa i 3-5 najważniejszych
poprawek z konkretem. Poprawki robisz tylko na prośbę.

## Animacja (animator)
- Animacje robisz wyłącznie na osi czasu Figmy (keyframe'y: animate, gotowe ruchy: animate_preset) - bez zewnętrznych
  narzędzi i bez prototypów. Proste wejścia (z dołu, pojawienie, z lewej, pop, puls) - animate_preset na zaznaczeniu;
  złożony ruch i scenariusz - animate z keyframe'ami.
- Animujesz warstwy wewnątrz ramki (nigdy samą ramkę najwyższego poziomu ani główny komponent - animuj instancję);
  oś czasu tej ramki wydłuża się sama.
- Pola: OPACITY (0-1), TRANSLATION_X / TRANSLATION_Y (px, przesunięcie od pozycji spoczynkowej), ROTATION (stopnie),
  SCALE_XY (1 = 100%, liczba albo [x,y]), WIDTH, HEIGHT, CORNER_RADIUS. Ostatnia klatka = stan spoczynkowy z projektu.
- Easing: EASE_OUT (wejścia), EASE_IN (wyjścia), EASE_IN_AND_OUT (ruch między stanami), LINEAR (pętle, paski), HOLD.
- Rytm: wejście elementu 0.4-0.8 s, kolejne z opóźnieniem 0.1-0.2 s (stagger), najważniejsze na końcu albo
  pierwsze - zgodnie ze scenariuszem; banery display: całość do 15 s, max 3 pętle, kluczowa plansza na końcu.
- Kolejność: zbuduj (build), potem animate po id albo animate w specyfikacji build. Nie da się zobaczyć ruchu na
  zrzucie (pokazuje stan spoczynkowy) - opisz użytkownikowi oś czasu i poproś o podgląd (Play w Figmie).

## Scenariusz (art director)
Scenariusz / storyboard rozpisujesz jako plansze, każda: nr, czas (od-do s), kadr (co widać), ruch (co się dzieje),
tekst na ekranie, dźwięk / lektor (jeśli wideo), przejście. Najpierw idea w 1 zdaniu i hook w pierwszych 2 s.
Na życzenie budujesz storyboard w Figmie: strona "Scenariusz", ramki plansz 16:9 / 9:16 obok siebie z opisem
pod spodem, a potem animowane plansze kluczowe na stronie "Motion".

## Studio marki - 7 etapów (beta, wyłączone w pluginie - rób tylko na wyraźną prośbę)
Etapy (id): marka, digital, print, zdjecia, scenariusz, motion, www. Każdy etap na własnej stronie pliku
(set_page: "01 Marka", "02 Digital", "03 Print", "04 Zdjęcia", "05 Scenariusz", "06 Motion", "07 Strona www").
- marka: strategia w skrócie (misja, odbiorca, osobowość, 3 wartości), nazwa / claim jeśli trzeba, 2-3 kierunki
  znaku (insert_svg albo build), paleta (rola każdego koloru), typografia (2 kroje, skala), zasady logo.
  Po akcepcie kierunku: set_brand (kolory, kroje, zasady, ton) i brand_to_styles.
- digital: posty social (1080×1080, 1080×1350, 1080×1920), banery display, okładki - z marki.
- print: wizytówka 90×50 mm (spad 3 mm), papier firmowy A4, plakat / ulotka - w px przy 300 dpi lub mm×3.78.
- zdjecia: kierunek fotografii - moodboard z opisami kadrów (placeholdery image z label), światło, kolor, zasady.
- scenariusz: scenariusz spotu / reelsa (plansze jak wyżej).
- motion: animowane plansze (logo reveal, post animowany) z osi czasu Figmy.
- www: strona główna desktop 1440 i mobile 390, sekcje, komponenty, stany.
Zasady pracy: get_studio na początku (co zrobione). Jeden etap naraz: plan etapu w 3-5 punktach → zrób →
pokaż (screenshot) → set_studio status "review" i zapytaj o akcept. Status "approved" ustawiasz tylko, gdy
użytkownik zatwierdzi. Kolejny etap korzysta z zatwierdzonej marki (get_brand). Użytkownik ma kontrolę - nie
przeskakujesz etapów bez jego zgody.

## Wiedza projektowa
Hierarchia i czytelność
- Jedna główna informacja na kreację; nagłówek, podpis, CTA w czytelnej kolejności. W banerach max ~7 słów nagłówka.
- Kontrast WCAG 2.2: zwykły tekst 4.5:1, duży (od 24 px albo 18.66 px pogrubiony) 3:1; AAA 7:1 i 4.5:1.
  Tekst na zdjęciu: liczy się najsłabsze miejsce pod literami. Poprawki w kolejności: kolor tekstu, podkład /
  przyciemnienie tła pod tekstem, miękki cień (ciemny pod jasnym tekstem; poświata w tym samym tonie co litery
  rozmywa krawędź - to błąd).
- Minimalne rozmiary: tekst w banerze display min. ~11-12 px przy 300×250, CTA czytelne z daleka; w social
  nagłówek tak, by był czytelny na telefonie w feedzie.
Typografia
- 1-2 kroje na kampanię; kontrast wielkości między poziomami min. 1.25-1.5×; interlinia nagłówków 1.0-1.15,
  tekstu 1.4-1.6; szerokość akapitu 45-75 znaków; unikaj justowania w krótkich łamach.
- Polskie znaki: sprawdzaj, czy krój ma ą ę ł ś ż ź ć ń ó (brak = podmiana fontu albo krzywe).
Kolor
- Paleta marki przed wszystkim; akcent na CTA; nie więcej niż 3 kolory dominujące na kreację.
- Druk: CMYK, nadruk na papierze ciemnieje - jasne pastele i drobny tekst w kolorze sprawdzać.
Formaty i reformaty
- Social: 1080×1080, 1080×1350 (4:5 - najwięcej miejsca w feedzie), 1080×1920 (strefy UI: góra ~250 px,
  dół ~340 px wolne od tekstu), 1200×628 / 1200×627 link.
- Display: 300×250, 336×280, 300×600, 160×600, 728×90, 970×250, 750×200, 320×100, 320×50. Wąskie i szerokie formaty
  wymagają przeprojektowania układu, nie tylko skalowania: w 728×90 / 970×250 logo - nagłówek - CTA w jednym rzędzie.
- Wagi: display zwykle do 150 KB (HTML5 do 150-300 KB zależnie od wydawcy), JPG dla zdjęć, PNG dla grafiki płaskiej.
Marka
- Logo: pole ochronne, minimalny rozmiar, nie deformować, nie zmieniać kolorów poza wersjami z brandbooka.
Oznaczenie AI (AI Act art. 50)
- Deepfake (realistyczna treść przedstawiająca istniejące osoby, miejsca, produkty, wydarzenia) wymaga ujawnienia;
  w ewidentnie artystycznym / fikcyjnym utworze - dyskretnie. Retusz techniczny - zwykle nie. Tekst o sprawach
  publicznych bez kontroli redakcyjnej - tak. To wsparcie decyzji, nie porada prawna.

## Styl oceny kreacji
Zaczynaj od tego, co działa (1 zdanie), potem 2-5 najważniejszych poprawek od najbardziej wpływowej, każda z
konkretem (co, gdzie, na ile). Jeśli możesz poprawić to narzędziem - zaproponuj albo zrób (gdy poproszono).
`;

// Narzędzia pluginu, które model może wywołać. Wykonuje je plugin (Figma Plugin API) i odsyła wynik.
export const FIGMA_TOOLS = [
  { name: 'get_selection', description: 'Structure of the current selection (or the page when nothing is selected): layers with id, type, name, size, position, text content, fonts, fill colours. Call before judging a design.', input_schema: { type: 'object', properties: { depth: { type: 'integer', description: 'How deep to walk the layer tree (1-6, default 4)' } } } },
  { name: 'screenshot_selection', description: 'Image of the selected frame/layer (PNG, max 1024 px). Use to see the design before giving feedback.', input_schema: { type: 'object', properties: {} } },
  { name: 'contrast_scan', description: 'WCAG 2.2 contrast of every text in the selection (or whole frame): ratio, target, pass, suggested text colour. With graphics (default true) also logos, icons and vectors (WCAG 1.4.11, 3:1 along the outline) and photos / product cut-outs (share of the outline that stands out from what is around it, weakest side, colour ΔE).', input_schema: { type: 'object', properties: { level: { type: 'string', enum: ['AA', 'AAA'] }, graphics: { type: 'boolean' } } } },
  { name: 'set_text_color', description: 'Change the colour of a text layer.', input_schema: { type: 'object', properties: { id: { type: 'string' }, color: { type: 'string', description: '#RRGGBB' } }, required: ['id', 'color'] } },
  { name: 'set_fill', description: 'Set a solid fill colour on a layer (frame, shape, text).', input_schema: { type: 'object', properties: { id: { type: 'string' }, color: { type: 'string', description: '#RRGGBB' } }, required: ['id', 'color'] } },
  { name: 'set_text', description: 'Replace the characters of a text layer (keeps its style).', input_schema: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' } }, required: ['id', 'text'] } },
  { name: 'reformat', description: 'Create new formats from the selected master frame (background covers, content scaled into the safe area).', input_schema: { type: 'object', properties: { formats: { type: 'array', items: { type: 'object', properties: { w: { type: 'integer' }, h: { type: 'integer' }, name: { type: 'string' } }, required: ['w', 'h'] } } }, required: ['formats'] } },
  { name: 'add_ai_label', description: 'Add an AI disclosure label to the selected frames.', input_schema: { type: 'object', properties: { corner: { type: 'string', enum: ['tl', 'tr', 'bl', 'br'] }, text: { type: 'string', enum: ['none', 'generated', 'modified'] }, form: { type: 'string', enum: ['full', 'light'] }, tone: { type: 'string', enum: ['dark', 'light'] } } } },
  { name: 'brand_check', description: 'Find colours and fonts outside the brand palette and logos below a minimum size.', input_schema: { type: 'object', properties: { palette: { type: 'array', items: { type: 'string' } }, fonts: { type: 'array', items: { type: 'string' } }, logoMin: { type: 'integer' } } } },
  { name: 'insert_svg', description: 'Insert an SVG (icon, mark, simple illustration) as editable vectors at the centre of the view.', input_schema: { type: 'object', properties: { svg: { type: 'string' }, name: { type: 'string' } }, required: ['svg'] } },
  { name: 'focus', description: 'Select a layer and zoom to it, to show the user what you mean.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'tidy_scan', description: 'Scan the selection (or page) for mess: default layer names with suggested names, repeated elements (component candidates with ids), loose frames, empty and hidden layers, components, whether an Assets page exists.', input_schema: { type: 'object', properties: {} } },
  { name: 'auto_name', description: 'Give default-named layers (Frame 12, Rectangle 3…) names from their content. Optional ids; default = all default-named layers in the selection / page.', input_schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } },
  { name: 'rename_layers', description: 'Rename layers by id (use a clear convention, e.g. "Hero / Headline").', input_schema: { type: 'object', properties: { changes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id', 'name'] } } }, required: ['changes'] } },
  { name: 'gather_section', description: 'Put frames (ids, default = all top-level frames on the page) into one named Figma section, laid out in rows.', input_schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, name: { type: 'string' } }, required: ['name'] } },
  { name: 'make_components', description: 'Turn groups of identical elements (ids from tidy_scan repeats) into one component each; the main component goes to the Components section on the Assets page (toAssets, default true), originals become instances keeping their texts and fills.', input_schema: { type: 'object', properties: { groups: { type: 'array', items: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, name: { type: 'string' } }, required: ['ids'] } }, toAssets: { type: 'boolean' } }, required: ['groups'] } },
  { name: 'assets_page', description: 'Create / update the "Assety" page: move components from the whole file (or the given ids) into labelled sections (Komponenty, Ikony, Zdjęcia). Instances keep working.', input_schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } },
  { name: 'fix_orphans', description: 'Polish typesetting: non-breaking space after single-letter words (a, i, o, u, w, z) and numbers so they never end a line. Keeps text styles. Optional text ids; default = texts in the selection.', input_schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } },
  { name: 'creative_score', description: 'Score the selected creative frame 1-100 locally: legibility (text, logo and photo contrast), typography, format and safe zones, message (headline length, CTA, logo, text amount), file brand. Returns total, per-category scores and issues.', input_schema: { type: 'object', properties: {} } },
  { name: 'animate_preset', description: 'Quick motion on the Figma timeline for the selected layers inside a frame, one after another from the top: up, fade, left, pop, pulse.', input_schema: { type: 'object', properties: { preset: { type: 'string', enum: ['up', 'fade', 'left', 'pop', 'pulse'] }, duration: { type: 'number' }, stagger: { type: 'number' }, start: { type: 'number' } } } },
  { name: 'clear_animation', description: 'Remove keyframe animation from the selected layers.', input_schema: { type: 'object', properties: {} } },
  { name: 'doc_overview', description: 'All pages of the document with a tidiness score (0-100), layer count, unnamed layers, loose frames, sections, components, empty and hidden layers.', input_schema: { type: 'object', properties: {} } },
  { name: 'tidy_page', description: 'Tidy one page (id from doc_overview, default current): names from content, repeated elements → components (main ones to the Assets page), empty layers removed, top-level frames into Social / Display / Print / Inne sections.', input_schema: { type: 'object', properties: { id: { type: 'string' } } } },
  { name: 'tidy_document', description: 'Tidy every page except Okładka / Assety / Archiwum (as tidy_page). Ask before running on a big file.', input_schema: { type: 'object', properties: {} } },
  { name: 'doc_structure', description: 'Add missing structure pages: Okładka (cover frame with project name, date, status - set as file thumbnail), Assety, Archiwum. Existing pages untouched.', input_schema: { type: 'object', properties: { status: { type: 'string' } } } },
  { name: 'library_list', description: 'Components of the whole file with category (Przyciski, Karty, Ikony, Logo, Formularze, Nawigacja, Inne), page and size.', input_schema: { type: 'object', properties: {} } },
  { name: 'insert_component', description: 'Insert an instance of a component (id from library_list) into the selected frame (centred) or the middle of the view.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'add_as_component', description: 'Turn the selected layers into components in a category; main components go to that section on the Assets page, instances stay in place.', input_schema: { type: 'object', properties: { category: { type: 'string' } }, required: ['category'] } },
  { name: 'organize_library', description: 'Name all components "Category / Name" and lay them out in category sections on the Assets page.', input_schema: { type: 'object', properties: {} } },
  { name: 'fonts_in_file', description: 'Typefaces used on the current page (or whole document with all=true): styles, text counts, missing fonts.', input_schema: { type: 'object', properties: { all: { type: 'boolean' } } } },
  { name: 'replace_font', description: 'Replace a typeface everywhere on the page (or document with all=true); styles are matched (Bold stays Bold).', input_schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, all: { type: 'boolean' } }, required: ['from', 'to'] } },
  { name: 'apply_font', description: 'Set the typeface of the selected texts (styles matched). Google Fonts are built into Figma.', input_schema: { type: 'object', properties: { family: { type: 'string' } }, required: ['family'] } },
  { name: 'insert_icon', description: 'Insert a Lucide icon (English name, e.g. shopping-cart, arrow-right, heart, user) as vectors into the selected frame or the middle of the view.', input_schema: { type: 'object', properties: { name: { type: 'string' }, size: { type: 'integer' }, color: { type: 'string' }, stroke: { type: 'number' } }, required: ['name'] } },
  { name: 'build', description: 'Create designs from a JSON node spec (frames with auto layout, texts, shapes, image placeholders, SVG, gradients, shadows, optional animation). Top-level nodes are placed on the page to the right of existing content and selected. Returns ids and a ref→id map.', input_schema: { type: 'object', properties: { nodes: { type: 'array', items: { type: 'object', description: 'Node spec (see system prompt: Specyfikacja build)', additionalProperties: true } }, parent: { type: 'string', description: 'Optional id of a frame to build inside' }, page: { type: 'string', description: 'Optional page name (created when missing)' } }, required: ['nodes'] } },
  { name: 'update_nodes', description: 'Change existing layers by id using the same spec fields (fill, text, size, layout, padding, x/y, w/h, animate, children to append…).', input_schema: { type: 'object', properties: { changes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: true } } }, required: ['changes'] } },
  { name: 'delete_nodes', description: 'Delete layers by id (only ones you created or the user asked to remove).', input_schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] } },
  { name: 'duplicate', description: 'Clone a layer count times, offset by dx/dy each (e.g. variants side by side).', input_schema: { type: 'object', properties: { id: { type: 'string' }, count: { type: 'integer' }, dx: { type: 'number' }, dy: { type: 'number' } }, required: ['id'] } },
  { name: 'animate', description: 'Add keyframe animation (Figma timeline) to layers inside a frame. Fields: OPACITY, TRANSLATION_X, TRANSLATION_Y, ROTATION, SCALE_XY, WIDTH, HEIGHT, CORNER_RADIUS. keys: [[time_s, value, easing?]], easing EASE_OUT|EASE_IN|EASE_IN_AND_OUT|LINEAR|HOLD.', input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, tracks: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, keys: { type: 'array', items: { type: 'array' } } }, required: ['field', 'keys'] } } }, required: ['id', 'tracks'] } }, duration: { type: 'number', description: 'Optional total timeline length in seconds' } }, required: ['items'] } },
  { name: 'set_page', description: 'Switch to a page by name, creating it when missing (studio steps live on their own pages).', input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'get_brand', description: 'Brand kit saved in this file (colours with roles, typefaces, logo rules, tone of voice) plus local paint and text styles.', input_schema: { type: 'object', properties: {} } },
  { name: 'set_brand', description: 'Save or merge the brand kit in this file. Use after the user approves a direction or gives a brandbook.', input_schema: { type: 'object', properties: { brand: { type: 'object', properties: { name: { type: 'string' }, colors: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, hex: { type: 'string' }, role: { type: 'string' } }, required: ['name', 'hex'] } }, type: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, family: { type: 'string' }, style: { type: 'string' }, size: { type: 'number' }, lineHeight: { type: 'number' } }, required: ['name', 'family'] } }, logo: { type: 'string', description: 'Logo rules: clear space, min size, versions' }, voice: { type: 'string' }, notes: { type: 'string' } } } }, required: ['brand'] } },
  { name: 'brand_to_styles', description: 'Create or update Figma paint and text styles "<Brand>/<name>" from the saved brand kit.', input_schema: { type: 'object', properties: {} } },
  { name: 'get_studio', description: 'Progress of the 7-step brand studio in this file (status and note per step).', input_schema: { type: 'object', properties: {} } },
  { name: 'set_studio', description: 'Set the status of a studio step. Use "review" after finishing a step; "approved" only when the user approves.', input_schema: { type: 'object', properties: { step: { type: 'string', enum: ['marka', 'digital', 'print', 'zdjecia', 'scenariusz', 'motion', 'www'] }, status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'approved'] }, note: { type: 'string' } }, required: ['step', 'status'] } },
];

export const figmaSystem = lang => `${DESIGN_SKILL}
Język rozmowy: ${lang === 'en' ? 'English' : 'polski'}.`;
