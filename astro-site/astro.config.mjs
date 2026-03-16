// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import path from 'path';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
// Note: @astrojs/sitemap integration removed in favor of custom sitemap.xml.ts
// which includes all dynamic SSR routes (blog posts, authors, categories, etc.)

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://aiworkoutgenerator.com',
  // Astro 5: "static" includes former hybrid behavior — routes with `prerender = false` are SSR; others are pre-rendered.
  output: 'static',
  // Use a distinct asset path so we can proxy /_astro/* to the programs app (same host, broken assets otherwise).
  build: { assets: 'marketing_astro' },

  integrations: [
    react(),
    // Custom sitemap at /sitemap.xml handles all routes including SSR pages
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