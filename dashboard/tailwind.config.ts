import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0B1220",
          800: "#0F172A",
          700: "#111827",
        },
      },
    },
  },
  plugins: [],
};
export default config;
