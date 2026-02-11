/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./styles/**/*.css",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rr: {
          bg: {
            base: "#0a0e1a",
            secondary: "#0f172a",
          },
          card: {
            DEFAULT: "#1e293b",
            elevated: "#0f172a",
          },
          accent: "#14b8a6",
          primary: "#3b82f6",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          text: {
            primary: "#ffffff",
            secondary: "#e2e8f0",
            muted: "#cbd5e1",
          },
          border: {
            subtle: "rgba(148, 163, 184, 0.36)",
          },
        },
      },
    },
  },
  plugins: [],
};
