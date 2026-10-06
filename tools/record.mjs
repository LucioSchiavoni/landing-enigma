import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const slug = process.argv[2];
const encodeOnly = process.argv.includes('--encode');
if (!slug) {
  console.error('Uso: node tools/record.mjs <slug> [--encode]');
  process.exit(1);
}

const { default: tour, config = {} } = await import(`./tours/${slug}.mjs`);

const VIEWPORT = config.viewport ?? { width: 1440, height: 900 };
const OUTPUT = config.output ?? VIEWPORT;
const FPS = config.fps ?? 30;

const outDir = path.resolve(`tools/out/${slug}`);
const framesDir = path.join(outDir, 'frames');
const timelinePath = path.join(outDir, 'timeline.json');
const publicDir = path.resolve('public/proyectos');

const cursorScript = () => {
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const mount = () => {
    if (document.getElementById('__rec-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = '__rec-cursor';
    cursor.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 19 12l-6.6 1.4L9 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(cursor.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transform: 'translate(-100px, -100px)',
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))',
    });
    document.documentElement.appendChild(cursor);

    const place = (x, y) => {
      window.__recX = x;
      window.__recY = y;
      cursor.style.transform = `translate(${x - 3}px, ${y - 2}px)`;
    };

    window.__recAnimate = (x, y, duration) => {
      const fromX = window.__recX ?? x;
      const fromY = window.__recY ?? y;
      const begin = performance.now();
      window.__recBusy = begin + duration;
      const step = (time) => {
        const k = Math.min(1, (time - begin) / duration);
        const e = ease(k);
        place(fromX + (x - fromX) * e, fromY + (y - fromY) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    window.__recScroll = (dy, duration) => {
      const from = window.scrollY;
      const begin = performance.now();
      const step = (time) => {
        const k = Math.min(1, (time - begin) / duration);
        window.scrollTo({ top: from + dy * ease(k), behavior: 'instant' });
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    window.addEventListener(
      'mousemove',
      (event) => {
        if (performance.now() < (window.__recBusy ?? 0)) return;
        place(event.clientX, event.clientY);
      },
      true,
    );
    window.addEventListener(
      'mousedown',
      (event) => {
        const ring = document.createElement('div');
        Object.assign(ring.style, {
          position: 'fixed',
          left: `${event.clientX - 18}px`,
          top: `${event.clientY - 18}px`,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '2px solid rgba(67,16,227,.85)',
          zIndex: '2147483646',
          pointerEvents: 'none',
          transition: 'transform .45s ease-out, opacity .45s ease-out',
        });
        document.documentElement.appendChild(ring);
        requestAnimationFrame(() => {
          ring.style.transform = 'scale(1.8)';
          ring.style.opacity = '0';
        });
        setTimeout(() => ring.remove(), 500);
      },
      true,
    );
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
};

const record = async () => {
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const authPath = `tools/.auth/${slug}.json`;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: existsSync(authPath) ? authPath : undefined,
    viewport: VIEWPORT,
    colorScheme: config.colorScheme ?? 'light',
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(cursorScript);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const frames = [];
  const cuts = [];
  const writes = [];
  let recording = false;
  const now = () => Date.now() / 1000;

  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
    if (!recording) return;
    const file = path.join(framesDir, `${String(frames.length).padStart(6, '0')}.jpg`);
    frames.push({ t: now(), file });
    writes.push(writeFile(file, Buffer.from(data, 'base64')));
  });

  const helpers = {
    page,
    wait: (ms) => page.waitForTimeout(ms),
    async moveTo(target, { duration = 650 } = {}) {
      let point = target;
      if (typeof target.boundingBox === 'function') {
        const visible = target.filter({ visible: true }).first();
        await visible.waitFor({ state: 'visible' });
        const box = await visible.boundingBox();
        point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }
      await page.evaluate(({ x, y, d }) => window.__recAnimate?.(x, y, d), { x: point.x, y: point.y, d: duration });
      await page.waitForTimeout(duration + 30);
      await page.mouse.move(point.x, point.y);
    },
    async click(target, options) {
      await helpers.moveTo(target, options);
      await page.waitForTimeout(120);
      await page.mouse.down();
      await page.waitForTimeout(60);
      await page.mouse.up();
    },
    async drag(from, to, { duration = 1400, steps = 24 } = {}) {
      await helpers.moveTo(from);
      await page.waitForTimeout(120);
      await page.mouse.down();
      await page.evaluate(({ x, y, d }) => window.__recAnimate?.(x, y, d), { x: to.x, y: to.y, d: duration });
      const begin = Date.now();
      for (let i = 1; i <= steps; i += 1) {
        const target = begin + (duration * i) / steps;
        const k = i / steps;
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
        const left = target - Date.now();
        if (left > 0) await page.waitForTimeout(left);
      }
      await page.mouse.up();
    },
    async scroll(deltaY, { duration = 900 } = {}) {
      await page.evaluate(({ dy, d }) => window.__recScroll?.(dy, d), { dy: deltaY, d: duration });
      await page.waitForTimeout(duration + 30);
    },
    async cut(fn, { keepStart = 0, keepEnd = 0 } = {}) {
      const start = now();
      const result = await fn();
      const end = now();
      const a = start + keepStart;
      const b = end - keepEnd;
      if (b - a > 0.05) cuts.push([a, b]);
      return result;
    },
    async start() {
      await cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 92,
        maxWidth: VIEWPORT.width,
        maxHeight: VIEWPORT.height,
        everyNthFrame: 1,
      });
      await page.waitForTimeout(300);
      recording = true;
    },
  };

  try {
    await tour(helpers);
  } catch (error) {
    await page.screenshot({ path: path.join(outDir, 'error.png') }).catch(() => undefined);
    await browser.close();
    throw error;
  }

  await page.waitForTimeout(200);
  recording = false;
  const endTime = now();
  await cdp.send('Page.stopScreencast').catch(() => undefined);
  await Promise.all(writes);
  await browser.close();

  const timeline = { frames, cuts, endTime };
  await writeFile(timelinePath, JSON.stringify(timeline));
  return timeline;
};

const run = (args) =>
  new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { cwd: outDir, stdio: ['ignore', 'ignore', 'pipe'] });
    let log = '';
    proc.stderr.on('data', (chunk) => (log += chunk));
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(log.slice(-2000)))));
  });

const encode = async ({ frames, cuts, endTime }) => {
  if (frames.length < 2) throw new Error('No se capturaron suficientes fotogramas.');
  await mkdir(publicDir, { recursive: true });

  const sorted = [...cuts].sort((x, y) => x[0] - y[0]);
  const shifted = frames.map((f) => ({ ...f }));
  for (const [a, b] of sorted) {
    const inside = shifted.filter((f) => f.t >= a && f.t <= b);
    const last = inside.at(-1);
    if (last) last.t = b;
  }

  const removedBefore = (t) => sorted.reduce((sum, [a, b]) => sum + (t > a ? Math.min(t, b) - a : 0), 0);
  const isCut = (f) => sorted.some(([a, b]) => f.t >= a && f.t < b);

  const kept = shifted
    .filter((f) => !isCut(f))
    .map((f) => ({ ...f, t: f.t - removedBefore(f.t) }))
    .sort((x, y) => x.t - y.t);

  const origin = kept[0].t;
  const finish = endTime - removedBefore(endTime) + (config.holdEnd ?? 0);
  const lines = [];
  kept.forEach((f, i) => {
    const next = kept[i + 1]?.t ?? finish;
    const duration = Math.max(next - f.t, 0.001);
    lines.push(`file '${path.relative(outDir, f.file).replaceAll('\\', '/')}'`, `duration ${duration.toFixed(4)}`);
  });
  lines.push(`file '${path.relative(outDir, kept.at(-1).file).replaceAll('\\', '/')}'`);
  await writeFile(path.join(outDir, 'frames.txt'), lines.join('\n'));

  const scale = `scale=${OUTPUT.width}:${OUTPUT.height}:flags=lanczos`;
  const videoPath = path.join(publicDir, `${slug}.mp4`);
  const posterPath = path.join(publicDir, `${slug}.webp`);
  const posterAt = kept.findIndex((f) => f.t - origin >= (config.posterTime ?? 0));
  const posterIndex = posterAt < 0 ? kept.length - 1 : posterAt;

  await run([
    '-y', '-f', 'concat', '-safe', '0', '-i', 'frames.txt',
    '-vf', `fps=${FPS},${scale},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(config.crf ?? 20), '-profile:v', 'high',
    '-movflags', '+faststart', '-an', videoPath,
  ]);
  await run([
    '-y', '-i', path.relative(outDir, kept[posterIndex].file).replaceAll('\\', '/'),
    '-vf', scale, '-quality', '85', posterPath,
  ]);

  console.log(`Fotogramas: ${frames.length} capturados, ${kept.length} usados`);
  console.log(`Duración: ${(finish - origin).toFixed(1)} s`);
  console.log(`Vídeo: ${path.relative(process.cwd(), videoPath)}`);
  console.log(`Póster: ${path.relative(process.cwd(), posterPath)}`);
};

const timeline = encodeOnly ? JSON.parse(await readFile(timelinePath, 'utf8')) : await record();
await encode(timeline);
