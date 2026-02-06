/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      borderRadius: {
        xl: '0.75rem'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
