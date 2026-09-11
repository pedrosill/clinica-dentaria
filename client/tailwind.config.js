/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sugestão de cores "New Clinic"
        medical: {
          light: '#e0f2fe',
          blue: '#0ea5e9',
          dark: '#0369a1',
        }
      }
    },
  },
  plugins: [],
}