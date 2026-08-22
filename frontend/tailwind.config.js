/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F4F8F8',
        ink: '#183D40',
        'ink-blue': '#235D62',
        highlighter: '#78C0BD',
        graphite: '#5A7E81',
        line: '#D2E3E3',
        teal: {
          dark: '#235D62',
          deep: '#183E41',
          footer: '#143639',
          ink: '#16383B',
          muted: '#547A7D',
          border: '#D0E2E2',
        },
        mint: {
          accent: '#78C0BD',
          hover: '#68B3B0',
          light: '#EBF4F4',
          bg: '#F4F8F8',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        script: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
}
