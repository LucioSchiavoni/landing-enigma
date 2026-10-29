import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { adminDir, findAdmin, normalizeSite, renderAdminPage, writeVault } from './lib/propuestas.mjs';
import { randomSlug } from './lib/sealed.mjs';

const [secret, siteArg] = process.argv.slice(2);

if (!secret || secret.length < 16) {
  console.error('Uso: node tools/admin-init.mjs <secret de 16 caracteres o más> [https://dominio]');
  console.error('Crea el panel en public/a/<slug>/ con una bóveda vacía cifrada con el secret.');
  process.exit(1);
}

if (await findAdmin()) {
  console.error('Ya existe un panel en public/a/. Bórralo antes de crear otro.');
  process.exit(1);
}

const site = normalizeSite(siteArg);
const slug = randomSlug(24);
const dir = join(adminDir, slug);

await mkdir(dir, { recursive: true });
await writeFile(join(dir, 'index.html'), renderAdminPage());
await writeVault(dir, secret, { site, proposals: [] });

console.log(`Panel creado en public/a/${slug}/`);
console.log(`Enlace: /a/${slug}/`);
