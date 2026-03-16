import nextConfig from 'eslint-config-next'
import prettierConfig from 'eslint-config-prettier'

const config = [
	...nextConfig,
	prettierConfig,
	{
		ignores: ['generated/**'],
	},
	{
		rules: {
			'react-hooks/exhaustive-deps': 'off',
		},
	},
]

export default config
