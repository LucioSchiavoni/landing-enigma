const BASE = 'https://digitaldentallab-git-main-lucioschiavonis-projects.vercel.app';

export const config = {
  viewport: { width: 1440, height: 900 },
  output: { width: 1440, height: 900 },
  fps: 30,
  crf: 24,
  posterTime: 0.5,
};

export default async function tour({ page, wait, click, scroll, cut, start }) {
  const settle = async (ms = 1500) => {
    await page.waitForLoadState('load');
    await page.waitForTimeout(ms);
  };
  const park = () => page.mouse.move(1180, 600);
  const toTop = () => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const bottom = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  for (const path of ['/', '/servicios']) {
    await page.goto(BASE + path);
    await settle(1500);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
  }

  await page.goto(BASE + '/');
  await settle(2500);
  await park();
  await start();

  await wait(1200);
  await scroll(await bottom(), { duration: 4200 });
  await wait(700);

  await cut(() => toTop().then(() => page.waitForTimeout(600)));
  await click(page.getByRole('link', { name: /nuestros servicios/i }).first(), { duration: 700 });
  await cut(() => page.waitForURL('**/servicios').then(() => settle(1800)), { keepStart: 0.2 });
  await park();
  await wait(900);
  await scroll(await bottom(), { duration: 5200 });
  await wait(1500);
}
