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
        volcano: {
          orange: 'var(--color-volcano-orange)',
          red: 'var(--color-volcano-red)',
          yellow: 'var(--color-volcano-yellow)',
        },
        dark: {
          bg: 'var(--color-dark-bg)',
          surface: 'var(--color-dark-surface)',
          border: 'var(--color-dark-border)',
        },
        light: {
          bg: 'var(--color-light-bg)',
          surface: 'var(--color-light-surface)',
          border: 'var(--color-light-border)',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'volcano-glow': '0 0 20px rgba(255, 87, 34, 0.6)',
      }
    },
  },
  plugins: [],
}