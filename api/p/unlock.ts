import { decrypt, safeEqual } from '../_lib/crypto.js';
import { clientKey, json, readJson, sameOrigin } from '../_lib/http.js';
import { db } from '../_lib/supabase.js';

const denied = () => json(401, { error: 'PIN incorrecto' });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Origen no permitido' });
  try {
    const body = await readJson(request);
    const slug = String(body.slug ?? '');
    const pin = String(body.pin ?? '');
    if (!/^[a-z0-9-]{8,}$/.test(slug) || !/^\d{6}$/.test(pin)) return denied();

    const ip = clientKey(request);
    const allowed = (await db.allow(`unlock:${slug}:${ip}`, 8, 600)) && (await db.allow(`unlock:${slug}`, 40, 3600));
    if (!allowed) return json(429, { error: 'Demasiados intentos. Espere unos minutos.' });

    const proposal = await db.find(slug);
    if (!proposal || !safeEqual(decrypt(proposal.pin_enc), pin)) return denied();

    await db.view(slug).catch(() => undefined);
    return json(200, { html: proposal.html });
  } catch (error) {
    console.error(error);
    return json(500, { error: 'No se pudo verificar el PIN' });
  }
}
