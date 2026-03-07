/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        background: '#0f172a',
        surface: '#1e293b',
      },
    },
  },
  plugins: [],
}
