/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1f2937', // Dark gray
        secondary: '#3b82f6', // Blue
        accent: '#10b981' // Green
      }
    }
  },
  plugins: []
};