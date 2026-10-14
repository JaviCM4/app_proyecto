/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        azul: {
          DEFAULT: '#1B3A6B',
          oscuro: '#12294D',
          claro: '#3E63A3',
        },
        cafe: {
          DEFAULT: '#6B4A2F',
          oscuro: '#4E3421',
          claro: '#9C7250',
        },
        menta: {
          DEFAULT: '#5ED3A7',
          oscuro: '#2FA67E',
          claro: '#C9F2E2',
        },
        crema: {
          DEFAULT: '#FAF3E7',
          oscuro: '#EFE3CE',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
