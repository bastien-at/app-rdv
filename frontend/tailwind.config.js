/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Alltricks Midnight Green (Primary)
        blue: {
          100: '#B0C9CE',
          200: '#8AAEB7',
          300: '#4F8A96',
          400: '#337481',
          500: '#005162',
          600: '#004459',
          700: '#003A46',
          800: '#002D37',
          900: '#0F172A',
        },
        // Alltricks Aquamarine (Accent)
        accent: {
          300: '#BCF4DC',
          400: '#A5F0D1',
          500: '#8FECC5',
          600: '#75CBA7',
          700: '#5BAA89',
        },
        // Semantic colors
        success: '#8FECC5',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#337481',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
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
        button: '8px',
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
