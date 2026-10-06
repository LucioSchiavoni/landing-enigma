const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\$@';
const START_DELAY = 250;
const STEP_IN = 32;
const STEP_OUT = 14;
const SPREAD = 260;
const TICK = 55;
const HOLD = 4200;

type Mode = 'in' | 'out';

const randomGlyph = () => GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const charsOf = (phrase: HTMLElement) => Array.from(phrase.querySelectorAll<HTMLElement>('.dc'));

const scramble = (char: HTMLElement) => {
  char.dataset.c = randomGlyph();
  char.classList.add('is-scrambling');
};

const settle = (char: HTMLElement) => {
  char.classList.remove('is-scrambling');
  delete char.dataset.c;
};

const animate = (chars: HTMLElement[], mode: Mode) =>
  new Promise<void>((resolve) => {
    const step = mode === 'in' ? STEP_IN : STEP_OUT;
    const offset = mode === 'in' ? START_DELAY : 0;
    const spread = mode === 'in' ? SPREAD : SPREAD / 2;
    const schedule = chars.map((_, i) => offset + i * step + Math.random() * spread);
    const done = chars.map(() => false);
    const start = performance.now();
    let lastTick = 0;
    let pending = chars.length;

    const frame = (now: number) => {
      const elapsed = now - start;
      const shuffle = now - lastTick >= TICK;
      if (shuffle) lastTick = now;

      chars.forEach((char, i) => {
        if (!done[i] && elapsed >= schedule[i]) {
          done[i] = true;
          pending -= 1;
          if (mode === 'in') {
            settle(char);
          } else {
            scramble(char);
          }
        } else if (shuffle && char.classList.contains('is-scrambling')) {
          char.dataset.c = randomGlyph();
        }
      });

      if (pending > 0) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(frame);
  });

const run = async (root: HTMLElement) => {
  const phrases = Array.from(root.querySelectorAll<HTMLElement>('[data-phrase]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || phrases.length === 0) {
    root.classList.add('is-ready');
    return;
  }

  const first = charsOf(phrases[0]);
  first.forEach(scramble);
  root.classList.add('is-ready');
  await animate(first, 'in');

  const sequence = [...phrases.keys(), 0];
  for (let i = 1; i < sequence.length; i += 1) {
    await pause(HOLD);
    const current = phrases[sequence[i - 1]];
    const next = phrases[sequence[i]];
    const currentChars = charsOf(current);
    await animate(currentChars, 'out');
    await pause(120);
    current.classList.remove('is-active');
    currentChars.forEach(settle);
    const nextChars = charsOf(next);
    nextChars.forEach(scramble);
    next.classList.add('is-active');
    await animate(nextChars, 'in');
  }
};

document.querySelectorAll<HTMLElement>('[data-decrypt]').forEach((root) => {
  void run(root);
});
