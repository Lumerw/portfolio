# Okrojony Open Sans (font marki teraz) do animacji teraz w portfolio.
# Źródło: pliki Open Sans 3.003 z teraz.eu (licencja SIL OFL 1.1 - assets/fonts/OFL.txt).
# Wagi jak w teraz: 400 (opisy), 600 (pigułki, chipy, legenda, podpisy - text-sm font-semibold), 700 (nagłówki, hasło).
# Zestaw znaków: ASCII + polskie litery + kilka znaków typograficznych - wystarczy na teksty PL/EN.
# Użycie (wymaga: pip install fonttools brotli):
#   python3 tools/subset-fonts.py <OpenSans-Regular> <OpenSans-Bold> <OpenSans-SemiBold>
#   (woff2 albo ttf; SemiBold opcjonalny - bez niego powstają tylko 400 i 700)
import sys
from pathlib import Path
from fontTools import subset

root = Path(__file__).resolve().parent.parent
text = ''.join(chr(c) for c in range(0x20, 0x7F)) + 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ' + ' ’‘“”„…·•–'
for src, weight in zip(sys.argv[1:4], (400, 700, 600)):
    out = root / 'assets' / 'fonts' / f'open-sans-{weight}-sub.woff2'
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk']
    opts.name_IDs = ['*']           # zachowaj nazwy i informację o licencji
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, str(out), opts)
    print(out.relative_to(root), out.stat().st_size, 'B')
