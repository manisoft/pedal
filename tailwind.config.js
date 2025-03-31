/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      height: {
        'screen-90': '90vh',
      },
      maxWidth: {
        'xxs': '16rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      fontSize: {
        'xxs': '0.625rem',
      },
    },
  },
  plugins: [],
};