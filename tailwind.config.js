/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: ['animate-[scroll_20s_linear_infinite]'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b10',
        card: '#101017',
        surface: '#15151c',
        border: '#21212e',
        accent: '#7c3aed',
        'accent-hover': '#6d28d9',
        accent2: '#06b6d4',
        muted: '#6b7280',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}
