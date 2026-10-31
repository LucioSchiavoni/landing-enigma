import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const methods = ['GET', 'POST', 'PATCH', 'DELETE'];

const toRequest = (req, body) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, [value].flat().join(', '));
  const origin = `http://${req.headers.host}`;
  return new Request(new URL(req.url, origin), { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const exists = async (dir, name) => (await readdir(dir).catch(() => [])).includes(name);

export const devApi = {
  name: 'dev-api',
  config(_, { mode }) {
    Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ''), ...process.env });
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const path = (req.url ?? '').split('?')[0];
      if (!path.startsWith('/api/')) return next();
      const parts = path.slice(5).replace(/\/$/, '').split('/');
      const file = `${parts.pop()}.ts`;
      const dir = join(process.cwd(), 'api', ...parts);
      if (parts.some((part) => part.startsWith('_')) || !(await exists(dir, file))) {
        res.statusCode = 404;
        return res.end('Not found');
      }
      try {
        const module = await server.ssrLoadModule(`/api/${[...parts, file].join('/')}`);
        const handler = module[req.method];
        if (!methods.includes(req.method) || typeof handler !== 'function') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }
        const response = await handler(toRequest(req, await readBody(req)));
        res.statusCode = response.status;
        const cookies = response.headers.getSetCookie?.() ?? [];
        response.headers.forEach((value, key) => {
          if (key !== 'set-cookie') res.setHeader(key, value);
        });
        if (cookies.length) res.setHeader('set-cookie', cookies);
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        server.ssrFixStacktrace?.(error);
        console.error(error);
        res.statusCode = 500;
        res.end('Error interno');
      }
    });
  },
};
