// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import path from 'path';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://aiworkoutgenerator.com',
  output: 'static', // Static by default, use `export const prerender = false` for SSR routes
  
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin/'), // Exclude admin from sitemap
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Silence deprecation warnings from Sass
          silenceDeprecations: ['legacy-js-api'],
        },
      },
    },
  },

  adapter: vercel(),
});