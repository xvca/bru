import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { WebSocketProvider } from '@/lib/websocketContext'
import { AuthProvider } from '@/lib/authContext'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
	useEffect(() => {
		if ('serviceWorker' in navigator) {
			const onLoad = () => {
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
			}

			window.addEventListener('load', onLoad)
			return () => window.removeEventListener('load', onLoad)
		}
	}, [])

	return (
		<ThemeProvider
			attribute='class'
			defaultTheme='system'
			disableTransitionOnChange
		>
			<AuthProvider>
				<WebSocketProvider>
					<Component {...pageProps} />
				</WebSocketProvider>
			</AuthProvider>
		</ThemeProvider>
	)
}
