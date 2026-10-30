// Silnik reguł art. 50 AI Act - przeniesiony 1:1 z projektu AI Label Check (~/Desktop/ai-label-check,
// src/lib/rules: types, ruleset, evaluate, aggregate; ruleset 1.0.0). Czysta funkcja, bez DOM i bez sieci:
// werdykt wydają tylko reguły, nigdy model językowy. Tekst z plików to dane - silnik go nie czyta.
// Testy wszystkich ścieżek drzewa: tools/checker-check.mjs.

export const RULESET_VERSION = '1.0.0';

// Od najsurowszego do najłagodniejszego (werdykt projektu = najsurowszy werdykt pliku)
export const VERDICTS = ['REQUIRED', 'REQUIRED_LIGHT', 'UNRESOLVED', 'RECOMMENDED', 'NOT_REQUIRED'];
export const PLATFORM_IDS = ['meta', 'tiktok', 'youtube', 'linkedin'];
export const EXISTING_SUBJECTS = ['person', 'object', 'place', 'entity', 'event'];
export const ASSET_KINDS = ['image', 'video', 'audio', 'pdf', 'text'];

// Reguły wydające werdykt (liście drzewa §5.3); pendingLegalReview - interpretacja czeka na prawnika (§12)
export const VERDICT_RULE_IDS = ['A50.NA.01', 'A50.CONFLICT.01', 'A50.4.EDIT.01', 'A50.4.GREY.01', 'A50.4.STYL.01', 'A50.4.ART.01', 'A50.4.ART.02', 'A50.4.DF.01', 'A50.4.TXT.00', 'A50.4.TXT.ED', 'A50.4.TXT.01'];
export const RULES = {
  'A50.NA.01': { verdict: 'NOT_REQUIRED', basis: ['AIA.50.4'], pendingLegalReview: false },
  'A50.CONFLICT.01': { verdict: 'UNRESOLVED', basis: ['AIA.50.4'], pendingLegalReview: false },
  'A50.4.EDIT.01': { verdict: 'NOT_REQUIRED', basis: ['AIA.50.4', 'AIA.3.60'], pendingLegalReview: true },
  'A50.4.GREY.01': { verdict: 'RECOMMENDED', basis: ['AIA.3.60'], pendingLegalReview: true },
  'A50.4.STYL.01': { verdict: 'NOT_REQUIRED', basis: ['AIA.3.60'], pendingLegalReview: false },
  'A50.4.ART.01': { verdict: 'REQUIRED_LIGHT', basis: ['AIA.50.4', 'AIA.3.60'], pendingLegalReview: false },
  'A50.4.ART.02': { verdict: 'UNRESOLVED', basis: ['AIA.50.4', 'AIA.3.60'], pendingLegalReview: false },
  'A50.4.DF.01': { verdict: 'REQUIRED', basis: ['AIA.50.4', 'AIA.3.60'], pendingLegalReview: false },
  'A50.4.TXT.00': { verdict: 'NOT_REQUIRED', basis: ['AIA.50.4'], pendingLegalReview: false },
  'A50.4.TXT.ED': { verdict: 'NOT_REQUIRED', basis: ['AIA.50.4'], pendingLegalReview: false },
  'A50.4.TXT.01': { verdict: 'REQUIRED', basis: ['AIA.50.4'], pendingLegalReview: false },
};

export const platformFlagId = p => `F.PLAT.${p.toUpperCase()}`;

// PDF przechodzi obie gałęzie (ostrożnie: bez fałszywego NOT_REQUIRED), reszta jedną
export const BRANCHES_BY_KIND = { image: ['A'], video: ['A'], audio: ['A'], pdf: ['A', 'B'], text: ['B'] };

// Terminy IPTC DigitalSourceType liczone jako sygnał AI
export const AI_IPTC_SOURCE_TYPES = new Set(['trainedAlgorithmicMedia', 'compositeWithTrainedAlgorithmicMedia', 'algorithmicMedia']);

// Forma oznaczenia per medium (§5.4); null = brak formy ograniczonej
export const LABEL_FORMS = {
  static_graphic: { full: 'LBL.STATIC_GRAPHIC.FULL', light: 'LBL.STATIC_GRAPHIC.LIGHT' },
  video: { full: 'LBL.VIDEO.FULL', light: 'LBL.VIDEO.LIGHT' },
  audio: { full: 'LBL.AUDIO.FULL', light: 'LBL.AUDIO.LIGHT' },
  pdf_print: { full: 'LBL.PDF_PRINT.FULL', light: 'LBL.PDF_PRINT.LIGHT' },
  text: { full: 'LBL.TEXT.FULL', light: null },
};
// RECOMMENDED dostaje pełną formę, dopóki właściciel nie zdecyduje inaczej
export const LABEL_FORM_BY_VERDICT = { REQUIRED: 'full', REQUIRED_LIGHT: 'light', UNRESOLVED: null, RECOMMENDED: 'full', NOT_REQUIRED: null };
export const LABEL_REQUIREMENTS = ['LBL.ALWAYS.FIRST_CONTACT', 'LBL.ALWAYS.LEGIBLE', 'LBL.ALWAYS.ALT_TEXT'];

export const moreSevere = (a, b) => (VERDICTS.indexOf(a) <= VERDICTS.indexOf(b) ? a : b);

// Metadane wskazują AI: liczą się tylko sygnały strukturalne, nigdy tekst z pliku ani wynik detektora
export function hasAiMetadata(tech) {
  if (tech.c2pa?.ai_generated) return true;
  if (tech.ai_signals.length > 0) return true;
  const sourceType = tech.iptc_digital_source_type?.split('/').pop();
  return sourceType !== undefined && AI_IPTC_SOURCE_TYPES.has(sourceType);
}

// Walidacja odpowiedzi (jak Zod strictObject w oryginale): nieznany klucz albo wartość = błąd
const ANSWER_VALUES = {
  Q0: ['yes', 'no', 'unknown'], Q0_CONFIRM: [true, false], A1: ['generated', 'substantial', 'retouch'],
  A3: ['yes', 'no'], A4: ['yes', 'no', 'unclear'], B1: ['yes', 'no'], B2: ['yes', 'no'],
};
function checkAnswers(answers) {
  for (const [k, v] of Object.entries(answers)) {
    if (v === undefined) continue;
    if (k === 'A2') { if (!Array.isArray(v) || v.some(s => !EXISTING_SUBJECTS.includes(s))) throw new TypeError(`Invalid answer A2`); continue; }
    if (!ANSWER_VALUES[k]?.includes(v)) throw new TypeError(`Invalid answer ${k}`);
  }
  return answers;
}

// Walidacja faktów (jak FactsSchema w oryginale): typy pól i zakresy liczb
const isBool = v => typeof v === 'boolean', isStrOrNull = v => v === null || typeof v === 'string';
const inUnit = v => typeof v === 'number' && v >= 0 && v <= 1;
function checkFacts(f) {
  const t = f?.tech, c = f?.content;
  const ok = ASSET_KINDS.includes(f?.asset?.kind) && (f.asset.parent_kind === null || ASSET_KINDS.includes(f.asset.parent_kind))
    && t && (t.c2pa === null || (isStrOrNull(t.c2pa.claim_generator) && isBool(t.c2pa.ai_generated)))
    && isStrOrNull(t.iptc_digital_source_type) && isStrOrNull(t.software) && Array.isArray(t.ai_signals)
    && isBool(t.camera_exif_present) && isBool(t.metadata_stripped) && (t.detector_score === null || inUnit(t.detector_score))
    && (c === null || (isBool(c.contains_people) && isBool(c.people_photorealistic) && inUnit(c.realism_score) && Array.isArray(c.visible_logos_or_brands)))
    && Array.isArray(f.context?.channels);
  if (!ok) throw new TypeError('Invalid facts');
}

const fired = rule => ({ kind: 'fired', rule });
const missing = (...questions) => ({ kind: 'missing', questions });

// Gałąź A: obraz / wideo / audio
function branchA(a) {
  if (a.A1 === undefined) return missing('A1');
  if (a.A1 === 'retouch') return fired('A50.4.EDIT.01');
  if (a.A2 === undefined || a.A3 === undefined) return missing(...(a.A2 === undefined ? ['A2'] : []), ...(a.A3 === undefined ? ['A3'] : []));
  if (a.A3 === 'no') return fired('A50.4.STYL.01');
  if (a.A2.length === 0) return fired('A50.4.GREY.01');
  // A2 = tak i A3 = tak: deepfake (art. 3 pkt 60)
  if (a.A4 === undefined) return missing('A4');
  return fired({ yes: 'A50.4.ART.01', no: 'A50.4.DF.01', unclear: 'A50.4.ART.02' }[a.A4]);
}

// Gałąź B: tekst
function branchB(a) {
  if (a.B1 === undefined) return missing('B1');
  if (a.B1 === 'no') return fired('A50.4.TXT.00');
  if (a.B2 === undefined) return missing('B2');
  return fired(a.B2 === 'yes' ? 'A50.4.TXT.ED' : 'A50.4.TXT.01');
}

function labelMedium(facts, branch) {
  if (branch === 'B') return 'text';
  if (facts.asset.parent_kind === 'pdf') return 'pdf_print';
  return { video: 'video', audio: 'audio', pdf: 'pdf_print', image: 'static_graphic', text: 'static_graphic' }[facts.asset.kind];
}

function computeFlags(facts, a, aiMetadata) {
  const aiInvolved = aiMetadata || a.Q0 === 'yes' || a.Q0 === 'unknown';
  const flags = [];
  if (aiInvolved && facts.tech.metadata_stripped) flags.push('F.META.01');
  if (a.A2?.includes('person')) flags.push('F.IMG.01');
  if ((facts.content?.visible_logos_or_brands.length ?? 0) > 0) flags.push('F.TM.01');
  if (aiInvolved) {
    const channels = new Set(facts.context.channels);
    for (const p of PLATFORM_IDS) if (channels.has(p)) flags.push(platformFlagId(p));
  }
  return flags;
}

function complete(base, facts, firedByBranch) {
  let verdict = 'NOT_REQUIRED';
  const placements = [];
  for (const [branch, rule] of firedByBranch) {
    const ruleVerdict = RULES[rule].verdict;
    verdict = moreSevere(verdict, ruleVerdict);
    const form = LABEL_FORM_BY_VERDICT[ruleVerdict];
    if (form === null || branch === null) continue;   // reguły z Q0 nie dają oznaczenia
    const medium = labelMedium(facts, branch), forms = LABEL_FORMS[medium];
    placements.push(form === 'light' && forms.light !== null
      ? { medium, form: 'light', id: forms.light, rule }
      : { medium, form: 'full', id: forms.full, rule });
  }
  return {
    ...base, status: 'complete', verdict,
    firedRules: firedByBranch.map(([, rule]) => rule),
    labelRecommendation: placements.length ? { placements, requirements: LABEL_REQUIREMENTS } : null,
  };
}

export class UnsupportedRulesetVersionError extends Error {
  constructor(version) { super(`Ruleset version ${version} is not supported (current: ${RULESET_VERSION})`); this.name = 'UnsupportedRulesetVersionError'; }
}

// evaluate(facts, answers) → { status: 'complete', verdict, firedRules, labelRecommendation, flags }
//                          albo { status: 'incomplete', missingQuestions, flags }
export function evaluate(facts, answersInput, rulesetVersion = RULESET_VERSION) {
  if (rulesetVersion !== RULESET_VERSION) throw new UnsupportedRulesetVersionError(rulesetVersion);
  checkFacts(facts);
  const a = checkAnswers({ ...answersInput });
  const aiMetadata = hasAiMetadata(facts.tech);
  const base = { rulesetVersion, flags: computeFlags(facts, a, aiMetadata) };

  if (a.Q0 === undefined) return { ...base, status: 'incomplete', missingQuestions: ['Q0'] };
  if (a.Q0 === 'no') {
    if (!aiMetadata) return complete(base, facts, [[null, 'A50.NA.01']]);
    // „nie użyto AI”, a metadane mówią AI: najpierw potwierdzenie, potem UNRESOLVED
    if (a.Q0_CONFIRM !== true) return { ...base, status: 'incomplete', missingQuestions: ['Q0_CONFIRM'] };
    return complete(base, facts, [[null, 'A50.CONFLICT.01']]);
  }

  const missingQuestions = [], firedByBranch = [];
  for (const branch of BRANCHES_BY_KIND[facts.asset.kind]) {
    const out = branch === 'A' ? branchA(a) : branchB(a);
    if (out.kind === 'missing') missingQuestions.push(...out.questions);
    else firedByBranch.push([branch, out.rule]);
  }
  if (missingQuestions.length) return { ...base, status: 'incomplete', missingQuestions };
  return complete(base, facts, firedByBranch);
}

// Werdykt projektu = najsurowszy werdykt pliku + liczba plików na werdykt
export function aggregate(verdicts) {
  const counts = Object.fromEntries(VERDICTS.map(v => [v, 0]));
  let verdict = null;
  for (const v of verdicts) { counts[v] += 1; verdict = verdict === null ? v : moreSevere(verdict, v); }
  return { verdict, counts };
}
