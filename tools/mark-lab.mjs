// Laboratorium znaków v3: cztery role rozwijają algorytm generatora (generator.js), typ po typie.
//   art director  (Claude, obraz) - przegląd całego systemu co kilka rund (oceny typów, test asystenta „wygeneruj ze mną”,
//                  wybór 1-2 typów do pracy) i sędzia „mistrz czy pretendent” po każdej zmianie,
//   konstruktor   (Claude, obraz) - zamienia uwagi art directora na konstrukcję z liczbami i rysuje 3 wzorcowe znaki
//                  (SVG) na 8/10 dla danego typu - cel dla developera,
//   developer     (Claude, obraz) - odtwarza wzorce parametrycznie w kodzie (edycje SEARCH/REPLACE, tylko wybrane typy),
//   kontrola QA   (kod, mark-qa.js) - pole, środek, drzazgi, szczeliny, czytelność przy 32 px, powtarzalność; bramki twarde
//                  (bezpieczeństwo, kontrakt, wyjście poza pole, nieruszane typy) i miękkie (pogorszenie względem mistrza).
// Przechodzi tylko lepsza wersja (sędzia porównuje starą i nową na tym samym arkuszu, A/B w losowej kolejności).
// Wzorce stron z książek: private/mark-lab/refs (lokalnie, poza repozytorium). Baza wiedzy: knowledge-prompt.md.
// Wynik: private/mark-lab/current.js (+ versions/, scores.jsonl, state.json, rounds/NN/). Do repozytorium:
//   npm run lab -- --apply   (algorytm z laboratorium, UI z repozytorium)
//   npm run lab -- --rounds=30 --budget=40   (budżet USD łącznie, licznik w ledger.json; ceny Opus 5.5)
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, copyFile, readdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { content } from '../content.js';
import { markSystem, markParams, pickSystem, pickMessage } from '../agent/worker.js';
import { top } from '../mark-qa.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAB = join(root, 'private/mark-lab');
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const ROUNDS = +arg('rounds', 5), BUDGET = +arg('budget', 40);
const REVIEW_EVERY = 4;                              // przegląd całego systemu co 4 rundy pracy
const ENDPOINT = `${content.shared.agent.endpoint.replace(/\/$/, '')}/lab`;
const PRICE = { in: 4, cw: 5, cr: .2, out: 20 };     // USD / MTok, Claude Opus 5.5 (platform.claude.com/docs/en/about-claude/pricing)
const MODEL = 'claude-opus-5-5';
const UI = 'export function initGenerator';
const MAX_KINDS = 12;

const BRIEFS = [
  'kawiarnia specialty, ciepło, rzemiosło', 'fintech dla freelancerów, zaufanie, prostota', 'fundacja dla dzieci, radość, opieka',
  'studio jogi, spokój, oddech', 'biuro architektoniczne, beton, światło', 'start-up logistyczny, ruch, punktualność',
  'marka rowerowa, prędkość, miasto', 'festiwal muzyki elektronicznej, rytm, noc', 'klinika weterynaryjna, troska, zwierzęta',
  'piekarnia rodzinna, tradycja, zboże', 'kancelaria prawna, powaga, równowaga', 'aplikacja do medytacji, cisza, skupienie',
  'producent okien, przejrzystość, rama', 'galeria sztuki współczesnej, eksperyment', 'szkoła programowania, logika, krok po kroku',
  'browar rzemieślniczy, chmiel, wspólnota', 'energia odnawialna, słońce, wiatr', 'wydawnictwo książek, strona, opowieść',
  'sklep z roślinami, wzrost, liść', 'agencja podróży, horyzont, odkrywanie', 'platforma dla ekspertów kreatywnych, rozmowa',
  'marka kosmetyków naturalnych, kropla, łagodność', 'firma budowlana, solidność, cegła', 'radio internetowe, fala, głos',
];

/* ---------- Licznik kosztów i wywołania Claude (Worker /lab, strumień SSE) ---------- */
const ledgerFile = join(LAB, 'ledger.json');
const ledger = existsSync(ledgerFile) ? JSON.parse(await readFile(ledgerFile, 'utf8')) : { usd: 0, calls: 0 };
const cost = u => ((u.input_tokens || 0) * PRICE.in + (u.cache_creation_input_tokens || 0) * PRICE.cw + (u.cache_read_input_tokens || 0) * PRICE.cr + (u.output_tokens || 0) * PRICE.out) / 1e6;
const token = (await readFile(join(root, 'private/lab-token'), 'utf8')).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastStop = null;
async function claude({ system, content: user, max_tokens = 16000, effort: startEffort = 'high', label }) {
  let effort = startEffort;
  if (ledger.usd >= BUDGET) throw new Error('budget');
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Origin: 'http://localhost:8099' },
        body: JSON.stringify({ token, model: MODEL, max_tokens, effort, system, messages: [{ role: 'user', content: user }] }),
      });
      if (res.status === 429) { await sleep(20000); continue; }
      if (!res.ok) { console.warn(`… ${label}: ${res.status} ${(await res.text()).slice(0, 300)}`); await sleep(8000); continue; }
      const usage = {};
      let text = '', buf = '', failed = null, stop = null;
      const dec = new TextDecoder();
      for await (const chunk of res.body) {
        buf += dec.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const ev = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = ev.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          let d; try { d = JSON.parse(line.slice(6)); } catch { continue; }
          if (d.type === 'message_start') Object.assign(usage, d.message?.usage);
          else if (d.type === 'content_block_delta' && d.delta?.type === 'text_delta') text += d.delta.text;
          else if (d.type === 'message_delta') { Object.assign(usage, d.usage); stop = d.delta?.stop_reason ?? stop; }
          else if (d.type === 'error') failed = d.error?.message || 'error';
        }
      }
      const usd = cost(usage);
      ledger.usd += usd; ledger.calls++;
      await writeFile(ledgerFile, JSON.stringify(ledger, null, 2));
      console.log(`  $ ${label}: ${usd.toFixed(3)} (razem ${ledger.usd.toFixed(2)} / ${BUDGET})${stop && stop !== 'end_turn' ? ` · stop: ${stop}` : ''}`);
      lastStop = stop;
      if (failed) { console.warn(`… ${label}: ${failed}`); await sleep(8000); continue; }
      if (!text.trim() && stop === 'max_tokens' && effort !== 'low') {   // całe wyjście poszło na myślenie
        console.warn(`… ${label}: bez tekstu (limit zjadło myślenie) - ponawiam z niższym wysiłkiem`);
        effort = effort === 'high' ? 'medium' : 'low';
        continue;
      }
      return text;
    } catch (e) { console.warn(`… ${label}: ${e.message}`); await sleep(8000); }
  }
  throw new Error(`${label}: brak odpowiedzi`);
}
const json = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
const img = async (file, type = 'image/jpeg') => ({ type: 'image', source: { type: 'base64', media_type: type, data: (await readFile(file)).toString('base64') } });
const sha = s => createHash('sha1').update(s).digest('hex').slice(0, 8);
const knowledge = async () => {
  const f = join(LAB, 'knowledge-prompt.md');
  return existsSync(f) ? `\n\nKNOWLEDGE BASE (distilled from the owner's design library - principles, vocabulary, craft rules with numbers, roadmap; numeric rules are hard constraints unless the art director overrides them):\n${await readFile(f, 'utf8')}` : '';
};

/* ---------- Wersje generatora: import, render, QA ---------- */
let bust = 0;
const load = async file => import(`${pathToFileURL(file).href}?v=${++bust}`);
const algo = src => src.slice(0, src.indexOf(UI));
const uiPart = src => src.slice(src.indexOf(UI));
// Kod jednego typu w MAKERS (od „  kind(r, c, s)” do zamykającego „  },”) i jego wiersz w KIND_INFO;
// swapMaker: kod i opis typu k z `from` w miejsce tych w `src` (null, gdy któregoś brak)
const makerOf = (src, k) => { const i = src.indexOf(`  ${k}(r, c, s)`); return i < 0 ? null : src.slice(i, src.indexOf('\n  },', i) + 5); };
const infoOf = (src, k) => src.match(new RegExp(`^  ${k}: \\{ pl:.*$`, 'm'))?.[0] ?? null;
const swapMaker = (src, from, k) => {
  const a = makerOf(src, k), b = makerOf(from, k), ia = infoOf(src, k), ib = infoOf(from, k);
  return a && b && ia && ib ? src.replace(a, () => b).replace(ia, () => ib) : null;
};
const VAR = [[.1, .1], [.15, .9], [.5, .5], [.5, .15], [.85, .85], [.9, .35]];    // (złożoność, styl) na arkuszach
const PANEL_SEEDS = [11, 23, 47, 71];
const seedOf = (seed, ki) => seed * 97 + ki;

let browser, page;
async function qaPage() {
  if (page) return page;
  page = await browser.newPage();
  await page.setContent('<body></body>');
  await page.addScriptTag({ type: 'module', content: `${await readFile(join(root, 'mark-qa.js'), 'utf8')}\nwindow.QA = { rasterize, analyze, score, png };` });
  await page.waitForFunction(() => window.QA);
  return page;
}
// Miary QA dla listy SVG (każdy rasteryzowany osobno)
async function measure(svgs) {
  const p = await qaPage();
  return p.evaluate(async svgs => {
    const out = [];
    for (const s of svgs) {
      try { const r = await QA.rasterize(s); const m = QA.analyze(r); out.push({ ...m, q: QA.score(m), h24: r.h24 }); } catch { out.push({ empty: true, q: 0 }); }
    }
    return out;
  }, svgs);
}
// Statystyki QA dla typu: średnia ocena, odsetki usterek, różnorodność (odciski 24 px przy c = s = .5)
async function kindStats(m, kind) {
  const ki = m.KINDS.indexOf(kind), jobs = [];
  for (let i = 1; i <= 16; i++) for (const [c, s] of [[.2, .2], [.5, .5], [.8, .85]]) jobs.push({ seed: seedOf(i * 13, ki), c, s });
  const res = await measure(jobs.map(j => m.markSvg({ kind, seed: j.seed, complexity: j.c, style: j.s }, '#000000', 200)));
  const pct = f => Math.round(100 * res.filter(f).length / res.length);
  const mid = res.filter((_, i) => jobs[i].c === .5);
  return {
    q: +(res.reduce((a, r) => a + r.q, 0) / res.length).toFixed(3),
    outside: pct(r => r.outside), edge: pct(r => r.edge), offCentre: pct(r => r.offset > .05), crumbs: pct(r => r.crumbs > 0),
    thin: pct(r => r.thin > .04), hair: pct(r => r.hair > .03), topo32: pct(r => r.topo32), small: pct(r => r.extent < 90), big: pct(r => r.extent > 152),
    variety: new Set(mid.map(r => r.h24)).size,                         // ile różnych z 16 numerów
    worst: res.map((r, i) => ({ ...jobs[i], q: r.q })).sort((a, b) => a.q - b.q).slice(0, 3).map(w => `seed ${w.seed} c${w.c} s${w.s} q${w.q.toFixed(2)}`),
  };
}
const statLine = (k, s) => `${k}: QA ${s.q} · outside ${s.outside}% · touching edge ${s.edge}% · off-centre ${s.offCentre}% · crumbs ${s.crumbs}% · thin parts ${s.thin}% · hairline gaps ${s.hair}% · changes at 32px ${s.topo32}% · too small ${s.small}% · too big ${s.big}% · variety ${s.variety}/16 · worst: ${s.worst.join('; ')}`;

// Arkusz: komórki z SVG (unikalne id masek w obrębie strony), podpisy
async function sheet(cells, out, cols = 12, w = 150) {
  const html = `<body style="margin:0;padding:8px;background:#fff;font:11px Helvetica;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:6px">${cells.map((c, i) => {
    const svg = c.svg.replace(/id="([^"]+)"/g, `id="c${i}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#c${i}-$1)`).replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1').replace('<svg', `<svg width="${w}" height="${w}"`);
    return `<figure style="margin:0"><div style="width:${w}px;height:${w}px;background:#FAFAF7;outline:1px solid #e5e5e5;overflow:hidden">${svg}</div><figcaption style="height:${c.tall ? 30 : 14}px;overflow:hidden">${c.label}</figcaption></figure>`;
  }).join('')}</body>`;
  const p = await browser.newPage({ viewport: { width: cols * (w + 6) + 16, height: 400 } });
  await p.setContent(html);
  await p.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 84 });
  await p.close();
}
// Panel typów: wiersz na typ, kolumny = 2 numery × 6 ustawień (te same dla mistrza i pretendenta)
const panelCells = (m, kinds, prefix = '') => kinds.flatMap(kind => {
  const ki = m.KINDS.indexOf(kind);
  return PANEL_SEEDS.slice(0, 2).flatMap((seed, si) => VAR.map(([c, s], vi) => {
    const id = `${prefix}${kind.slice(0, 4)}${si * VAR.length + vi + 1}`;
    return { id, label: `${id} c${Math.round(c * 100)} s${Math.round(s * 100)}`, legend: `${id} = ${kind} seed ${seedOf(seed, ki)} complexity ${c} style ${s}`, svg: m.markSvg({ kind, seed: seedOf(seed, ki), complexity: c, style: s }, '#111111', 150) };
  }));
});

/* ---------- Bramki (kod) ---------- */
const SAFE_SRC = /Math\.random|\bDate\b|document\.|window\.|fetch\(|import\(|eval\(|Function\(|localStorage|XMLHttpRequest/;
const SAFE_SVG_TAG = /^(svg|g|path|defs|mask|rect|circle|ellipse|polygon|polyline|line|clipPath)$/;
async function gates(file, base, focus) {
  const errs = [];
  const src = await readFile(file, 'utf8');
  if (src.split(UI).length !== 2) return ['initGenerator marker must appear exactly once'];
  if (uiPart(src) !== uiPart(base)) errs.push('the UI part (from "export function initGenerator" to the end) changed - it must stay byte-identical');
  if (SAFE_SRC.test(algo(src))) errs.push(`forbidden API in the algorithm part: ${algo(src).match(SAFE_SRC)[0]}`);
  if (/^\s*import\s/m.test(algo(src))) errs.push('no imports in the algorithm part');
  const lines = src.split('\n').length;
  if (lines > 1100 || src.length > 60000) errs.push(`file too big: ${lines} lines / ${src.length} chars (max 1100 / 60000)`);
  let m, b;
  try { m = await load(file); b = await load(join(LAB, 'current.js')); } catch (e) { return [...errs, `import: ${e.message}`]; }
  if (typeof m.markSvg !== 'function' || typeof m.initGenerator !== 'function') errs.push('missing export markSvg / initGenerator');
  if (!Array.isArray(m.KINDS) || !m.KIND_INFO || JSON.stringify(m.KINDS) !== JSON.stringify(Object.keys(m.KIND_INFO))) return [...errs, 'KINDS must equal Object.keys(KIND_INFO)'];
  if (m.KINDS.length > MAX_KINDS) errs.push(`too many kinds: ${m.KINDS.length} (max ${MAX_KINDS})`);
  for (const k of m.KINDS) {
    const i = m.KIND_INFO[k];
    if (!i?.pl || !i?.en || !i?.brief || i.brief.length > 240 || /[—–]/.test(i.brief + i.pl + i.en)) errs.push(`KIND_INFO.${k}: needs pl, en, brief (<= 240 chars, no long dashes)`);
  }
  // błędy, NaN, deterministyczność, kontrakt i bezpieczeństwo SVG - także skrajne suwaki i obroty
  for (const k of m.KINDS) {
    let bad = 0;
    for (let seed = 1; seed <= 24 && bad < 2; seed++) for (const c of [0, .5, 1]) for (const s of [0, .5, 1]) for (const rotate of [0, 90]) {
      if (bad >= 2) break;
      const at = `${k} seed ${seed} c${c} s${s} r${rotate}`;
      try {
        const a = m.markSvg({ kind: k, seed, complexity: c, style: s, rotate }, '#111111', 200);
        if (a !== m.markSvg({ kind: k, seed, complexity: c, style: s, rotate }, '#111111', 200)) { errs.push(`${at}: not deterministic`); bad++; continue; }
        if (/NaN|undefined|Infinity/.test(a)) { errs.push(`${at}: ${a.match(/NaN|undefined|Infinity/)[0]} in SVG`); bad++; continue; }
        if (!a.includes('viewBox="0 0 200 200"') || (a.match(/<g transform="rotate\(/g) || []).length !== 1) { errs.push(`${at}: contract - literal viewBox="0 0 200 200" and exactly one <g transform="rotate(...)"> required`); bad++; continue; }
        if (a.length > 9000) { errs.push(`${at}: SVG ${a.length} chars (max 9000)`); bad++; continue; }
        const tags = [...a.matchAll(/<([a-zA-Z]+)/g)].map(x => x[1]).filter(t => !SAFE_SVG_TAG.test(t));
        if (tags.length || /\son\w+=|href|<script|url\((?!#)/i.test(a)) { errs.push(`${at}: unsafe SVG (${tags[0] || 'attribute'})`); bad++; }
      } catch (e) { errs.push(`${at}: ${e.message}`); bad++; }
    }
  }
  if (errs.length) return errs;
  // typy spoza pracy: identyczne SVG na panelu (strażnik przypadkowych zmian)
  for (const k of b.KINDS.filter(k => !focus.includes(k))) {
    if (!m.KINDS.includes(k)) { errs.push(`kind ${k} was removed but is not in focus`); continue; }
    outer: for (const seed of PANEL_SEEDS) for (const [c, s] of VAR) {
      if (m.markSvg({ kind: k, seed, complexity: c, style: s }, '#111111', 200) !== b.markSvg({ kind: k, seed, complexity: c, style: s }, '#111111', 200)) { errs.push(`kind ${k} is not in focus (${focus.join(', ')}) but its output changed (seed ${seed} c${c} s${s}) - keep shared helpers backwards compatible`); break outer; }
    }
  }
  // typy w pracy: zmiana musi być widoczna przynajmniej w jednym (inaczej sędzia porównuje dwie takie same wersje)
  const live = focus.filter(k => b.KINDS.includes(k) && m.KINDS.includes(k));
  const same = k => PANEL_SEEDS.every(seed => VAR.every(([c, s]) => m.markSvg({ kind: k, seed, complexity: c, style: s }, '#111111', 200) === b.markSvg({ kind: k, seed, complexity: c, style: s }, '#111111', 200)));
  if (live.length && live.length === focus.length && live.every(same)) errs.push(`output of ${live.join(', ')} is identical to the current version on every panel cell - the edits did not change any geometry`);
  if (errs.length) return errs;
  // QA twarde: poza polem / krawędź / rozmiar / różnorodność; miękkie: pogorszenie względem mistrza
  for (const k of focus.filter(k => m.KINDS.includes(k))) {
    const st = await kindStats(m, k);
    if (st.edge > 0) errs.push(`${k}: ink touches the viewBox edge in ${st.edge}% of renders`);
    if (st.outside > 5) errs.push(`${k}: outside the 20..180 field in ${st.outside}% of renders (max 5%)`);
    if (st.small + st.big > 15) errs.push(`${k}: size outside 90..152 px in ${st.small + st.big}% of renders (max 15%)`);
    if (st.variety < 8) errs.push(`${k}: only ${st.variety}/16 different marks at c=.5 s=.5 - seeds must give real variety`);
    if (b.KINDS.includes(k)) {
      const old = await kindStats(b, k);
      if (st.q < old.q - .08) errs.push(`${k}: QA score dropped ${old.q} -> ${st.q} (${statLine(k, st)})`);
    }
  }
  return errs;
}

// Edycje SEARCH/REPLACE (każde SEARCH dokładnie raz) albo cały plik w bloku ```js
function applyEdits(base, text) {
  // ucięta odpowiedź: kompletne bloki bywają tylko opisami (KIND_INFO), a geometria została w uciętym - całość do poprawki
  if (lastStop === 'max_tokens') return { error: 'reply was cut at the token limit before the edits were complete - return fewer, smaller SEARCH/REPLACE edits (focus kinds only, no commentary)' };
  const blocks = [...text.matchAll(/<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g)];
  if (blocks.length) {
    let src = base;
    for (const [, find, repl] of blocks) {
      const n = src.split(find).length - 1;
      if (n !== 1) return { error: `SEARCH block matched ${n} times (must be exactly once):\n${find.slice(0, 300)}` };
      src = src.replace(find, () => repl);
    }
    return { src, edits: blocks.length };
  }
  const full = text.match(/```(?:js|javascript|mjs)?[^\n]*\n([\s\S]*?)```/);
  if (full && full[1].includes(UI)) return { src: full[1], edits: 'full' };
  return { error: lastStop === 'max_tokens' ? 'reply was cut at the token limit - use fewer, smaller SEARCH/REPLACE edits' : 'no SEARCH/REPLACE blocks and no complete file' };
}

/* ---------- Role ---------- */
const ANCHORS = 'Score anchors (keep them stable across rounds): 1-2 broken or clip-art; 3-4 generic stock icon; 5-6 competent but forgettable; 7-8 portfolio-grade, one clear idea, crafted; 9-10 would sit on a Logo Modernism spread next to the best.';
const AD_REVIEW = `You are a senior art director (calibre of Paul Rand, Pentagram, the designers in "Logo Modernism") leading the development of an algorithmic mark generator on the portfolio of Wojciech Lumer, a designer of identities and digital products. It must produce NEW abstract signets (no letters, no text), black on paper; users then pick a colour, a complexity slider (0-1, more elements) and a square-to-round style slider (0 sharp/technical - 1 round/organic). Target: every kind at 8/10 or better.
You get reference pages from modernist logo books (the quality bar - ignore lettermarks, never ask to copy a mark, only principles), a contact sheet of the current generator (rows = kinds; ids explained in the legend), QA numbers measured by code (trust them for things you cannot see at 150 px), and marks the "generate with me" assistant chose for brand briefs (same flow as the site: kind and sliders from the brief, the best 4 of 30 seeds by QA, then the assistant picks one by eye and writes name/why for it - judge whether the mark answers the brief and whether name/why describe what is actually drawn).
${ANCHORS}
Judge: one clear idea, figure-ground and negative space, optical balance and centre, consistent weights and gaps, no slivers / tangents / near-misses, legible at 16-32 px, distinctive (not clip-art), craft, variety across seeds, sliders that change the mark meaningfully.
Pick the 1-2 kinds to work on next (lowest score with the clearest path to 8; or a new kind if the system lacks a family - at most ${MAX_KINDS} kinds in total).
Reply with ONLY JSON: {"overall": 1-10, "briefs_fit": 1-10, "kinds": {"<kind>": {"score": 1-10, "verdict": "...", "issues": ["concrete geometric problem + fix with numbers"]}}, "resolved": ["previous issues now solved"], "focus": ["kind" or "new:<name>"], "new_kinds": [{"name": "...", "idea": "...", "geometry": "..."}], "assistant": "how the brief-to-kind choice should improve (prompt-level advice)"}. English.`;

const AD_JUDGE = `You are the same senior art director. Judge a change to the mark generator: version A and version B of the same kinds, rendered with the same seeds and slider settings (rows = kinds, ids in the legend; a kind may exist in only one version when it is new). One of them is the current champion, one the challenger - you do not know which. You also see the constructor's target marks (what 8/10 should look like) and QA numbers measured by code.
${ANCHORS}
Score each kind for A and for B independently (0 if a version lacks the kind), then decide. Be strict: the winner must be clearly better; equal is not enough.
Reply with ONLY JSON: {"kinds": {"<kind>": {"A": 0-10, "B": 0-10, "why": "..."}}, "winner": "A"|"B"|"=", "next": {"<kind>": ["the most important remaining problems with concrete geometric fixes"]}}. English.`;

const CONSTRUCTOR = `You are a constructor - a senior identity designer who turns art-direction feedback into exact construction, for an algorithmic generator of abstract signets (no letters, black on paper, field 200 x 200, mark centred on (100,100) inside 24..176, extent 100-150).
For each focus kind: write the construction as numbered rules with numbers (proportions to the mark diameter D, radii, stroke and gap widths, grid unit, symmetry order, how many elements, optical corrections), say exactly how complexity (0-1) and style (0 square/sharp - 1 round/organic) must act on it and how seeds create real variety (different constructions, not jitter), and DRAW 3 golden marks by hand as SVG code that a jury would score 8/10 or better - each at a different (complexity, style) so the developer sees the range. Golden SVG rules: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">, only path/circle/rect/polygon/g/mask/defs, fill #111111 (cuts with a mask or fill-rule evenodd), no text, no strokes unless the kind is line-based. Minimum gap and minimum feature width 6 units; no tangents; no slivers.
Never copy a mark from the references - use their principles.
Reply with ONLY JSON: {"kinds": {"<kind>": {"concept": "...", "construction": ["rule with numbers", ...], "complexity": "...", "style": "...", "variety": "...", "golden": [{"complexity": 0-1, "style": 0-1, "note": "...", "svg": "<svg ...>...</svg>"}]}}}.`;

const DEVELOPER = `You are a creative-coding developer maintaining generator.js - a dependency-free ES module that draws abstract signets as SVG. Each round you implement ONE OR TWO kinds so they reproduce the constructor's golden marks parametrically (the golden marks are the target; the rules are the spec) and fix the art director's issues.
Hard rules:
- Return ONLY edits in this exact format (any number of blocks; each SEARCH must match the current file exactly once):
<<<<<<< SEARCH
(exact lines from the current file)
=======
(replacement)
>>>>>>> REPLACE
  Use a complete file in one \`\`\`js block only when restructuring more than half of the file.
- Touch only the focus kinds (their MAKERS entry, their KIND_INFO entry, new helpers). Every other kind must render byte-identical - do not change shared helpers in a breaking way (add new helpers instead).
- Keep the exports KIND_INFO (pl, en display names, English "brief" <= 240 chars: look + which brands it suits - the assistant reads it), KINDS = Object.keys(KIND_INFO), markSvg and initGenerator. Never edit anything from "export function initGenerator" to the end.
- markSvg is pure and deterministic: no Math.random, Date, DOM, imports. Output keeps the literal viewBox="0 0 200 200" and exactly one <g transform="rotate(...)">. Mark centred on (100,100), inside 24..176, extent 100-150 at every slider setting. Cuts via mask (ids unique per parameter set) or evenodd. Keep f() rounding.
- Draw every random decision from r() in a fixed order that does not depend on complexity or style; complexity adds elements at the end; no rejection loops that depend on c or s (sliders must change the mark smoothly).
- Craft by construction: minimum gap and minimum feature width 6 units, no tangents, no slivers, legible at 32 px; seeds must give real variety (different constructions, not just jitter).
- Short Polish comments in the existing style; file under ~1100 lines.
After the edits write "CHANGED_KINDS: a, b" and "NOTES:" with 3-6 bullets for the art director.`;

/* ---------- Pętla ---------- */
await mkdir(join(LAB, 'rounds'), { recursive: true });
await mkdir(join(LAB, 'versions'), { recursive: true });
const current = join(LAB, 'current.js');
if (!existsSync(current)) await copyFile(join(root, 'generator.js'), current);
if (process.argv.includes('--apply')) {            // algorytm z laboratorium, UI z repozytorium
  const lab = await readFile(current, 'utf8'), repo = await readFile(join(root, 'generator.js'), 'utf8');
  await writeFile(join(root, 'generator.js'), algo(lab) + uiPart(repo));
  console.log('✓ generator.js: algorytm z private/mark-lab/current.js, UI z repozytorium. Teraz: build, test strony, wrangler deploy (Worker czyta KIND_INFO).');
  process.exit(0);
}
// UI zawsze z repozytorium (gdy zmieniło się na stronie, laboratorium pracuje na aktualnym)
{
  const lab = await readFile(current, 'utf8'), repo = await readFile(join(root, 'generator.js'), 'utf8');
  if (uiPart(lab) !== uiPart(repo)) { await writeFile(current, algo(lab) + uiPart(repo)); console.log('UI w current.js zsynchronizowane z repozytorium'); }
}
const stateFile = join(LAB, 'state.json');
const state = existsSync(stateFile) ? JSON.parse(await readFile(stateFile, 'utf8')) : { kinds: {}, focus: [], review: null, round: (await readdir(join(LAB, 'rounds'))).length, sinceReview: REVIEW_EVERY };
const saveState = () => writeFile(stateFile, JSON.stringify(state, null, 2));
const log = s => appendFile(join(LAB, 'log.md'), `${s}\n`);
const refsAll = async () => (await readdir(join(LAB, 'refs'))).filter(f => /\.(jpe?g|png)$/.test(f));
// Strony wzorcowe do typów w pracy (refs-index.json z bazy wiedzy: strona → typy), reszta losowo
const REF_KINDS = { carrier: ['carrier', 'split'], interlock: ['interlock', 'weave', 'pair', 'hinge'], radial: ['radial', 'rotor', 'fan', 'mon'], grid: ['grid', 'tangram', 'primitives'], stencil: ['stencil', 'hatch', 'bundle', 'split'], blob: ['blob', 'organic', 'split'], line: ['line', 'concentric', 'meander'] };
async function refsFor(kinds, n) {
  const all = await refsAll(), shuffle = a => [...a].sort(() => Math.random() - .5);
  const f = join(LAB, 'refs-index.json');
  const index = existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : [];
  const words = kinds.flatMap(k => REF_KINDS[k] || [k]);
  const hit = shuffle(index.filter(x => all.includes(x.img) && x.kinds.some(t => words.some(w => t.includes(w)))).map(x => x.img));
  return [...new Set([...hit.slice(0, n - 1), ...shuffle(all)])].slice(0, n);
}
browser = await chromium.launch();

for (let n = 0; n < ROUNDS && ledger.usd < BUDGET - 4; n++) {   // zapas na najdroższą rundę (konstruktor 40k + developer 2 × 48k)
  const r = ++state.round;
  const dir = join(LAB, 'rounds', String(r).padStart(2, '0'));
  await mkdir(dir, { recursive: true });
  const kb = await knowledge();
  const base = await readFile(current, 'utf8');
  const m = await load(current);

  // 1. Przegląd całego systemu (co REVIEW_EVERY rund pracy albo gdy nie ma celu)
  if (state.sinceReview >= REVIEW_EVERY || !state.focus.length) {
    console.log(`\n— runda ${r}: przegląd systemu`);
    const cells = m.KINDS.flatMap((kind, ki) => PANEL_SEEDS.slice(0, 3).flatMap((seed, si) => VAR.filter((_, vi) => vi % 2 === 0 || si === 0).map(([c, s]) => {
      const id = `${ki + 1}.${si + 1}.${Math.round(c * 10)}${Math.round(s * 10)}`;
      return { id, label: `${id} ${kind}`, legend: `${id} = ${kind} seed ${seedOf(seed, ki)} complexity ${c} style ${s}`, svg: m.markSvg({ kind, seed: seedOf(seed, ki), complexity: c, style: s }, '#111111', 150) };
    })));
    await sheet(cells, join(dir, 'system.jpg'), 12);
    const stats = {};
    for (const k of m.KINDS) stats[k] = await kindStats(m, k);
    // asystent „wygeneruj ze mną” - jak na stronie: /mark (ten sam prompt) → 30 kandydatów → 4 najlepsze różne wg QA
    // → wybór z obrazów (/mark/pick, ten sam prompt i wiadomość)
    const briefs = [];
    for (const [i, brief] of [...BRIEFS].sort(() => Math.random() - .5).slice(0, 6).entries()) {
      try {
        const p = markParams(json(await claude({ system: markSystem(m.KINDS, m.KIND_INFO, 'pl'), content: `Brand brief: ${brief}`, max_tokens: 1500, effort: 'low', label: `asystent ${i + 1}` })));
        if (!m.KINDS.includes(p.kind)) continue;
        const cfg = seed => ({ kind: p.kind, seed, complexity: p.complexity / 100, style: p.style / 100, rotate: p.rotate });
        const seeds = Array.from({ length: 30 }, () => 1 + Math.floor(Math.random() * 99999));
        const res = await measure(seeds.map(sd => m.markSvg(cfg(sd), '#000000', 200)));
        const cands = top(seeds.map((seed, j) => ({ seed, q: res[j].q, h24: res[j].h24 })).filter(x => x.h24), 4);
        let b = { id: `B${i + 1}`, brief, ...p, seed: cands[0]?.seed ?? seeds[0] };
        if (cands.length > 1) {
          try {
            const images = await (await qaPage()).evaluate(svgs => Promise.all(svgs.map(s => QA.png(s))), cands.map(cd => m.markSvg(cfg(cd.seed), '#111111', 256)));
            const q = json(await claude({ system: pickSystem('pl'), content: pickMessage({ brief, kind: p.kind, name: p.name, why: p.why, images }, m.KIND_INFO), max_tokens: 2000, effort: 'low', label: `asystent ${i + 1} (wybór)` }));
            const n = Math.round(+q.pick);
            if (n >= 1 && n <= cands.length) b = { ...b, seed: cands[n - 1].seed, name: q.name || b.name, why: q.why || b.why };
          } catch { /* bez wyboru - najlepsza wg QA */ }
        }
        briefs.push(b);
      } catch { /* pomijamy */ }
    }
    if (briefs.length) await sheet(briefs.map(b => ({ label: `${b.id} ${b.kind} c${b.complexity} s${b.style}: ${b.brief} → ${b.name}`, tall: true, svg: m.markSvg({ kind: b.kind, seed: b.seed, complexity: b.complexity / 100, style: b.style / 100, rotate: +b.rotate || 0 }, '#111111', 150) })), join(dir, 'briefs.jpg'), 6);
    const refs = await refsFor([], 3);
    const t = await claude({
      system: AD_REVIEW + kb, label: 'art director (przegląd)', max_tokens: 14000, effort: 'high',
      content: [
        { type: 'text', text: 'Reference pages (quality bar, private):' }, ...await Promise.all(refs.map(f => img(join(LAB, 'refs', f)))),
        { type: 'text', text: `Round ${r}. Contact sheet (kinds in rows: ${m.KINDS.join(', ')}). Legend:\n${cells.map(c => c.legend).join('\n')}` }, await img(join(dir, 'system.jpg')),
        { type: 'text', text: `QA measured by code (16 seeds x 3 slider settings per kind):\n${m.KINDS.map(k => statLine(k, stats[k])).join('\n')}` },
        ...(briefs.length ? [{ type: 'text', text: `Assistant choices:\n${briefs.map(b => `${b.id}: "${b.brief}" → ${b.kind} c${b.complexity} s${b.style} "${b.name}" - ${b.why}`).join('\n')}` }, await img(join(dir, 'briefs.jpg'))] : []),
        { type: 'text', text: `Previous review: ${state.review ? JSON.stringify({ overall: state.review.overall, kinds: Object.fromEntries(Object.entries(state.review.kinds || {}).map(([k, v]) => [k, v.score])) }) : 'none'}. Judge scores since then: ${JSON.stringify(Object.fromEntries(Object.entries(state.kinds).map(([k, v]) => [k, v.score])))}` },
      ],
    });
    let rev;
    try { rev = json(t); } catch { rev = null; }
    await writeFile(join(dir, 'review.json'), rev ? JSON.stringify(rev, null, 2) : t);
    if (rev) {
      state.review = rev;
      for (const [k, v] of Object.entries(rev.kinds || {})) state.kinds[k] = { score: v.score, issues: v.issues || [] };
      state.focus = (rev.focus || []).slice(0, 2);
      state.newKinds = rev.new_kinds || [];
      state.sinceReview = 0;
      await appendFile(join(LAB, 'scores.jsonl'), `${JSON.stringify({ round: r, version: sha(base), type: 'review', overall: rev.overall, briefs_fit: rev.briefs_fit, kinds: Object.fromEntries(Object.entries(rev.kinds || {}).map(([k, v]) => [k, v.score])), usd: +ledger.usd.toFixed(2) })}\n`);
      console.log(`  ocena: ${rev.overall}/10 · dopasowanie: ${rev.briefs_fit} · ${Object.entries(rev.kinds || {}).map(([k, v]) => `${k} ${v.score}`).join(', ')} · dalej: ${state.focus.join(', ')}`);
      await log(`## Runda ${r} - przegląd\n- ocena: ${rev.overall}/10, dopasowanie do opisów: ${rev.briefs_fit}\n- typy: ${Object.entries(rev.kinds || {}).map(([k, v]) => `${k} ${v.score}`).join(', ')}\n- dalej: ${state.focus.join(', ')}\n- asystent: ${rev.assistant || '-'}\n- koszt łącznie: $${ledger.usd.toFixed(2)}\n`);
    }
    await saveState();
    continue;
  }

  // 2. Runda pracy nad 1-2 typami: konstruktor → developer → bramki QA → sędzia (mistrz czy pretendent)
  const newOnes = state.focus.filter(f => f.startsWith('new:')).map(f => f.slice(4).trim().toLowerCase().replace(/[^a-z]/g, ''));
  const focus = [...state.focus.filter(f => !f.startsWith('new:') && m.KINDS.includes(f)), ...newOnes].filter(Boolean);
  if (!focus.length) { state.sinceReview = REVIEW_EVERY; await saveState(); continue; }
  console.log(`\n— runda ${r}: praca nad ${focus.join(', ')}`);
  const existing = focus.filter(k => m.KINDS.includes(k));
  const curCells = panelCells(m, existing);
  if (curCells.length) await sheet(curCells, join(dir, 'before.jpg'), 12);
  const stats = {};
  for (const k of existing) stats[k] = await kindStats(m, k);
  const feedback = k => (m.KINDS.includes(k)
    ? `${k} (current score ${state.kinds[k]?.score ?? '?'}/10): ${(state.kinds[k]?.issues || []).join(' | ')}\nQA: ${statLine(k, stats[k])}`
    : `NEW KIND "${k}": ${JSON.stringify((state.newKinds || []).find(x => x.name?.toLowerCase().replace(/[^a-z]/g, '') === k) || {})}`);
  const makerSrc = k => makerOf(base, k) ?? `(${k}: new kind - no code yet)`;
  const refs = await refsFor(focus, 2);

  // konstruktor: konstrukcja z liczbami + 3 wzorcowe znaki na typ; ucięta odpowiedź (limit zjadło myślenie) → ponownie z niższym wysiłkiem
  const cMsg = [
    { type: 'text', text: 'Reference pages (principles only):' }, ...await Promise.all(refs.map(f => img(join(LAB, 'refs', f)))),
    ...(curCells.length ? [{ type: 'text', text: `Current marks of the focus kinds (legend):\n${curCells.map(c => c.legend).join('\n')}` }, await img(join(dir, 'before.jpg'))] : []),
    { type: 'text', text: `Focus kinds and art-director feedback:\n${focus.map(feedback).join('\n\n')}\n\nCurrent code of these kinds (context):\n${focus.map(makerSrc).join('\n\n')}` },
  ];
  let spec = null;
  // niski wysiłek: przy średnim myślenie zjadało cały limit w każdej rundzie (rundy 4-6, ~$0,87 na darmo)
  for (const attempt of [1, 2]) {
    const ct = await claude({ system: CONSTRUCTOR + kb, label: attempt === 1 ? 'konstruktor' : 'konstruktor (ponownie)', max_tokens: 40000, effort: 'low', content: cMsg });
    try { spec = json(ct); break; } catch { if (attempt === 1) console.log('… konstruktor: niepełna odpowiedź - ponawiam'); }
  }
  spec ??= { kinds: {} };
  await writeFile(join(dir, 'constructor.json'), JSON.stringify(spec, null, 2));
  const golden = Object.entries(spec.kinds || {}).flatMap(([k, v]) => (v.golden || []).map((g, i) => ({ k, i, ...g })))
    .filter(g => /^<svg[\s\S]*<\/svg>$/.test((g.svg || '').trim()) && !/<script|<text|href|\son\w+=/i.test(g.svg));
  if (golden.length) await sheet(golden.map(g => ({ label: `${g.k} gold ${g.i + 1} c${g.complexity} s${g.style}`, svg: g.svg.trim() })), join(dir, 'golden.jpg'), 6);
  const goldenQa = golden.length ? await measure(golden.map(g => g.svg.trim())) : [];

  // developer (+ jedna poprawka: dostaje błędy i własną poprzednią odpowiedź)
  let accepted = false, candSrc = null, devText = '', errs = [];
  const cand = join(dir, 'generator.js');
  const specText = JSON.stringify(spec.kinds || {}, null, 1);
  for (let attempt = 0; attempt < 2 && !accepted; attempt++) {
    const msg = [
      { type: 'text', text: `Round ${r}. Focus kinds: ${focus.join(', ')} (new kinds to add: ${newOnes.join(', ') || 'none'}).\n\nConstructor spec (with golden SVG code):\n${specText}` },
      ...(golden.length ? [{ type: 'text', text: `Golden marks rendered (QA score of each golden: ${goldenQa.map((q, i) => `${golden[i].k}#${golden[i].i + 1} ${(q.q ?? 0).toFixed(2)}`).join(', ')}):` }, await img(join(dir, 'golden.jpg'))] : []),
      ...(curCells.length ? [{ type: 'text', text: `Current output of the focus kinds:\n${curCells.map(c => c.legend).join('\n')}` }, await img(join(dir, 'before.jpg'))] : []),
      { type: 'text', text: `Art-director feedback:\n${focus.map(feedback).join('\n\n')}` },
      { type: 'text', text: attempt
        ? `Your previous edits FAILED the checks:\n${errs.join('\n')}\n\nYour previous reply was:\n${devText.slice(0, 24000)}\n\nReturn corrected edits against the ORIGINAL current file below (same SEARCH/REPLACE format).\n\nCurrent generator.js:\n\`\`\`js\n${base}\n\`\`\``
        : `Current generator.js:\n\`\`\`js\n${base}\n\`\`\`` },
    ];
    devText = await claude({ system: DEVELOPER + kb, label: attempt ? 'developer (poprawka)' : 'developer', max_tokens: 48000, effort: 'low', content: msg });
    await writeFile(join(dir, `developer-raw-${attempt + 1}.md`), devText);
    const ed = applyEdits(base, devText);
    if (ed.error) { errs = [ed.error]; continue; }
    candSrc = ed.src;
    await writeFile(cand, candSrc);
    errs = await gates(cand, base, focus);
    accepted = !errs.length;
  }
  const notes = devText.split('NOTES:')[1]?.trim() || '';
  let verdict = 'odrzucone (bramki QA)';
  if (accepted) {
    // sędzia: mistrz (obecna) czy pretendent (nowa) - ten sam panel, kolejność A/B losowa
    const nm = await load(cand);
    const challengerIsB = Math.random() < .5;
    const [A, B] = challengerIsB ? [m, nm] : [nm, m];
    const kinds = focus.filter(k => nm.KINDS.includes(k));
    const both = kinds.flatMap(k => [...(A.KINDS.includes(k) ? panelCells(A, [k], 'A·') : []), ...(B.KINDS.includes(k) ? panelCells(B, [k], 'B·') : [])]);
    await sheet(both, join(dir, 'ab.jpg'), 12);
    const statsOf = async X => { const o = {}; for (const k of kinds.filter(k => X.KINDS.includes(k))) o[k] = await kindStats(X, k); return o; };
    const statsA = await statsOf(A), statsB = await statsOf(B);
    const jt = await claude({
      system: AD_JUDGE + kb, label: 'art director (sędzia)', max_tokens: 10000, effort: 'medium',
      content: [
        { type: 'text', text: `Kinds: ${kinds.join(', ')}. Cells prefixed A· are version A, B· are version B. Legend:\n${both.map(c => c.legend).join('\n')}` }, await img(join(dir, 'ab.jpg')),
        ...(golden.length ? [{ type: 'text', text: 'Constructor golden marks (target):' }, await img(join(dir, 'golden.jpg'))] : []),
        { type: 'text', text: `QA A:\n${Object.entries(statsA).map(([k, s]) => statLine(k, s)).join('\n') || '(kind not present in A)'}\nQA B:\n${Object.entries(statsB).map(([k, s]) => statLine(k, s)).join('\n') || '(kind not present in B)'}` },
      ],
    });
    let j;
    try { j = json(jt); } catch { j = { winner: '=' }; }
    const ch = challengerIsB ? 'B' : 'A', champ = challengerIsB ? 'A' : 'B';
    await writeFile(join(dir, 'judge.json'), JSON.stringify({ ...j, challenger: ch }, null, 2));
    const sc = (k, v) => +(j.kinds?.[k]?.[v] ?? 0);
    // typ po typie: nowy kod tylko tam, gdzie sędzia ocenił go wyżej (przy remisie - gdy pretendent wygrał całość);
    // pozostałe typy wracają do kodu mistrza, a bramki sprawdzają, czy wspólne funkcje nie zmieniły ich wyniku
    // nowy typ (mistrz go nie ma): tylko gdy pretendent wygrał całość albo typ dostał co najmniej 7
    const take = kinds.filter(k => (m.KINDS.includes(k)
      ? sc(k, ch) > sc(k, champ) || (j.winner === ch && sc(k, ch) === sc(k, champ))
      : j.winner === ch || sc(k, ch) >= 7));
    const keep = kinds.filter(k => !take.includes(k));
    // typy bez zmian: kod mistrza; nowy typ, którego nie bierzemy, nie ma kodu mistrza - wtedy cała zmiana odpada
    let src = take.length ? candSrc : null, merged = false;
    for (const k of keep) src = src && swapMaker(src, base, k);
    if (src && keep.length) {
      const hybrid = join(dir, 'hybrid.js');
      await writeFile(hybrid, src);
      const e2 = await gates(hybrid, base, take);
      if (e2.length) { src = null; errs = e2; merged = true; }
    }
    if (src) {
      await writeFile(current, src);
      await writeFile(join(LAB, 'versions', `${sha(src)}.js`), src);
      for (const k of take) state.kinds[k] = { score: sc(k, ch), issues: j.next?.[k] || [] };
      for (const k of keep) if (state.kinds[k]) state.kinds[k] = { score: sc(k, champ), issues: j.next?.[k] || state.kinds[k].issues };
      verdict = `przyjęte (${take.map(k => `${k} ${sc(k, champ)}→${sc(k, ch)}`).join(', ')})${keep.length ? ` · bez zmian: ${keep.map(k => `${k} mistrz ${sc(k, champ)} / pretendent ${sc(k, ch)}`).join(', ')}` : ''}`;
    } else {
      for (const k of kinds) if (state.kinds[k]) state.kinds[k].issues = j.next?.[k] || state.kinds[k].issues;
      verdict = `${merged ? 'odrzucone (bramki po scaleniu typów)' : 'odrzucone przez sędziego'} (${kinds.map(k => `${k} mistrz ${sc(k, champ)} / pretendent ${sc(k, ch)}`).join(', ')})`;
    }
    await appendFile(join(LAB, 'scores.jsonl'), `${JSON.stringify({ round: r, type: 'judge', focus: kinds, champion: Object.fromEntries(kinds.map(k => [k, sc(k, champ)])), challenger: Object.fromEntries(kinds.map(k => [k, sc(k, ch)])), accepted: verdict.startsWith('przyjęte'), usd: +ledger.usd.toFixed(2) })}\n`);
  }
  await writeFile(join(dir, 'developer.md'), `${notes}\n\n${verdict.toUpperCase()}${errs.length ? `\n${errs.join('\n')}` : ''}`);
  // po dwóch nieudanych rundach z rzędu - nowy przegląd i nowy wybór typów; po udanej - dalej te same typy
  state.failStreak = verdict.startsWith('przyjęte') ? 0 : (state.failStreak || 0) + 1;
  state.sinceReview = state.failStreak >= 2 ? REVIEW_EVERY : state.sinceReview + 1;
  if (state.failStreak >= 2) state.failStreak = 0;
  await saveState();
  console.log(`  ${verdict}${errs.length ? ` · ${errs.slice(0, 2).join(' · ')}` : ''}`);
  await log(`## Runda ${r} - praca: ${focus.join(', ')}\n- konstruktor: ${golden.length} wzorców\n- ${verdict}${errs.length ? `\n- błędy: ${errs.slice(0, 3).join(' · ')}` : ''}\n${notes.split('\n').map(l => `  ${l}`).join('\n')}\n- koszt łącznie: $${ledger.usd.toFixed(2)}\n`);
}
await browser.close();
console.log(`\nkoniec · wydano $${ledger.usd.toFixed(2)} z ${BUDGET} · wynik: private/mark-lab/current.js`);
