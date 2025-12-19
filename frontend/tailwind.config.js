/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      screens: {
        xs: '475px',
      },
      colors: {
        // Midnight Green - Primary
        blue: {
          50: '#E6EEEF',
          100: '#B0C9CE',
          200: '#8AAFB7',
          300: '#548A96',
          400: '#337481',
          500: '#005162',
          600: '#004A59',
          700: '#003A46',
          800: '#002D36',
          900: '#002229',
        },
        // Aquamarine - Accent
        accent: {
          50: '#F4FDF9',
          100: '#E9FBF3',
          200: '#D2F7E8',
          300: '#BCF4DC',
          400: '#A5F0D1',
          500: '#8FECC5',
          600: '#75CBA7',
          700: '#5BAA89',
        },
        // Semantic colors scales
        red: {
          100: '#F6CBCF',
          200: '#EA8690',
          300: '#DC3545',
          400: '#8B1824',
        },
        orange: {
          100: '#FEDDC2',
          200: '#FEB172',
          300: '#FD7E14',
          400: '#C86411',
        },
        sky: {
          100: '#C2EBFF',
          200: '#47C2FF',
          300: '#008BD2',
          400: '#005F8F',
        },
        // Semantic aliases
        success: '#8FECC5',
        error: '#DC3545',
        warning: '#FD7E14',
        info: '#008BD2',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', '-apple-system', 'sans-serif'],
        heading: ['Overpass', 'sans-serif'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      borderRadius: {
        card: '12px',
        button: '9999px',
        badge: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
        focus: '0 0 0 3px rgba(0, 81, 98, 0.1)',
      },
    },
  },
  plugins: [],
};
