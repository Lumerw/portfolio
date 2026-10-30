// Analiza techniczna pliku w przeglądarce (brief AI Label Check §6.1, wersja bez serwera): typ po magic bytes,
// SHA-256, ślady AI w metadanych - C2PA, IPTC DigitalSourceType, XMP CreatorTool, PDF Producer/Creator,
// parametry generatorów w PNG (Stable Diffusion, ComfyUI). Plik nigdzie nie wychodzi.
// Tekst z pliku to dane: generator rozpoznajemy tylko w polach metadanych, nigdy w treści.

const MB = 1024 * 1024;
const SCAN_WHOLE = 32 * MB, SCAN_PART = 16 * MB;   // większe pliki: początek i koniec (moov w MP4 bywa na końcu)
const HASH_MAX = 512 * MB;

const IPTC_TERMS = ['trainedAlgorithmicMedia', 'compositeWithTrainedAlgorithmicMedia', 'algorithmicMedia', 'compositeSynthetic',
  'algorithmicallyEnhanced', 'digitalCapture', 'negativeFilm', 'positiveFilm', 'print', 'minorHumanEdits', 'compositeCapture',
  'humanEdits', 'dataDrivenMedia', 'digitalCreation', 'virtualRecording', 'composite', 'screenCapture'];
const AI_IPTC = new Set(['trainedAlgorithmicMedia', 'compositeWithTrainedAlgorithmicMedia', 'algorithmicMedia']);
const GENERATORS = /midjourney|dall[·\-\s]?e|openai|chatgpt|firefly|stable[\s-]?diffusion|sdxl|comfyui|automatic1111|invokeai|imagen|gemini|nano[\s-]?banana|runway|sora|kling|pika|leonardo\.?ai|ideogram|flux\b|magnific|krea|veo\b|elevenlabs|suno|udio|synthesia|heygen/i;
const CAMERAS = /Canon|NIKON|SONY|Apple|FUJIFILM|OLYMPUS|Panasonic|samsung|Google|HUAWEI|Xiaomi|LEICA|RICOH|HASSELBLAD|DJI|GoPro|OnePlus|motorola/;

// Typ pliku po pierwszych bajtach (jak detect.ts w oryginale, bez biblioteki file-type)
function detect(h, name) {
  const at = (o, ...b) => b.every((x, i) => h[o + i] === x);
  const ascii = (o, n) => String.fromCharCode(...h.subarray(o, o + n));
  const ext = name.toLowerCase().split('.').pop();
  if (at(0, 0xFF, 0xD8, 0xFF)) return ['image', 'image/jpeg'];
  if (at(0, 0x89, 0x50, 0x4E, 0x47)) return ['image', 'image/png'];
  if (ascii(0, 4) === 'GIF8') return ['image', 'image/gif'];
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return ['image', 'image/webp'];
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE') return ['audio', 'audio/wav'];
  if (at(0, 0x49, 0x49, 0x2A, 0) || at(0, 0x4D, 0x4D, 0, 0x2A)) return ['image', 'image/tiff'];
  if (ascii(0, 4) === '8BPS') return ['image', 'image/vnd.adobe.photoshop'];
  if (ascii(0, 5) === '%PDF-') return ['pdf', 'application/pdf'];
  if (at(0, 0x1A, 0x45, 0xDF, 0xA3)) return ['video', 'video/webm'];
  if (ascii(0, 3) === 'ID3' || at(0, 0xFF, 0xFB) || at(0, 0xFF, 0xF3) || at(0, 0xFF, 0xF2)) return ['audio', 'audio/mpeg'];
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4);
    if (/^(heic|heix|mif1|msf1|hevc)/.test(brand)) return ['image', 'image/heic'];
    if (/^avi[fs]/.test(brand)) return ['image', 'image/avif'];
    if (/^M4A|^M4B/.test(brand)) return ['audio', 'audio/mp4'];
    if (brand === 'qt  ') return ['video', 'video/quicktime'];
    return ['video', 'video/mp4'];
  }
  if (at(0, 0x50, 0x4B, 0x03, 0x04) && ext === 'docx') return ['text', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!h.includes(0)) {
    const start = new TextDecoder().decode(h.subarray(0, 1024)).replace(/^﻿/, '').trimStart().toLowerCase();
    if (ext === 'svg' && (start.startsWith('<svg') || (start.startsWith('<?xml') && start.includes('<svg')))) return ['image', 'image/svg+xml'];
    if (ext === 'txt' || ext === 'md') return ['text', 'text/plain'];
  }
  return null;
}

const latin1 = buf => new TextDecoder('latin1').decode(buf);
const clip = s => s.replace(/[\u0000-\u001F]/g, '').trim().slice(0, 80);

// Pola tekstowe PNG (tEXt / iTXt): klucz → wartość
function pngText(bytes) {
  const out = {}, v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let o = 8; o + 8 <= bytes.length;) {
    const len = v.getUint32(o), type = String.fromCharCode(...bytes.subarray(o + 4, o + 8));
    if (type === 'tEXt' || type === 'iTXt') {
      const data = bytes.subarray(o + 8, o + 8 + len), z = data.indexOf(0);
      if (z > 0) out[latin1(data.subarray(0, z))] = new TextDecoder().decode(data.subarray(z + 1)).replace(/^[\u0000-\u0002]+/, '');
    }
    if (type === 'IEND' || len > bytes.length) break;
    o += 12 + len;
  }
  return out;
}

async function sha256(file) {
  if (file.size > HASH_MAX || !crypto.subtle) return null;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('');
}

// → { kind, mime, sha256, tech } (tech jak TechFindings w silniku) albo null, gdy format nieobsługiwany
export async function inspect(file) {
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const type = detect(head, file.name);
  if (!type) return null;
  const [kind, mime] = type;

  const parts = file.size <= SCAN_WHOLE ? [file] : [file.slice(0, SCAN_PART), file.slice(file.size - SCAN_PART)];
  const raw = await Promise.all(parts.map(p => p.arrayBuffer()));
  const text = raw.map(latin1).join('\n');

  const signals = [];
  const c2paPresent = /c2pa\.(claim|assertions|actions)|jumb[\s\S]{0,40}c2pa/.test(text);
  const generator = text.match(/claim_generator(?:_info)?[^A-Za-z]{1,12}([A-Za-z][\w .\/()-]{2,60})/)?.[1];
  const iptcTerm = IPTC_TERMS.find(t => new RegExp(`digitalsourcetype[^\\n]{0,80}\\b${t}\\b|newscodes/digitalsourcetype/${t}\\b`, 'i').test(text)) ?? null;
  const iptcAi = iptcTerm !== null && AI_IPTC.has(iptcTerm);

  // Pola, w których narzędzie podpisuje plik: XMP CreatorTool, PDF Producer / Creator, generator C2PA
  const fields = [
    text.match(/xmp:CreatorTool(?:="|>)([^"<]{1,120})/)?.[1],
    kind === 'pdf' ? text.match(/\/Producer\s*\(([^)]{1,120})\)/)?.[1] : null,
    kind === 'pdf' ? text.match(/\/Creator\s*\(([^)]{1,120})\)/)?.[1] : null,
    generator,
  ].filter(Boolean).map(clip);
  const software = fields[0] ?? null;
  for (const f of fields) if (GENERATORS.test(f)) signals.push({ source: f === generator ? 'c2pa' : 'xmp', detail: f });

  if (mime === 'image/png') {
    const t = pngText(new Uint8Array(raw[0]));
    if (/Steps:\s*\d+/.test(t.parameters ?? '')) signals.push({ source: 'png_text', detail: 'Stable Diffusion' });
    if (/class_type/.test(t.prompt ?? '') || 'workflow' in t) signals.push({ source: 'png_text', detail: 'ComfyUI' });
    if ('Dream' in t || 'sd-metadata' in t || 'invokeai_metadata' in t) signals.push({ source: 'png_text', detail: 'InvokeAI' });
  }
  if (c2paPresent && iptcAi && !signals.some(s => s.source === 'c2pa')) signals.push({ source: 'c2pa', detail: generator ? clip(generator) : 'C2PA' });

  const exif = /Exif\u0000\u0000/.test(text) || mime === 'image/tiff';
  const xmp = /x:xmpmeta/.test(text);
  const camera = (exif && CAMERAS.test(text.slice(0, 64 * 1024))) || /com\.apple\.quicktime\.make/.test(text);
  const rasterImage = kind === 'image' && mime !== 'image/svg+xml' && mime !== 'image/gif';

  return {
    kind, mime,
    sha256: await sha256(file),
    tech: {
      c2pa: c2paPresent ? { claim_generator: generator ? clip(generator) : null, ai_generated: iptcAi || signals.some(s => s.source === 'c2pa') } : null,
      iptc_digital_source_type: iptcTerm,
      software,
      ai_signals: signals,
      camera_exif_present: camera,
      metadata_stripped: rasterImage && !exif && !xmp && !c2paPresent && iptcTerm === null && signals.length === 0,
      detector_score: null,
    },
  };
}
