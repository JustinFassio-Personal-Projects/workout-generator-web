/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-dark': 'var(--bg-dark)',
        accent: 'var(--color-accent)',
        'orange-light': 'var(--color-orange-light)',
        'orange-medium': 'var(--color-orange-medium)',
        'text-primary': 'var(--text-primary)',
      },
    },
  },
  plugins: [],
};
