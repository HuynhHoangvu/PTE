/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Luxury gold + charcoal (user palette)
          gold:          '#e4a808',
          'gold-bright':   '#fdd52f',
          'gold-light':    '#ffea80',
          'gold-soft':     '#fef9c3',

          yellow:        '#fdd52f',
          'yellow-deep': '#e4a808',
          'yellow-light':'#ffea80',
          'yellow-soft': '#fef9c3',

          orange:        '#b45309',
          'orange-light':'#fef3c7',
          'orange-deep': '#92400e',

          black:  '#0A0A12',
          dark:   '#1a1a1a',
          dark2:  '#2a2a2a',
          dark3:  '#3a3a3a',

          charcoal: '#2a2a2a',
          'charcoal-deep': '#151515',

          cream:  '#fffdf8',
        }
      },
      fontFamily: {
        sans:    ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #e4a808 0%, #fdd52f 48%, #e4a808 100%)',
        'gold-shine':    'linear-gradient(90deg, #e4a808, #ffea80, #fdd52f, #e4a808)',
        'lux-hero':      'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 55%, #151515 100%)',
        'lux-page':      'linear-gradient(175deg, #fffdf8 0%, #fefce8 50%, #fdf6d9 100%)',
        'dark-gradient': 'linear-gradient(180deg, #2a2a2a 0%, #151515 100%)',
      },
      boxShadow: {
        'gold-sm': '0 2px 10px rgba(228,168,8,0.28)',
        'gold-md': '0 4px 18px rgba(228,168,8,0.35)',
        'gold-lg': '0 8px 28px rgba(228,168,8,0.30)',
        'card':    '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      },
      animation: {
        'wave':         'wave 1.2s ease-in-out infinite',
        'pulse-ring':   'pulseRing 1.2s ease-out infinite',
        'blink':        'blink 1s ease-in-out infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'float':        'float 3s ease-in-out infinite',
        'fade-in':      'fadeIn 0.45s ease-out both',
        'fade-in-up':   'fadeInUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in-down': 'fadeInDown 0.45s ease-out both',
      },
      keyframes: {
        wave:      { '0%,100%': { height: '8px' }, '50%': { height: '24px' } },
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.8' }, '100%': { transform: 'scale(1.4)', opacity: '0' } },
        blink:     { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        shimmer:   { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp:  {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    }
  },
  plugins: []
}
