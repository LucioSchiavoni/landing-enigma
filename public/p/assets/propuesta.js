const lock = document.querySelector('[data-lock]');
const doc = document.querySelector('[data-doc]');
const pin = document.querySelector('[data-pin]');
const input = document.querySelector('[data-pin-input]');
const cells = [...document.querySelectorAll('[data-pin-cell]')];
const status = document.querySelector('[data-pin-status]');

const storageKey = `propuesta:${location.pathname}`;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let busy = false;
let failures = 0;
let lockedUntil = 0;

const slug = location.pathname.split('/').filter(Boolean).pop();

class Rejected extends Error {
  constructor(message, limited) {
    super(message);
    this.limited = limited;
  }
}

const unlock = async (code) => {
  let response;
  try {
    response = await fetch('/api/p/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, pin: code }),
    });
  } catch {
    throw new Error('Sin conexión. Inténtelo de nuevo.');
  }
  const result = await response.json().catch(() => ({}));
  if (response.ok && typeof result.html === 'string') return result.html;
  if (response.status === 401) throw new Rejected('PIN incorrecto', false);
  if (response.status === 429) throw new Rejected(result.error ?? 'Demasiados intentos. Espere unos minutos.', true);
  throw new Error('No se pudo verificar el PIN. Inténtelo de nuevo.');
};

const render = () => {
  const value = input.value;
  cells.forEach((cell, index) => {
    cell.textContent = value[index] ? '•' : '';
    cell.classList.toggle('is-filled', Boolean(value[index]));
    cell.classList.toggle('is-active', index === Math.min(value.length, 5) && value.length < 6);
  });
};

const setStatus = (text, error = false) => {
  status.textContent = text;
  status.classList.toggle('is-error', error);
};

const reveal = () => {
  const items = doc.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((item) => observer.observe(item));
};

const open = (html) => {
  doc.innerHTML = html;
  doc.hidden = false;
  document.documentElement.classList.remove('is-locked');
  reveal();
  if (reduceMotion) {
    lock.remove();
  } else {
    lock.classList.add('is-leaving');
    lock.addEventListener('transitionend', () => lock.remove(), { once: true });
  }
  doc.querySelector('h1')?.focus({ preventScroll: true });
};

const lock429 = (message) => {
  input.value = '';
  render();
  lockedUntil = Date.now() + 60000;
  input.disabled = true;
  setStatus(message, true);
  setTimeout(() => {
    input.disabled = false;
    setStatus('Ingrese el PIN de 6 dígitos');
    input.focus();
  }, 60000);
};

const fail = () => {
  failures += 1;
  input.value = '';
  render();
  pin.classList.add('is-error');
  pin.classList.remove('is-shake');
  void pin.offsetWidth;
  pin.classList.add('is-shake');
  if (failures >= 5) {
    lockedUntil = Date.now() + 30000;
    input.disabled = true;
    setStatus('Demasiados intentos. Espere 30 segundos.', true);
    setTimeout(() => {
      failures = 0;
      input.disabled = false;
      setStatus('Ingrese el PIN de 6 dígitos');
      input.focus();
    }, 30000);
  } else {
    setStatus('PIN incorrecto', true);
    input.focus();
  }
};

const submit = async (code, remember = true) => {
  if (busy || Date.now() < lockedUntil) return;
  busy = true;
  pin.classList.add('is-busy');
  setStatus('Verificando…');
  try {
    const html = await unlock(code);
    if (remember) {
      try {
        sessionStorage.setItem(storageKey, code);
      } catch {}
    }
    setStatus('Acceso concedido');
    open(html);
  } catch (error) {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    if (!remember) setStatus('Ingrese el PIN de 6 dígitos');
    else if (error instanceof Rejected && error.limited) lock429(error.message);
    else if (error instanceof Rejected) fail();
    else {
      input.value = '';
      render();
      setStatus(error.message, true);
      input.focus();
    }
  } finally {
    busy = false;
    pin.classList.remove('is-busy');
  }
};

input.addEventListener('input', () => {
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  pin.classList.remove('is-error');
  if (status.classList.contains('is-error') && Date.now() >= lockedUntil) setStatus('Ingrese el PIN de 6 dígitos');
  render();
  if (input.value.length === 6) submit(input.value);
});

input.closest('form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (input.value.length === 6) submit(input.value);
});

render();

let saved = null;
try {
  saved = sessionStorage.getItem(storageKey);
} catch {}

if (saved) submit(saved, false);
else input.focus();
