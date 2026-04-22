/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Gold palette — inspired by FLY ACADEMY logo
          gold:         '#C8952A',   // deep metallic gold (main)
          'gold-bright':'#E8B84B',   // bright gold
          'gold-light': '#FFF4D6',   // very light gold bg
          'gold-soft':  '#FFFBEC',   // ultra-light gold

          // Keep yellow aliases for backwards compat
          yellow:       '#E8B84B',
          'yellow-deep':'#C8952A',
          'yellow-light':'#FFF4D6',
          'yellow-soft':'#FFFBEC',

          orange:       '#D97706',
          'orange-light':'#FEF3C7',
          'orange-deep': '#B45309',

          // Dark palette — sidebar & dark surfaces
          black:  '#0A0A12',
          dark:   '#12121C',
          dark2:  '#1A1A28',
          dark3:  '#252535',

          // Accent
          cream:  '#F8F7F4',
        }
      },
      fontFamily: {
        sans:    ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C8952A 0%, #E8B84B 50%, #C8952A 100%)',
        'gold-shine':    'linear-gradient(90deg, #C8952A, #F0D060, #C8952A)',
        'dark-gradient': 'linear-gradient(180deg, #0A0A12 0%, #12121C 100%)',
      },
      boxShadow: {
        'gold-sm': '0 2px 8px rgba(200,149,42,0.30)',
        'gold-md': '0 4px 16px rgba(200,149,42,0.40)',
        'gold-lg': '0 8px 32px rgba(200,149,42,0.35)',
        'card':    '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      },
      animation: {
        'wave':        'wave 1.2s ease-in-out infinite',
        'pulse-ring':  'pulseRing 1.2s ease-out infinite',
        'blink':       'blink 1s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'float':       'float 3s ease-in-out infinite',
      },
      keyframes: {
        wave:      { '0%,100%': { height: '8px' }, '50%': { height: '24px' } },
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.8' }, '100%': { transform: 'scale(1.4)', opacity: '0' } },
        blink:     { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        shimmer:   { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      }
    }
  },
  plugins: []
}
