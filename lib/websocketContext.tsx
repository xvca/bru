import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useRouter } from 'next/router'

interface WebSocketContextType {
	ws: WebSocket | null
	isWsConnected: boolean
	brewData: {
		weight: number
		flowRate: number
		time: number
		state: number
		target: number
		isActive: boolean
		isScaleConnected: boolean
		lastUpdated: number
	}
	sendMessage: (message: string) => void
}

const initialBrewData = {
	weight: 0,
	flowRate: 0,
	time: 0,
	state: 0,
	target: 0,
	isActive: false,
	isScaleConnected: false,
	lastUpdated: 0,
}

const WebSocketContext = createContext<WebSocketContextType>({
	ws: null,
	isWsConnected: false,
	brewData: initialBrewData,
	sendMessage: () => {},
})

export const useWebSocket = () => useContext(WebSocketContext)

interface WebSocketProviderProps {
	children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
	children,
}) => {
	const [ws, setWs] = useState<WebSocket | null>(null)
	const [isWsConnected, setWsConnected] = useState(false)
	const [brewData, setBrewData] = useState(initialBrewData)

	const wsRef = useRef<WebSocket | null>(null)
	const isReconnecting = useRef(false)
	const router = useRouter()
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const wsUrl =
		`ws://${process.env.NEXT_PUBLIC_ESP_IP}/ws` || 'ws://localhost:8080'
	const isMainPage = router.pathname === '/'

	const isMainPageRef = useRef(isMainPage)

	const parseWsMessage = (buffer: ArrayBuffer) => {
		const view = new DataView(buffer)
		let offset = 0

		try {
			const weight = view.getFloat32(offset, true)
			offset += 4

			const flowRate = view.getFloat32(offset, true)
			offset += 4

			const target = view.getFloat32(offset, true)
			offset += 4

			const time = view.getUint32(offset, true)
			offset += 4

			const state = view.getUint8(offset)
			offset += 1

			const isActive = view.getUint8(offset) !== 0
			offset += 1

			const isScaleConnected = view.getUint8(offset) !== 0
			offset += 1

			setBrewData({
				weight,
				flowRate,
				target,
				time,
				state,
				isActive,
				isScaleConnected,
				lastUpdated: Date.now(),
			})
		} catch (e) {
			console.error('Error parsing binary metrics:', e)
			throw e
		}
	}

	// Send WebSocket message
	const sendMessage = (message: string) => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(message)
		}
	}

	// Clean up WebSocket connection
	const cleanupWebSocket = () => {
		if (wsRef.current) {
			console.log('Cleaning up WebSocket connection')
			wsRef.current.close()
			wsRef.current = null
		}

		if (pingIntervalRef.current) {
			clearInterval(pingIntervalRef.current)
			pingIntervalRef.current = null
		}

		if (pingTimeoutRef.current) {
			clearTimeout(pingTimeoutRef.current)
			pingTimeoutRef.current = null
		}

		setWs(null)
		setWsConnected(false)
		isReconnecting.current = false
	}

	useEffect(() => {
		isMainPageRef.current = isMainPage
	}, [isMainPage])

	// WebSocket connection management
	useEffect(() => {
		// Only connect on the main page
		if (!isMainPage) {
			console.log('not on main page - skipping connection')
			cleanupWebSocket()
			return
		}

		const connect = () => {
			if (
				isReconnecting.current ||
				(wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)
			) {
				console.log('Connection attempt already in progress')
				return
			}

			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				console.log('Already connected')
				return
			}

			isReconnecting.current = true
			console.log('Starting connection attempt')

			cleanupWebSocket()

			try {
				const newWs = new WebSocket(wsUrl)
				newWs.binaryType = 'arraybuffer'
				wsRef.current = newWs

				const heartbeat = () => {
					if (pingTimeoutRef.current) {
						clearTimeout(pingTimeoutRef.current)
					}

					pingTimeoutRef.current = setTimeout(() => {
						console.log('Ping timeout - closing connection')
						if (wsRef.current?.readyState === WebSocket.OPEN) {
							wsRef.current?.close()
						}
						isReconnecting.current = false
					}, 5000)
				}

				newWs.onopen = () => {
					console.log('ws connected')
					setWs(newWs)
					setWsConnected(true)
					isReconnecting.current = false

					// Start ping interval
					pingIntervalRef.current = setInterval(() => {
						if (wsRef.current?.readyState === WebSocket.OPEN) {
							console.log('sending ping')
							wsRef.current.send('ping')
							heartbeat()
						}
					}, 10000)
				}

				newWs.onclose = (event) => {
					console.log('ws disconnected:', event.code, event.reason)

					setWsConnected(false)
					setBrewData(initialBrewData)

					if (document.visibilityState === 'hidden') {
						console.log(
							'Tab hidden, halting auto-reconnect to prevent fighting tabs',
						)
						isReconnecting.current = false
						return
					}

					if (!isReconnecting.current && isMainPageRef.current) {
						setTimeout(() => {
							if (isMainPageRef.current) connect()
						}, 1000)
					}
				}

				newWs.onerror = (error) => {
					console.log('ws error: ', error)
					setWsConnected(false)
					setBrewData(initialBrewData)

					if (wsRef.current?.readyState === WebSocket.OPEN) {
						wsRef.current?.close()
					}
					isReconnecting.current = false
				}

				newWs.onmessage = (event) => {
					try {
						if (typeof event.data === 'string' && event.data === 'pong') {
							console.log('Pong received')
							if (pingTimeoutRef.current) {
								clearTimeout(pingTimeoutRef.current)
							}
							return
						}

						if (event.data instanceof ArrayBuffer) {
							parseWsMessage(event.data)
						}
					} catch (error) {
						console.error('Failed to parse WebSocket message:', error)
					}
				}
			} catch (error) {
				console.error('Error creating ws:', error)
				isReconnecting.current = false
			}
		}

		const initialTimeout = setTimeout(() => {
			connect()
		}, 500)

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				console.log('Tab is visible again, attempting reconnect...')
				connect()
			}
		}

		const handleFocus = () => {
			console.log('window focused, attemping reconnect...')
			connect()
		}

		const handleOnline = () => {
			console.log('network online, attempting reconnect...')
			connect()
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('focus', handleFocus)
		window.addEventListener('online', handleOnline)

		return () => {
			clearTimeout(initialTimeout)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('focus', handleFocus)
			window.removeEventListener('online', handleOnline)
			cleanupWebSocket()
		}
	}, [isMainPage, wsUrl])

	useEffect(() => {
		const IDLE_LIMIT = 15 * 60 * 1000
		let idleTimeout: NodeJS.Timeout

		const handleUserActivity = () => {
			if (idleTimeout) clearTimeout(idleTimeout)

			idleTimeout = setTimeout(() => {
				console.log('User idle for 15 mins, closing WS to save resources')
				cleanupWebSocket()
			}, IDLE_LIMIT)
		}

		window.addEventListener('mousemove', handleUserActivity)
		window.addEventListener('keydown', handleUserActivity)
		window.addEventListener('touchstart', handleUserActivity)

		handleUserActivity()

		return () => {
			if (idleTimeout) clearTimeout(idleTimeout)
			window.removeEventListener('mousemove', handleUserActivity)
			window.removeEventListener('keydown', handleUserActivity)
			window.removeEventListener('touchstart', handleUserActivity)
		}
	}, [])

	return (
		<WebSocketContext.Provider
			value={{
				ws,
				isWsConnected,
				brewData,
				sendMessage,
			}}
		>
			{children}
		</WebSocketContext.Provider>
	)
}
