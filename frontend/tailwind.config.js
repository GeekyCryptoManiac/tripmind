/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',    // Blue
        secondary: '#10B981',  // Green
        danger: '#EF4444',     // Red
      }
    },
  },
  plugins: [],
}