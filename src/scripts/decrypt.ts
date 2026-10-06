const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\$@';
const START_DELAY = 250;
const STEP = 32;
const SPREAD = 260;
const TICK = 55;

const randomGlyph = () => GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));

const run = (root: HTMLElement) => {
  const chars = Array.from(root.querySelectorAll<HTMLElement>('.dc'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || chars.length === 0) {
    root.classList.add('is-ready');
    return;
  }

  const schedule = chars.map((_, i) => START_DELAY + i * STEP + Math.random() * SPREAD);

  chars.forEach((char) => {
    char.dataset.c = randomGlyph();
    char.classList.add('is-scrambling');
  });
  root.classList.add('is-ready');

  const start = performance.now();
  let lastTick = 0;
  let pending = chars.length;

  const frame = (now: number) => {
    const elapsed = now - start;
    const shuffle = now - lastTick >= TICK;
    if (shuffle) lastTick = now;

    chars.forEach((char, i) => {
      if (!char.classList.contains('is-scrambling')) return;
      if (elapsed >= schedule[i]) {
        char.classList.remove('is-scrambling');
        delete char.dataset.c;
        pending -= 1;
      } else if (shuffle) {
        char.dataset.c = randomGlyph();
      }
    });

    if (pending > 0) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};

document.querySelectorAll<HTMLElement>('[data-decrypt]').forEach(run);
