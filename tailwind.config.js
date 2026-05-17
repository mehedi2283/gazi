/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        canvas: 'transparent'
      },
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 20px 40px -10px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
}
