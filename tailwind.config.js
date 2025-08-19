/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // app is dark-only; we still allow 'class' in case of future toggles
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
