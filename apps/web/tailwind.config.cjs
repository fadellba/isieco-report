/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { eco: { 50:'#eff8f3',100:'#d9eee2',600:'#28745b',700:'#17664d',900:'#182923' } } } },
  plugins: [],
};
