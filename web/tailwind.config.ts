import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f6ff",
          100: "#e2ebff",
          200: "#c7d7ff",
          400: "#7d94f0",
          500: "#5568d3",
          600: "#4150ab",
          700: "#333f87",
        },
      },
    },
  },
  plugins: [],
};

export default config;
