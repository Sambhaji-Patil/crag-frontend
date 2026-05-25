import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'brutal':      '3px 3px 0px 0px #7C3AED',
        'brutal-sm':   '2px 2px 0px 0px #7C3AED',
        'brutal-green':'3px 3px 0px 0px #10B981',
        'brutal-red':  '3px 3px 0px 0px #EF4444',
        'brutal-amber':'3px 3px 0px 0px #F59E0B',
        'brutal-muted':'3px 3px 0px 0px var(--shadow-brutal-muted)',
        'brutal-lg':   '5px 5px 0px 0px #7C3AED',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        blink:     'blink 1s step-end infinite',
        'slide-in': 'slide-in 0.25s ease-out forwards',
        shimmer:   'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
