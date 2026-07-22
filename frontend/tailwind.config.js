/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Brand palette — change these values to retheme the entire app ──
      colors: {
        // ── Tagalong palette ──────────────────────────────────────
        ink:         '#1E2A38',  // was: forest
        cream:       '#F6F1E7',  // was: parchment
        marigold:    '#E8A33D',  // was: gold
        teal:        '#3F7C74',  // new — Sherpa's color
        poppy:       '#C1432E',  // danger/warning — full strength for text/icons/borders
        'poppy-tint': '#FBEAE6', // danger/warning — light tint for backgrounds
        terrain:     '#D9E8DF',
        sage:        '#8FA898',  // semantic success color — full strength for text/icons/borders
        'sage-tint': '#EDF1EF',  // semantic success color — light tint for backgrounds
        'card-border': '#DDD8CE',
        // Primary action colour (buttons, links, active states)
        brand: {
          50:  '#eef2ff',  // indigo-50
          100: '#e0e7ff',
          200: '#c7d2fe',
          400: '#818cf8',  // indigo-400
          500: '#6366f1',  // indigo-500
          600: '#4f46e5',  // indigo-600
          700: '#4338ca',  // indigo-700
        },
        // Page / card surfaces
        surface: {
          bg:    '#F7F5F2',   // ← warm off-white page background
          card:  '#FFFFFF',   // ← card white
          muted: '#F0EDE8',   // ← subtle tinted background (sidebar, badges)
        },
        // Text scale — renamed from `ink` to avoid colliding with the new
        // flat `ink` brand token (#1E2A38) above.
        inkText: {
          DEFAULT: '#1C1917',  // ← near-black headings
          secondary: '#78716C',// ← muted body text
          tertiary: '#A8A29E', // ← timestamps, labels
        },
        // Status colours — one consistent light-bg/dark-text pair per status,
        // reconciled against the scattered raw amber/emerald/rose shades
        // previously used ad hoc across components.
        status: {
          planning:  { bg: '#FEF3C7', text: '#92400E' },  // amber family — unchanged, already a good pair
          booked:    { bg: '#EDF1EF', text: '#8FA898' },  // sage / sage-tint
          ongoing:   { bg: '#eef2ff', text: '#6366f1' },  // brand.50 / brand.500 — same indigo already used ad hoc
          completed: { bg: '#E6ECE8', text: '#4F5C54' },  // darker/muted sage — distinct from booked's lighter sage
          cancelled: { bg: '#FBEAE6', text: '#C1432E' },  // poppy-tint / poppy
        },
        // Chat UI — Sherpa is the one colored element in the thread;
        // everything else stays neutral (cream/ink-derived).
        chat: {
          bg:       '#FAF7F1',  // neutral backdrop (cream mixed toward white)
          user:     '#E9E5DC',  // neutral bubble (cream mixed toward ink)
          ai:       '#ECF2F1',  // Sherpa's bubble — light teal tint
          avatar:   '#3F7C74',  // Sherpa's avatar circle — teal itself
          send:     '#32635D',  // Sherpa's send button — darker teal shade
          input:    '#FCFBF8',  // neutral input background
        },
      },
      fontFamily: {
        // Display font for headings (Fraunces — warm editorial serif)
        display: ['"Fraunces"', 'Georgia', 'serif'],
        // Body font — clean humanist sans
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
        // Mono — coordinates, eyebrow labels, metadata
        mono:    ['"DM Mono"', 'ui-monospace', 'monospace'],
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