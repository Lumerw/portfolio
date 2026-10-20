// Publikuje PDF-y z pdf/ w GitHub Releases (tag „pdf”) - nie w historii repozytorium.
//   npm run pdf && npm run deck && npm run publish-pdf
// Workflow publikacji pobiera je stamtąd do strony, więc na lumerw.com mają te same adresy co wcześniej
// (np. /portfolio-lumer-pl.pdf). Po wysłaniu uruchamia publikację strony, żeby nowe pliki trafiły na stronę.
import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'pdf');
const TAG = 'pdf';
const gh = (...args) => execFileSync('gh', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const files = (await readdir(dir).catch(() => [])).filter(f => f.endsWith('.pdf')).map(f => join(dir, f));
if (!files.length) { console.error('✗ brak plików w pdf/ - najpierw npm run pdf i npm run deck'); process.exit(1); }

try { gh('release', 'view', TAG); } catch {
  gh('release', 'create', TAG, '--title', 'PDF portfolio', '--notes', 'PDF-y do pobrania ze strony (npm run publish-pdf). Workflow publikacji dokłada je do lumerw.com.', '--latest=false');
}
gh('release', 'upload', TAG, ...files, '--clobber');
console.log(`✓ ${files.length} PDF → GitHub Releases (${TAG})`);
try { gh('workflow', 'run', 'checks.yml'); console.log('✓ publikacja strony uruchomiona (Actions → Testy i publikacja)'); } catch { console.log('… uruchom publikację ręcznie: Actions → Testy i publikacja → Run workflow'); }
