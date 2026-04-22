/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#F5C518',
          'yellow-deep': '#D4A600',
          'yellow-light': '#FFF9D6',
          'yellow-soft': '#FFFBEA',
          orange: '#FF6B1A',
          'orange-light': '#FFF0E8',
          'orange-deep': '#D94F00',
          black: '#0E0E0E',
          dark: '#1A1A1A',
          dark2: '#252525',
        }
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      animation: {
        'wave': 'wave 1.2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.2s ease-out infinite',
        'blink': 'blink 1s ease-in-out infinite',
      },
      keyframes: {
        wave: { '0%,100%': { height: '8px' }, '50%': { height: '24px' } },
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.8' }, '100%': { transform: 'scale(1.4)', opacity: '0' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
      }
    }
  },
  plugins: []
}
