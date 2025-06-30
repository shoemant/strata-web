/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,jsx,tsx}', './src/components/**/*.{js,jsx, tsx}'],
  theme: {
    extend: {
      colors: {
        'text': '#111827',
        'background': '#f9fafb',
        'primary': '#0d43d6',
        'secondary': '#91c3fd',
        'accent': '#e5e7eb',
      },

    }
  },
  plugins: [],
};
