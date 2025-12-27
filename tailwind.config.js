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
          50: '#eef8ff',
          100: '#d6f0ff',
          200: '#addffd',
          300: '#7ac0fb',
          400: '#4aaaf8',
          500: '#1d87ee',
          600: '#1466c4',
          700: '#0f4a95',
          800: '#082f68',
          900: '#031735'
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
