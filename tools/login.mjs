import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const [slug, url] = process.argv.slice(2);
if (!slug || !url) {
  console.error('Uso: node tools/login.mjs <slug> <url-de-login>');
  process.exit(1);
}

const statePath = `tools/.auth/${slug}.json`;
await mkdir('tools/.auth', { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await page.goto(url);

console.log('Inicia sesión en la ventana de Chromium. La sesión se guardará automáticamente.');

await page.waitForURL((current) => !/\/(login|signin|auth)/i.test(current.pathname), { timeout: 600000 });
await page.waitForLoadState('networkidle').catch(() => undefined);
await context.storageState({ path: statePath });

console.log(`Sesión guardada en ${statePath}`);
await browser.close();
