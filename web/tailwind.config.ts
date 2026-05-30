import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        walnut: {
          deep: "#0e0805",
          DEFAULT: "#1a0f0a",
          mid: "#241710",
          warm: "#2e1d12",
        },
        paper: {
          DEFAULT: "#f1e8d6",
          dim: "rgba(241, 232, 214, 0.78)",
          mute: "rgba(241, 232, 214, 0.5)",
          faint: "rgba(241, 232, 214, 0.18)",
        },
        brass: {
          DEFAULT: "#b08d57",
          bright: "#d4ad6e",
          dim: "rgba(176, 141, 87, 0.18)",
          edge: "rgba(176, 141, 87, 0.35)",
        },
        stamp: {
          DEFAULT: "#9b2c2c",
          bright: "#c0392b",
        },
        verdigris: {
          DEFAULT: "#2f5f4f",
          bright: "#4a8975",
        },
        ink: {
          indigo: "#2a3a5e",
          "indigo-bright": "#4a6c9a",
        },
        rule: {
          DEFAULT: "rgba(176, 141, 87, 0.22)",
          strong: "rgba(176, 141, 87, 0.4)",
        },
      },
      fontFamily: {
        display: ['"Cormorant"', "ui-serif", "Georgia", "serif"],
        body: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
