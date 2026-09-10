/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ink — deep charcoal/slate
        ink: {
          950: "#0d1420",
          900: "#121b29",
          800: "#1a2536",
          700: "#24334a",
          600: "#33465f",
          500: "#4a5f7a",
          400: "#71879e",
          300: "#a3b3c4",
        },
        // Paper — warm cream/off-white surfaces
        paper: {
          50: "#fbfaf6",
          100: "#f5f2ea",
          200: "#ece6d8",
          300: "#ddd4bf",
        },
        // Channel — working deep teal/cyan brand accent
        channel: {
          900: "#093a3e",
          700: "#0f6367",
          600: "#167f82",
          500: "#1f9a97",
          400: "#4db8b0",
          300: "#8ad4c9",
          100: "#e2f3ee",
        },
        // Risk semantics
        risk: {
          clear: "#2f8f5b",
          "clear-soft": "#e4f3ea",
          caution: "#c98a2c",
          "caution-soft": "#f8ecd7",
          severe: "#b3402f",
          "severe-soft": "#f6e2de",
        },
        // Backward-compatible tokens
        canvas: "#f5f2ea",
        card: "#ffffff",
        primary: "#1f9a97",
        "primary-dark": "#167f82",
        secondary: "#0f6367",
        "text-dark": "#0d1420",
        "text-muted": "#71879e",
        safe: "#2f8f5b",
        "safe-bg": "#e4f3ea",
        caution: "#c98a2c",
        "caution-bg": "#f8ecd7",
        blocked: "#b3402f",
        "blocked-bg": "#f6e2de",
        border: "rgba(13, 20, 32, 0.12)",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(13, 20, 32, 0.06), 0 12px 32px -12px rgba(13, 20, 32, 0.25)",
        float: "0 2px 6px rgba(13, 20, 32, 0.12), 0 8px 24px -8px rgba(13, 20, 32, 0.2)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        elevated: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [],
};
