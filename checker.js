// AI Act checker (panel #ai-act): pliki → metadane (checker-inspect.js) → pytania z drzewa art. 50 →
// werdykt z deterministycznego silnika (checker-rules.js) → jak oznaczyć + flagi → nałożenie oznaczenia na grafikę.
// Wszystko lokalnie w przeglądarce. Teksty: content[lang].checker. Wczytywany przy pierwszym otwarciu panelu.
import { evaluate, aggregate, RULES, RULESET_VERSION, PLATFORM_IDS, EXISTING_SUBJECTS, VERDICTS } from './checker-rules.js';
import { inspect } from './checker-inspect.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const size = b => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const LABELLED = new Set(['REQUIRED', 'REQUIRED_LIGHT', 'RECOMMENDED']);
const PREVIEW = /^image\/(jpeg|png|gif|webp|avif|svg\+xml)$/;

export function initChecker(root, { copy: C, lang }) {
  if (root.__checker) return;
  root.__checker = true;
  const list = root.querySelector('[data-ck="list"]');
  const summary = root.querySelector('[data-ck="summary"]');
  const input = root.querySelector('[data-ck="input"]');
  const zone = root.querySelector('[data-ck="zone"]');
  const channels = new Set();
  const assets = [];
  let seq = 0;

  const facts = a => ({ asset: { kind: a.kind, parent_kind: null }, tech: a.tech, content: null, context: { channels: [...channels] } });
  const result = a => (a.status === 'ready' ? evaluate(facts(a), a.answers) : null);

  // --- pytania -------------------------------------------------------------------------------------------
  function question(a, id) {
    const Q = C.questions[id];
    const head = `<p class="ck__q">${esc(Q.q)}</p>${Q.hint ? `<p class="ck__hint t-meta">${esc(Q.hint)}</p>` : ''}`;
    if (id === 'A2') {
      const picked = a.draftA2 ?? [];
      return `${head}
        <div class="ck__opts ck__opts--multi">${EXISTING_SUBJECTS.map(s => `
          <label class="ck__check"><input type="checkbox" data-a2="${s}"${picked.includes(s) ? ' checked' : ''}><span>${esc(Q.a[s])}</span></label>`).join('')}
        </div>
        <div class="ck__opts">
          <button class="ck__opt" type="button" data-answer="A2" data-value="none">${esc(Q.a.none)}</button>
          <button class="ck__opt ck__opt--go" type="button" data-answer="A2" data-value="picked"${picked.length ? '' : ' disabled'}>${esc(C.next)} →</button>
        </div>`;
    }
    return `${head}
        <div class="ck__opts">${Object.entries(Q.a).map(([v, label]) => `
          <button class="ck__opt" type="button" data-answer="${id}" data-value="${v}">${esc(label)}</button>`).join('')}
        </div>`;
  }

  // Udzielone odpowiedzi - krótko, w kolejności drzewa
  function answered(a) {
    const out = [];
    for (const id of ['Q0', 'Q0_CONFIRM', 'A1', 'A2', 'A3', 'A4', 'B1', 'B2']) {
      const v = a.answers[id];
      if (v === undefined) continue;
      const Q = C.questions[id];
      const text = id === 'A2' ? (v.length ? v.map(s => Q.a[s]).join(', ') : Q.a.none) : Q.a[String(v)];
      out.push(`<li><span class="t-meta">${esc(Q.q)}</span> ${esc(text)}</li>`);
    }
    return out.length ? `<ul class="ck__answers">${out.join('')}</ul>` : '';
  }

  function signals(a) {
    const S = C.signals, t = a.tech, out = [];
    if (t.c2pa) out.push(t.c2pa.ai_generated ? `${S.c2pa}${t.c2pa.claim_generator ? ` (${t.c2pa.claim_generator})` : ''}` : `${S.c2paPlain}${t.c2pa.claim_generator ? ` (${t.c2pa.claim_generator})` : ''}`);
    if (t.iptc_digital_source_type) out.push(fill(S.iptc, { type: t.iptc_digital_source_type }));
    for (const s of t.ai_signals) if (s.source !== 'c2pa') out.push(fill(S.trace, { detail: s.detail }));
    if (t.camera_exif_present) out.push(S.camera);
    if (t.metadata_stripped) out.push(S.stripped);
    const ai = t.c2pa?.ai_generated || t.ai_signals.length || ['trainedAlgorithmicMedia', 'compositeWithTrainedAlgorithmicMedia', 'algorithmicMedia'].includes(t.iptc_digital_source_type);
    if (!ai) out.push(S.none);
    return `<p class="ck__meta t-meta"><span>${esc(C.metadata)}:</span> ${out.map(esc).join(' · ')}</p>`;
  }

  // --- werdykt -------------------------------------------------------------------------------------------
  function verdict(a, r) {
    const rules = r.firedRules.map(id => `
          <li>${esc(C.rules[id])} <span class="t-meta">${id}${RULES[id].pendingLegalReview ? ` · ${esc(C.pending)}` : ''}</span></li>`).join('');
    const label = r.labelRecommendation ? `
        <div class="ck__block">
          <p class="t-meta">${esc(C.howTo)}</p>
          <ul class="ck__list">${r.labelRecommendation.placements.map(p => `<li>${esc(C.labels[p.id])}</li>`).join('')}</ul>
          <p class="t-meta">${esc(C.always)}</p>
        </div>` : '';
    const flags = r.flags.length ? `
        <div class="ck__block">
          <p class="t-meta">${esc(C.flagsTitle)}</p>
          <ul class="ck__list">${r.flags.map(f => `<li>${esc(C.flags[f])}</li>`).join('')}</ul>
        </div>` : '';
    const overlay = a.kind === 'image' && PREVIEW.test(a.mime) && LABELLED.has(r.verdict) ? `
        <div class="ck__block ck__overlay" data-overlay>
          <button class="ck__opt" type="button" data-ov="open" aria-expanded="${a.overlay ? 'true' : 'false'}">${esc(C.overlay.open)}</button>${a.overlay ? overlayTools(a, r) : ''}
        </div>` : '';
    return `
        <div class="ck__verdict ck__verdict--${r.verdict.toLowerCase().replace('_', '-')}">
          <p class="ck__badge">${esc(C.verdicts[r.verdict])}</p>
          <ul class="ck__rules">${rules}
          </ul>
        </div>${label}${flags}${overlay}
        <div class="ck__row">
          <button class="ck__link" type="button" data-act="change">${esc(C.change)}</button>${assets.filter(x => x.status === 'ready').length > 1 ? `
          <button class="ck__link" type="button" data-act="all">${esc(C.applyAll)}</button>` : ''}
        </div>`;
  }

  function overlayTools(a) {
    const O = C.overlay, o = a.overlay;
    return `
          <div class="ck__ovbar">
            <span class="t-meta">${esc(O.corner)}</span>${Object.entries(O.corners).map(([k, v]) => `
            <button class="ck__corner${o.corner === k ? ' is-on' : ''}" type="button" data-ov="corner" data-value="${k}" aria-pressed="${o.corner === k}" aria-label="${esc(v)}"><i class="ck__corner-${k}"></i></button>`).join('')}
            <label class="ck__check"><input type="checkbox" data-ov="text"${o.text ? ' checked' : ''}><span>${esc(O.text)}</span></label>
            <button class="ck__opt ck__opt--go" type="button" data-ov="download">${esc(O.download)}</button>
          </div>
          <canvas class="ck__canvas" data-ov="canvas"></canvas>`;
  }

  // --- karta pliku ---------------------------------------------------------------------------------------
  function thumb(a) {
    if (a.status === 'ready' && PREVIEW.test(a.mime)) return `<img class="ck__thumb" src="${a.url}" alt="">`;
    if (a.status === 'ready' && a.kind === 'video') return `<video class="ck__thumb" src="${a.url}#t=0.5" muted playsinline preload="metadata"></video>`;
    return `<span class="ck__thumb ck__thumb--kind">${esc(a.kind ? C.kinds[a.kind] : '?')}</span>`;
  }
  function card(a) {
    const r = result(a);
    const meta = a.status === 'ready'
      ? `${C.kinds[a.kind]} · ${size(a.size)}${a.sha256 ? ` · SHA-256 ${a.sha256.slice(0, 12)}…` : ''}`
      : a.status === 'reading' ? C.reading : fill(C.unsupported, { name: a.name });
    const body = a.status !== 'ready' ? '' : `${signals(a)}${answered(a)}${r.status === 'incomplete'
      ? `<div class="ck__ask" role="group">${question(a, r.missingQuestions[0])}</div>`
      : verdict(a, r)}`;
    return `
      <li class="ck__item" data-id="${a.id}">
        <div class="ck__head">${thumb(a)}
          <div class="ck__name"><p>${esc(a.name)}</p><p class="t-meta">${esc(meta)}</p></div>
          <button class="ck__link" type="button" data-act="remove" aria-label="${esc(`${C.remove}: ${a.name}`)}">${esc(C.remove)}</button>
        </div>${body}
      </li>`;
  }

  function renderSummary() {
    const ready = assets.filter(a => a.status === 'ready');
    if (!ready.length) { summary.hidden = true; return; }
    const results = ready.map(result);
    const done = results.filter(r => r.status === 'complete');
    const n = ready.length;
    const agg = aggregate(done.map(r => r.verdict));
    const word = n === 1 ? C.files.one : C.files.many;
    summary.hidden = false;
    summary.innerHTML = `
      <p class="t-meta">${esc(fill(C.project, { n: `${n} ${word}` }))}</p>
      <p class="ck__total ck__verdict--${(done.length === n ? agg.verdict : 'pending').toLowerCase().replace('_', '-')}">${esc(done.length === n ? C.verdicts[agg.verdict] : C.waiting)}</p>
      ${done.length > 1 ? `<p class="t-meta">${VERDICTS.filter(v => agg.counts[v]).map(v => `${esc(C.verdicts[v])}: ${agg.counts[v]}`).join(' · ')}</p>` : ''}
      <button class="ck__link" type="button" data-act="clear">${esc(C.clear)}</button>`;
  }

  function render(focusId) {
    list.innerHTML = assets.map(card).join('');
    renderSummary();
    for (const a of assets) if (a.overlay) drawOverlay(a);
    if (focusId != null) list.querySelector(`[data-id="${focusId}"] .ck__ask button, [data-id="${focusId}"] .ck__badge`)?.focus?.({ preventScroll: true });
  }

  // --- oznaczenie na grafice (canvas → PNG) ---------------------------------------------------------------
  function drawOverlay(a) {
    const canvas = list.querySelector(`[data-id="${a.id}"] [data-ov="canvas"]`);
    if (!canvas || !a.img?.naturalWidth) return;
    const r = result(a), light = r.verdict === 'REQUIRED_LIGHT';
    const w = a.img.naturalWidth, h = a.img.naturalHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(a.img, 0, 0, w, h);
    const s = Math.max(24, Math.round(Math.min(w, h) * (light ? 0.06 : 0.09))), m = Math.round(Math.min(w, h) * 0.04);
    const word = a.answers.A1 === 'generated' ? C.overlay.generated : C.overlay.modified;
    ctx.font = `500 ${Math.round(s * 0.3)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    const tw = a.overlay.text ? Math.ceil(ctx.measureText(word).width + s * 0.6) : 0;
    const bw = s + tw;
    const x = a.overlay.corner.endsWith('l') ? m : w - m - bw, y = a.overlay.corner.startsWith('t') ? m : h - m - s;
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, y, bw, s);
    ctx.fillStyle = '#FAFAF7';
    ctx.textBaseline = 'middle';
    if (tw) { ctx.fillRect(x + s, y + s * 0.2, Math.max(1, s * 0.02), s * 0.6); ctx.fillText(word, x + s + s * 0.3, y + s / 2); }
    ctx.font = `500 ${Math.round(s * 0.42)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('AI', x + s / 2, y + s / 2 + s * 0.02);
    ctx.textAlign = 'start';
  }

  // --- zdarzenia -----------------------------------------------------------------------------------------
  async function add(files) {
    for (const file of files) {
      const a = { id: ++seq, file, name: file.name, size: file.size, status: 'reading', answers: {} };
      assets.push(a);
      render();
      const info = await inspect(file).catch(() => null);
      if (!info) { a.status = 'unsupported'; render(); continue; }
      Object.assign(a, info, { status: 'ready', url: URL.createObjectURL(file) });
      render(a.id);
    }
  }
  input.addEventListener('change', () => { add([...input.files]); input.value = ''; });
  for (const ev of ['dragenter', 'dragover']) zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('is-over'); });
  for (const ev of ['dragleave', 'drop']) zone.addEventListener(ev, () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', e => { e.preventDefault(); add([...e.dataTransfer.files]); });

  root.querySelector('[data-ck="channels"]').addEventListener('change', e => {
    const p = e.target.dataset.channel;
    if (!PLATFORM_IDS.includes(p)) return;
    if (e.target.checked) channels.add(p); else channels.delete(p);
    render();
  });

  summary.addEventListener('click', e => {
    if (e.target.closest('[data-act="clear"]')) { for (const a of assets) if (a.url) URL.revokeObjectURL(a.url); assets.length = 0; render(); }
  });

  list.addEventListener('change', e => {
    const a = assets.find(x => x.id === Number(e.target.closest('[data-id]')?.dataset.id));
    if (!a) return;
    if (e.target.dataset.a2) {
      a.draftA2 = [...e.target.closest('.ck__item').querySelectorAll('[data-a2]:checked')].map(x => x.dataset.a2);
      e.target.closest('.ck__ask').querySelector('[data-value="picked"]').disabled = !a.draftA2.length;
    }
    if (e.target.dataset.ov === 'text') { a.overlay.text = e.target.checked; drawOverlay(a); }
  });

  list.addEventListener('click', e => {
    const item = e.target.closest('[data-id]');
    const a = assets.find(x => x.id === Number(item?.dataset.id));
    if (!a) return;
    const btn = e.target.closest('button');
    if (!btn) return;
    const { answer, value, act, ov } = btn.dataset;
    if (answer) {
      if (answer === 'A2') a.answers.A2 = value === 'none' ? [] : [...(a.draftA2 ?? [])];
      else if (answer === 'Q0_CONFIRM') {
        if (value === 'true') a.answers.Q0_CONFIRM = true;
        else { delete a.answers.Q0; delete a.answers.Q0_CONFIRM; }
      } else a.answers[answer] = value;
      render(a.id);
    } else if (act === 'remove') {
      if (a.url) URL.revokeObjectURL(a.url);
      assets.splice(assets.indexOf(a), 1);
      render();
    } else if (act === 'change') {
      a.answers = {}; a.draftA2 = []; a.overlay = null;
      render(a.id);
    } else if (act === 'all') {
      for (const x of assets) if (x !== a && x.status === 'ready') x.answers = structuredClone(a.answers);
      render();
    } else if (ov === 'open') {
      a.overlay = a.overlay ? null : { corner: 'tr', text: true };
      if (a.overlay && !a.img) { a.img = new Image(); a.img.onload = () => drawOverlay(a); a.img.src = a.url; }
      render();
    } else if (ov === 'corner') {
      a.overlay.corner = value;
      render();
    } else if (ov === 'download') {
      list.querySelector(`[data-id="${a.id}"] [data-ov="canvas"]`).toBlob(blob => {
        const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${a.name.replace(/\.[^.]+$/, '')}-ai-label.png` });
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }, 'image/png');
    }
  });

  root.querySelector('[data-ck="version"]').textContent = fill(C.disclaimer, { v: RULESET_VERSION });
  root.dataset.lang = lang;
  render();
}
