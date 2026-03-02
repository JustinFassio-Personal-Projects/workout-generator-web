/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['Syncopate', 'sans-serif'],
        'sans': ['Space Grotesk', 'sans-serif'],
      },
      fontWeight: {
        light: '400',
        medium: '600',
        black: '700',
      },
    },
  },
  plugins: [],
}
