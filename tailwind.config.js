module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/client/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};
