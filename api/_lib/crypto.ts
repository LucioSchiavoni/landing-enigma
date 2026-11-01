import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

export const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export const encrypt = (text: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', env.appKey, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.');
};

export const decrypt = (value: string) => {
  const [iv, tag, data] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', env.appKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

const sign = (payload: string) => createHmac('sha256', env.appKey).update(payload).digest('base64url');

export const signToken = (ttlSeconds: number) => {
  const payload = String(Math.floor(Date.now() / 1000) + ttlSeconds);
  return `${payload}.${sign(payload)}`;
};

export const verifyToken = (token: string | undefined) => {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return false;
  return Number(payload) > Date.now() / 1000;
};

const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';

export const randomSlug = (length = 12) => [...randomBytes(length)].map((byte) => alphabet[byte % alphabet.length]).join('');

export const randomPin = () => String(randomInt(0, 1000000)).padStart(6, '0');

export const hashKey = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 32);
