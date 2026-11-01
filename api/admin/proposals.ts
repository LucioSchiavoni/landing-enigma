import { decrypt, encrypt, randomPin, randomSlug } from '../_lib/crypto.js';
import { isAdmin, json, readJson, sameOrigin, text } from '../_lib/http.js';
import { db, type Row } from '../_lib/supabase.js';

const channels = ['whatsapp', 'email', 'otro'] as const;

const present = (row: Omit<Row, 'html'>) => ({
  slug: row.slug,
  name: row.name,
  client: row.client,
  contact: { channel: row.contact_channel, value: row.contact_value },
  pin: decrypt(row.pin_enc),
  views: row.views,
  lastViewedAt: row.last_viewed_at,
  pinUpdatedAt: row.pin_updated_at,
  createdAt: row.created_at,
});

const readContact = (body: Record<string, unknown>) => ({
  contact_channel: channels.find((channel) => channel === body.channel) ?? 'otro',
  contact_value: text(body.contact, 200),
});

const choosePin = (value: unknown) => {
  if (value === undefined || value === null || value === '') return randomPin();
  if (!/^\d{6}$/.test(String(value))) throw new Error('El PIN debe tener 6 dígitos');
  return String(value);
};

const chooseHtml = (value: unknown) => {
  const html = String(value ?? '');
  if (html.trim().length < 20) throw new Error('El HTML de la propuesta está vacío');
  return html;
};

const handle = async (request: Request, run: (body: Record<string, unknown>) => Promise<Response>) => {
  if (!sameOrigin(request)) return json(403, { error: 'Origen no permitido' });
  if (!isAdmin(request)) return json(401, { error: 'Sin sesión' });
  try {
    return await run(request.method === 'GET' ? {} : await readJson(request));
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : 'Petición inválida' });
  }
};

const listing = async () => json(200, { proposals: (await db.list()).map(present) });

export const GET = (request: Request) => handle(request, listing);

export const POST = (request: Request) =>
  handle(request, async (body) => {
    const name = text(body.name, 120);
    if (!name) throw new Error('Falta el nombre de la propuesta');
    const slug = body.slug ? String(body.slug) : randomSlug();
    if (!/^[a-z0-9-]{8,}$/.test(slug)) throw new Error('El enlace debe tener al menos 8 caracteres: minúsculas, números o guiones');
    if (await db.find(slug)) throw new Error('Ya existe una propuesta con ese enlace');
    await db.insert({
      slug,
      name,
      client: text(body.client, 120),
      ...readContact(body),
      pin_enc: encrypt(choosePin(body.pin)),
      html: chooseHtml(body.html),
    });
    return listing();
  });

export const PATCH = (request: Request) =>
  handle(request, async (body) => {
    const slug = String(body.slug ?? '');
    const patch: Partial<Row> = {};
    if (body.client !== undefined) patch.client = text(body.client, 120);
    if (body.channel !== undefined || body.contact !== undefined) Object.assign(patch, readContact(body));
    if (body.html !== undefined) patch.html = chooseHtml(body.html);
    if (body.resetPin) {
      patch.pin_enc = encrypt(choosePin(body.pin));
      patch.pin_updated_at = new Date().toISOString();
    }
    if (!(await db.update(slug, patch)).length) throw new Error('La propuesta no existe');
    return listing();
  });

export const DELETE = (request: Request) =>
  handle(request, async (body) => {
    await db.remove(String(body.slug ?? ''));
    return listing();
  });
