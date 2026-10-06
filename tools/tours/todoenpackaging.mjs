const BASE = 'https://todoenpackaging.com.uy';
const PAGES = ['/', '/productos', '/nosotros', '/contacto'];

export const config = {
  viewport: { width: 1440, height: 900 },
  output: { width: 1440, height: 900 },
  fps: 30,
  crf: 25,
  posterTime: 0.5,
};

export default async function tour({ page, wait, click, scroll, cut, start }) {
  const settle = async (ms = 1500) => {
    await page.waitForLoadState('load');
    await page.waitForTimeout(ms);
  };
  const park = () => page.mouse.move(1180, 560);

  for (const path of PAGES) {
    await page.goto(BASE + path);
    await settle(1200);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 700) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(600);
  }

  await page.goto(BASE + '/');
  await settle(2000);
  await park();
  await start();

  await wait(800);
  await scroll(2300, { duration: 2600 });
  await wait(500);

  await cut(() => page.goto(BASE + '/productos').then(() => settle(1500)));
  await park();
  await wait(500);
  await scroll(1900, { duration: 2200 });
  await wait(400);

  await click(page.getByRole('link', { name: 'Nosotros', exact: true }), { duration: 650 });
  await cut(() => page.waitForURL('**/nosotros').then(() => settle(1500)), { keepStart: 0.2 });
  await park();
  await wait(600);
  await scroll(2200, { duration: 2400 });
  await wait(400);

  await click(page.getByRole('link', { name: /contactanos/i }).first(), { duration: 650 });
  await cut(() => page.waitForURL('**/contacto').then(() => settle(1500)), { keepStart: 0.2 });
  await park();
  await wait(2000);
}
