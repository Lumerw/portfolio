// Cloudflare Worker: pośrednik między stroną a Claude API - czat asystenta (/) i art director generatora znaków (/mark).
// Klucz API jest tylko tutaj (sekret ANTHROPIC_API_KEY), nigdy w przeglądarce.
// Wiedza o portfolio: content.js wbudowany przy `wrangler deploy` - po zmianie treści wdróż ponownie.
// Wdrożenie i ustawienia: README → „Asystent AI”.
import { content } from '../content.js';
import { systemPrompt } from '../agent.js';
import { FIGMA_TOOLS, figmaSystem } from './figma-skill.js';
export { FigmaUsage } from './figma-usage.js';

const MAX_MESSAGES = 12;     // ostatnie wiadomości rozmowy wysyłane do modelu
const MAX_CHARS = 500;       // = maxlength pola na stronie
const MAX_TOKENS = 2000;     // limit odpowiedzi razem z myśleniem modelu (Opus 5.5 myśli zawsze; 1-4 zdania z zapasem)

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://lumerw.com').split(',').map(s => s.trim());
    // Ten sam Worker pod workers.dev i pod lumerw.com/api (trasa w Cloudflare) - przedrostek /api odpada
    const path = new URL(req.url).pathname.replace(/^\/api(?=\/|$)/, '') || '/';
    // plugin lumerw w Figmie: okno pluginu ma origin "null" - dopuszczony tylko na /figma
    const plugin = (path === '/figma' || path === '/figma/file') && origin === 'null';
    const ok = allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) || plugin;
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization, x-lumerw-plugin, x-file-name',
      'Vary': 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!ok) return json({ error: 'origin' }, 403);

    // Załącznik z czatu pluginu - tylko z okna pluginu, treść płynie strumieniem do Files API
    if (path === '/figma/file') {
      if (!plugin || req.headers.get('x-lumerw-plugin') !== '1') return json({ error: 'origin' }, 403);
      const lim = env.FILE_LIMITER ?? env.FIGMA_LIMITER;
      if (lim && !(await lim.limit({ key: `file:${req.headers.get('CF-Connecting-IP') || 'anon'}` })).success) return json({ error: 'rate' }, 429);
      const who = await figmaGate(req, env, json, +(req.headers.get('content-length') || 0) / 1e6);
      if (who.denied) return who.denied;
      return figmaFile(req, env, json, who.user, ctx);
    }
    // Asystent w pluginie: własny, większy limit (jedna odpowiedź to kilka kroków z narzędziami)
    if (path === '/figma') {
      if (plugin && req.headers.get('x-lumerw-plugin') !== '1') return json({ error: 'origin' }, 403);
      const lim = env.FIGMA_LIMITER ?? env.LIMITER;
      if (lim && !(await lim.limit({ key: `figma:${req.headers.get('CF-Connecting-IP') || 'anon'}` })).success) return json({ error: 'rate' }, 429);
      if (+(req.headers.get('content-length') || 0) > FIGMA_MAX_BYTES) return json({ error: 'size' }, 413);
      const who = await figmaGate(req, env, json);
      if (who.denied) return who.denied;
      let body;
      try { body = await req.json(); } catch { return json({ error: 'json' }, 400); }
      return figma(body, body?.lang === 'en' ? 'en' : 'pl', env, json, cors, who.user, ctx);
    }
    // Limit zapytań na adres IP (wiązanie LIMITER w wrangler.toml).
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: req.headers.get('CF-Connecting-IP') || 'anon' });
      if (!success) return json({ error: 'rate' }, 429);
    }

    let body;
    try { body = await req.json(); } catch { return json({ error: 'json' }, 400); }
    const lang = body?.lang === 'en' ? 'en' : 'pl';
    if (path === '/mark') return mark(body, lang, env, json);
    if (path === '/mark/pick') return pickMark(body, lang, env, json);
    if (path === '/mark/draw') return drawMark(body, lang, env, json);
    if (path === '/lab') return lab(body, env, json);
    const messages = validate(body?.messages);
    if (!messages) return json({ error: 'messages' }, 400);

    const res = await logged(fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        // odmowa modelu (klasyfikatory bezpieczeństwa) → API samo ponawia na zapasowym modelu
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MODEL || 'claude-opus-5-5',
        max_tokens: MAX_TOKENS,
        output_config: { effort: 'low' },   // krótkie odpowiedzi z treści portfolio - niski wysiłek wystarcza
        fallbacks: 'default',
        // Wiedza się nie zmienia między pytaniami - cache obniża koszt kolejnych zapytań.
        system: [{ type: 'text', text: systemPrompt(content, lang), cache_control: { type: 'ephemeral' } }],
        messages,
      }),
    }));
    if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
    const data = await res.json();
    if (data.stop_reason === 'refusal') return json({ error: 'refusal' }, 502);   // czat przejdzie na tryb lokalny
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    if (!text) return json({ error: 'empty' }, 502);
    return json({ text: text.replace(/[—–]/g, '-') });
  },
};

// Rozmowa: user / assistant na zmianę, zaczyna i kończy pytanie, krótkie teksty. Inaczej null.
function validate(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const msgs = list.slice(-MAX_MESSAGES);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs.at(-1).role !== 'user') return null;
  const out = [];
  for (const [i, m] of msgs.entries()) {
    const role = i % 2 === 0 ? 'user' : 'assistant';
    if (m?.role !== role || typeof m.content !== 'string' || !m.content.trim()) return null;
    out.push({ role, content: m.content.slice(0, role === 'user' ? MAX_CHARS : 2000) });
  }
  return out;
}

/* ---------- Generator znaków: Claude jako art director ----------
   1. /mark: opis marki → ustawienia algorytmu ze strony (generator.js): typ znaku, złożoność, styl, obrót, nazwa
      i jedno zdanie uzasadnienia. Claude nie rysuje SVG - wybiera kierunek, rysuje algorytm (zawsze poprawny znak
      w stylu strony).
   2. /mark/pick: przeglądarka rysuje ~30 kandydatów, kontrola jakości (mark-qa.js) zostawia 4 najlepsze różne;
      art director ogląda je i wybiera jeden, a nazwę i uzasadnienie pisze do tego, co widać na obrazie.
   Odpowiedzi sprawdzane i przycinane do dozwolonych wartości. */
const clean = (v, n) => (typeof v === 'string' ? v : '').replace(/[—–]/g, '-').replace(/[<>]/g, '').trim().slice(0, n);
// Błąd API do logów Workera (wrangler tail): status i treść odpowiedzi, bez nagłówków i klucza
const logged = async req => {
  const res = await req;
  if (!res.ok) console.error('anthropic', res.status, (await res.clone().text()).slice(0, 600));
  return res;
};
const anthropic = (env, body) => logged(fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'server-side-fallback-2026-07-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({ model: env.MODEL || 'claude-opus-5-5', output_config: { effort: 'low' }, fallbacks: 'default', ...body }),
}));
// Pierwszy obiekt JSON z odpowiedzi modelu (tylko bloki tekstu); null, gdy go nie ma
const reply = data => {
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  try { return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { return null; }
};
// Typy znaków i ich opisy z generator.js (KIND_INFO) - nowy typ w generatorze trafia tu po `wrangler deploy`
import { KINDS, KIND_INFO, customMark } from '../generator.js';
// Prompt art directora /mark - funkcja, żeby laboratorium (tools/mark-lab.mjs) testowało go na rozwijanej wersji typów
export const markSystem = (kinds = KINDS, info = KIND_INFO, lang = 'pl') => `You are the art director of a mark generator on the portfolio of Wojciech Lumer, a designer of identities and digital products.
An algorithm draws the mark; you choose its parameters from the brand brief. Principles: one idea, simple geometry, legible at 16 px, black on paper (colour comes later), negative space, grid and rhythm, symmetry (mirror or rotational), a carrier shape when the brand needs stability. Never imitate an existing trademark.
Mark kinds:
${kinds.map(k => `- ${k}: ${info[k].brief}.`).join('\n')}
Parameters: complexity 0-100 (low = iconic and minimal, high = more elements), style 0-100 (0 = square, sharp, technical; 50 = sharp geometric; 100 = round, organic, friendly), rotate in degrees (0, 45, 90, 180 or 270; usually 0).
Reply with ONLY a JSON object, no prose: {"kind": "...", "complexity": 0-100, "style": 0-100, "rotate": 0, "name": "2-4 word concept name", "why": "one short sentence on how the mark answers the brief"}. Write name and why in ${lang === 'en' ? 'English' : 'Polish'}. Use a plain hyphen "-", never long dashes.`;

async function mark(body, lang, env, json) {
  const brief = typeof body?.brief === 'string' ? body.brief.trim().slice(0, 160) : '';
  if (!brief) return json({ error: 'brief' }, 400);
  const res = await anthropic(env, {
    max_tokens: 1500,
    system: [{ type: 'text', text: markSystem(KINDS, KIND_INFO, lang), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Brand brief: ${brief}` }],
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
  const data = await res.json();
  if (data.stop_reason === 'refusal') return json({ error: 'refusal' }, 502);
  const p = reply(data);
  if (!p) return json({ error: 'parse' }, 502);
  if (!KINDS.includes(p.kind)) return json({ error: 'kind' }, 502);
  return json({ ...markParams(p), seed: 1 + Math.floor(Math.random() * 99999) });   // numer losuje Worker - model powtarza te same liczby
}
// Odpowiedź modelu /mark → dozwolone wartości (też w laboratorium, żeby testowało to samo co strona)
export const markParams = p => {
  const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : d);
  return {
    kind: p.kind,
    complexity: num(p.complexity, 0, 100, 40),
    style: num(p.style, 0, 100, 60),
    rotate: [0, 45, 90, 180, 270].includes(+p.rotate) ? +p.rotate : 0,
    name: clean(p.name, 40),
    why: clean(p.why, 180),
  };
};

// Prompt i wiadomość wyboru z kandydatów - funkcje, żeby laboratorium testowało asystenta tak samo jak strona
export const pickSystem = (lang = 'pl') => `You are the art director of a mark generator on the portfolio of Wojciech Lumer, a designer of identities and digital products.
For a brand brief, several candidate marks were drawn (bespoke concepts, or an algorithm's strongest candidates of one kind). Look at the images and choose the single best mark for the brief: one clear idea, balanced and optically centred, confident negative space, legible at 16 px, and no accidental figures (letters, digits, faces, arrows, hearts or known logos the brief did not ask for).
Then name it and say why, describing only what is visible in the chosen mark (its shape and its one negative-space idea) and how that answers the brief. Never claim details the image does not show; drop the working concept if the drawing does not carry it.
Reply with ONLY a JSON object, no prose: {"pick": <candidate number>, "name": "2-4 word concept name", "why": "one short sentence"}. Write name and why in ${lang === 'en' ? 'English' : 'Polish'}. Use a plain hyphen "-", never long dashes.`;
export const pickMessage = ({ brief, kind, name, why, images }, info = KIND_INFO) => [
  { type: 'text', text: `Brand brief: ${brief}\nMark kind: ${kind === 'custom' ? 'custom - drawn from scratch for this brief' : `${kind} (${info[kind]?.brief ?? ''})`}\nWorking concept: ${[name, why].filter(Boolean).join(' - ') || '-'}` },
  ...images.flatMap((data, i) => [{ type: 'text', text: `Candidate ${i + 1}:` }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data } }]),
];

// Obraz kandydata: PNG 256 × 256 (sygnatura i nagłówek IHDR), do ~40 KB - nic innego nie trafia do modelu
const MAX_PNG = 54000;      // znaków base64
function isMarkPng(s) {
  if (typeof s !== 'string' || s.length < 32 || s.length > MAX_PNG || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
  const b = Uint8Array.from(atob(s.slice(0, 32)), ch => ch.charCodeAt(0));
  const be = i => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && be(12) === 0x49484452 && be(16) === 256 && be(20) === 256;
}

async function pickMark(body, lang, env, json) {
  const brief = typeof body?.brief === 'string' ? body.brief.trim().slice(0, 160) : '';
  const images = Array.isArray(body?.images) ? body.images : [];
  if (!brief || !(KINDS.includes(body?.kind) || body?.kind === 'custom') || images.length < 2 || images.length > 4 || !images.every(isMarkPng)) return json({ error: 'pick' }, 400);
  const res = await anthropic(env, {
    max_tokens: 2000,
    system: [{ type: 'text', text: pickSystem(lang), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: pickMessage({ brief, kind: body.kind, name: clean(body.name, 40), why: clean(body.why, 180), images }) }],
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
  const data = await res.json();
  if (data.stop_reason === 'refusal') return json({ error: 'refusal' }, 502);
  const p = reply(data), n = Math.round(+p?.pick);
  if (!(n >= 1 && n <= images.length)) return json({ error: 'parse' }, 502);
  return json({ pick: n, name: clean(p.name, 40), why: clean(p.why, 180) });
}

/* ---------- Znak autorski (/mark/draw): Claude projektuje od zera 4 różne koncepcje pod opis marki ----------
   Odpowiedź to geometria (koła, prostokąty, wielokąty, ścieżki, linie, wycięcia) w polu 200 × 200; customMark()
   z generator.js przepuszcza tylko liczby z zakresu i polecenia ścieżek. Rysuje i ocenia przeglądarka. */
export const drawSystem = (lang = 'pl') => `You are a senior identity designer on the portfolio of Wojciech Lumer. For a brand brief, design 4 bespoke brand marks (symbols, no lettering) from scratch.
Process: pull 4 different ideas out of the brief itself (what the brand makes, its origin, its inspirations, its character) - each mark carries one idea, and the 4 must differ in idea and construction. Do not fall back on generic templates (plain circle with a slice, generic star, random tiles) unless the brief truly points there. Think in negative space, figure-ground, a clever double reading, grid and rhythm, symmetry where it helps.
Craft: one clear silhouette, simple geometry, legible at 16 px, black on paper, optically centred, filling about 110-140 px of the 200 x 200 field (keep it inside 30-170), no parts thinner than 8 px, no gaps narrower than 6 px, no tiny crumbs. Never imitate an existing trademark, no letters or digits unless the brief asks.
Geometry (coordinates in the 200 x 200 field, y down). Each shape has "op": "add" (ink), "cut" (removes ink below - negative space) or "line" (a thick stroke):
- {"op": "add|cut", "t": "circle", "cx": 100, "cy": 100, "r": 40}
- {"op": "add|cut", "t": "rect", "x": 60, "y": 60, "w": 80, "h": 80, "rx": 0}
- {"op": "add|cut", "t": "poly", "pts": [[100, 40], [160, 150], [40, 150]], "rx": 0}   (rx rounds corners)
- {"op": "add|cut", "t": "path", "d": "M... C... Z"}   (SVG path commands M L H V C S Q T A Z, absolute coordinates preferred; use it for organic curves)
- {"op": "line", "t": "line", "d": "M... L...", "w": 14, "cap": "round|square"}
Cuts apply to all ink. Up to 24 shapes per mark; prefer few. Optional "evenodd": true on a mark makes overlapping "add" shapes cancel out.
Reply with ONLY a JSON object, no prose: {"marks": [{"name": "2-4 word concept name", "why": "one short sentence on the idea", "shapes": [...]}, ...4 marks]}. Write name and why in ${lang === 'en' ? 'English' : 'Polish'}. Use a plain hyphen "-", never long dashes.`;

async function drawMark(body, lang, env, json) {
  const brief = typeof body?.brief === 'string' ? body.brief.trim().slice(0, 160) : '';
  if (!brief) return json({ error: 'brief' }, 400);
  const res = await anthropic(env, {
    max_tokens: 16000,
    output_config: { effort: 'medium' },   // projekt od zera - więcej myślenia niż wybór parametrów
    system: [{ type: 'text', text: drawSystem(lang), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Brand brief: ${brief}` }],
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
  const data = await res.json();
  if (data.stop_reason === 'refusal') return json({ error: 'refusal' }, 502);
  const marks = (reply(data)?.marks || []).slice(0, 6).map(customMark).filter(Boolean);
  if (!marks.length) return json({ error: 'parse' }, 502);
  return json({ marks });
}

/* ---------- Laboratorium znaków (tools/mark-lab.mjs): art director i developer ----------
   Tylko z tajnym tokenem (sekret LAB_TOKEN, kopia lokalnie w private/lab-token - poza repozytorium).
   Przekazuje rozmowę do Claude API i zwraca odpowiedź razem ze zużyciem tokenów (licznik kosztów w narzędziu). */
async function lab(body, env, json) {
  if (!env.LAB_TOKEN || body?.token !== env.LAB_TOKEN) return json({ error: 'token' }, 403);
  // Strumień (SSE) prosto do narzędzia: długie odpowiedzi developera (kilka minut) nie zrywają połączenia
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: body.model || env.MODEL || 'claude-opus-5-5',
      max_tokens: Math.min(+body.max_tokens || 8000, 64000),
      stream: true,
      ...(body.effort && { output_config: { effort: body.effort } }),
      system: body.system,
      messages: body.messages,
    }),
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status, detail: (await res.text()).slice(0, 500) }, 502);
  const cors = Object.fromEntries([...json({}).headers].filter(([k]) => k.startsWith('access-control') || k === 'vary'));
  return new Response(res.body, { status: 200, headers: { ...cors, 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' } });
}

// ---------- /figma: dostęp - token użytkownika i dzienny limit kosztów ----------
// Nagłówek pluginu i origin da się podrobić, więc o dostępie decyduje token: sekret FIGMA_TOKENS w postaci
// „nazwa:token,nazwa2:token2” (token min. 32 znaki, np. `openssl rand -hex 32`). Bez sekretu nikt nie wejdzie.
const sha256 = async text => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
export async function figmaUser(req, env) {
  const got = /^Bearer (\S+)$/.exec(req.headers.get('Authorization') || '')?.[1];
  if (!got) return null;
  const hash = await sha256(got);
  for (const entry of (env.FIGMA_TOKENS || '').split(',')) {
    const at = entry.indexOf(':'), name = entry.slice(0, at).trim(), token = entry.slice(at + 1).trim();
    if (!name || token.length < 32) continue;
    const other = await sha256(token);
    if (!hash.reduce((diff, v, i) => diff | (v ^ other[i]), 0)) return name;   // porównanie skrótów bez wczesnego wyjścia
  }
  return null;
}
const figmaUsage = (env, op) => env.FIGMA_USAGE.get(env.FIGMA_USAGE.idFromName('global'))
  .fetch('https://usage/', { method: 'POST', body: JSON.stringify(op) }).then(r => r.json());
// { user } albo { denied: gotowa odpowiedź }. Limit na użytkownika i na cały serwer (wrangler.toml); liczy się po każdej odpowiedzi.
async function figmaGate(req, env, json, mb = 0) {
  const user = await figmaUser(req, env);
  if (!user) return { denied: json({ error: 'token' }, 401) };
  if (!env.FIGMA_USAGE) return { denied: json({ error: 'config' }, 503) };
  const limit = (value, fallback) => (value === undefined || value === '' ? fallback : +value);   // „0” wyłącza asystenta
  const limits = { usd: limit(env.FIGMA_DAILY_USD, 10), total: limit(env.FIGMA_TOTAL_DAILY_USD, 20), mb: limit(env.FIGMA_DAILY_FILES_MB, 2000) };
  return (await figmaUsage(env, { op: 'check', user, mb, limits })).ok ? { user } : { denied: json({ error: 'budget' }, 429) };
}
// Koszt odpowiedzi w USD: stawki za milion tokenów dla Opus 5.5 (wyjście, wejście, zapis i odczyt cache). Tańszy MODEL liczy się
// zawyżone, czyli bezpiecznie; przy droższym zmień stawki. usage.iterations rozbija odpowiedź na próby (odmowa i model zapasowy).
const PRICE = { input: 4, output: 20, read: 0.2, write: 5 };
const costOne = u => ((u.input_tokens || 0) * PRICE.input + (u.output_tokens || 0) * PRICE.output
  + (u.cache_read_input_tokens || 0) * PRICE.read + (u.cache_creation_input_tokens || 0) * PRICE.write) / 1e6;
export const costOf = u => Math.max(costOne(u), (u.iterations || []).reduce((sum, x) => sum + costOne(x), 0));
// Strumień modelu idzie do pluginu bajt w bajt. Plan Free to 10 ms CPU, więc parsowane są tylko dwa zdarzenia z licznikiem tokenów,
// a treść nie. Klient się rozłączył (przycisk Stop): model też przestaje pisać, a wyjście szacujemy z liczby przesłanych bajtów.
function meterStream(upstream, env, user, ctx) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter(), reader = upstream.getReader(), dec = new TextDecoder();
  let usage = {}, tail = '', bytes = 0, finished = false, gone = false;
  writer.closed.catch(() => { gone = true; reader.cancel().catch(() => {}); });   // klient zamknął połączenie
  const pump = (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done || gone) break;
        bytes += value.length;
        const lines = (tail + dec.decode(value, { stream: true })).split('\n');
        tail = lines.pop();
        for (const line of lines) if (line.includes('"type":"message_')) {
          try { const d = JSON.parse(line.replace(/^data: ?/, '')), u = d.usage ?? d.message?.usage; if (u) usage = { ...usage, ...u }; } catch { /* zdarzenie bez licznika */ }
        }
        await writer.write(value);
      }
      finished = !gone;
      if (finished) await writer.close();
    } catch {
      reader.cancel().catch(() => {}); writer.abort().catch(() => {});
    }
    if (!finished || !usage.output_tokens) usage.output_tokens = Math.max(usage.output_tokens || 0, Math.ceil(bytes / 30));
    await figmaUsage(env, { op: 'add', user, usd: costOf(usage) }).catch(e => console.error('usage', e.message));
  })();
  if (ctx?.waitUntil) ctx.waitUntil(pump);
  return readable;
}

// ---------- /figma: asystent projektowy w pluginie lumerw ----------
// Plugin prowadzi pętlę: wysyła rozmowę (tekst, zrzuty, wyniki narzędzi), dostaje odpowiedź modelu z blokami
// tool_use, wykonuje je w Figmie i odsyła tool_result. Worker tylko sprawdza rozmowę i dokleja wiedzę i narzędzia.
const FIGMA_MAX_BYTES = 6_000_000;
const FIGMA_MAX_MESSAGES = 120;   // pętla projektowa: do ~24 kroków narzędzi na pytanie
const FIGMA_TOOL_NAMES = new Set(FIGMA_TOOLS.map(t => t.name));
const isImage = b => b?.type === 'image' && b.source?.type === 'base64' && ['image/png', 'image/jpeg'].includes(b.source.media_type)
  && typeof b.source.data === 'string' && b.source.data.length < 2_000_000 && /^[A-Za-z0-9+/=]+$/.test(b.source.data);
const isText = b => b?.type === 'text' && typeof b.text === 'string' && b.text.length <= 20_000;
// załącznik: tylko podpisany odnośnik z /figma/file (file_id nigdy nie przychodzi od klienta bez podpisu)
const isFile = b => ['document', 'image'].includes(b?.type) && b.source?.type === 'file' && typeof b.source.ref === 'string' && /^file_[A-Za-z0-9_-]{1,100}\.[A-Za-z0-9_-]{43}$/.test(b.source.ref)
  && (b.title === undefined || (b.type === 'document' && typeof b.title === 'string' && b.title.length <= 255));
export function validateFigma(list) {
  if (!Array.isArray(list) || !list.length || list.length > FIGMA_MAX_MESSAGES) return null;
  for (const [i, m] of list.entries()) {
    if (m?.role !== (i % 2 ? 'assistant' : 'user')) return null;
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    if (!Array.isArray(blocks) || !blocks.length) return null;
    for (const b of blocks) {
      const okUser = isText(b) || isImage(b) || isFile(b) || (b?.type === 'tool_result' && typeof b.tool_use_id === 'string'
        && (typeof b.content === 'string' ? b.content.length <= 60_000 : Array.isArray(b.content) && b.content.every(c => isText(c) || isImage(c))));
      const okAssistant = isText(b) || (b?.type === 'tool_use' && FIGMA_TOOL_NAMES.has(b.name) && typeof b.id === 'string')
        || ['thinking', 'redacted_thinking'].includes(b?.type);
      if (m.role === 'user' ? !okUser : !okAssistant) return null;
    }
  }
  return list[list.length - 1].role === 'user' ? list : null;
}
// cache całej dotychczasowej rozmowy (znacznik na ostatnim bloku): kolejne kroki agenta płacą za nią 5% ceny wejścia
const cacheTail = list => list.map((m, i) => {
  if (i !== list.length - 1) return m;
  const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
  return { ...m, content: blocks.map((b, j) => (j === blocks.length - 1 ? { ...b, cache_control: { type: 'ephemeral' } } : b)) };
});
// ---------- /figma/file: załącznik z czatu pluginu → Files API ----------
// Plan Free Workera to 10 ms CPU i 128 MB pamięci, więc plik nie jest czytany ani buforowany: Worker dokleja nagłówki
// formularza i przepuszcza strumień. 100 MB to limit ciała zapytania w planie Free Cloudflare.
const FILE_MAX_BYTES = 100_000_000;
const FILE_TTL = 86_400;          // plik wygasa po dobie - w zapisanej rozmowie zostaje tylko jego nazwa
const FILES_PER_CHAT = 40;
const FILE_KINDS = { 'application/pdf': 'document', 'text/plain': 'document', 'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'image/webp': 'image' };
const fileName = raw => {
  let s = '';
  try { s = decodeURIComponent(raw || ''); } catch {}
  return s.replace(/[<>:"|?*\\/\u0000-\u001f]/g, '_').slice(0, 200) || 'plik';
};
// Files API jest wspólne dla całego konta, więc identyfikator pliku wraca do klienta tylko z podpisem Workera
// (HMAC kluczem API - bez osobnego sekretu), a przy pytaniu podpis jest sprawdzany: cudzego pliku nie da się wskazać.
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fileSig = async (id, env) => b64url(await crypto.subtle.sign('HMAC',
  await crypto.subtle.importKey('raw', new TextEncoder().encode(env.ANTHROPIC_API_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
  new TextEncoder().encode(`lumerw-file:${id}`)));
async function figmaFile(req, env, json, user, ctx) {
  const type = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), kind = FILE_KINDS[type];
  if (!kind) return json({ error: 'type' }, 415);
  const size = +(req.headers.get('content-length') || 0);
  if (!size || !req.body) return json({ error: 'empty' }, 400);
  if (size > FILE_MAX_BYTES) return json({ error: 'size' }, 413);
  const boundary = `lumerw${crypto.randomUUID().replaceAll('-', '')}`, enc = new TextEncoder();
  const head = enc.encode(`--${boundary}\r\ncontent-disposition: form-data; name="expires_in_seconds"\r\n\r\n${FILE_TTL}\r\n`
    + `--${boundary}\r\ncontent-disposition: form-data; name="file"; filename="${fileName(req.headers.get('x-file-name'))}"\r\ncontent-type: ${type}\r\n\r\n`);
  const tail = enc.encode(`\r\n--${boundary}--\r\n`);
  const { readable, writable } = typeof FixedLengthStream === 'function' ? new FixedLengthStream(head.length + size + tail.length) : new TransformStream();
  const pump = (async () => {
    let w = writable.getWriter(); await w.write(head); w.releaseLock();
    await req.body.pipeTo(writable, { preventClose: true });
    w = writable.getWriter(); await w.write(tail); await w.close();
  })();
  pump.catch(() => {});
  const res = await logged(fetch('https://api.anthropic.com/v1/files', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': `multipart/form-data; boundary=${boundary}` },
    body: readable,
    duplex: 'half',
  }));
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    return json({ error: 'upstream', status: res.status, credit: /credit balance/i.test(detail) }, 502);
  }
  const { id } = await res.json();
  const counted = figmaUsage(env, { op: 'add', user, mb: size / 1e6 }).catch(e => console.error('usage', e.message));
  if (ctx?.waitUntil) ctx.waitUntil(counted);
  return json({ ref: `${id}.${await fileSig(id, env)}`, kind });
}
// podpisane odnośniki → prawdziwe bloki plików; null, gdy podpis się nie zgadza albo plików jest za dużo
async function resolveFiles(list, env) {
  let count = 0;
  const out = [];
  for (const m of list) {
    if (!Array.isArray(m.content)) { out.push(m); continue; }
    const blocks = [];
    for (const b of m.content) {
      if (b.source?.type !== 'file') { blocks.push(b); continue; }
      const [id, sig] = b.source.ref.split('.');
      if (++count > FILES_PER_CHAT || sig !== await fileSig(id, env)) return null;
      blocks.push({ type: b.type, source: { type: 'file', file_id: id }, ...(b.title ? { title: b.title } : {}) });
    }
    out.push({ ...m, content: blocks });
  }
  return out;
}
async function figma(body, lang, env, json, cors, user, ctx) {
  const checked = validateFigma(body?.messages);
  if (!checked) return json({ error: 'messages' }, 400);
  const messages = await resolveFiles(checked, env);
  if (!messages) return json({ error: 'file' }, 403);
  const res = await anthropic(env, {
    stream: true,        // tekst pojawia się w pluginie na bieżąco, a przycisk Stop przerywa też pracę modelu
    max_tokens: 16000,   // projekty budowane narzędziem build to spore struktury JSON
    output_config: { effort: 'medium' },
    // wiedza i narzędzia stałe między pytaniami - cache
    system: [{ type: 'text', text: figmaSystem(lang), cache_control: { type: 'ephemeral' } }],
    tools: FIGMA_TOOLS.map((t, i) => (i === FIGMA_TOOLS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t)),
    messages: cacheTail(messages),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    return json({ error: 'upstream', status: res.status, credit: /credit balance/i.test(detail),
      gone: /file.*(not found|expired)/i.test(detail), tooBig: /too long|too large|exceed|maximum.*pages|pages.*maximum/i.test(detail),
      thinking: /signature.*thinking|thinking.*signature/i.test(detail) }, 502);   // plugin usuwa bloki myślenia i ponawia raz
  }
  return new Response(meterStream(res.body, env, user, ctx), { headers: { ...cors, 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' } });
}
