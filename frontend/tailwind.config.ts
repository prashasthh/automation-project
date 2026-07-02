import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Anti-gravity dark palette
        void:  { DEFAULT: '#000000', 50: '#0A0A0A', 100: '#111111', 200: '#1A1A1A', 300: '#222222' },
        surface: { DEFAULT: 'rgba(20,20,28,0.85)', card: 'rgba(18,18,26,0.75)', modal: 'rgba(14,14,20,0.95)' },
        neon:  { violet: '#7C3AED', purple: '#6B46C1', glow: 'rgba(124,58,237,0.35)', soft: 'rgba(124,58,237,0.12)' },
        silver: { DEFAULT: '#A3A3A3', dim: '#6B6B6B', bright: '#D4D4D4' },
        brand: {
          50:  '#ede9fe',
          100: '#ddd6fe',
          200: '#c4b5fd',
          500: '#7C3AED',
          600: '#6B46C1',
          700: '#5B21B6',
        },
      },
      boxShadow: {
        card:         '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 16px 0 rgb(0 0 0 / 0.08), 0 1px 4px -1px rgb(0 0 0 / 0.04)',
        // Anti-gravity hover glow
        float:   '0 0 0 1px #2a2a2a, 0 8px 32px rgba(124,58,237,0.18)',
        'float-hover': '0 0 0 1px #333, 0 16px 48px rgba(124,58,237,0.28), 0 4px 16px rgba(0,0,0,0.6)',
        'neon-violet': '0 0 20px rgba(124,58,237,0.45)',
        premium: '0 20px 40px -10px rgb(0 0 0 / 0.8), 0 0 0 1px rgba(124,58,237,0.2)',
      },
      animation: {
        'spin-slow':   'spin 2s linear infinite',
        'pulse-dot':   'pulse 1.5s ease-in-out infinite',
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'float-in':    'floatIn 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'pulse-glow':  'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:    { '0%': { opacity: '0', transform: 'translateY(8px)'  }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        floatIn:    { '0%': { opacity: '0', transform: 'translateY(20px) scale(0.97)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        pulseGlow:  { '0%,100%': { boxShadow: '0 0 0 0 rgba(124,58,237,0)' }, '50%': { boxShadow: '0 0 24px 4px rgba(124,58,237,0.25)' } },
      },
      backdropBlur: { xs: '2px' },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
