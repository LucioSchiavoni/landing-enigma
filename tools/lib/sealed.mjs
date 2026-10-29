import { webcrypto, randomBytes, randomInt } from 'node:crypto';

const iterations = 600000;
const encoder = new TextEncoder();
const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
const fromBase64 = (value) => new Uint8Array(Buffer.from(value, 'base64'));

const deriveKey = async (secret, salt, rounds, usage) => {
  const material = await webcrypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
};

export const seal = async (secret, text) => {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt, iterations, 'encrypt');
  const data = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  return { iterations, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
};

export const unseal = async (secret, payload) => {
  const key = await deriveKey(secret, fromBase64(payload.salt), payload.iterations, 'decrypt');
  const plain = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.data));
  return new TextDecoder().decode(plain);
};

const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';

export const randomSlug = (length = 12) => [...randomBytes(length)].map((byte) => alphabet[byte % alphabet.length]).join('');

export const randomPin = () => String(randomInt(0, 1000000)).padStart(6, '0');
