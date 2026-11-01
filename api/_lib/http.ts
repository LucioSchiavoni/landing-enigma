import { hashKey, verifyToken } from './crypto.js';

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const clientKey = (request: Request) => {
  const forwarded = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  return hashKey(forwarded.trim());
};

export const readJson = async (request: Request) => {
  const raw = await request.text();
  if (raw.length > 2_000_000) throw new Error('Petición demasiado grande');
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    throw new Error('JSON inválido');
  }
};

export const cookieName = 'enigma_admin';

export const isAdmin = (request: Request) => {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${cookieName}=`));
  return verifyToken(match?.slice(cookieName.length + 1));
};

export const sessionCookie = (value: string, maxAge: number) =>
  `${cookieName}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

export const sameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
};

export const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
