/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Brand palette — change these 6 values to retheme the entire app ──
      colors: {
        // Primary action colour (buttons, links, active states)
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',   // ← main brand blue
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Page / card surfaces
        surface: {
          bg:    '#F7F5F2',   // ← warm off-white page background
          card:  '#FFFFFF',   // ← card white
          muted: '#F0EDE8',   // ← subtle tinted background (sidebar, badges)
        },
        // Text scale
        ink: {
          DEFAULT: '#1C1917',  // ← near-black headings
          secondary: '#78716C',// ← muted body text
          tertiary: '#A8A29E', // ← timestamps, labels
        },
        // Status colours
        status: {
          planning:  { bg: '#FEF3C7', text: '#92400E' },
          booked:    { bg: '#D1FAE5', text: '#065F46' },
          completed: { bg: '#DBEAFE', text: '#1E40AF' },
        },
        // Chat UI (Qubi-inspired)
        chat: {
          bg:       '#f3f0ff',  // lavender page background
          user:     '#e9d5ff',  // purple-200 user message bubble
          ai:       '#ffffff',  // white AI message bubble
          avatar:   '#86efac',  // green-300 AI avatar circle
          send:     '#a78bfa',  // purple-400 send button (dark lavender)
          input:    '#faf5ff',  // purple-50 input background
        },
      },
      fontFamily: {
        // Display font for headings — loaded via index.html <link>
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        // Body font — clean geometric sans
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 8px 25px -5px rgb(0 0 0 / 0.10), 0 4px 10px -6px rgb(0 0 0 / 0.08)',
        'modal': '0 20px 60px -10px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
}