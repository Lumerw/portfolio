// Plansze marek projektów - jedna grafika w języku wizualnym projektu, w dowolnej proporcji
// (style w tools/covers.css liczą wszystko od rozmiaru ramki: cqw / cqh / cqmin).
// Używają ich: tools/build-deck.mjs (PDF 1080 × 1080) i tools/build-covers.mjs (grafiki na stronę).
import { RP } from '../render.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const covers = {
  // teraz: czerń z aurorą z teraz.eu, logo, hasło (Open Sans 700 - krój teraz)
  teraz(p, tp) {
    const [a, b, c, d] = p.brand.aurora;
    return `
      <div class="cover cover--teraz" style="--a:${a};--b:${b};--c:${c};--d:${d}">
        <img class="cover__logo" src="${esc(p.logo.src)}" alt="teraz">
        <p class="cover__claim">${esc(tp.reel.claimA)} <span class="cover__key">${esc(tp.reel.claimKey)}</span></p>
      </div>`;
  },
  // loom.studio: oś - czerń z mgławicą po lewej, papier z trzema figurami Bauhausu po prawej, logo na osi
  // (logo i figury z brand kitu loom.studio; Haus tylko w krzywych)
  loom() {
    return `
      <div class="cover cover--loom">
        <div class="cover__night"></div>
        <img class="cover__logo cover__logo--l" src="assets/deck/loom-logo-paper.svg" alt="">
        <img class="cover__logo cover__logo--r" src="assets/deck/loom-logo-ink.svg" alt="loom.studio">
        <img class="cover__figures" src="assets/deck/loom-symbol.svg" alt="">
      </div>`;
  },
  // reh.ab: głęboka czerwień, hasło Helvetica Bold z wygaszonym „toget”, pasek gradientu „her”
  rehab() {
    return `
      <div class="cover cover--rehab">
        <p class="cover__word">reh.ab</p>
        <p class="cover__claim">Make an <span class="cover__soft">impact</span> <span class="cover__dim">toget</span>her.</p>
        <div class="cover__her"></div>
      </div>`;
  },
};
