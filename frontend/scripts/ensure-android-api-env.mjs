/**
 * Play / release: Vite embeds VITE_* at build time. Without API URL, the app uses
 * relative "/api" — broken inside Capacitor WebView.
 * Pass VITE_API_BASE_URL in the environment (CI) or define it in .env.production.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const fromEnv = (process.env.VITE_API_BASE_URL || '').trim();
if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
  console.log('[ensure-android-api-env] OK: VITE_API_BASE_URL from environment.');
  process.exit(0);
}

const envPath = resolve(root, '.env.production');
if (!existsSync(envPath)) {
  console.error(
    '[ensure-android-api-env] Missing .env.production (or set VITE_API_BASE_URL in env).\n' +
      '  Create frontend/.env.production with e.g.:\n' +
      '  VITE_API_BASE_URL=https://your-backend.up.railway.app\n' +
      '  VITE_GOOGLE_CLIENT_ID=....apps.googleusercontent.com\n',
  );
  process.exit(1);
}

let text = readFileSync(envPath, 'utf8');
if (!text.trim()) {
  console.error(
    '[ensure-android-api-env] frontend/.env.production is empty (0 bytes or only whitespace).\n' +
      '  Paste your VITE_* lines and press Ctrl+S to save, then run again.\n' +
      '  Example:\n' +
      '  VITE_API_BASE_URL=https://your-backend.up.railway.app\n' +
      '  VITE_GOOGLE_CLIENT_ID=....apps.googleusercontent.com\n',
  );
  process.exit(1);
}
// UTF-8 BOM / Notepad saves can break a strict ^ anchor match
if (text.charCodeAt(0) === 0xfeff) {
  text = text.slice(1);
}

let url = '';
for (const line of text.split(/\r?\n/)) {
  const t = line.replace(/^\uFEFF/, '').trim();
  if (!t || t.startsWith('#')) continue;
  const m = t.match(/^VITE_API_BASE_URL\s*=\s*(.+)$/);
  if (m) {
    url = m[1].trim().replace(/^["']|["']$/g, '');
    const hash = url.indexOf('#');
    if (hash >= 0) url = url.slice(0, hash).trim();
    break;
  }
  // Lenient: BOM or hidden chars before key
  const key = 'VITE_API_BASE_URL=';
  const at = t.indexOf(key);
  if (at >= 0) {
    url = t.slice(at + key.length).trim();
    const hash = url.indexOf('#');
    if (hash >= 0) url = url.slice(0, hash).trim();
    url = url.replace(/^["']|["']$/g, '');
    break;
  }
}

if (!url || !/^https?:\/\//i.test(url)) {
  console.error(
    '[ensure-android-api-env] No valid VITE_API_BASE_URL= in .env.production.\n' +
      '  Use a full URL with https:// and no /api suffix. Save the file after editing.',
  );
  process.exit(1);
}

console.log('[ensure-android-api-env] OK: VITE_API_BASE_URL in .env.production');
