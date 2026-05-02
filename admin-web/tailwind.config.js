/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#0b0d10',
          surface: '#13161b',
          elevated: '#1a1e25',
        },
        border: {
          DEFAULT: '#22272e',
          strong: '#2d333b',
        },
        fg: {
          DEFAULT: '#e6edf3',
          muted: '#8b949e',
          subtle: '#6e7681',
        },
        accent: {
          DEFAULT: '#5b8def',
          hover: '#4674d6',
        },
        success: '#3fb950',
        danger: '#f85149',
        warning: '#d29922',
      },
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};
