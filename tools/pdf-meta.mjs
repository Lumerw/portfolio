// Metadane PDF (właściwości pliku): autor, tytuł, temat i słowa kluczowe - standardowe, jawne pole „Keywords”,
// które czytają systemy rekrutacyjne (ATS). Słowa tylko z treści portfolio: moje narzędzia i kompetencje,
// narzędzia projektów, role z doświadczenia + nazwy specjalizacji, którymi faktycznie się zajmuję.
import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { content } from '../content.js';

const ROLES = {
  pl: ['projektant', 'grafik', 'UX/UI designer', 'UX designer', 'UI designer', 'product designer', 'brand designer', 'web designer', 'AI designer',
    'projektowanie UX', 'projektowanie UI', 'UX/UI', 'identyfikacja wizualna', 'branding', 'projektowanie stron', 'produkty cyfrowe', 'motion design',
    'grafika 3D', 'AI', 'generatywna AI', 'projektowanie z AI', 'front-end', 'dostępność', 'WCAG 2.2', 'pełny etat', 'freelance', 'zdalnie'],
  en: ['designer', 'graphic designer', 'UX/UI designer', 'UX designer', 'UI designer', 'product designer', 'brand designer', 'web designer', 'AI designer',
    'UX design', 'UI design', 'UX/UI', 'visual identity', 'branding', 'web design', 'digital products', 'motion design', '3D', 'AI',
    'generative AI', 'AI-assisted design', 'front-end', 'accessibility', 'WCAG 2.2', 'full-time', 'freelance', 'remote'],
};

export function keywords(lang) {
  const t = content[lang];
  const words = [
    ...ROLES[lang],
    ...(t.about?.tools ?? []),
    ...(t.cv?.skillsList ?? []),
    ...content.shared.projects.flatMap(p => p.tools ?? []),
  ].flatMap(w => String(w).split(/:\s*|,\s*/)).map(w => w.trim()).filter(w => w && !/^\[/.test(w));
  const seen = new Set();
  return words.filter(w => !seen.has(w.toLowerCase()) && seen.add(w.toLowerCase()));
}

// Ustawia metadane w gotowym pliku (po page.pdf); tytuł np. „Wojciech Lumer - CV”
export async function setMeta(file, { lang, title }) {
  const doc = await PDFDocument.load(await readFile(file), { updateMetadata: false });
  const t = content[lang];
  doc.setTitle(title, { showInWindowTitleBar: true });
  doc.setAuthor(content.shared.name ?? 'Wojciech Lumer');
  doc.setSubject(t.cv?.line?.join(' ') ?? t.hero?.title ?? '');
  doc.setKeywords([keywords(lang).join(', ')]);   // pdf-lib łączy spacją - przecinki zachowują wielowyrazowe hasła
  doc.setLanguage(lang === 'pl' ? 'pl-PL' : 'en-US');
  await writeFile(file, await doc.save({ useObjectStreams: false }));
}
