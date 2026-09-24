import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f4f4ff",
          100: "#eae9fe",
          200: "#d3d1fd",
          300: "#b0acfa",
          400: "#8a80f5",
          500: "#6c5aee",
          600: "#5a3fdf",
          700: "#4a30bf",
          800: "#3d299b",
          900: "#33257c",
          950: "#1f1650",
        },
        ink: {
          50: "#f7f7fb",
          100: "#eeeef4",
          200: "#d9d9e6",
          300: "#b7b7cc",
          400: "#8f8fab",
          500: "#6f6f8d",
          600: "#585873",
          700: "#46465d",
          800: "#2b2b3d",
          900: "#18182a",
          950: "#0d0d18",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(24 24 42 / 0.04), 0 1px 3px 0 rgb(24 24 42 / 0.06)",
        card: "0 2px 8px -2px rgb(24 24 42 / 0.06), 0 4px 24px -8px rgb(24 24 42 / 0.08)",
        lift: "0 8px 30px -8px rgb(108 90 238 / 0.35)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, transparent, white), radial-gradient(circle at top, rgb(108 90 238 / 0.08), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
