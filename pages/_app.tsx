import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { DM_Mono, Instrument_Sans } from 'next/font/google'
import { useRouter } from 'next/router'
import { ThemeProvider } from 'next-themes'
import { WebSocketProvider } from '@/lib/websocketContext'
import { installApiRequestInterceptor } from '@/lib/apiClient'
import { Toaster } from '@/components/ui/sonner'
import { AnimatePresence, motion } from 'framer-motion'
import '@/styles/globals.css'
import { EspConfigProvider } from '@/lib/espConfigContext'
import { TabBar } from '@/components/kit/TabBar'

const textFont = Instrument_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	display: 'swap',
})

const figureFont = DM_Mono({
	subsets: ['latin'],
	weight: ['400', '500'],
	display: 'swap',
})

export default function App({ Component, pageProps }: AppProps) {
	const router = useRouter()

	useEffect(() => installApiRequestInterceptor(), [])

	useEffect(() => {
		if ('serviceWorker' in navigator) {
			const onLoad = () => {
				navigator.serviceWorker.register('/sw.js').catch((err) => {
					console.warn('Service Worker registration failed: ', err)
				})
			}

			window.addEventListener('load', onLoad)
			return () => window.removeEventListener('load', onLoad)
		}
	}, [])

	return (
		<>
			<Head>
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1, viewport-fit=cover'
				/>
			</Head>
			{/* Fonts as CSS variables on :root so portalled sheets get them too */}
			<style jsx global>{`
				:root {
					--font-text: ${textFont.style.fontFamily};
					--font-figures: ${figureFont.style.fontFamily};
				}
			`}</style>
			<ThemeProvider
				attribute='class'
				defaultTheme='system'
				// Theme follows the system; the new key drops choices saved by the
				// old in-app toggle
				storageKey='bru-theme'
				disableTransitionOnChange
			>
				<EspConfigProvider>
					<WebSocketProvider>
						<AnimatePresence mode='wait' initial={false}>
							<motion.div
								key={router.pathname}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15, ease: 'easeInOut' }}
							>
								<Component {...pageProps} />
							</motion.div>
						</AnimatePresence>
						{/* Outside the page transition so the tab bar stays put */}
						<TabBar />
						<Toaster position='top-center' />
					</WebSocketProvider>
				</EspConfigProvider>
			</ThemeProvider>
		</>
	)
}
