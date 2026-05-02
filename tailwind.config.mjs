/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      colors: {
        sakura: { 50: '#fef2f2', 100: '#ffe1e4', 200: '#ffc8ce', 300: '#ffa0ab', 400: '#ff6b7d', 500: '#ff3355', 600: '#ed1144', 700: '#c80a39', 800: '#a80c37', 900: '#8e0e34' },
        japan: { 50: '#f0f9ff', 100: '#e0f2fe', 500: '#0369a1', 700: '#0c4a6e', 900: '#082f49' }
      }
    }
  },
  plugins: [],
};
