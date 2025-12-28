/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ktaby: {
          50: '#f0fdff',
          100: '#ccfeff',
          200: '#99fbff',
          300: '#66f5ff',
          400: '#00e5ff',
          500: '#00d4ff',
          600: '#00b8e6',
          700: '#0094bf',
          800: '#007599',
          900: '#005c7a'
        },
        kpop: {
          pink: '#FF4DA6',
          candy: '#FF7AB6',
          cyan: '#00E5FF',
          purple: '#7A5CFF',
          deep: '#7A2AFF'
        }
      },
      fontFamily: {
        sans: ['Baloo 2', 'Noto Sans KR', 'Poppins', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Baloo 2', 'Poppins', 'Noto Sans KR', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [],
}
