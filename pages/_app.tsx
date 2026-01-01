import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { ThemeProvider } from 'next-themes'
import { WebSocketProvider } from '@/lib/websocketContext'
import { AuthProvider } from '@/lib/authContext'
import { BrewBarProvider } from '@/lib/brewBarContext'
import { Toaster } from '@/components/ui/sonner'
import { AnimatePresence, motion } from 'framer-motion'
import '@/styles/globals.css'
import { EspConfigProvider } from '@/lib/espConfigContext'

export default function App({ Component, pageProps }: AppProps) {
	const router = useRouter()

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
			<EspConfigProvider>
				<AuthProvider>
					<WebSocketProvider>
						<BrewBarProvider>
							<AnimatePresence mode='wait' initial={false}>
								<motion.div
									key={router.pathname}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{
										duration: 0.15,
										ease: 'easeInOut',
									}}
								>
									<Component {...pageProps} />
								</motion.div>
							</AnimatePresence>
							<Toaster
								position='top-center'
								toastOptions={{
									style: {
										background: 'var(--background)',
										borderColor: 'var(--border)',
									},
								}}
							/>
						</BrewBarProvider>
					</WebSocketProvider>
				</AuthProvider>
			</EspConfigProvider>
		</ThemeProvider>
	)
}
