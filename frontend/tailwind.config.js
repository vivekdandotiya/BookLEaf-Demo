/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FAF8F5',
          100: '#F4EFEA',
          200: '#E8DFD5',
          300: '#D5C7B7',
          400: '#B8A38F',
          500: '#9B8068',
        },
        ink: {
          950: '#0C131F',
          900: '#141E2E',
          800: '#1F2C42',
          700: '#2F405E',
          600: '#43587D',
          500: '#5F76A1',
          400: '#899EC2',
          300: '#B7C6DE',
          200: '#DCE4F0',
          100: '#EEF3F9',
        },
        brand: {
          DEFAULT: '#9E3A24', // Warm terracotta book-cloth
          hover: '#822D1B',
          light: '#F8ECE8',
          dark: '#5A1C0E'
        },
        sage: {
          DEFAULT: '#2D6A4F',
          light: '#E8F5EE',
          dark: '#1B4332'
        },
        amber: {
          DEFAULT: '#B45309',
          light: '#FEF3C7',
          dark: '#78350F'
        }
      },
      fontFamily: {
        serif: ['"Newsreader"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
