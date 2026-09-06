import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	useRef,
} from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { toast } from 'sonner'

interface BrewBar {
	id: number
	name: string
	role: string
}

interface BrewBarContextType {
	activeBarId: number | null
	setActiveBarId: (id: number | null) => void
	availableBars: BrewBar[]
	isLoading: boolean
	refreshBars: () => Promise<void>
}

const BrewBarContext = createContext<BrewBarContextType>({
	activeBarId: null,
	setActiveBarId: () => {},
	availableBars: [],
	isLoading: true,
	refreshBars: async () => {},
})

export const useBrewBar = () => useContext(BrewBarContext)

export const BrewBarProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user } = useAuth()
	const [activeBarId, setActiveBarId] = useState<number | null>(null)
	const [availableBars, setAvailableBars] = useState<BrewBar[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const requestVersion = useRef(0)
	const userId = user?.id

	const fetchBarsAndPreference = useCallback(async () => {
		const version = ++requestVersion.current
		if (!userId) {
			setIsLoading(false)
			return
		}

		try {
			setIsLoading(true)

			const [barsRes, prefRes] = await Promise.all([
				axios.get('/api/brew-bars', { timeout: 5000 }),
				axios.get('/api/user/preferences', { timeout: 5000 }),
			])
			if (version !== requestVersion.current) return
			setAvailableBars(barsRes.data)

			// if we haven't manually set a bar in this session yet, use the default
			if (prefRes.data.defaultBarId !== undefined) {
				setActiveBarId((current) =>
					current === null ? prefRes.data.defaultBarId : current,
				)
			}
		} catch (error) {
			if (version !== requestVersion.current) return
			if (!(
				axios.isAxiosError(error) &&
				error.response?.data?.code === 'SESSION_INVALID'
			)) {
				toast.error(
					'Unable to load your brew bars and preferences. Check your connection and try again.',
				)
			}
		} finally {
			if (version === requestVersion.current) setIsLoading(false)
		}
	}, [userId])

	useEffect(() => {
		setAvailableBars([])
		setActiveBarId(null)
		void fetchBarsAndPreference()
		const retry = () => {
			if (document.visibilityState === 'visible') void fetchBarsAndPreference()
		}
		window.addEventListener('online', retry)
		window.addEventListener('focus', retry)
		return () => {
			requestVersion.current++
			window.removeEventListener('online', retry)
			window.removeEventListener('focus', retry)
		}
	}, [fetchBarsAndPreference])

	return (
		<BrewBarContext.Provider
			value={{
				activeBarId,
				setActiveBarId,
				availableBars,
				isLoading,
				refreshBars: fetchBarsAndPreference,
			}}
		>
			{children}
		</BrewBarContext.Provider>
	)
}
