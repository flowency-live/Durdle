import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",

        // Brand Colors - Durdle Palette
        "ocean-light": "hsl(var(--ocean-light))",
        "sand-golden": "hsl(var(--sand-golden))",
        "sky-blue": "hsl(var(--sky-blue))",
        "cliff-green": "hsl(var(--cliff-green))",
      },
      backgroundImage: {
        "gradient-hero-overlay": "linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.3))",
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(0, 0, 0, 0.08)",
        "card": "0 4px 16px rgba(0, 0, 0, 0.1)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out",
        "fade-up-delay-1": "fadeUp 0.6s ease-out 0.2s both",
        "fade-up-delay-2": "fadeUp 0.6s ease-out 0.4s both",
        "fade-up-delay-3": "fadeUp 0.6s ease-out 0.6s both",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
