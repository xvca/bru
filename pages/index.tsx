import Page from '@/components/Page'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios, { type AxiosInstance } from 'axios'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import Link from 'next/link'
import { useWebSocket } from '@/lib/websocketContext'
import { useEspConfig } from '@/lib/espConfigContext'
import { DEFAULT_MAX_SHOT_WEIGHT, type BrewFormData } from '@/lib/validators'
import { SUGGESTIONS_KEY, type SmartSuggestion } from '@/hooks/useSuggestions'
import BrewForm from '@/components/BrewFormModal'
import { verifyEspReachable } from '@/utils/esp'
import { cn } from '@/lib/utils'

import { Dial } from '@/components/Dial'
import { RecipeChips } from '@/components/RecipeChips'
import { QuickLogSheet } from '@/components/QuickLogSheet'
import { Sheet } from '@/components/kit/Sheet'
import { FormField, Hint, StatusDot } from '@/components/kit/rows'
import { Key, NeutralKey, TextButton } from '@/components/kit/buttons'
import { MinusIcon, PlayIcon, PlusIcon, StopIcon } from '@/components/kit/icons'

enum BrewStates {
	IDLE,
	PREINFUSION,
	BREWING,
	DRIPPING,
}

const isLiteMode = process.env.NEXT_PUBLIC_LITE === 'true'

const sanitizeIp = (value: string) =>
	value
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')

const DIAL = 336

export default function Dashboard() {
	const [targetWeight, setTargetWeight] = useState(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('targetWeight')
			const value = saved ? parseFloat(saved) : 20
			return Number.isFinite(value) && value >= 1 ? value : 20
		}
		return 20
	})
	// What the user is typing; committed to targetWeight as it parses
	const [targetText, setTargetText] = useState<string | null>(null)

	const [isWaking, setIsWaking] = useState(false)
	const [isBrewing, setIsBrewing] = useState(false)
	const [showCompletionAnimation, setShowCompletionAnimation] = useState(false)

	const { brewData, isWsConnected } = useWebSocket()
	const { espIp, setEspIp, prefs, isReady: isEspConfigReady } = useEspConfig()
	const maxShotWeight = prefs?.maxShotWeight ?? DEFAULT_MAX_SHOT_WEIGHT
	const clampTargetWeight = useCallback(
		(weight: number) =>
			Math.min(
				maxShotWeight,
				Math.max(1, Number.isFinite(weight) ? weight : 20),
			),
		[maxShotWeight],
	)
	const isTargetValid =
		Number.isFinite(targetWeight) &&
		targetWeight >= 1 &&
		targetWeight <= maxShotWeight

	const sanitizedIp = useMemo(() => (espIp ? sanitizeIp(espIp) : null), [espIp])

	const api: AxiosInstance | null = useMemo(() => {
		if (!sanitizedIp) return null
		return axios.create({
			baseURL: `http://${sanitizedIp}`,
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
	}, [sanitizedIp])

	const [selectedSuggestion, setSelectedSuggestion] =
		useState<SmartSuggestion | null>(null)
	const [isBrewFormOpen, setIsBrewFormOpen] = useState(false)
	const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
	const [brewDraft, setBrewDraft] = useState<Partial<BrewFormData> | null>(null)

	const [displayWeight, setDisplayWeight] = useState(brewData.weight)
	const [displayTime, setDisplayTime] = useState(brewData.time)

	const [showEspPrompt, setShowEspPrompt] = useState(false)
	const [hasDismissedEspPrompt, setHasDismissedEspPrompt] = useState(false)
	const [espIpDraft, setEspIpDraft] = useState('')
	const [isValidatingEsp, setIsValidatingEsp] = useState(false)

	const liveDataRef = useRef({ brewData, isWsConnected })
	const previousStateRef = useRef(brewData.state)
	const { mutate } = useSWRConfig()

	const refreshSuggestions = () => {
		void mutate(SUGGESTIONS_KEY).catch((error) => {
			console.error('Error refreshing brew suggestions:', error)
		})
	}

	const formTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		if (prefs && !isBrewing) setTargetWeight(clampTargetWeight)
	}, [prefs, isBrewing, clampTargetWeight])

	useEffect(() => {
		localStorage.setItem('targetWeight', targetWeight.toString())
	}, [targetWeight])

	useEffect(() => {
		if (!isEspConfigReady) return
		setEspIpDraft(espIp ?? '')

		if (!espIp && !hasDismissedEspPrompt) {
			setShowEspPrompt(true)
		}
	}, [espIp, hasDismissedEspPrompt, isEspConfigReady])

	useEffect(() => {
		if (espIp) {
			setHasDismissedEspPrompt(false)
			setShowEspPrompt(false)
		}
	}, [espIp])

	useEffect(() => {
		if (brewData.state === BrewStates.IDLE) {
			setIsBrewing(false)
		} else {
			setIsBrewing(true)
		}

		if (isBrewing && brewData.target) {
			setTargetWeight(brewData.target)
		}
	}, [brewData.state, brewData.target, isBrewing])

	useEffect(() => {
		const prevState = previousStateRef.current
		const currentState = brewData.state

		const wasIdle = prevState === BrewStates.IDLE
		const isActive =
			currentState === BrewStates.PREINFUSION ||
			currentState === BrewStates.BREWING

		if (wasIdle && isActive) {
			setDisplayTime(brewData.time)
			setDisplayWeight(brewData.weight)
			setShowCompletionAnimation(false)

			if (formTimeoutRef.current) {
				clearTimeout(formTimeoutRef.current)
				formTimeoutRef.current = null
			}
		}

		if (prevState === BrewStates.DRIPPING && currentState === BrewStates.IDLE) {
			setShowCompletionAnimation(true)

			if (selectedSuggestion) {
				const lastProfile = selectedSuggestion.lastBrew

				const prefill: Partial<BrewFormData> = {
					beanId: selectedSuggestion.id,
					method: 'Espresso',
					doseWeight: lastProfile?.doseWeight ?? targetWeight / 2,
					yieldWeight: targetWeight,
					brewTime: brewData.time
						? Math.round(brewData.time / 1000)
						: undefined,
					grindSize: lastProfile?.grindSize ?? undefined,
					waterTemperature: lastProfile?.waterTemperature ?? undefined,
					grinderId: lastProfile?.grinderId,
					brewerId: lastProfile?.brewerId,
				}

				setBrewDraft(prefill)

				formTimeoutRef.current = setTimeout(() => {
					setIsQuickLogOpen(true)
					setShowCompletionAnimation(false)
				}, 3000)
			} else {
				setTimeout(() => setShowCompletionAnimation(false), 2000)
			}
		}

		previousStateRef.current = currentState
	}, [
		brewData.state,
		brewData.time,
		brewData.weight,
		targetWeight,
		selectedSuggestion,
	])

	useEffect(() => {
		return () => {
			if (formTimeoutRef.current) {
				clearTimeout(formTimeoutRef.current)
			}
		}
	}, [])

	useEffect(() => {
		liveDataRef.current = { brewData, isWsConnected }
	}, [brewData, isWsConnected])

	useEffect(() => {
		let animationFrameId: number
		let previousFrame = performance.now()

		const update = (now: number) => {
			const { brewData: data, isWsConnected: connected } = liveDataRef.current
			const age = Math.max(0, now - data.lastUpdated)
			const blend = 1 - Math.exp(-Math.max(0, now - previousFrame) / 100)
			previousFrame = now

			// Bridge jitter and 1 Hz updates; hold the display once the data is stale.
			if (connected && age <= 2000) {
				const elapsed = data.isScaleConnected ? age : 0
				const running =
					data.state === BrewStates.PREINFUSION ||
					data.state === BrewStates.BREWING
				const weight = Math.max(
					0,
					data.weight +
						(data.state !== BrewStates.IDLE
							? (data.flowRate * elapsed) / 1000
							: 0),
				)

				setDisplayWeight((current) => current + (weight - current) * blend)
				setDisplayTime((current) =>
					running
						? current + (data.time + elapsed - current) * blend
						: data.time,
				)
			}

			animationFrameId = requestAnimationFrame(update)
		}

		animationFrameId = requestAnimationFrame(update)
		return () => cancelAnimationFrame(animationFrameId)
	}, [])

	const isEspConfigured = Boolean(api)

	const status = useMemo((): {
		label: string
		tone: 'green' | 'ink2' | 'danger' | 'warning'
		pulse?: boolean
	} => {
		if (!isEspConfigured) return { label: 'Not set up', tone: 'warning' }
		if (!isWsConnected) return { label: 'Offline', tone: 'danger' }
		if (brewData.isScaleConnected) {
			switch (brewData.state) {
				case BrewStates.PREINFUSION:
					return { label: 'Pre-infusion', tone: 'green' }
				case BrewStates.BREWING:
					return { label: 'Brewing', tone: 'green' }
				case BrewStates.DRIPPING:
					return { label: 'Dripping', tone: 'green' }
				default:
					return {
						label: showCompletionAnimation ? 'Done' : 'Ready',
						tone: 'green',
					}
			}
		}
		if (brewData.isActive)
			return { label: 'Scanning', tone: 'warning', pulse: true }
		return { label: 'Sleeping', tone: 'ink2' }
	}, [brewData, isWsConnected, isEspConfigured, showCompletionAnimation])

	const setTarget = useCallback(
		(weight: number) => {
			setTargetText(null)
			setTargetWeight(clampTargetWeight(Number(weight.toFixed(1))))
		},
		[clampTargetWeight],
	)

	const handleSuggestionToggle = useCallback(
		(bean: SmartSuggestion, nextSelected: boolean) => {
			if (nextSelected) {
				setSelectedSuggestion(bean)
				if (bean.lastBrew?.yieldWeight) setTarget(bean.lastBrew.yieldWeight)
			} else {
				setSelectedSuggestion(null)
			}
		},
		[setTarget],
	)

	const startBrew = useCallback(async () => {
		if (!api) {
			toast.error('Configure your ESP IP first')
			return
		}

		if (!isTargetValid) {
			toast.error(`Target weight must be between 1 and ${maxShotWeight}g.`)
			return
		}

		try {
			const formData = new FormData()
			formData.append('weight', targetWeight.toString())
			await api.post('/start', formData)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to start brew:',
					error.response?.data?.message || error.message,
				)
				toast.error(error.response?.data?.error || 'Failed to start brew')
			}
		}
	}, [api, targetWeight, isTargetValid, maxShotWeight])

	const stopBrew = useCallback(async () => {
		if (!api) {
			toast.error('Configure your ESP IP first')
			return
		}

		try {
			await api.post('/stop')
			setIsBrewing(false)
		} catch (error) {
			console.error('Failed to stop brew')
		}
	}, [api])

	const wakeESP = useCallback(async () => {
		if (!api) {
			toast.error('Configure your ESP IP first')
			return
		}

		if (brewData.isActive) return
		setIsWaking(true)
		try {
			await api.post('/wake')
			toast.success('Waking up ESP...')
		} catch (error) {
			if (axios.isAxiosError(error)) {
				toast.error(
					`Failed to wake ESP: ${error.response?.data?.error || error.message}`,
				)
			}
		} finally {
			setIsWaking(false)
		}
	}, [api, brewData.isActive])

	const openEspModal = () => {
		setEspIpDraft(espIp ?? '')
		setHasDismissedEspPrompt(false)
		setShowEspPrompt(true)
	}

	const handleSaveEspIp = useCallback(async () => {
		const normalized = sanitizeIp(espIpDraft)
		if (!normalized) {
			toast.error('Enter a valid IP address or hostname.')
			return
		}

		setIsValidatingEsp(true)
		try {
			await verifyEspReachable(normalized)
			setEspIp(normalized)
			toast.success('ESP IP saved.')
			setHasDismissedEspPrompt(false)
			setShowEspPrompt(false)
		} catch (error) {
			toast.error('Unable to reach the ESP at that address.')
		} finally {
			setIsValidatingEsp(false)
		}
	}, [espIpDraft, setEspIp])

	const handleMaybeLater = () => {
		setHasDismissedEspPrompt(true)
		setShowEspPrompt(false)
	}

	const onBrewLogged = () => {
		setSelectedSuggestion(null)
		setBrewDraft(null)
		refreshSuggestions()
	}

	const saveQuickLog = async () => {
		if (!brewDraft) return
		try {
			await axios.post('/api/brews', brewDraft)
			toast.success('Shot saved')
			setIsQuickLogOpen(false)
			onBrewLogged()
		} catch (error) {
			console.error('Error saving brew:', error)
			toast.error('Failed to save shot')
		}
	}

	// Scale the dial to the space left above the controls
	const dialAreaRef = useRef<HTMLDivElement>(null)
	const [dialFit, setDialFit] = useState(1)
	useEffect(() => {
		const el = dialAreaRef.current
		if (!el) return
		const ro = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect
			setDialFit(Math.max(0.4, Math.min(width - 24, height - 12) / DIAL))
		})
		ro.observe(el)
		return () => ro.disconnect()
	}, [])

	const isDripping = brewData.state === BrewStates.DRIPPING
	// Phone size by default; on big screens the resting dial grows with the
	// space, leaving room for the 1.14x step while brewing
	const BREW_GROW = 1.14
	const restScale = Math.max(1, dialFit / BREW_GROW)
	const dialScale = Math.min(
		dialFit,
		isBrewing ? restScale * BREW_GROW : restScale,
	)

	// The bean being brewed, held through the drip so the layout doesn't shift
	const statusText = isBrewing ? (selectedSuggestion?.name ?? '') : ''

	const keyDisabled =
		!brewData.isScaleConnected || isDripping || (!isBrewing && !isTargetValid)

	return (
		<Page title='Autobru' fill>
			<header className='flex h-[52px] shrink-0 items-center justify-between pt-2 pr-2 pl-5'>
				<div className='flex items-center gap-2.5'>
					<StatusDot tone={status.tone} size={8} pulse={status.pulse} />
					<span className='lbl'>{status.label}</span>
				</div>
				<div className='flex items-center gap-1'>
					{isEspConfigured && isWsConnected && !brewData.isScaleConnected && (
						<button
							type='button'
							onClick={wakeESP}
							disabled={isWaking || brewData.isActive}
							className='skey lbl h-9 rounded-xl px-3.5 text-[11px] text-ink!'
						>
							{isWaking ? 'Waking…' : brewData.isActive ? 'Waking…' : 'Wake'}
						</button>
					)}
				</div>
			</header>

			{isEspConfigReady && !espIp && (
				<div className='mx-5 flex shrink-0 items-center justify-between gap-3 border-y border-line py-1.5'>
					<span className='text-[14px] text-ink-2'>
						Connect your Autobru to brew.
					</span>
					<div className='flex items-center'>
						<Link
							href='/settings'
							className='flex min-h-11 items-center px-2 text-[14px] font-semibold text-ink-2'
						>
							Settings
						</Link>
						<TextButton tone='accent' onClick={openEspModal}>
							Set up
						</TextButton>
					</div>
				</div>
			)}

			<div
				ref={dialAreaRef}
				className='flex min-h-0 flex-1 items-center justify-center'
			>
				<div
					style={{
						width: DIAL * dialScale,
						height: DIAL * dialScale,
						transition: 'width .35s ease, height .35s ease',
					}}
					className='flex items-center justify-center'
				>
					<Dial
						weight={displayWeight}
						target={targetWeight}
						time={displayTime / 1000}
						flow={isBrewing ? brewData.flowRate : null}
						showTarget={isBrewing}
						done={showCompletionAnimation}
						scale={dialScale}
					/>
				</div>
			</div>

			{!isBrewing && (
				<div className='shrink-0 px-5 animate-in fade-in slide-in-from-bottom-2 duration-300'>
					<div className='lbl text-[10px]'>Target yield</div>
					<div className='mt-1.5 flex items-center justify-between'>
						<button
							type='button'
							className='skey size-11 rounded-xl font-mono text-[15px] font-medium'
							onClick={() => setTarget(targetWeight / 2)}
							aria-label='Halve target weight'
						>
							½×
						</button>
						<button
							type='button'
							className='skey size-11 rounded-xl'
							onClick={() => setTarget(targetWeight - 1)}
							aria-label='Decrease target weight'
						>
							<MinusIcon />
						</button>
						<div className='flex items-baseline gap-1.5'>
							<input
								type='text'
								inputMode='decimal'
								aria-label='Target weight in grams'
								value={targetText ?? targetWeight.toFixed(1)}
								onChange={(e) => {
									setTargetText(e.target.value)
									const n = parseFloat(e.target.value)
									if (Number.isFinite(n) && n >= 1 && n <= maxShotWeight)
										setTargetWeight(n)
								}}
								onFocus={(e) => e.target.select()}
								onBlur={() => setTarget(targetWeight)}
								onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
								className='h-11 w-[86px] rounded-none border-0 border-b-2 border-line bg-transparent p-0 text-center font-mono text-[26px] font-medium text-ink outline-none focus:border-accent'
							/>
							<span className='font-mono text-[13px] font-medium text-ink-2'>
								g
							</span>
						</div>
						<button
							type='button'
							className='skey size-11 rounded-xl'
							onClick={() => setTarget(targetWeight + 1)}
							aria-label='Increase target weight'
						>
							<PlusIcon size={18} strokeWidth={2} />
						</button>
						<button
							type='button'
							className='skey size-11 rounded-xl font-mono text-[15px] font-medium'
							onClick={() => setTarget(targetWeight * 2)}
							aria-label='Double target weight'
						>
							2×
						</button>
					</div>

					{!isLiteMode && (
						<RecipeChips
							className='mt-4'
							selectedBeanId={selectedSuggestion?.id ?? null}
							onToggle={handleSuggestionToggle}
						/>
					)}
				</div>
			)}

			<div className='mx-5 mt-3.5 h-[70px] shrink-0'>
				<Key
					size='lg'
					tone={isBrewing ? 'ink' : 'accent'}
					onClick={isBrewing ? stopBrew : startBrew}
					disabled={keyDisabled}
				>
					{isBrewing ? <StopIcon /> : <PlayIcon />}
					<span>{isDripping ? 'Stopping' : isBrewing ? 'Stop' : 'Start'}</span>
				</Key>
			</div>

			<div
				className={cn(
					'flex shrink-0 items-center justify-center overflow-hidden transition-[height] duration-300',
					statusText ? 'h-[34px]' : 'h-3',
				)}
			>
				<span className='lbl truncate px-5'>{statusText}</span>
			</div>

			<QuickLogSheet
				open={isQuickLogOpen}
				beanName={selectedSuggestion?.name ?? ''}
				draft={brewDraft}
				onSkip={() => setIsQuickLogOpen(false)}
				onEdit={() => {
					setIsQuickLogOpen(false)
					setIsBrewFormOpen(true)
				}}
				onSave={saveQuickLog}
			/>

			<BrewForm
				afterShot
				isOpen={isBrewFormOpen}
				onClose={() => setIsBrewFormOpen(false)}
				initialData={brewDraft ?? undefined}
				onSuccess={onBrewLogged}
			/>

			<Sheet
				open={showEspPrompt}
				onClose={() => {
					if (!espIp) setHasDismissedEspPrompt(true)
					setShowEspPrompt(false)
				}}
				title='Connect your Autobru'
				description="Enter the device's IP address or hostname on your home network. It's on the Autobru display or in your router's client list."
				footer={
					<div className='flex items-center gap-3 pb-1.5'>
						<NeutralKey
							onClick={handleMaybeLater}
							className='text-[16px] tracking-normal normal-case'
						>
							Later
						</NeutralKey>
						<Key
							onClick={handleSaveEspIp}
							disabled={isValidatingEsp}
							className='flex-1'
						>
							{isValidatingEsp ? 'Checking…' : 'Connect'}
						</Key>
					</div>
				}
			>
				<form
					className='pt-2 pb-1'
					onSubmit={(e) => {
						e.preventDefault()
						void handleSaveEspIp()
					}}
				>
					<FormField label='Device address' htmlFor='dashboard-esp-ip'>
						<input
							id='dashboard-esp-ip'
							className='fin font-mono text-[19px] font-medium'
							value={espIpDraft}
							onChange={(e) => setEspIpDraft(e.target.value)}
							placeholder='192.168.1.42'
							autoComplete='off'
							autoCapitalize='off'
							spellCheck={false}
							inputMode='url'
						/>
					</FormField>
					<Hint>
						No need for http://. Used for the API and the live scale feed.
					</Hint>
				</form>
			</Sheet>
		</Page>
	)
}
