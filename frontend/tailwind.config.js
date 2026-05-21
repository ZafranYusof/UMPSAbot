/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0d0d1a',
        secondary: '#1a1a2e',
        tertiary: '#252540',
        border: '#2a2a4a',
        'text-primary': '#e8e8e8',
        'text-secondary': '#8888aa',
        accent: {
          DEFAULT: '#D4AF37',
          dark: '#B8960C',
          light: '#F5E6B8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
