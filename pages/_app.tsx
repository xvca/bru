import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { WebSocketProvider } from '@/lib/websocketContext'
import { AuthProvider } from '@/lib/authContext'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
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
