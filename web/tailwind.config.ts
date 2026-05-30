import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0a0f",
          deep: "#050508",
          surface: "rgba(255, 255, 255, 0.03)",
          border: "rgba(255, 255, 255, 0.06)",
          "border-strong": "rgba(255, 255, 255, 0.12)",
          paper: "#f4f0e8",
          "paper-warm": "#ece7da",
          accent: "#1a3a8f",
          "accent-bright": "#2952cc",
          gold: "#c9a84c",
          "gold-light": "#e8c96a",
          stream: "#0ea5e9",
          "stream-dark": "#0369a1",
          yield: "#10b981",
          "yield-dark": "#047857",
          muted: "#6b6557",
          mute2: "rgba(244, 240, 232, 0.6)",
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', "ui-serif", "Georgia", "serif"],
        news: ['"Newsreader"', "ui-serif", "Georgia", "serif"],
        mono: ['"DM Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
