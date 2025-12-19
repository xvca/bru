import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type PropsWithChildren,
} from 'react'

const STORAGE_KEY = 'bru:esp_ip'

interface EspConfigContextValue {
	espIp: string | null
	setEspIp: (value: string | null) => void
	isReady: boolean
}

const EspConfigContext = createContext<EspConfigContextValue | undefined>(
	undefined,
)

export const EspConfigProvider = ({ children }: PropsWithChildren) => {
	const [espIp, setEspIpState] = useState<string | null>(null)
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		if (typeof window === 'undefined') return
		const stored = window.localStorage.getItem(STORAGE_KEY)
		setEspIpState(stored)
		setIsReady(true)
	}, [])

	const setEspIp = useCallback((value: string | null) => {
		const trimmed = value?.trim() ?? ''
		const nextValue = trimmed.length > 0 ? trimmed : null
		setEspIpState(nextValue)

		if (typeof window === 'undefined') return
		if (nextValue) {
			window.localStorage.setItem(STORAGE_KEY, nextValue)
		} else {
			window.localStorage.removeItem(STORAGE_KEY)
		}
	}, [])

	const value = useMemo(
		() => ({
			espIp,
			setEspIp,
			isReady,
		}),
		[espIp, setEspIp, isReady],
	)

	return (
		<EspConfigContext.Provider value={value}>
			{children}
		</EspConfigContext.Provider>
	)
}

export const useEspConfig = () => {
	const context = useContext(EspConfigContext)
	if (!context) {
		throw new Error('useEspConfig must be used within an EspConfigProvider')
	}
	return context
}
