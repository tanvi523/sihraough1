/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        rail: {
          dark: '#0B1120',
          card: '#131D33',
          cardHover: '#1B2744',
          border: '#1F2E4D',
          accent: '#38BDF8',
          orange: '#FF8A00',
          emerald: '#10B981',
          crimson: '#EF4444',
          amber: '#F59E0B',
          navy: '#060B16'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(56, 189, 248, 0.3)',
        'glow-orange': '0 0 20px -5px rgba(255, 138, 0, 0.3)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
