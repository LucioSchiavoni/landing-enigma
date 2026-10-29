import {
  findAdmin,
  hasSource,
  isPin,
  listSources,
  normalizeSite,
  publishFromSource,
  readSourceSlug,
  readVault,
  rekey,
  writeVault,
} from './lib/propuestas.mjs';
import { randomPin, randomSlug } from './lib/sealed.mjs';

const channels = ['whatsapp', 'email', 'otro'];

const text = (value, max) => String(value ?? '').trim().slice(0, max);

const readContact = (body) => ({
  channel: channels.includes(body.channel) ? body.channel : 'otro',
  value: text(body.contact, 200),
});

const pick = (vault, slug) => {
  const proposal = vault.proposals.find((item) => item.slug === slug);
  if (!proposal) throw new Error('La propuesta no está en el panel');
  return proposal;
};

const choosePin = (value) => {
  if (value === undefined || value === null || value === '') return randomPin();
  if (!isPin(value)) throw new Error('El PIN debe tener 6 dígitos');
  return value;
};

const actions = {
  session: async () => false,
  create: async (vault, body) => {
    const name = text(body.name, 120);
    if (!hasSource(name)) throw new Error(`No existe propuestas/${name}.html`);
    if (vault.proposals.some((item) => item.name === name)) throw new Error('Esa propuesta ya está en el panel');
    const pin = choosePin(body.pin);
    const slug = (await readSourceSlug(name)) ?? randomSlug();
    await publishFromSource(name, pin, slug);
    const now = new Date().toISOString();
    vault.proposals.unshift({ slug, name, client: text(body.client, 120), contact: readContact(body), pin, createdAt: now, pinUpdatedAt: now });
    return true;
  },
  update: async (vault, body) => {
    const proposal = pick(vault, body.slug);
    proposal.client = text(body.client, 120);
    proposal.contact = readContact(body);
    return true;
  },
  reset: async (vault, body) => {
    const proposal = pick(vault, body.slug);
    const pin = choosePin(body.pin);
    try {
      await rekey(proposal.slug, proposal.pin, pin);
    } catch (error) {
      if (!hasSource(proposal.name)) throw new Error(`No se pudo volver a cifrar la propuesta: ${error.message}`);
      await publishFromSource(proposal.name, pin, proposal.slug);
    }
    proposal.pin = pin;
    proposal.pinUpdatedAt = new Date().toISOString();
    return true;
  },
  site: async (vault, body) => {
    vault.site = normalizeSite(body.site);
    return true;
  },
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100000) reject(new Error('Petición demasiado grande'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });

export const adminApi = {
  name: 'admin-api',
  configureServer(server) {
    server.middlewares.use('/__admin', async (req, res) => {
      const send = (status, body) => {
        res.statusCode = status;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        res.end(JSON.stringify(body));
      };
      const action = actions[(req.url ?? '').replace(/^\//, '').split('?')[0]];
      if (req.method !== 'POST' || !action) return send(404, { error: 'No encontrado' });
      try {
        const body = await readBody(req);
        const dir = await findAdmin();
        if (!dir) return send(404, { error: 'No hay panel. Ejecuta node tools/admin-init.mjs' });
        if (typeof body.secret !== 'string') return send(401, { error: 'Falta el secret' });
        let vault;
        try {
          vault = await readVault(dir, body.secret);
        } catch {
          return send(401, { error: 'Secret incorrecto' });
        }
        if (await action(vault, body)) await writeVault(dir, body.secret, vault);
        send(200, { vault, sources: await listSources() });
      } catch (error) {
        send(400, { error: error.message });
      }
    });
  },
};
