// Symbole projektów (brief 4.4). Jedno źródło geometrii:
// używane inline na stronie (animacja) i przez tools/build-assets.mjs (pliki .svg, placeholdery).
// Układ 48 × 48, kreska 1 px. Każda linia ma pathLength="1", więc animacja
// stroke-dashoffset 1 → 0 działa tak samo dla każdego kształtu.

const P = [14, 24, 34]; // pozycje nitek w znaku loom
const GAP = 2.5;        // przerwa tam, gdzie nitka przechodzi „pod spodem”

// Nitka od 8 do 40 z przerwami w podanych miejscach.
function thread(fixed, gaps, vertical) {
  const pts = [8];
  for (const g of gaps) pts.push(g - GAP, g + GAP);
  pts.push(40);
  let d = '';
  for (let i = 0; i < pts.length; i += 2) {
    const [a, b] = [pts[i], pts[i + 1]];
    d += vertical ? `M${fixed} ${a}V${b}` : `M${a} ${fixed}H${b}`;
  }
  return d;
}

// Splot płócienny: na skrzyżowaniu (i, j) przy parzystej sumie wierzchem idzie osnowa (pion).
const warp = P.map((x, i) => thread(x, P.filter((_, j) => (i + j) % 2 === 1), true));
const weft = P.map((y, j) => thread(y, P.filter((_, i) => (i + j) % 2 === 0), false));

const SHAPES = {
  personal: [
    '<circle cx="24" cy="24" r="18" pathLength="1"/>',
    '<circle class="hanko" cx="24" cy="24" r="3.5"/>',
  ],
  teraz: ['<circle cx="24" cy="24" r="18" pathLength="1"/>'],
  loom: [...warp, ...weft].map(d => `<path d="${d}" pathLength="1"/>`),
  // Wersja do 16 px: przeplot jest za drobny, więc zwykła siatka 3 × 3.
  'loom-small': [...P.map(x => `M${x} 8V40`), ...P.map(y => `M8 ${y}H40`)].map(d => `<path d="${d}" pathLength="1"/>`),
  rehab: [
    '<rect x="8" y="8" width="32" height="32" pathLength="1"/>',
    '<path d="M24 16V32" pathLength="1"/>',
    '<path d="M16 24H32" pathLength="1"/>',
  ],
};

export const SYMBOL_NAMES = ['personal', 'teraz', 'loom', 'rehab'];

// Elementy kształtu z indeksem --i (opóźnienie rysowania kolejnych linii).
// Linie dostają klasę .stroke — CSS wybiera je po klasie, nie po [pathLength]:
// Chrome nie przelicza stylu SVG po selektorze atrybutu w camelCase, gdy klasa
// .is-drawing dochodzi do rodzica później (animacja by nie ruszyła).
export function symbolInner(name) {
  return SHAPES[name]
    .map((el, i) => el.replace(/^<(\w+)/, el.includes('pathLength') ? `<$1 class="stroke" style="--i:${i}"` : `<$1`))
    .join('');
}

// Inline SVG do strony. Kolor z currentColor, kropka hanko z CSS.
// small: true → wariant na 16 px (tam, gdzie istnieje).
export function symbol(name, { cls = '', label = '', small = false } = {}) {
  if (small && SHAPES[`${name}-small`]) name = `${name}-small`;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="symbol symbol--${name} ${cls}" viewBox="0 0 48 48" ${a11y} focusable="false">${symbolInner(name)}</svg>`;
}
