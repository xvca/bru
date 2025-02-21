import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
	return (
		<Html lang='en'>
			<Head>
				<meta charSet='utf-8' />
				<link rel='icon' type='image/icon' href='/images/favicon.ico' />
				<meta
					name='theme-color'
					content='#1f1815'
					media='(prefers-color-scheme: dark)'
				/>
				<meta name='theme-color' content='#fdfbf7' />
				<link rel='apple-touch-icon' href='/images/icon-maskable-512.png' />
				<link rel='manifest' href='/manifest.json' />
			</Head>
			<body className='bg-background'>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
