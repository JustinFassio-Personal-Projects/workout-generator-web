import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          main: '#f0dc7a',
          light: '#f4e59c',
          medium: '#e6d185',
          'dark-1': '#d4c469',
          'dark-2': '#b8a85e',
          'dark-3': '#9c8c53',
          'dark-4': '#807048',
          'dark-5': '#6b5d3c',
          'light-1': '#faf5e1',
          'light-2': '#fdfaf0',
        },
        earth: {
          brown: '#7d6f54',
        },
        primary: {
          50: '#fdfaf0',
          100: '#faf5e1',
          200: '#f4e59c',
          300: '#f0dc7a',
          400: '#e6d185',
          500: '#f0dc7a',
          600: '#d4c469',
          700: '#b8a85e',
          800: '#9c8c53',
          900: '#807048',
        },
        accent: {
          DEFAULT: '#f0dc7a',
          light: '#f4e59c',
          dark: '#d4c469',
        },
        gray: {
          50: '#f8fafc',
          100: '#f8fafc',
          200: '#94a3b8',
          300: '#94a3b8',
          400: '#64748b',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#1e293b',
          950: '#0f172a',
        },
        slate: {
          50: '#f8fafc',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#1e293b',
          950: '#0f172a',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
