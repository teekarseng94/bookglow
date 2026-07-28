/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './contexts/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Existing teal utility classes resolve to Bookglow brand — do not remap other palettes. */
        teal: {
          50: '#f4f0ff',
          100: '#eae2ff',
          200: '#d9ccff',
          300: '#bea8ff',
          400: '#9e7cf1',
          500: '#8563e1',
          600: '#7656d6',
          700: '#6244bd',
          800: '#4f369b',
          900: '#3e2b7d',
          950: '#28194f',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          deep: 'var(--brand-deep)',
          soft: 'var(--brand-soft)',
          border: 'var(--brand-border)',
        },
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        soft: 'var(--bg-soft)',
      },
      spacing: {
        /* 4px rhythm aliases (opt-in; existing Tailwind spacing unchanged) */
        'ui-1': 'var(--space-1)',
        'ui-2': 'var(--space-2)',
        'ui-3': 'var(--space-3)',
        'ui-4': 'var(--space-4)',
        'ui-5': 'var(--space-5)',
        'ui-6': 'var(--space-6)',
        'ui-8': 'var(--space-8)',
        'ui-10': 'var(--space-10)',
        'ui-12': 'var(--space-12)',
        'safe-t': 'var(--safe-top)',
        'safe-r': 'var(--safe-right)',
        'safe-b': 'var(--safe-bottom)',
        'safe-l': 'var(--safe-left)',
      },
      borderRadius: {
        'ui-xs': 'var(--radius-xs)',
        'ui-sm': 'var(--radius-sm)',
        'ui-md': 'var(--radius-md)',
        'ui-lg': 'var(--radius-lg)',
        'ui-xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'ui-xs': 'var(--shadow-xs)',
        'ui-sm': 'var(--shadow-sm)',
        'ui-md': 'var(--shadow-md)',
        'ui-lg': 'var(--shadow-lg)',
        'ui-focus': 'var(--focus-ring)',
        'ui-focus-strong': 'var(--focus-ring-strong)',
      },
      fontSize: {
        /** ~32px — primary screen title (mobile-first reference) */
        'app-page': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        /** ~34px — large title on sm+ */
        'app-page-lg': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        /** ~24px — section / card titles */
        'app-section': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        /** ~15px — default body (between 14–16px reference) */
        'app-body': ['0.875rem', { lineHeight: '1.375rem' }],
        /** ~11px — small caps labels */
        'app-label': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
        blob: 'blob 7s infinite',
      },
    },
  },
  plugins: [],
};
