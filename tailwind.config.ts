import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#4caf50",
          "green-hover": "#43a047",
          navy: "#1e2d3d",
          "navy-hover": "#243548",
          "navy-border": "#2d4a66",
          "navy-muted": "#8098b4",
          orange: "#ff9800",
          blue: "#2196f3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
