/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orchestra: {
          navy: '#0f172a',
          'navy-light': '#1e293b',
          gold: '#d4a017',
          'gold-light': '#f0c040',
          cream: '#f8f4ef',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
