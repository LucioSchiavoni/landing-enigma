import { safeEqual, signToken } from '../_lib/crypto.js';
import { env } from '../_lib/env.js';
import { clientKey, isAdmin, json, readJson, sameOrigin, sessionCookie } from '../_lib/http.js';
import { db } from '../_lib/supabase.js';

const ttl = 12 * 3600;

export async function GET(request: Request) {
  return isAdmin(request) ? json(200, { ok: true }) : json(401, { error: 'Sin sesión' });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Origen no permitido' });
  try {
    if (!(await db.allow(`login:${clientKey(request)}`, 5, 900))) return json(429, { error: 'Demasiados intentos. Espera unos minutos.' });
    const body = await readJson(request);
    if (typeof body.secret !== 'string' || !safeEqual(body.secret, env.adminSecret)) return json(401, { error: 'Secret incorrecto' });
    return json(200, { ok: true }, { 'set-cookie': sessionCookie(signToken(ttl), ttl) });
  } catch (error) {
    console.error(error);
    return json(500, { error: 'No se pudo iniciar sesión' });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Origen no permitido' });
  return json(200, { ok: true }, { 'set-cookie': sessionCookie('', 0) });
}
