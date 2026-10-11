import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4321';
const outDir = path.resolve('src/assets/demos');

const shots = {
  obra: async (page) => {
    await page.evaluate(() => {
      const chapter = document.querySelectorAll('.chapter')[4];
      window.scrollTo(0, chapter.offsetTop + chapter.offsetHeight * 0.35);
    });
  },
  carta: async (page) => {
    await page.evaluate(() => window.scrollTo(0, document.getElementById('entradas-0').offsetTop));
  },
  agenda: async (page) => {
    await page.evaluate(() => window.scrollTo(0, document.getElementById('p1').offsetTop));
  },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [slug, position] of Object.entries(shots)) {
  await page.goto(`${base}/demos/${slug}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important }' });
  await page.evaluate(() => document.fonts.ready);
  await position(page);
  await page.waitForTimeout(1500);
  await page.waitForLoadState('networkidle');
  const file = path.join(outDir, `${slug}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  console.log(file);
}

await browser.close();
