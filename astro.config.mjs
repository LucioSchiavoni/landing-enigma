import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const demoIndex = {
  name: 'demo-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const match = req.url?.match(/^(\/demos\/[\w-]+\/)(\?.*)?$/);
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
    plugins: [tailwindcss(), demoIndex],
    build: {
      assetsInlineLimit: 0,
    },
  },
});
