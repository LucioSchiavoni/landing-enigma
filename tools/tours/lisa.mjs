const BASE = 'https://www.lisabasilisa.com';
const WORLD = '/mundos/d35e4fd2-a093-407a-85f0-8241d4fb0ba1';

const SAMPLE =
  'La fotosíntesis es el proceso bioquímico mediante el cual los organismos autótrofos, como las plantas, transforman la energía lumínica en energía química, sintetizando glucosa a partir de dióxido de carbono y agua, y liberando oxígeno como subproducto.';

export const config = {
  viewport: { width: 1440, height: 900 },
  output: { width: 1440, height: 900 },
  fps: 30,
  crf: 20,
};

const textLength = (page) => page.evaluate(() => document.body.innerText.length);

const waitForGrowth = async (page, base, min = 40, timeout = 60000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await textLength(page)) > base + min) return;
    await page.waitForTimeout(150);
  }
};

const waitForStable = async (page, quiet = 2500, timeout = 90000) => {
  const start = Date.now();
  let last = await textLength(page);
  let since = Date.now();
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(250);
    const current = await textLength(page);
    if (current !== last) {
      last = current;
      since = Date.now();
    } else if (Date.now() - since >= quiet) {
      return;
    }
  }
};

export default async function tour({ page, wait, moveTo, click, cut, start }) {
  const settle = async (ms = 1500) => {
    await page.waitForLoadState('load');
    await page.waitForTimeout(ms);
  };
  const park = () => page.mouse.move(760, 520);

  await page.goto(`${BASE}/inicio`);
  await settle(2000);
  await park();
  await start();

  await wait(500);
  await click({ x: 1046, y: 232 }, { duration: 900 });
  await cut(() => page.waitForURL(`**${WORLD}`).then(() => settle(1800)), { keepStart: 0.25 });
  await park();

  await wait(700);
  await click({ x: 720, y: 312 }, { duration: 650 });
  await wait(900);
  await click(page.getByText('Probar ejercicio'), { duration: 550 });
  await cut(() => page.waitForURL('**/ejercicios/**').then(() => settle(1800)), { keepStart: 0.25 });
  await park();

  await wait(700);
  await click(page.getByRole('button', { name: 'Comenzar' }).first(), { duration: 550 });
  await cut(() => page.waitForURL('**/preguntas**').then(() => settle(1800)), { keepStart: 0.25 });
  await park();

  await wait(800);
  await click({ x: 863, y: 628 }, { duration: 650 });
  await wait(1300);

  await cut(() => page.goto(`${BASE}/simplificador`).then(() => settle(1800)));
  await park();

  await wait(400);
  await click(page.locator('textarea').first(), { duration: 500 });
  await cut(() => page.keyboard.type(SAMPLE, { delay: 10 }), { keepStart: 1.0, keepEnd: 0.4 });
  await wait(200);

  const base = await textLength(page);
  await click(page.getByRole('button', { name: 'Simplificar texto' }), { duration: 500 });
  await cut(() => waitForGrowth(page, base), { keepStart: 0.4 });
  await cut(() => waitForStable(page), { keepStart: 1.5, keepEnd: 0.2 });
  await wait(2200);
}
