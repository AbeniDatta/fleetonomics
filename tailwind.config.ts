import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nlng: {
          /** Deep navy from NLNG wordmark */
          navy: "#002060",
          /** Legacy alias — maps to logo navy for UI chrome */
          blue: "#002060",
          nav: "#001533",
          /** Swoosh greens + cyan from NLNG logo */
          green: "#006837",
          lime: "#8DC63F",
          cyan: "#00AEEF",
          sky: "#4FC3F7",
          /** Kept for charts / fuel accents */
          amber: "#F4A62A",
        },
        /** Dark VMS shell (dashboard canvas ~ #1212–#181818) */
        vms: {
          canvas: "#141414",
          elevated: "#1a1a1c",
          card: "#1e1e22",
          inset: "#252529",
          border: "#3f3f46",
          muted: "#a1a1aa",
        },
        surface: {
          primary: "#1e1e22",
          secondary: "#252529",
          tertiary: "#141414",
        },
        border: {
          secondary: "#3f3f46",
          tertiary: "#3f3f46",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        /** Slightly larger UI scale */
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
