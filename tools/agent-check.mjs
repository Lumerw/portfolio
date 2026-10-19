// Testy asystenta AI bez sieci i bez klucza API (npm run check-agent, też w CI):
//   - tryb lokalny: typowe pytania PL/EN trafiają we właściwy temat, bez [placeholderów] i długich myślników;
//   - wiedza dla modelu: bez [placeholderów];
//   - Worker: CORS, limit zapytań, walidacja rozmowy, zapytanie do Claude API (podstawione fetch).
import { content } from '../content.js';
import { localAnswer, knowledge } from '../agent.js';
import worker from '../agent/worker.js';

const results = [];
const check = (name, ok, note = '') => results.push({ name, ok, note });
const flat = a => [a.text, ...(a.items ?? []), ...(a.links ?? []).map(l => `${l.label} ${l.href}`)].join(' ');

const CASES = {
  pl: [
    ['Jakie projekty zrobił Wojciech?', /Projekty w portfolio/],
    ['Jakich narzędzi używa?', /Figma/],
    ['Jak umówić rozmowę?', /mailto:/],
    ['Ile kosztuje logo?', /mailto:/],
    ['Opowiedz o teraz', /^teraz - /],
    ['co to loom?', /^loom\.studio - /],
    ['reh.ab', /^reh\.ab - /],
    ['Kim jest Wojciech?', /projektant/],
    ['Jakie kolory ma marka?', /#brandbook/],
    ['Jaka jest pogoda?', /Tego nie ma w portfolio/],
  ],
  en: [
    ['What has Wojciech worked on?', /Projects in the portfolio/],
    ['Which tools does Wojciech use?', /Figma/],
    ['How can I book a call?', /mailto:/],
    ['tell me about rehab', /^reh\.ab - /],
    ['what is the weather', /not in the portfolio/],
  ],
};
for (const [lang, list] of Object.entries(CASES)) {
  const bad = [];
  for (const [q, re] of list) {
    const a = flat(localAnswer(content, lang, q));
    if (!re.test(a) || /\[|[—–]/.test(a)) bad.push(`„${q}” → ${a.slice(0, 80)}`);
  }
  check(`Tryb lokalny (${lang}): ${list.length} pytań we właściwy temat`, !bad.length, bad.join(' · '));
}
for (const lang of ['pl', 'en']) {
  const k = knowledge(content, lang);
  check(`Wiedza dla modelu (${lang}) bez [placeholderów]`, !/\[[^\]]*\]/.test(k), `${k.length} znaków`);
}

// Worker z podstawionym Claude API
let sent = null;
globalThis.fetch = async (url, init) => {
  sent = { url, body: JSON.parse(init.body), headers: init.headers };
  return new Response(JSON.stringify({ content: [{ type: 'text', text: 'loom.studio — studio w subskrypcji.' }] }));
};
const env = { ANTHROPIC_API_KEY: 'test', LIMITER: { limit: async () => ({ success: true }) } };
const req = (body, { origin = 'https://lumerw.com', method = 'POST' } = {}) => new Request('https://agent.test/', {
  method, headers: { Origin: origin, 'content-type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined,
});
const q = [{ role: 'user', content: 'Co to loom?' }];

const r = await worker.fetch(req({ lang: 'pl', messages: q }), env);
const j = await r.json();
check('Worker: odpowiedź z Claude, krótki myślnik', r.status === 200 && j.text === 'loom.studio - studio w subskrypcji.', JSON.stringify(j));
check('Worker: zapytanie do Claude API (model, wiedza, klucz)',
  sent?.url === 'https://api.anthropic.com/v1/messages' && /^claude-/.test(sent.body.model) && sent.body.system[0].text.includes('KNOWLEDGE') && sent.headers['x-api-key'] === 'test',
  sent?.body.model);
check('Worker: obca strona → 403', (await worker.fetch(req({ messages: q }, { origin: 'https://example.com' }), env)).status === 403);
check('Worker: localhost dozwolony', (await worker.fetch(req({ messages: q }, { origin: 'http://localhost:8080' }), env)).status === 200);
check('Worker: preflight OPTIONS → 204', (await worker.fetch(req(null, { method: 'OPTIONS' }), env)).status === 204);
check('Worker: zła kolejność ról → 400', (await worker.fetch(req({ messages: [...q, ...q] }), env)).status === 400);
check('Worker: limit zapytań → 429', (await worker.fetch(req({ messages: q }), { ...env, LIMITER: { limit: async () => ({ success: false }) } })).status === 429);

for (const x of results) console.log(`${x.ok ? '✓' : '✗'} ${x.name}${x.note && !x.ok ? ` - ${x.note}` : ''}`);
const failed = results.filter(x => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} ok`);
process.exit(failed ? 1 : 0);
