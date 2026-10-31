// Testy asystenta AI bez sieci i bez klucza API (npm run check-agent, też w CI):
//   - tryb lokalny: typowe pytania PL/EN trafiają we właściwy temat, bez [placeholderów] i długich myślników;
//   - wiedza dla modelu: bez [placeholderów];
//   - Worker: CORS, limit zapytań, walidacja rozmowy, zapytanie do Claude API (podstawione fetch);
//     generator znaków: /mark (ustawienia przycięte do dozwolonych) i /mark/pick (tylko PNG 256 × 256, wybór w zakresie).
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
    ['Jakie kolory ma marka?', /#generator/],
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
let sent = null, reply = 'loom.studio — studio w subskrypcji.';
globalThis.fetch = async (url, init) => {
  sent = { url, body: JSON.parse(init.body), headers: init.headers };
  return new Response(JSON.stringify({ content: [{ type: 'text', text: reply }] }));
};
const env = { ANTHROPIC_API_KEY: 'test', LIMITER: { limit: async () => ({ success: true }) } };
const req = (body, { origin = 'https://lumerw.com', method = 'POST', path = '/' } = {}) => new Request(`https://agent.test${path}`, {
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

// Generator znaków: /mark - odpowiedź modelu przycięta do dozwolonych wartości
reply = '{"kind": "radial", "complexity": 150, "style": -5, "rotate": 33, "name": "Słońce — piekarni", "why": "<b>Pięć ramion</b>"}';
const mk = await worker.fetch(req({ brief: 'piekarnia', lang: 'pl' }, { path: '/mark' }), env), mj = await mk.json();
check('Worker /mark: typ, suwaki 0-100, obrót z listy, czysty tekst',
  mk.status === 200 && mj.kind === 'radial' && mj.complexity === 100 && mj.style === 0 && mj.rotate === 0 && mj.seed >= 1 && mj.name === 'Słońce - piekarni' && !/[<>]/.test(mj.why) && sent.body.max_tokens === 1500,
  JSON.stringify(mj));
reply = '{"kind": "logo"}';
check('Worker /mark: nieznany typ → 502', (await worker.fetch(req({ brief: 'x' }, { path: '/mark' }), env)).status === 502);
check('Worker /mark: pusty opis → 400', (await worker.fetch(req({ brief: ' ' }, { path: '/mark' }), env)).status === 400);

// /mark/pick - tylko 2-4 obrazy PNG 256 × 256 (nagłówek), wybór w zakresie
const png = (w = 256, h = 256, extra = 600) => {
  const b = new Uint8Array(33 + extra), v = new DataView(b.buffer);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  v.setUint32(16, w); v.setUint32(20, h);
  return Buffer.from(b).toString('base64');
};
const pick = { brief: 'piekarnia', lang: 'pl', kind: 'radial', name: 'Słońce', why: 'roboczo', images: [png(), png(), png()] };
const pickStatus = async body => (await worker.fetch(req(body, { path: '/mark/pick' }), env)).status;
reply = '{"pick": 2, "name": "Słońce", "why": "Pięć ramion — wokół pustego środka."}';
sent = null;
const pk = await worker.fetch(req(pick, { path: '/mark/pick' }), env), pj = await pk.json();
check('Worker /mark/pick: wybór, obrazy jako PNG base64, krótki myślnik',
  pk.status === 200 && pj.pick === 2 && pj.why === 'Pięć ramion - wokół pustego środka.' && sent?.body.messages[0].content.filter(c => c.type === 'image' && c.source.media_type === 'image/png').length === 3,
  JSON.stringify(pj));
sent = null;
const badPick = [
  ['1 obraz', { ...pick, images: [png()] }], ['5 obrazów', { ...pick, images: Array(5).fill(png()) }],
  ['512 px', { ...pick, images: [png(512, 512), png()] }], ['data: URL', { ...pick, images: [`data:image/png;base64,${png()}`, png()] }],
  ['za duży', { ...pick, images: [png(256, 256, 45000), png()] }], ['nie PNG', { ...pick, images: [Buffer.from('GIF89a'.repeat(8)).toString('base64'), png()] }],
  ['zły typ', { ...pick, kind: 'logo' }], ['pusty opis', { ...pick, brief: '' }],
];
const wrong = [];
for (const [name, body] of badPick) if (await pickStatus(body) !== 400) wrong.push(name);
check(`Worker /mark/pick: ${badPick.length} złych zapytań → 400 bez wywołania Claude`, !wrong.length && sent === null, wrong.join(', '));
reply = '{"pick": 4, "name": "x", "why": "y"}';
check('Worker /mark/pick: wybór poza zakresem → 502', await pickStatus(pick) === 502);

// /mark/draw - znaki autorskie: tylko bezpieczna geometria (liczby w zakresie, polecenia ścieżek), tekst bez znaczników
reply = JSON.stringify({ marks: [
  { name: 'Fala — alg', why: '<i>Ramen</i> i alga', shapes: [
    { op: 'add', t: 'circle', cx: 100, cy: 100, r: 999 }, { op: 'cut', t: 'rect', x: 60, y: 90, w: 80, h: 20 },
    { op: 'add', t: 'path', d: 'M40 100 C 60 40 140 40 160 100 Z' }, { op: 'add', t: 'path', d: 'M0 0"/><script>alert(1)</script>' },
    { op: 'line', t: 'line', d: 'M50 150 L150 150', w: 99, cap: 'round' }, { op: 'add', t: 'poly', pts: [[1, 2], ['x', 3], [4, 5]] },
  ] },
  { name: 'pusty', shapes: [{ op: 'cut', t: 'circle', cx: 1, cy: 1, r: 5 }] },
] });
sent = null;
const dr = await worker.fetch(req({ brief: 'vegan ramen bar', lang: 'pl' }, { path: '/mark/draw' }), env), dj = await dr.json();
const m0 = dj.marks?.[0];
check('Worker /mark/draw: geometria przycięta, skrypt odrzucony, znak bez tuszu pominięty',
  dr.status === 200 && dj.marks.length === 1 && m0.fill.length === 2 && m0.cut.length === 1 && m0.lines[0].w === 40
  && !JSON.stringify(dj).includes('script') && m0.name === 'Fala - alg' && !/[<>]/.test(m0.why) && m0.fill[0].includes('120') && sent?.body.output_config.effort === 'medium',
  JSON.stringify(dj).slice(0, 300));
reply = '{"marks": []}';
check('Worker /mark/draw: brak znaków → 502', (await worker.fetch(req({ brief: 'x' }, { path: '/mark/draw' }), env)).status === 502);
check('Worker /mark/draw: pusty opis → 400', (await worker.fetch(req({ brief: '' }, { path: '/mark/draw' }), env)).status === 400);
reply = '{"pick": 1, "name": "Fala", "why": "y"}';
check('Worker /mark/pick: znaki autorskie (kind custom) → 200', await pickStatus({ ...pick, kind: 'custom' }) === 200);

// /figma - asystent projektowy w pluginie lumerw: okno pluginu (origin "null") tylko z nagłówkiem pluginu,
// narzędzia i wiedza w zapytaniu, zrzuty i wyniki narzędzi przechodzą, zła rozmowa → 400
const figReq = (body, headers = {}) => new Request('https://agent.test/figma', { method: 'POST', headers: { Origin: 'null', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const png1 = png(64, 64, 100);
const convo = [
  { role: 'user', content: [{ type: 'text', text: 'Oceń ten baner' }] },
  { role: 'assistant', content: [{ type: 'tool_use', id: 'tu1', name: 'screenshot_selection', input: {} }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: png1 } }] }] },
];
check('Worker /figma: okno pluginu bez nagłówka → 403', (await worker.fetch(figReq({ messages: convo }), env)).status === 403);
reply = 'Nagłówek jest czytelny — popraw CTA.';
sent = null;
const fr = await worker.fetch(figReq({ messages: convo, lang: 'pl' }, { 'x-lumerw-plugin': '1' }), env), fj = await fr.json();
check('Worker /figma: narzędzia, wiedza i zrzut w zapytaniu, odpowiedź z krótkim myślnikiem',
  fr.status === 200 && fr.headers.get('Access-Control-Allow-Origin') === 'null' && sent?.body.tools?.some(t => t.name === 'contrast_scan')
  && sent.body.system[0].text.includes('WCAG') && sent.body.messages[2].content[0].content[0].type === 'image' && fj.content[0].text.includes(' - '),
  JSON.stringify(fj).slice(0, 200));
// projektant w pętli: build → animate, wyniki narzędzi i nowe pytanie w jednej wiadomości (pętla zatrzymana na limicie)
const design = [
  { role: 'user', content: [{ type: 'text', text: 'Zaprojektuj post 4:5' }] },
  { role: 'assistant', content: [{ type: 'tool_use', id: 'b1', name: 'build', input: { nodes: [{ type: 'frame', w: 1080, h: 1350 }] } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'b1', content: '{"ids":["1:2"]}' }] },
  { role: 'assistant', content: [{ type: 'tool_use', id: 'a1', name: 'animate', input: { items: [] } }, { type: 'tool_use', id: 's1', name: 'set_studio', input: { step: 'digital', status: 'review' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a1', content: 'ok' }, { type: 'tool_result', tool_use_id: 's1', content: 'ok' }, { type: 'text', text: 'dalej' }] },
];
const desr = await worker.fetch(figReq({ messages: design, lang: 'pl' }, { 'x-lumerw-plugin': '1' }), env);
check('Worker /figma: narzędzia projektowe (build, animate, studio) przechodzą, wiedza o studiu w zapytaniu',
  desr.status === 200 && ['build', 'update_nodes', 'animate', 'set_brand', 'set_studio'].every(n => sent?.body.tools?.some(t => t.name === n)) && sent.body.system[0].text.includes('Studio marki'));
const badFig = [
  ['rola', [{ role: 'assistant', content: 'x' }]],
  ['obce narzędzie', [{ role: 'user', content: 'a' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'x', name: 'delete_everything', input: {} }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }] }]],
  ['obraz nie base64', [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: 'https://x' } }] }]],
  ['kończy asystent', [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]],
];
const wrongFig = [];
for (const [n, m] of badFig) if ((await worker.fetch(figReq({ messages: m }, { 'x-lumerw-plugin': '1' }), env)).status !== 400) wrongFig.push(n);
check(`Worker /figma: ${badFig.length} złych rozmów → 400`, !wrongFig.length, wrongFig.join(', '));
check('Worker /figma: inna strona → 403', (await worker.fetch(new Request('https://agent.test/figma', { method: 'POST', headers: { Origin: 'https://example.com', 'content-type': 'application/json' }, body: '{}' }), env)).status === 403);

for (const x of results) console.log(`${x.ok ? '✓' : '✗'} ${x.name}${x.note && !x.ok ? ` - ${x.note}` : ''}`);
const failed = results.filter(x => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} ok`);
process.exit(failed ? 1 : 0);
