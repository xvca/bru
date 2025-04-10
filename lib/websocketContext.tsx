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
	isConnected: boolean
	isWsConnected: boolean
	brewData: {
		weight: number
		flowRate: number
		time: number
		state: number
		target: number
	}
	sendMessage: (message: string) => void
}

const initialBrewData = {
	weight: 0,
	flowRate: 0,
	time: 0,
	state: 0,
	target: 0,
}

const WebSocketContext = createContext<WebSocketContextType>({
	ws: null,
	isConnected: false,
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
	const [isConnected, setIsConnected] = useState(false)
	const [isWsConnected, setWsConnected] = useState(false)
	const [brewData, setBrewData] = useState(initialBrewData)

	const wsRef = useRef<WebSocket | null>(null)
	const isReconnecting = useRef(false)
	const router = useRouter()
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const lastScaleMessageTimeRef = useRef<number>(Date.now())

	const wsUrl =
		`ws://${process.env.NEXT_PUBLIC_ESP_IP}/ws` || 'ws://localhost:8080'
	const isMainPage = router.pathname === '/'

	// Parse WebSocket binary message
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

			setBrewData({ weight, flowRate, target, time, state })
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
		setIsConnected(false)
		isReconnecting.current = false
	}

	// WebSocket connection management
	useEffect(() => {
		// Only connect on the main page
		if (!isMainPage) {
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
						if (lastScaleMessageTimeRef.current + 5000 < Date.now()) {
							setIsConnected(false)
						}
					}, 10000)
				}

				newWs.onclose = (event) => {
					console.log('ws disconnected:', event.code, event.reason)

					setWsConnected(false)
					setIsConnected(false)
					setBrewData(initialBrewData)

					if (!isReconnecting.current && isMainPage) {
						isReconnecting.current = false
						// Only attempt reconnect if we're on the main page
						setTimeout(() => {
							if (isMainPage) {
								connect()
							}
						}, 1000)
					}
				}

				newWs.onerror = (error) => {
					console.log('ws error: ', error)
					setWsConnected(false)
					setIsConnected(false)
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
							lastScaleMessageTimeRef.current = Date.now()
							if (pingTimeoutRef.current) {
								clearTimeout(pingTimeoutRef.current)
							}
							return
						}

						if (event.data instanceof ArrayBuffer) {
							parseWsMessage(event.data)
							if (!isConnected) setIsConnected(true)
							lastScaleMessageTimeRef.current = Date.now()
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

		connect()

		// Cleanup function
		return () => {
			cleanupWebSocket()
		}
	}, [isMainPage, wsUrl]) // Only re-establish when router changes

	useEffect(() => {
		// Check for router changes to handle cleanup
		const handleRouteChange = () => {
			if (!isMainPage) {
				cleanupWebSocket()
			}
		}

		router.events.on('routeChangeComplete', handleRouteChange)

		return () => {
			router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [router])

	return (
		<WebSocketContext.Provider
			value={{
				ws,
				isConnected,
				isWsConnected,
				brewData,
				sendMessage,
			}}
		>
			{children}
		</WebSocketContext.Provider>
	)
}
