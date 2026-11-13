/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}', '../../packages/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        eco: {
          50: '#eff8f3',
          100: '#d9eee2',
          600: '#28745b',
          700: '#17664d',
          900: '#182923',
        },
        brand: {
          forest: '#14532D',
          petrol: '#164E63',
          lime: '#A3E635',
          mist: '#E8F1E9',
        },
        ink: {
          400: '#8A948C',
          500: '#647067',
          700: '#344239',
          800: '#26342B',
          900: '#17231C',
        },
        surface: {
          base: '#F7F8F5',
          card: '#FFFFFF',
          muted: '#EEF1EC',
        },
        line: {
          subtle: '#E1E7E0',
          strong: '#C7D0C7',
        },
        'status-danger': '#B42318',
        'status-warning': '#A15C07',
        'status-success': '#167044',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
