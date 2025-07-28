/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: "#0f172a",
        cyan: "#22d3ee",
        blue: "#1E40AF",
        emerald: "#047857"
      }
    }
  },
  plugins: [],
};
