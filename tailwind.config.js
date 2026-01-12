/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zen-paper': '#F8F5F0', // The new paper-like background
        parchment: '#F4ECD8',
        'parchment-dark': '#E8DECA',
        'eye-green': '#C7EDCC',
        'eye-green-dark': '#B0D6B5',
        'soft-black': '#3C3C3C',
        'ink': '#3C3C3C',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'], // Added for UI elements
      },
      boxShadow: {
        'book': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 20px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}