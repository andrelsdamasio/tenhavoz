import type { Config } from "tailwindcss";

/**
 * Identidade TenhaVoz: cartaz de rua. Papel, tinta preta e vermelho-urucum,
 * com amarelo-sol como destaque e verde-folha para arrecadação.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Archivo Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        paper: { DEFAULT: "#f4eee2", deep: "#e9e0cf" },
        ink: { DEFAULT: "#16120f", soft: "#4a423a" },
        sol: { DEFAULT: "#ffc61a", deep: "#e0a800" },
        folha: { DEFAULT: "#0e5a39", light: "#e3efe6" },
        brand: {
          50: "#fff1ea",
          100: "#ffe1d3",
          200: "#ffc3a8",
          300: "#ff9a72",
          500: "#e8431f",
          600: "#d23a18",
          700: "#a82b10",
        },
      },
    },
  },
  plugins: [],
};

export default config;
