// Cloudflare Worker: pośrednik między czatem na stronie a Claude API.
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
