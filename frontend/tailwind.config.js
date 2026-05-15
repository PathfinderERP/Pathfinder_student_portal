/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        script: ['"Playwrite GB S"', 'cursive'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
