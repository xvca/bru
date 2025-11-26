import { useEffect } from 'react'
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
	useEffect(() => {
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('/sw.js').then(
					(registration) => {
						console.log(
							'Service Worker registration successful with scope: ',
							registration.scope,
						)
					},
					(err) => {
						console.log('Service Worker registration failed: ', err)
					},
				)
			})
		}
	}, [])

	return (
		<Html lang='en'>
			<Head>
				<link rel='manifest' href='/manifest.json' />
				<link rel='icon' type='image/icon' href='/images/favicon.ico' />
				<meta charSet='utf-8' />
				<meta
					name='theme-color'
					media='(prefers-color-scheme: light)'
					content='#fdfbf7'
				/>
				<meta
					name='theme-color'
					media='(prefers-color-scheme: dark)'
					content='#1f1815'
				/>
				<meta name='mobile-web-app-capable' content='yes' />
				<meta
					name='apple-mobile-web-app-status-bar-style'
					content='black-translucent'
				/>
				<link rel='apple-touch-icon' href='/images/icon-maskable-512.png' />
			</Head>
			<body className='bg-background'>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
