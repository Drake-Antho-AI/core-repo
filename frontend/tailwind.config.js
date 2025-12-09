/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Anthologic brand colors
        navy: {
          900: '#0A2540',
          800: '#0A4D68',
          700: '#0E5F7F',
          600: '#127896',
        },
        accent: {
          teal: '#2DD4BF',
          cyan: '#4FC3F7',
          lime: '#D4FF3C',
        },
        sentiment: {
          positive: '#22C55E',
          'slightly-positive': '#86EFAC',
          neutral: '#9CA3AF',
          'slightly-negative': '#FCA5A5',
          negative: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Space Grotesk', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': 'linear-gradient(135deg, #0A2540 0%, #0A4D68 50%, #0E5F7F 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #2DD4BF, 0 0 10px #2DD4BF' },
          '100%': { boxShadow: '0 0 10px #2DD4BF, 0 0 20px #2DD4BF, 0 0 30px #2DD4BF' },
        },
      },
    },
  },
  plugins: [],
}


