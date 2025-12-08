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

        // Brand Colors - The Dorset Transfer Company
        navy: {
          DEFAULT: '#2b444c',
          dark: '#1a2428',
          light: '#3d5a64',
        },
        sage: {
          DEFAULT: '#b7d5b9',
          dark: '#8fb894',
          light: '#d4e7d6',
          accessible: '#4a7a50', // WCAG AA compliant (4.7:1 on white)
        },
        gray: {
          DEFAULT: '#a6a6a6',
          dark: '#707070',
          light: '#e5e5e5',
        },
        cream: '#f5f1e8',

        // Functional colors
        success: '#8fb894',
        warning: '#d4a574',
        error: '#c97064',
        info: '#3d5a64',

        // Legacy Durdle colors (for gradual migration)
        "ocean-light": "#14b8a6",
        "sand-golden": "#f59e0b",
      },
      fontFamily: {
        knockout: ['var(--font-knockout)', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'serif'],
      },
      backgroundImage: {
        "gradient-hero-overlay": "linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.3))",
        "gradient-navy-sage": "linear-gradient(135deg, #2b444c 0%, #8fb894 100%)",
        "gradient-sage-cream": "linear-gradient(135deg, #b7d5b9 0%, #f5f1e8 100%)",
        "gradient-navy-light": "linear-gradient(to bottom, #2b444c 0%, #3d5a64 100%)",
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(0, 0, 0, 0.08)",
        "card": "0 4px 16px rgba(0, 0, 0, 0.1)",
        "deep": "0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)",
        "floating": "0 12px 32px rgba(0, 0, 0, 0.2), 0 6px 12px rgba(0, 0, 0, 0.12)",
        "mobile": "0 6px 20px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)",
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
