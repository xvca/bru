import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type PropsWithChildren,
} from 'react'
import axios from 'axios'
import type { ESPPrefsFormData } from './validators'

const STORAGE_KEY = 'bru:esp_ip'

export enum PreinfusionMode {
	SIMPLE = 0,
	WEIGHT_TRIGGERED = 1,
}

interface EspConfigContextValue {
	espIp: string | null
	setEspIp: (value: string | null) => void
	isReady: boolean
	prefs: ESPPrefsFormData | null
	isLoadingPrefs: boolean
	prefsError: string | null
	refreshPrefs: () => Promise<void>
}

const EspConfigContext = createContext<EspConfigContextValue | undefined>(
	undefined,
)

export const EspConfigProvider = ({ children }: PropsWithChildren) => {
	const [espIp, setEspIpState] = useState<string | null>(null)
	const [isReady, setIsReady] = useState(false)
	const [prefs, setPrefs] = useState<ESPPrefsFormData | null>(null)
	const [isLoadingPrefs, setIsLoadingPrefs] = useState(false)
	const [prefsError, setPrefsError] = useState<string | null>(null)

	useEffect(() => {
		if (typeof window === 'undefined') return
		const stored = window.localStorage.getItem(STORAGE_KEY)
		setEspIpState(stored)
		setIsReady(true)
	}, [])

	const fetchPrefs = useCallback(async (ip: string) => {
		setIsLoadingPrefs(true)
		setPrefsError(null)

		try {
			const sanitizedIp = ip.trim().replace(/^https?:\/\//, '')
			const api = axios.create({
				baseURL: `http://${sanitizedIp}`,
			})

			const { data } = await api.get('/prefs', { timeout: 5000 })

			const prefsData: ESPPrefsFormData = {
				isEnabled: data.isEnabled ?? true,
				regularPreset: data.regularPreset ?? 40,
				decafPreset: data.decafPreset ?? 40,
				pMode: data.pMode ?? PreinfusionMode.SIMPLE,
				decafStartHour:
					data.decafStartHour === undefined ? -1 : data.decafStartHour,
				timezone: data.timezone?.trim() ?? 'GMT0',
				learningRate: data.learningRate === undefined ? 0.5 : data.learningRate,
				systemLag: data.systemLag === undefined ? 1.0 : data.systemLag,
			}

			setPrefs(prefsData)
		} catch (error) {
			console.error('Failed to fetch ESP preferences:', error)
			setPrefsError(
				error instanceof Error ? error.message : 'Failed to fetch preferences',
			)
			setPrefs(null)
		} finally {
			setIsLoadingPrefs(false)
		}
	}, [])

	useEffect(() => {
		if (isReady && espIp) {
			fetchPrefs(espIp)
		} else if (isReady && !espIp) {
			setPrefs(null)
			setPrefsError(null)
		}
	}, [isReady, espIp, fetchPrefs])

	const refreshPrefs = useCallback(async () => {
		if (espIp) {
			await fetchPrefs(espIp)
		}
	}, [espIp, fetchPrefs])

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
			prefs,
			isLoadingPrefs,
			prefsError,
			refreshPrefs,
		}),
		[espIp, setEspIp, isReady, prefs, isLoadingPrefs, prefsError, refreshPrefs],
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
