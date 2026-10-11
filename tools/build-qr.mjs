// Kod QR do wersji www (shared.siteUrl) jako statyczny SVG: assets/qr.svg
//   npm run qr   (uruchamiany też automatycznie przez npm run pdf)
import QRCode from 'qrcode';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shared } from '../content.js';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'qr.svg');

export async function buildQr() {
  if (shared.siteUrl.includes('[')) console.warn(`⚠ siteUrl to placeholder (${shared.siteUrl}) — QR trzeba wygenerować ponownie po ustaleniu domeny.`);
  const svg = await QRCode.toString(shared.siteUrl, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#0000' }, // przezroczyste tło — papier spod spodu
  });
  await writeFile(out, svg);
  console.log('assets/qr.svg ←', shared.siteUrl);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildQr();
