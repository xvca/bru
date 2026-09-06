import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'
import axios from 'axios'
import {
	MAX_CONFIGURABLE_SHOT_WEIGHT,
	type ESPPrefsFormData,
} from './validators'

import { parseEspIntegration, type EspIntegration } from './espIntegration'

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
	integration: EspIntegration | null
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
	const [integration, setIntegration] = useState<EspIntegration | null>(null)
	const prefsRequestId = useRef(0)
	const selectedIp = useRef<string | null>(null)

	useEffect(() => {
		if (typeof window === 'undefined') return
		const stored = window.localStorage.getItem(STORAGE_KEY)
		setEspIpState(stored)
		setIsReady(true)
	}, [])

	const fetchPrefs = useCallback(async (ip: string) => {
		if (ip !== selectedIp.current) return
		const requestId = ++prefsRequestId.current
		setIsLoadingPrefs(true)
		setPrefsError(null)
		setIntegration(null)

		try {
			const sanitizedIp = ip.trim().replace(/^https?:\/\//, '')
			const api = axios.create({
				baseURL: `http://${sanitizedIp}`,
			})

			const { data } = await api.get('/prefs', { timeout: 5000 })
			if (requestId !== prefsRequestId.current) return

			const prefsData: ESPPrefsFormData = {
				isEnabled: data.isEnabled ?? true,
				autoSavePreset: data.autoSavePreset ?? true,
				regularPreset: data.regularPreset ?? 40,
				decafPreset: data.decafPreset ?? 40,
				maxShotWeight:
					typeof data.maxShotWeight === 'number' &&
					Number.isFinite(data.maxShotWeight) &&
					data.maxShotWeight >= 1 &&
					data.maxShotWeight <= MAX_CONFIGURABLE_SHOT_WEIGHT
						? data.maxShotWeight
						: undefined,
				pMode: data.pMode ?? PreinfusionMode.SIMPLE,
				decafStartHour:
					data.decafStartHour === undefined ? -1 : data.decafStartHour,
				timezone: data.timezone?.trim() ?? 'GMT0',
				learningRate: data.learningRate === undefined ? 0.5 : data.learningRate,
				systemLag: data.systemLag === undefined ? 1.0 : data.systemLag,
				earlyStop: data.earlyStop ?? false,
				swapButtons: data.swapButtons ?? false,
				halfForTwoCup: data.halfForTwoCup ?? true,
			}

			setPrefs(prefsData)
			setIntegration(parseEspIntegration(data.autoLogging))
		} catch (error) {
			if (requestId !== prefsRequestId.current) return
			console.error('Failed to fetch ESP preferences:', error)
			setPrefsError(
				error instanceof Error ? error.message : 'Failed to fetch preferences',
			)
			setPrefs(null)
		} finally {
			if (requestId === prefsRequestId.current) setIsLoadingPrefs(false)
		}
	}, [])

	useEffect(() => {
		selectedIp.current = espIp
		if (isReady && espIp) {
			fetchPrefs(espIp)
		} else if (isReady && !espIp) {
			setPrefs(null)
			setPrefsError(null)
			setIntegration(null)
			setIsLoadingPrefs(false)
		}
		return () => {
			prefsRequestId.current += 1
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
			integration,
			isLoadingPrefs,
			prefsError,
			refreshPrefs,
		}),
		[
			espIp,
			setEspIp,
			isReady,
			prefs,
			integration,
			isLoadingPrefs,
			prefsError,
			refreshPrefs,
		],
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
