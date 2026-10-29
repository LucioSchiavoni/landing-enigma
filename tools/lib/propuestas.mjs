import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal, unseal } from './sealed.mjs';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sourceDir = join(root, 'propuestas');
const publicDir = join(root, 'public', 'p');
export const adminDir = join(root, 'public', 'a');

export const isPin = (value) => /^\d{6}$/.test(value ?? '');
export const isSlug = (value) => /^[a-z0-9-]{8,}$/.test(value ?? '');

export const normalizeSite = (value) => {
  const site = String(value ?? '').trim().replace(/\/+$/, '');
  if (site && !/^https?:\/\/[^\s/]+$/.test(site)) throw new Error('El dominio debe ser del tipo https://dominio.com');
  return site;
};

export const renderPage = (payload) => `<!doctype html>
<html lang="es" class="is-locked">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08061A">
<title>Propuesta privada · Enigma Builders</title>
<meta name="description" content="Propuesta privada de Enigma Builders.">
<meta property="og:title" content="Propuesta privada · Enigma Builders">
<meta property="og:description" content="Ingrese su PIN para ver la propuesta.">
<meta property="og:image" content="/p/assets/logo.jpg">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/p/assets/apple-touch-icon.png">
<link rel="preload" href="/p/assets/lexend-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/p/assets/propuesta.css">
<script type="module" src="/p/assets/propuesta.js"></script>
</head>
<body>
<div class="lock" data-lock>
  <div class="dot-grid" aria-hidden="true"></div>
  <div class="band band-left" aria-hidden="true"></div>
  <div class="band band-right" aria-hidden="true"></div>
  <form class="lock-card" autocomplete="off">
    <img class="seal" src="/p/assets/logo-circulo.webp" width="480" height="480" alt="Enigma Builders">
    <span class="tag">[ Documento privado ]</span>
    <h1 class="lock-title">Propuesta privada</h1>
    <p class="lock-text">Ingrese el PIN de 6 dígitos que le enviamos para ver la propuesta.</p>
    <div class="pin" data-pin>
      <label class="sr-only" for="pin">PIN de 6 dígitos</label>
      <input class="pin-input" id="pin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" aria-describedby="pin-status" data-pin-input>
      <div class="pin-cells" aria-hidden="true">
        <span class="pin-cell" data-pin-cell></span><span class="pin-cell" data-pin-cell></span><span class="pin-cell" data-pin-cell></span><span class="pin-cell" data-pin-cell></span><span class="pin-cell" data-pin-cell></span><span class="pin-cell" data-pin-cell></span>
      </div>
    </div>
    <p class="lock-status" id="pin-status" role="status" data-pin-status>Ingrese el PIN de 6 dígitos</p>
    <span class="tag lock-foot">Enigma Builders · Uruguay</span>
  </form>
</div>
<div class="doc" data-doc hidden></div>
<script type="application/json" data-payload>${JSON.stringify(payload)}</script>
</body>
</html>
`;

export const renderAdminPage = () => `<!doctype html>
<html lang="es" class="is-locked">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08061A">
<title>Panel · Enigma Builders</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preload" href="/p/assets/lexend-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/p/assets/propuesta.css">
<link rel="stylesheet" href="/p/assets/admin.css">
<script type="module" src="/p/assets/admin.js"></script>
</head>
<body>
<div class="lock" data-lock>
  <div class="dot-grid" aria-hidden="true"></div>
  <div class="band band-left" aria-hidden="true"></div>
  <div class="band band-right" aria-hidden="true"></div>
  <form class="lock-card" autocomplete="off" data-unlock>
    <img class="seal" src="/p/assets/logo-circulo.webp" width="480" height="480" alt="Enigma Builders">
    <span class="tag">[ Acceso restringido ]</span>
    <h1 class="lock-title">Panel</h1>
    <p class="lock-text">Introduce el secret para ver las propuestas enviadas.</p>
    <div class="lock-field">
      <label class="sr-only" for="secret">Secret</label>
      <input class="field-input" id="secret" type="password" autocomplete="current-password" aria-describedby="secret-status" required data-secret>
      <button class="btn btn-primary" type="submit" data-unlock-submit>Entrar</button>
    </div>
    <p class="lock-status" id="secret-status" role="status" data-unlock-status></p>
    <span class="tag lock-foot">Enigma Builders · Uso interno</span>
  </form>
</div>
<div class="admin" data-admin hidden></div>
</body>
</html>
`;

const payloadPattern = /(<script type="application\/json" data-payload>)([\s\S]*?)(<\/script>)/;

export const listSources = async () => {
  if (!existsSync(sourceDir)) return [];
  const files = await readdir(sourceDir);
  return files.filter((file) => file.endsWith('.html')).map((file) => file.slice(0, -5)).sort();
};

export const readSourceSlug = async (name) => {
  const meta = join(sourceDir, `${name}.json`);
  if (!existsSync(meta)) return undefined;
  return JSON.parse(await readFile(meta, 'utf8')).slug;
};

export const hasSource = (name) => existsSync(join(sourceDir, `${name}.html`));

export const publishFromSource = async (name, pin, slug) => {
  if (!hasSource(name)) throw new Error(`No existe propuestas/${name}.html`);
  const html = await readFile(join(sourceDir, `${name}.html`), 'utf8');
  const outDir = join(publicDir, slug);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), renderPage(await seal(pin, html)));
  await writeFile(join(sourceDir, `${name}.json`), `${JSON.stringify({ slug }, null, 2)}\n`);
};

export const rekey = async (slug, oldPin, newPin) => {
  const file = join(publicDir, slug, 'index.html');
  const page = await readFile(file, 'utf8');
  const match = page.match(payloadPattern);
  if (!match) throw new Error(`public/p/${slug}/index.html no tiene una propuesta cifrada`);
  const html = await unseal(oldPin, JSON.parse(match[2]));
  const payload = JSON.stringify(await seal(newPin, html));
  await writeFile(file, page.replace(payloadPattern, (_, open, _old, close) => `${open}${payload}${close}`));
};

export const findAdmin = async () => {
  if (!existsSync(adminDir)) return null;
  const entries = await readdir(adminDir, { withFileTypes: true });
  const panels = entries.filter((entry) => entry.isDirectory() && existsSync(join(adminDir, entry.name, 'vault.json')));
  if (panels.length > 1) throw new Error('Hay más de un panel en public/a/');
  return panels[0] ? join(adminDir, panels[0].name) : null;
};

export const readVault = async (dir, secret) => {
  const payload = JSON.parse(await readFile(join(dir, 'vault.json'), 'utf8'));
  return JSON.parse(await unseal(secret, payload));
};

export const writeVault = async (dir, secret, vault) => {
  await writeFile(join(dir, 'vault.json'), `${JSON.stringify(await seal(secret, JSON.stringify(vault)))}\n`);
};
