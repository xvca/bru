import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
	...nextVitals,
	prettier,
	{
		rules: {
			'react-hooks/exhaustive-deps': 'off',
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/immutability': 'off',
			'react-hooks/use-memo': 'off',
			'react-hooks/incompatible-library': 'off',
		},
	},
	globalIgnores([
		'.next/**',
		'out/**',
		'build/**',
		'generated/**',
		'next-env.d.ts',
	]),
])
