/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#A78BFA",
          foreground: "#0F172A",
        },
        accent: {
          DEFAULT: "#F43F5E",
          foreground: "#000000",
        },
        background: "#0F0F23",
        foreground: "#E2E8F0",
        card: {
          DEFAULT: "#1E1C35",
          foreground: "#E2E8F0",
        },
        muted: {
          DEFAULT: "#27273B",
          foreground: "#94A3B8",
        },
        border: "#4C1D95",
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ['"Russo One"', '"Chakra Petch"', 'sans-serif'],
        body: ['"Chakra Petch"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
