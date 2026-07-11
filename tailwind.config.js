/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F97316',
          'orange-dark': '#EA580C',
          green: '#22C55E',
          red: '#EF4444',
          blue: '#3B82F6',
          purple: '#A855F7',
        },
        surface: {
          bg: '#0A0A0F',
          card: '#13131A',
          elevated: '#1C1C27',
          border: '#2A2A3A',
        },
      },
    },
  },
  plugins: [],
}
