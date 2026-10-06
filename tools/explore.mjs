import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const [slug, ...urls] = process.argv.slice(2);
const outDir = `tools/out/${slug}/explore`;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: existsSync(`tools/.auth/${slug}.json`) ? `tools/.auth/${slug}.json` : undefined,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

for (const [i, url] of urls.entries()) {
  await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(3000);
  const file = `${outDir}/${String(i + 1).padStart(2, '0')}.png`;
  await page.screenshot({ path: file });
  console.log(file, page.url());
}

await browser.close();
