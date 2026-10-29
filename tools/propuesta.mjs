import { hasSource, isPin, isSlug, publishFromSource, readSourceSlug } from './lib/propuestas.mjs';
import { randomSlug } from './lib/sealed.mjs';

const [name, pin, slugArg] = process.argv.slice(2);

if (!name || !isPin(pin)) {
  console.error('Uso: node tools/propuesta.mjs <nombre> <pin de 6 dígitos> [slug]');
  console.error('Lee propuestas/<nombre>.html y escribe public/p/<slug>/index.html cifrado con el PIN.');
  process.exit(1);
}

if (!hasSource(name)) {
  console.error(`No existe propuestas/${name}.html`);
  process.exit(1);
}

const slug = slugArg ?? (await readSourceSlug(name)) ?? randomSlug();

if (!isSlug(slug)) {
  console.error('El slug debe tener al menos 8 caracteres: minúsculas, números o guiones.');
  process.exit(1);
}

await publishFromSource(name, pin, slug);

console.log(`Propuesta cifrada en public/p/${slug}/index.html`);
console.log(`Enlace: /p/${slug}/`);
console.log('Si la propuesta está en el panel, cambia el PIN desde el panel para que no quede desactualizado.');
