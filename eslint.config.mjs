import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
	// Next + React + hooks + jsx-a11y + import rules, and typescript-eslint
	// recommended. Prettier last so formatting never fights the linter.
	...nextVitals,
	...nextTs,
	prettier,
	{
		rules: {
			// Correctness
			eqeqeq: ['error', 'always', { null: 'ignore' }],
			'no-var': 'error',
			'prefer-const': 'error',
			'no-implicit-coercion': ['error', { allow: ['!!'] }],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'no-alert': 'error',
			'no-param-reassign': ['error', { props: false }],
			'no-return-assign': 'error',
			'no-self-compare': 'error',
			'no-template-curly-in-string': 'error',
			'no-unneeded-ternary': 'error',
			'no-useless-rename': 'error',
			'object-shorthand': 'error',
			'prefer-template': 'error',

			// TypeScript
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
					ignoreRestSiblings: true,
				},
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' },
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'warn',

			// React
			'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
			'react/self-closing-comp': 'error',
			'react/jsx-boolean-value': 'error',
			'react/jsx-curly-brace-presence': [
				'error',
				{ props: 'never', children: 'never' },
			],
			'react/no-array-index-key': 'warn',
			'react-hooks/exhaustive-deps': 'warn',

			// React Compiler rules; the codebase isn't written for the
			// compiler, so these stay off rather than flooding with noise
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/immutability': 'off',
			'react-hooks/use-memo': 'off',
			'react-hooks/incompatible-library': 'off',

			// Imports
			'import/no-duplicates': 'error',
			'import/first': 'error',
			'import/newline-after-import': 'error',
			'import/no-anonymous-default-export': 'error',
		},
	},
	{
		// API routes and scripts log to the server console on purpose
		files: ['pages/api/**', 'lib/api/**', 'scripts/**', '*.mjs', '*.js'],
		rules: { 'no-console': 'off' },
	},
	globalIgnores([
		'.next/**',
		'out/**',
		'build/**',
		'generated/**',
		'design/**',
		'.local/**',
		'next-env.d.ts',
	]),
])
