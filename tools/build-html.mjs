// Wpisuje polską treść z content.js do index.html (między znacznikami app/meta).
// Dzięki temu strona działa i indeksuje się bez JS. Uruchom po każdej zmianie treści:
//   npm run build
// `npm run dev` robi to samo w locie przy każdym odświeżeniu (tools/serve.mjs --dev).
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'index.html');
const fill = (html, key, inner) =>
  html.replace(new RegExp(`<!-- ${key}:start -->[\\s\\S]*?<!-- ${key}:end -->`), `<!-- ${key}:start -->\n  ${inner}\n  <!-- ${key}:end -->`);

// Świeży import przy każdym wywołaniu — serwer deweloperski widzi zmiany bez restartu.
export async function renderIndex() {
  const t = Date.now();
  const { content } = await import(`../content.js?t=${t}`);
  const { render, renderMeta } = await import(`../render.js?t=${t}`);
  let html = await readFile(file, 'utf8');
  html = fill(html, 'meta', renderMeta(content, 'pl'));
  html = fill(html, 'app', render(content, 'pl'));
  return { html, content };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { html, content } = await renderIndex();

  // Brief 5.2: maks. 120 słów tekstu na projekt.
  for (const lang of ['pl', 'en']) {
    for (const p of content.shared.projects) {
      const t = content[lang].projects[p.id];
      const words = [t.lead, t.problem, t.solution, t.result].join(' ').split(/\s+/).filter(Boolean).length;
      if (words > 120) console.warn(`⚠ ${p.title} (${lang}): ${words} słów — limit to 120`);
    }
  }

  await writeFile(file, html);
  console.log('index.html ← content.js (pl)');
}
