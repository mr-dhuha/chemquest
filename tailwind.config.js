/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      animation: {
        slideUpFade: 'slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        typing: 'typing 1.4s infinite ease-in-out',
      },
      keyframes: {
        slideUpFade: {
          'from': { opacity: 0, transform: 'translateY(20px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        typing: {
          '0%, 100%': { transform: 'translateY(0)', opacity: 0.5 },
          '50%': { transform: 'translateY(-4px)', opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
