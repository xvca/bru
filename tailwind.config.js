module.exports = {
	content: [
		'./pages/**/*.{js,ts,jsx,tsx}',
		'./components/**/*.{js,ts,jsx,tsx}',
	],
	darkMode: 'class',
	plugins: [require('tailwindcss-safe-area')],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: 'var(--color-primary)',
					dark: 'var(--color-primary-dark)',
					light: 'var(--color-primary-light)',
				},
				background: 'var(--color-background)',
				text: {
					DEFAULT: 'var(--color-text)',
					secondary: 'var(--color-text-secondary)',
				},

				border: 'var(--color-border)',
				input: {
					bg: 'var(--color-input-bg)',
					border: 'var(--color-input-border)',
				},
				success: 'var(--color-success)',
				error: 'var(--color-error)',

				gauge: {
					primary: 'var(--color-gauge-primary)',
					secondary: 'var(--color-gauge-secondary)',
				},
			},
			keyframes: {
				popIn: {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
			},
		},
	},
}
