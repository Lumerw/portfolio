// Cloudflare Worker: pośrednik między stroną a Claude API - czat asystenta (/) i art director generatora znaków (/mark).
// Klucz API jest tylko tutaj (sekret ANTHROPIC_API_KEY), nigdy w przeglądarce.
// Wiedza o portfolio: content.js wbudowany przy `wrangler deploy` - po zmianie treści wdróż ponownie.
// Wdrożenie i ustawienia: README → „Asystent AI”.
import { content } from '../content.js';
import { systemPrompt } from '../agent.js';

const MAX_MESSAGES = 12;     // ostatnie wiadomości rozmowy wysyłane do modelu
const MAX_CHARS = 500;       // = maxlength pola na stronie
const MAX_TOKENS = 2000;     // limit odpowiedzi razem z myśleniem modelu (Opus 5.5 myśli zawsze; 1-4 zdania z zapasem)

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://lumerw.com').split(',').map(s => s.trim());
    const ok = allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!ok) return json({ error: 'origin' }, 403);

    // Limit zapytań na adres IP (wiązanie LIMITER w wrangler.toml).
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: req.headers.get('CF-Connecting-IP') || 'anon' });
      if (!success) return json({ error: 'rate' }, 429);
    }

    let body;
    try { body = await req.json(); } catch { return json({ error: 'json' }, 400); }
    const lang = body?.lang === 'en' ? 'en' : 'pl';
    if (new URL(req.url).pathname === '/mark') return mark(body, lang, env, json);
    if (new URL(req.url).pathname === '/mark/pick') return pickMark(body, lang, env, json);
    if (new URL(req.url).pathname === '/lab') return lab(body, env, json);
    const messages = validate(body?.messages);
    if (!messages) return json({ error: 'messages' }, 400);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
    });
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
const anthropic = (env, body) => fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'server-side-fallback-2026-07-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({ model: env.MODEL || 'claude-opus-5-5', output_config: { effort: 'low' }, fallbacks: 'default', ...body }),
});
// Pierwszy obiekt JSON z odpowiedzi modelu (tylko bloki tekstu); null, gdy go nie ma
const reply = data => {
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  try { return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { return null; }
};
// Typy znaków i ich opisy z generator.js (KIND_INFO) - nowy typ w generatorze trafia tu po `wrangler deploy`
import { KINDS, KIND_INFO } from '../generator.js';
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
For a brand brief, the first step chose a mark kind and a working concept; the algorithm then drew the strongest candidates of that kind. Look at the images and choose the single best mark for the brief: one clear idea, balanced and optically centred, confident negative space, legible at 16 px, and no accidental figures (letters, digits, faces, arrows, hearts or known logos the brief did not ask for).
Then name it and say why, describing only what is visible in the chosen mark (its shape and its one negative-space idea) and how that answers the brief. Never claim details the image does not show; drop the working concept if the drawing does not carry it.
Reply with ONLY a JSON object, no prose: {"pick": <candidate number>, "name": "2-4 word concept name", "why": "one short sentence"}. Write name and why in ${lang === 'en' ? 'English' : 'Polish'}. Use a plain hyphen "-", never long dashes.`;
export const pickMessage = ({ brief, kind, name, why, images }, info = KIND_INFO) => [
  { type: 'text', text: `Brand brief: ${brief}\nMark kind: ${kind} (${info[kind]?.brief ?? ''})\nWorking concept: ${[name, why].filter(Boolean).join(' - ') || '-'}` },
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
  if (!brief || !KINDS.includes(body?.kind) || images.length < 2 || images.length > 4 || !images.every(isMarkPng)) return json({ error: 'pick' }, 400);
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
