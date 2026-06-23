/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Futuristic Precision Pure Palette mapped to CSS variables for dynamic updates
        'surface': '#faf8ff',
        'surface-dim': '#d2d9f4',
        'surface-bright': '#faf8ff',
        'surface-lowest': '#ffffff', // surface-container-lowest
        'surface-low': '#f2f3ff', // surface-container-low
        'surface-container': '#eaedff',
        'surface-high': '#e2e7ff', // surface-container-high
        'surface-highest': '#dbe2fd', // surface-container-highest
        'on-surface': '#131b2e',
        'on-surface-variant': '#444656',
        'inverse-surface': '#283044',
        'inverse-on-surface': '#eef0ff',
        'outline': '#747688',
        'outline-variant': '#c4c5d9',
        'surface-tint': 'var(--surface-tint, #2345f6)',
        
        primary: {
          DEFAULT: 'var(--primary, #0029c5)',
          container: 'var(--primary-container, #1c40f2)',
          on: '#ffffff',
          'on-container': 'var(--on-primary-container, #cad0ff)',
          inverse: '#bbc3ff'
        },
        secondary: {
          DEFAULT: 'var(--secondary, #006b55)',
          on: '#ffffff',
          container: 'var(--secondary-container, #3ffbcd)',
          'on-container': 'var(--on-secondary-container, #007059)'
        },
        tertiary: {
          DEFAULT: '#3f4352',
          on: '#ffffff',
          container: '#565a6a',
          'on-container': '#cfd2e5'
        },
        // Layout-specific
        'deep-navy': '#070B18',
        'neutral-tint': '#DDE4FF',
        'input-bg': '#E2E8FF'
      },
      borderRadius: {
        card: '8px',
        button: '8px',
        input: '8px',
        badge: '4px',
      },
      boxShadow: {
        'none': 'none',
      }
    },
  },
  plugins: [],
}
