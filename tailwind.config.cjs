module.exports = {
  content: ['./app/**/*.{ts,tsx,js,jsx}', './components/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        canvas: '#0a0a0a'
      },
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 24px 48px -12px rgba(0, 0, 0, 0.45)'
      }
    }
  },
  plugins: []
}
