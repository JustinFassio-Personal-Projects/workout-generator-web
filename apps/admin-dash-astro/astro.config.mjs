import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(root, '.env') });
loadEnv({ path: resolve(root, '.env.local') });
const src = resolve(root, 'src');

const isVercel = process.env.VERCEL === '1';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  output: 'server',
  adapter: isVercel ? vercel() : node({ mode: 'standalone' }),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  server: {
    port: Number(process.env.PORT) || 3009,
    host: true,
  },
  vite: {
    resolve: {
      alias: { '@': src },
    },
  },
});
