import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          bg: "#0a0a0f",
          surface: "#13131c",
          border: "#23232f",
          accent: "#a78bfa", // violet — InkFi violet
          accent2: "#22d3ee", // cyan
          mute: "#8a8a9a",
        },
      },
      fontFamily: {
        serif: ["ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
