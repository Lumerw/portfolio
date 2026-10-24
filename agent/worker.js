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
   Opis marki → ustawienia algorytmu ze strony (generator.js): typ znaku, złożoność, styl, obrót, nazwa
   i jedno zdanie uzasadnienia. Claude nie rysuje SVG - wybiera kierunek, rysuje algorytm (zawsze poprawny znak
   w stylu strony). Odpowiedź sprawdzana i przycinana do dozwolonych wartości. */
const KINDS = ['carrier', 'interlock', 'radial', 'grid', 'stencil', 'blob', 'line'];
const MARK_SYSTEM = `You are the art director of a mark generator on the portfolio of Wojciech Lumer, a designer of identities and digital products.
An algorithm draws the mark; you choose its parameters from the brand brief. Principles: one idea, simple geometry, legible at 16 px, black on paper (colour comes later), negative space, grid and rhythm, symmetry (mirror or rotational), a carrier shape when the brand needs stability. Never imitate an existing trademark.
Mark kinds:
- carrier: a circle or square with negative-space cuts (band, notch, crescent, slit, hole) - institutions, stability, finance, law, tech platforms.
- interlock: 2-4 overlapping rings or frames, overlaps cut out - partnership, community, connection, network.
- radial: 3-10 arms or blades around a centre (asterisk, star, propeller) - energy, light, growth, events, food, kids.
- grid: modular 2x2-4x4 tiles of quarter circles, half circles, squares and triangles, often mirrored - architecture, design, culture, systems.
- stencil: a solid shape sliced by parallel gaps - engineering, industry, speed, sport, media.
- blob: organic closed forms with 0-2 small companions - health, nature, beauty, food, calm.
- line: one thick continuous line on a grid (meander, loop) - journeys, logistics, process, craft, education.
Parameters: complexity 0-100 (low = iconic and minimal, high = more elements), style 0-100 (0 = square, sharp, technical; 50 = sharp geometric; 100 = round, organic, friendly), rotate in degrees (0, 45, 90, 180 or 270; usually 0).
Reply with ONLY a JSON object, no prose: {"kind": "...", "complexity": 0-100, "style": 0-100, "rotate": 0, "name": "2-4 word concept name", "why": "one short sentence on how the mark answers the brief"}. Write name and why in LANG. Use a plain hyphen "-", never long dashes.`;

async function mark(body, lang, env, json) {
  const brief = typeof body?.brief === 'string' ? body.brief.trim().slice(0, 160) : '';
  if (!brief) return json({ error: 'brief' }, 400);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.MODEL || 'claude-opus-5-5',
      max_tokens: 1500,
      output_config: { effort: 'low' },
      fallbacks: 'default',
      system: [{ type: 'text', text: MARK_SYSTEM.replace('LANG', lang === 'en' ? 'English' : 'Polish'), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Brand brief: ${brief}` }],
    }),
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
  const data = await res.json();
  if (data.stop_reason === 'refusal') return json({ error: 'refusal' }, 502);
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let p;
  try { p = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { return json({ error: 'parse' }, 502); }
  if (!KINDS.includes(p?.kind)) return json({ error: 'kind' }, 502);
  const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : d);
  const clean = (v, n) => String(v ?? '').replace(/[—–]/g, '-').replace(/[<>]/g, '').trim().slice(0, n);
  return json({
    kind: p.kind,
    complexity: num(p.complexity, 0, 100, 40),
    style: num(p.style, 0, 100, 60),
    rotate: [0, 45, 90, 180, 270].includes(+p.rotate) ? +p.rotate : 0,
    seed: 1 + Math.floor(Math.random() * 99999),   // numer losuje Worker - model powtarza te same liczby
    name: clean(p.name, 40),
    why: clean(p.why, 180),
  });
}
