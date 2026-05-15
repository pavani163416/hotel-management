import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Sidebar ──────────────────────────────────────────
        sidebar:         "#07101e",
        "sidebar-hover": "#112240",
        "sidebar-active":"#162a4a",

        // ── Surfaces (deep navy canvas) ───────────────────────
        surface:         "#0d1e35",
        "surface-2":     "#0a1628",
        "surface-3":     "#112240",

        // ── Borders (glass) ───────────────────────────────────
        border:          "rgba(255,255,255,0.08)",
        "border-dark":   "rgba(255,255,255,0.14)",

        // ── Imperial Red — primary action color ───────────────
        primary:         "#c0392b",
        "primary-dark":  "#a93226",
        "primary-light": "rgba(192,57,43,0.15)",

        // ── Gold — accent ─────────────────────────────────────
        gold:            "#d4a843",
        "gold-light":    "rgba(212,168,67,0.15)",
        "gold-dark":     "#b8902e",

        // ── Jewel-tone status ─────────────────────────────────
        success:         "#10b981",
        "success-light": "rgba(16,185,129,0.15)",
        warning:         "#f59e0b",
        "warning-light": "rgba(245,158,11,0.15)",
        danger:          "#e11d48",
        "danger-light":  "rgba(225,29,72,0.15)",
        sapphire:        "#3b82f6",
        "sapphire-light":"rgba(59,130,246,0.15)",

        // ── Text ──────────────────────────────────────────────
        muted:           "#64748b",
        "text-primary":  "#f0f4ff",
        "text-secondary":"#94a3b8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card:        "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card-hover":"0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        modal:       "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        glass:       "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "glass-card":  "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        "imperial-grad":"linear-gradient(135deg, #c0392b 0%, #a93226 100%)",
        "gold-grad":   "linear-gradient(135deg, #d4a843 0%, #b8902e 100%)",
      },
      animation: {
        "fade-in":  "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" },                               to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
