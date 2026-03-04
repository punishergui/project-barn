import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        barnBg: "#0F0804",
        barnCard: "#1E0F07",
        barnCard2: "#2C1810",
        barnRed: "#8B2814",
        gold: "#D4920C",
        cream: "#FAF6ED"
      }
    }
  },
  plugins: []
};

export default config;
