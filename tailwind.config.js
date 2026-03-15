/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        'primary': 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        'primary-active': 'rgb(var(--color-primary-active) / <alpha-value>)',
        'primary-muted': 'rgb(var(--color-primary-muted) / <alpha-value>)',

        // Surfaces
        'background': 'rgb(var(--color-background) / <alpha-value>)',
        'surface': 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-hover': 'rgb(var(--color-surface-hover) / <alpha-value>)',
        'border': 'rgb(var(--color-border) / <alpha-value>)',
        'border-muted': 'rgb(var(--color-border-muted) / <alpha-value>)',

        // Text
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--color-text-tertiary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',

        // Status
        'danger': 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-hover': 'rgb(var(--color-danger-hover) / <alpha-value>)',
        'warning': 'rgb(var(--color-warning) / <alpha-value>)',
        'warning-surface': 'rgb(var(--color-warning-surface) / <alpha-value>)',
        'warning-border': 'rgb(var(--color-warning-border) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
