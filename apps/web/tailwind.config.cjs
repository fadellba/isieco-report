/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        eco: {
          50: '#E8F0E7',
          100: '#D7E6D7',
          600: '#2F7773',
          700: '#23675F',
          900: '#192820',
        },
      },
    },
  },
  plugins: [],
};
