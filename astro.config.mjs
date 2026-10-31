import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { devApi } from './tools/dev-api.mjs';

const demoIndex = {
  name: 'demo-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const proposal = req.url?.match(/^\/p\/(?!assets\/|_shell\/)[a-z0-9-]{8,}\/?(\?.*)?$/);
      if (proposal) {
        req.url = `/p/_shell/index.html${proposal[1] ?? ''}`;
        return next();
      }
      const match = req.url?.match(/^(\/(?:demos|admin|mirror)\/(?:[\w-]+\/)?)(\?.*)?$/);
      if (match) req.url = `${match[1]}index.html${match[2] ?? ''}`;
      next();
    });
  },
};

export default defineConfig({
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss(), devApi, demoIndex],
    build: {
      assetsInlineLimit: 0,
    },
  },
});
