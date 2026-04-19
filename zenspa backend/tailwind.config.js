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
      fontSize: {
        /** ~32px — primary screen title (mobile-first reference) */
        'app-page': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        /** ~34px — large title on sm+ */
        'app-page-lg': ['2.125rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        /** ~24px — section / card titles */
        'app-section': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        /** ~15px — default body (between 14–16px reference) */
        'app-body': ['0.9375rem', { lineHeight: '1.5rem' }],
        /** ~11px — small caps labels */
        'app-label': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
        blob: 'blob 7s infinite',
      },
    },
  },
  plugins: [],
};
