const URL = 'https://wattstudio.com.uy/creativity';

export const config = {
  viewport: { width: 1440, height: 900 },
  output: { width: 1440, height: 900 },
  fps: 30,
  crf: 20,
  posterTime: 17,
};

export default async function tour({ page, wait, moveTo, click, drag, cut, start }) {
  await page.goto(URL);
  await page.waitForLoadState('load');
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /solo necesarias/i }).click().catch(() => undefined);
  await page.waitForTimeout(800);
  await page.mouse.move(980, 520);
  await start();

  await wait(900);
  await moveTo(page.getByText('Mesa', { exact: true }).first(), { duration: 700 });
  await wait(300);
  await click(page.getByText(/comenzar a crear/i).first(), { duration: 600 });
  await cut(() => page.waitForTimeout(2600), { keepStart: 1.1, keepEnd: 0.1 });

  await moveTo({ x: 760, y: 360 }, { duration: 600 });
  await wait(500);
  await click(page.getByRole('button', { name: 'Siguiente pantalla' }), { duration: 600 });
  await wait(1200);
  await click(page.getByRole('button', { name: 'Siguiente pantalla' }), { duration: 250 });
  await wait(1200);
  await click(page.getByRole('button', { name: 'Siguiente base' }), { duration: 650 });
  await wait(1200);
  await click(page.getByRole('button', { name: 'Siguiente base' }), { duration: 250 });
  await wait(1200);

  await click(page.getByRole('button', { name: 'Noche' }), { duration: 750 });
  await wait(1300);
  await drag({ x: 298, y: 684 }, { x: 440, y: 684 }, { duration: 1500 });
  await wait(700);
  await drag({ x: 440, y: 684 }, { x: 330, y: 684 }, { duration: 1100 });
  await wait(1500);
}
