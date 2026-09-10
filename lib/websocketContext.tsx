import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useRouter } from 'next/router'
import { useEspConfig } from './espConfigContext'

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
	const router = useRouter()

	const { espIp, isReady: isEspConfigReady } = useEspConfig()
	const wsUrl = useMemo(() => (espIp ? `ws://${espIp}/ws` : null), [espIp])

	const isMainPage = router.pathname === '/'

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
				lastUpdated: performance.now(),
			})
		} catch (e) {
			console.error('Error parsing binary metrics:', e)
			throw e
		}
	}

	const sendMessage = (message: string) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(message)
		}
	}

	useEffect(() => {
		if (!isEspConfigReady || !wsUrl || !isMainPage) return

		let disposed = false
		let retryTimer: ReturnType<typeof setTimeout> | undefined
		let timeout: ReturnType<typeof setTimeout> | undefined
		let pingInterval: ReturnType<typeof setInterval> | undefined

		const disconnect = () => {
			clearTimeout(retryTimer)
			clearTimeout(timeout)
			clearInterval(pingInterval)
			retryTimer = timeout = pingInterval = undefined

			const socket = wsRef.current
			wsRef.current = null
			if (socket) {
				socket.onopen = null
				socket.onclose = null
				socket.onerror = null
				socket.onmessage = null
				socket.close()
			}
			setWs(null)
			setWsConnected(false)
			// Keep the last metrics: losing a connection is not a brew finishing.
		}

		const retry = () => {
			disconnect()
			if (!disposed && document.visibilityState === 'visible') {
				retryTimer = setTimeout(connect, 1000)
			}
		}

		const ping = () => {
			if (wsRef.current?.readyState !== WebSocket.OPEN || timeout !== undefined)
				return
			timeout = setTimeout(retry, 5000)
			try {
				wsRef.current.send('ping')
			} catch {
				retry()
			}
		}

		const connect = () => {
			if (disposed || document.visibilityState !== 'visible') return
			if (wsRef.current?.readyState === WebSocket.OPEN) {
				// Safari can retain an OPEN socket after suspending the app.
				ping()
				return
			}
			if (wsRef.current?.readyState === WebSocket.CONNECTING) return

			disconnect()
			try {
				const newWs = new WebSocket(wsUrl)
				newWs.binaryType = 'arraybuffer'
				wsRef.current = newWs
				const isCurrent = () => !disposed && wsRef.current === newWs

				// A failed handshake must not leave us CONNECTING indefinitely.
				timeout = setTimeout(retry, 5000)
				newWs.onopen = () => {
					if (!isCurrent()) return
					clearTimeout(timeout)
					timeout = undefined
					setWs(newWs)
					setWsConnected(true)
					pingInterval = setInterval(ping, 10000)
					ping()
				}
				newWs.onclose = newWs.onerror = () => {
					if (isCurrent()) retry()
				}
				newWs.onmessage = (event) => {
					if (!isCurrent()) return
					if (event.data === 'pong') {
						clearTimeout(timeout)
						timeout = undefined
						return
					}
					try {
						if (event.data instanceof ArrayBuffer) {
							parseWsMessage(event.data)
						}
					} catch (error) {
						console.error('Failed to parse WebSocket message:', error)
					}
				}
			} catch (error) {
				console.error('Error creating WebSocket:', error)
				retry()
			}
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') disconnect()
			else connect()
		}

		connect()
		document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('pagehide', disconnect)
		window.addEventListener('pageshow', connect)
		window.addEventListener('focus', connect)
		window.addEventListener('online', connect)

		return () => {
			disposed = true
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('pagehide', disconnect)
			window.removeEventListener('pageshow', connect)
			window.removeEventListener('focus', connect)
			window.removeEventListener('online', connect)
			disconnect()
		}
	}, [isMainPage, wsUrl, isEspConfigReady])

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
