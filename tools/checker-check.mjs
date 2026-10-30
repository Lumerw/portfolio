// Testy silnika art. 50 (checker-rules.js) bez przeglądarki: każda ścieżka drzewa §5.3, konflikt metadanych,
// PDF przez obie gałęzie, flagi, agregacja projektu, walidacja wejścia. Pełny zestaw 96 testów z projektu
// AI Label Check przechodzi na tym porcie (vitest w ~/Desktop/ai-label-check, uruchamiany ręcznie).
import { evaluate, aggregate, RULES, VERDICT_RULE_IDS } from '../checker-rules.js';

const results = [];
const check = (name, ok, note = '') => results.push({ name, ok, note });
const tech = (ai = false) => ({ c2pa: ai ? { claim_generator: 'Adobe Firefly', ai_generated: true } : null, iptc_digital_source_type: null,
  software: null, ai_signals: [], camera_exif_present: !ai, metadata_stripped: false, detector_score: null });
const facts = (kind = 'image', o = {}) => ({ asset: { kind, parent_kind: null }, tech: { ...tech(o.ai), ...o.tech }, content: null, context: { channels: o.channels ?? [] } });
const df = { Q0: 'yes', A1: 'generated', A2: ['person'], A3: 'yes' };

const PATHS = [
  ['Q0 nie, bez sygnałów', facts(), { Q0: 'no' }, 'NOT_REQUIRED', ['A50.NA.01']],
  ['Q0 nie, metadane AI, potwierdzone', facts('image', { ai: true }), { Q0: 'no', Q0_CONFIRM: true }, 'UNRESOLVED', ['A50.CONFLICT.01']],
  ['retusz techniczny', facts(), { Q0: 'yes', A1: 'retouch' }, 'NOT_REQUIRED', ['A50.4.EDIT.01']],
  ['nic istniejącego, realistyczne', facts(), { Q0: 'yes', A1: 'generated', A2: [], A3: 'yes' }, 'RECOMMENDED', ['A50.4.GREY.01']],
  ['stylizacja', facts(), { Q0: 'unknown', A1: 'substantial', A2: ['place'], A3: 'no' }, 'NOT_REQUIRED', ['A50.4.STYL.01']],
  ['deepfake, utwór artystyczny', facts(), { ...df, A4: 'yes' }, 'REQUIRED_LIGHT', ['A50.4.ART.01']],
  ['deepfake, niejasne', facts(), { ...df, A4: 'unclear' }, 'UNRESOLVED', ['A50.4.ART.02']],
  ['deepfake', facts('video'), { ...df, A4: 'no' }, 'REQUIRED', ['A50.4.DF.01']],
  ['tekst nie publiczny', facts('text'), { Q0: 'yes', B1: 'no' }, 'NOT_REQUIRED', ['A50.4.TXT.00']],
  ['tekst z redakcją', facts('text'), { Q0: 'yes', B1: 'yes', B2: 'yes' }, 'NOT_REQUIRED', ['A50.4.TXT.ED']],
  ['tekst bez redakcji', facts('text'), { Q0: 'yes', B1: 'yes', B2: 'no' }, 'REQUIRED', ['A50.4.TXT.01']],
];
const bad = PATHS.filter(([, f, a, v, r]) => { const e = evaluate(f, a); return e.status !== 'complete' || e.verdict !== v || e.firedRules.join() !== r.join(); }).map(p => p[0]);
check(`Silnik: ${PATHS.length} ścieżek drzewa daje właściwy werdykt i regułę`, !bad.length, bad.join(', '));
check('Silnik: każda reguła werdyktu pokryta ścieżką', VERDICT_RULE_IDS.every(id => PATHS.some(p => p[4].includes(id))));

const conflict = evaluate(facts('image', { ai: true }), { Q0: 'no' });
check('Konflikt: „bez AI” przy metadanych AI wymaga potwierdzenia', conflict.status === 'incomplete' && conflict.missingQuestions.join() === 'Q0_CONFIRM');
const pdf = evaluate(facts('pdf'), { ...df, A4: 'yes', B1: 'yes', B2: 'no' });
check('PDF: obie gałęzie, najsurowszy werdykt, dwie formy oznaczenia',
  pdf.verdict === 'REQUIRED' && pdf.firedRules.join() === 'A50.4.ART.01,A50.4.TXT.01' && pdf.labelRecommendation.placements.map(p => p.id).join() === 'LBL.PDF_PRINT.LIGHT,LBL.TEXT.FULL', JSON.stringify(pdf));
const missingA = evaluate(facts(), { Q0: 'yes', A1: 'generated' });
check('Brakujące pytania: A2 i A3 naraz', missingA.missingQuestions.join() === 'A2,A3');
const fl = evaluate(facts('image', { tech: { metadata_stripped: true }, channels: ['tiktok', 'x'] }), { ...df, A4: 'no' }).flags;
check('Flagi: metadane usunięte, wizerunek, platforma (tylko znane)', fl.join() === 'F.META.01,F.IMG.01,F.PLAT.TIKTOK', fl.join());
check('Flagi platform tylko przy udziale AI', evaluate(facts('image', { channels: ['meta'] }), { Q0: 'no' }).flags.length === 0);
const agg = aggregate(['NOT_REQUIRED', 'UNRESOLVED', 'RECOMMENDED']);
check('Agregacja: najsurowszy werdykt i liczby', agg.verdict === 'UNRESOLVED' && agg.counts.RECOMMENDED === 1 && aggregate([]).verdict === null);
let threw = 0;
for (const f of [() => evaluate(facts(), { Q0: 'maybe' }), () => evaluate(facts(), { Q0: 'no', X: 1 }), () => evaluate(facts('gif'), { Q0: 'no' }), () => evaluate(facts(), { Q0: 'no' }, '0.9.0')]) { try { f(); } catch { threw++; } }
check('Walidacja: zła odpowiedź, nieznany klucz, zły typ, inna wersja → błąd', threw === 4);
check('Reguły czekające na prawnika oznaczone', RULES['A50.4.EDIT.01'].pendingLegalReview && RULES['A50.4.GREY.01'].pendingLegalReview);

for (const x of results) console.log(`${x.ok ? '✓' : '✗'} ${x.name}${x.note && !x.ok ? ` - ${x.note}` : ''}`);
const failed = results.filter(x => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} ok`);
process.exit(failed ? 1 : 0);
