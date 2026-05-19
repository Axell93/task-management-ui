/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fb',
          100: '#e8edf6',
          200: '#cdd7e9',
          300: '#a5b6d4',
          400: '#7790ba',
          500: '#5572a1',
          600: '#425b87',
          700: '#36496c',
          800: '#2c3a55',
          900: '#1f2638',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
};
