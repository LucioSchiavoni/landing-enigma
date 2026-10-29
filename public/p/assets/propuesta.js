const lock = document.querySelector('[data-lock]');
const doc = document.querySelector('[data-doc]');
const pin = document.querySelector('[data-pin]');
const input = document.querySelector('[data-pin-input]');
const cells = [...document.querySelectorAll('[data-pin-cell]')];
const status = document.querySelector('[data-pin-status]');
const payload = document.querySelector('[data-payload]');

const storageKey = `propuesta:${location.pathname}`;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let busy = false;
let failures = 0;
let lockedUntil = 0;

const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const decrypt = async (code) => {
  const data = JSON.parse(payload.textContent);
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(data.salt), iterations: data.iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(data.iv) }, key, fromBase64(data.data));
  return new TextDecoder().decode(plain);
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
    const html = await decrypt(code);
    if (remember) {
      try {
        sessionStorage.setItem(storageKey, code);
      } catch {}
    }
    setStatus('Acceso concedido');
    open(html);
  } catch {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    if (remember) fail();
    else setStatus('Ingrese el PIN de 6 dígitos');
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
