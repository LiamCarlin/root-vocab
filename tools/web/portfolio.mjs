// Builds Root's web version for a path on another site and drops it into that site's static folder.
//
//   node tools/web/portfolio.mjs ~/projects/dhvan
//
// writes, inside the site's public/ folder (copied as-is by Vite):
//   root/index.html   the page at /root: a short intro and the app in a phone-sized frame
//                     (phones skip the frame and open the app full screen)
//   root/app/         the app itself, built to live at /root/app/
//
// Anything already in public/root is replaced; nothing else in the site is touched.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const site = resolve((process.argv[2] ?? '').replace(/^~(?=$|\/)/, process.env.HOME ?? '~'));
if (!process.argv[2] || !existsSync(join(site, 'public'))) {
  console.error('Usage: node tools/web/portfolio.mjs <path to the site, with a public/ folder>');
  process.exit(1);
}

const out = mkdtempSync(join(tmpdir(), 'root-web-'));
console.log('Building Root for /root/app …');
execSync(`npx expo export --platform web --output-dir "${out}"`, { cwd: repo, stdio: 'inherit', env: { ...process.env, EXPO_BASE_URL: '/root/app' } });

// Cloudflare's uploader (wrangler pages deploy) skips every folder named node_modules, which is
// where Expo puts fonts and icons that come from packages. Move them and point the bundles there.
const from = join(out, 'assets', 'node_modules');
if (existsSync(from)) {
  renameSync(from, join(out, 'assets', 'vendor'));
  for (const file of readdirSync(out, { recursive: true })) {
    if (!/\.(js|html|css|json)$/.test(file)) continue;
    const text = readFileSync(join(out, file), 'utf8');
    if (text.includes('/assets/node_modules/')) writeFileSync(join(out, file), text.replaceAll('/assets/node_modules/', '/assets/vendor/'));
  }
}

const dest = join(site, 'public', 'root');
rmSync(dest, { recursive: true, force: true });
cpSync(out, join(dest, 'app'), { recursive: true });
cpSync(join(here, 'frame.html'), join(dest, 'index.html'));
rmSync(out, { recursive: true, force: true });
console.log(`Done: ${dest}`);
