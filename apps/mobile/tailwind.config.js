/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}', '../../packages/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
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
        brand: {
          forest: '#174C3D',
          'forest-dark': '#103B31',
          petrol: '#2F7773',
          lime: '#D7E6A5',
          mist: '#E8F0E7',
        },
        accent: {
          sand: '#EDE0CC',
        },
        ink: {
          400: '#8A968D',
          500: '#68766D',
          700: '#3C4D43',
          800: '#28382F',
          900: '#192820',
        },
        surface: {
          base: '#F6F7F2',
          card: '#FFFFFF',
          muted: '#EDF1E9',
        },
        line: {
          subtle: '#E0E8DF',
          strong: '#C8D4C9',
        },
        'status-danger': '#B64E43',
        'status-warning': '#A8671A',
        'status-success': '#23764F',
        'status-info': '#28748A',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};