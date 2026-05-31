import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        walnut: { DEFAULT: "#1a0f0a", 2: "#221610", 3: "#2c1d14" },
        leather: { DEFAULT: "#3a2418", 2: "#4a2e1f" },
        parchment: { DEFAULT: "#f1e8d6", 2: "#e6dabe", 3: "#c9bca0" },
        brass: { DEFAULT: "#b08d57", 2: "#c9a66b", 3: "#d4b97d" },
        stamp: { DEFAULT: "#9b2c2c", 2: "#b03838" },
        verdigris: { DEFAULT: "#5b8b6e", 2: "#7aab8c" },
        indigo: { DEFAULT: "#3d4a7a", 2: "#5b6ba0" },
        muted: "#6b5a48",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
