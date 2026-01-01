import Page from '@/components/Page'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import CountUp from 'react-countup'
import { Play, Square, ArrowUp, ArrowDown, Power } from 'lucide-react'
import axios, { AxiosInstance } from 'axios'
import { toast } from 'sonner'
import { Gauge } from '@/components/Gauge'
import { useWebSocket } from '@/lib/websocketContext'
import { useAuth } from '@/lib/authContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useEspConfig } from '@/lib/espConfigContext'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { SmartCarousel, type SmartSuggestion } from '@/components/SmartCarousel'
import { BrewFormData } from '@/lib/validators'
import { useBrewBar } from '@/lib/brewBarContext'
import BrewForm from '@/components/BrewFormModal'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { verifyEspReachable } from '@/utils/esp'

enum BrewStates {
	IDLE,
	PREINFUSION,
	BREWING,
	DRIPPING,
}

const sanitizeIp = (value: string) =>
	value
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')

export default function CoffeeBrewControl() {
	const [targetWeight, setTargetWeight] = useState(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('targetWeight')
			return saved ? parseFloat(saved) : 20
		}
		return 20
	})

	const [isWaking, setIsWaking] = useState(false)
	const [isBrewing, setIsBrewing] = useState(false)
	const [showGraph, setShowGraph] = useState(false)

	const { brewData, isWsConnected } = useWebSocket()
	const { espIp, setEspIp, isReady: isEspConfigReady } = useEspConfig()

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
	const [brewDraft, setBrewDraft] = useState<Partial<BrewFormData> | null>(null)

	const [displayData, setDisplayData] = useState({
		weight: 0,
		time: 0,
	})

	const [showEspPrompt, setShowEspPrompt] = useState(false)
	const [hasDismissedEspPrompt, setHasDismissedEspPrompt] = useState(false)
	const [espIpDraft, setEspIpDraft] = useState('')
	const [isValidatingEsp, setIsValidatingEsp] = useState(false)

	const latestShotRef = useRef(brewData)
	const previousStateRef = useRef(brewData.state)
	const { activeBarId } = useBrewBar()

	const { user } = useAuth()

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
		let animationFrameId: number

		const updateInterpolation = () => {
			const currentData = latestShotRef.current

			if (
				!isBrewing ||
				currentData.state === BrewStates.IDLE ||
				currentData.state === BrewStates.DRIPPING
			) {
				setDisplayData({
					weight: currentData.weight,
					time: currentData.time,
				})
				return
			}

			const now = Date.now()
			const timeSinceLastPacket = now - (currentData.lastUpdated || now)

			if (timeSinceLastPacket > 2000) {
				setDisplayData({
					weight: currentData.weight,
					time: currentData.time,
				})
				return
			}

			const predictedTime = currentData.time + timeSinceLastPacket

			const predictedWeight =
				currentData.weight + currentData.flowRate * (timeSinceLastPacket / 1000)

			setDisplayData({
				weight: predictedWeight,
				time: predictedTime,
			})

			animationFrameId = requestAnimationFrame(updateInterpolation)
		}

		updateInterpolation()

		return () => {
			if (animationFrameId) cancelAnimationFrame(animationFrameId)
		}
	}, [isBrewing])

	const getBrewStateText = (state: number) => {
		switch (state) {
			case BrewStates.IDLE:
				return 'Idle'
			case BrewStates.PREINFUSION:
				return 'Pre-infusion'
			case BrewStates.BREWING:
				return 'Brewing'
			case BrewStates.DRIPPING:
				return 'Dripping'
			default:
				return ''
		}
	}

	const getConnectionState = () => {
		if (!isEspConfigured) {
			return { label: 'ESP not configured', color: 'warning' }
		}

		if (!isWsConnected) return { label: 'Offline', color: 'destructive' }

		if (brewData.isScaleConnected)
			return { label: 'Connected', color: 'success' }

		if (brewData.isActive) return { label: 'Scanning...', color: 'warning' }

		return { label: 'Sleeping', color: 'secondary' }
	}

	const handleTargetChange = useCallback(
		(weight: number) => {
			const next = Number(weight.toFixed(1))

			setTargetWeight((prev) => (prev === next ? prev : next))

			if (targetWeight !== next) {
				toast.success(`Target set to ${next}g`)
			}
		},
		[targetWeight],
	)

	const handleSuggestionToggle = useCallback(
		(bean: SmartSuggestion, nextSelected: boolean) => {
			if (nextSelected) {
				setSelectedSuggestion(bean)
			} else {
				setSelectedSuggestion(null)
			}
		},
		[],
	)

	const isEspConfigured = Boolean(api)

	const connectionState = useMemo(getConnectionState, [
		brewData,
		isWsConnected,
		isEspConfigured,
	])

	const startBrew = useCallback(async () => {
		if (!api) {
			toast.error('Configure your ESP IP first')
			return
		}

		try {
			const formData = new FormData()
			formData.append('weight', targetWeight.toString())
			const { data } = await api.post('/start', formData)
			console.log('Brew started:', data)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to start brew:',
					error.response?.data?.message || error.message,
				)
				toast.error(error.response?.data?.error || 'Failed to start brew')
			}
		}
	}, [api, targetWeight])

	const stopBrew = useCallback(async () => {
		if (!api) {
			toast.error('Configure your ESP IP first')
			return
		}

		try {
			const { data } = await api.post('/stop')
			console.log('Brew stopped:', data)
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
			const { data } = await api.post('/wake')
			console.log('ESP now active: ', data)
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

	useEffect(() => {
		if (brewData.state !== BrewStates.IDLE) {
			latestShotRef.current = brewData
		}
	}, [brewData])

	useEffect(() => {
		const prevState = previousStateRef.current

		if (
			prevState === BrewStates.DRIPPING &&
			brewData.state === BrewStates.IDLE &&
			selectedSuggestion
		) {
			const snapshot = latestShotRef.current

			const lastProfile = selectedSuggestion.lastBrew

			const prefill: Partial<BrewFormData> = {
				beanId: selectedSuggestion.id,
				method: 'Espresso',
				doseWeight: lastProfile?.doseWeight ?? targetWeight / 2,
				yieldWeight: targetWeight,
				brewTime: snapshot.time ? Math.round(snapshot.time / 1000) : undefined,
				grindSize: lastProfile?.grindSize ?? undefined,
				waterTemperature: lastProfile?.waterTemperature ?? undefined,
				grinderId: lastProfile?.grinderId,
				brewerId: lastProfile?.brewerId,
				barId: activeBarId || undefined,
			}

			setBrewDraft(prefill)
			setIsBrewFormOpen(true)
		}

		previousStateRef.current = brewData.state
	}, [brewData.state, targetWeight, activeBarId, selectedSuggestion])

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

	return (
		<Page title='Autobru'>
			{isEspConfigReady && !espIp && (
				<div className='flex items-start justify-between gap-4 rounded-lg border border-dashed border-warning bg-warning/20 p-4 text-sm m-4'>
					<div>
						<p className='font-semibold'>Connect your Autobru ESP</p>
						<p className='mt-1 text-xs leading-relaxed opacity-90'>
							Enter the device IP to unlock live brewing controls. You can find
							the IP on the Autobru display or your router.
						</p>
					</div>
					<div className='flex flex-col gap-2 sm:flex-col sm:items-center'>
						<Button
							size='sm'
							variant='outline'
							onClick={openEspModal}
							className='w-full sm:w-auto'
						>
							Configure now
						</Button>
						<Link
							href='/settings'
							className='text-xs font-medium text-primary underline underline-offset-4'
						>
							Open ESP settings
						</Link>
					</div>
				</div>
			)}

			<div className='relative h-full grow flex flex-col justify-between p-6 pb-0 mb-28'>
				<div className='flex justify-between items-center rounded-lg z-10 mb-0'>
					<div className='flex items-center gap-2'>
						<div
							className={`w-2.5 h-2.5 rounded-full ${'bg-' + connectionState.color} animate-pulse`}
						/>
						<span className='text-sm font-medium text-muted-foreground'>
							{connectionState.label}
						</span>
					</div>

					{brewData.isScaleConnected ? (
						<Badge
							variant='outline'
							className='font-mono uppercase tracking-widest'
						>
							{getBrewStateText(brewData.state)}
						</Badge>
					) : (
						<Button
							onClick={wakeESP}
							disabled={isWaking || brewData.isActive}
							variant='outline'
							size='sm'
							className='h-8 px-4'
						>
							{isWaking ? (
								<Spinner className='mr-2 h-3 w-3' />
							) : (
								<Power className='mr-2 h-3 w-3' />
							)}
							Wake
						</Button>
					)}
				</div>

				<motion.div
					layout
					layoutId='gauge-wrapper'
					transition={{ type: 'spring', stiffness: 300, damping: 30 }}
					className='grow flex flex-col justify-center'
				>
					<motion.div layout className='relative w-full -mt-8'>
						<Gauge
							value={
								displayData.weight < 0
									? 0
									: (displayData.weight / targetWeight) * 100
							}
							min={0}
							max={100}
							arcSize={250}
							gaugePrimaryColor={
								isBrewing ? '#b54a35' : 'var(--muted-foreground)'
							}
							gaugePrimaryEndColor={isBrewing ? '#43694b' : ''}
							gaugeSecondaryColor='var(--secondary)'
							className='mx-auto max-w-[80vw] sm:max-w-md -mb-12'
						/>

						<div className='absolute inset-0 flex flex-col items-center justify-center pt-16 sm:pt-8'>
							<div className='flex flex-col items-center gap-1 mb-4'>
								<div className='text-3xl sm:text-4xl font-mono font-bold tabular-nums tracking-tighter text-muted-foreground'>
									{(displayData.time / 1000).toFixed(1)}s
								</div>

								<div className='text-5xl sm:text-7xl font-bold tabular-nums tracking-tighter leading-none'>
									{displayData.weight.toFixed(1)}g
								</div>

								{isBrewing && (
									<div className='h-8 text-xl font-medium tabular-nums text-muted-foreground'>
										<CountUp
											end={brewData.flowRate}
											decimals={1}
											duration={0.5}
											preserveValue={true}
											suffix=' g/s'
										/>
									</div>
								)}
							</div>

							{!isBrewing && (
								<div className='flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500'>
									<div className='flex items-center justify-center gap-4'>
										<Button
											onClick={() =>
												setTargetWeight((prev) => Math.max(prev - 1, 1))
											}
											variant='ghost'
											size='icon'
											className=''
										>
											<ArrowDown />
										</Button>

										<div className='flex-col justify-center'>
											<div className='text-2xl font-bold tabular-nums'>
												<div className='flex justify-center items-center gap-1'>
													<div className='w-20 flex justify-end'>
														<Input
															inputMode='decimal'
															type='number'
															min='1'
															max='100'
															value={targetWeight || ''}
															onChange={(e) => {
																let value =
																	e.target.value === ''
																		? 0
																		: parseFloat(e.target.value)
																if (value > 100) {
																	value = 100
																}
																setTargetWeight(value)
															}}
															onFocus={(e) => e.target.select()}
															className='h-auto w-20 border-none bg-transparent p-0 text-center text-3xl md:text-3xl font-bold shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
														/>
													</div>
												</div>
											</div>
											<div className='text-xs text-primary'>
												target weight (g)
											</div>
										</div>

										<Button
											onClick={() =>
												setTargetWeight((prev) => Math.min(prev + 1, 100))
											}
											variant='ghost'
											size='icon'
											className='rounded-full'
										>
											<ArrowUp size={48} />
										</Button>
									</div>

									<div className='flex gap-2 mt-2'>
										<Button
											size='sm'
											variant='outline'
											onClick={() =>
												setTargetWeight((prev) => Math.max(prev / 2, 1))
											}
											className='text-xs font-mono h-7 px-2.5'
										>
											½×
										</Button>
										<Button
											size='sm'
											variant='outline'
											onClick={() =>
												setTargetWeight((prev) => Math.min(prev * 2, 100))
											}
											className='text-xs font-mono h-7 px-2.5'
										>
											2×
										</Button>
									</div>
								</div>
							)}
						</div>
					</motion.div>
				</motion.div>

				<AnimatePresence mode='wait'>
					{user !== null && !isBrewing && (
						<SmartCarousel
							selectedBeanId={selectedSuggestion?.id ?? null}
							onBeanToggle={handleSuggestionToggle}
							onTargetRequest={handleTargetChange}
							className='mx-auto max-w-lg w-full'
						/>
					)}
				</AnimatePresence>
			</div>

			<div className='fixed bottom-4 left-0 right-0 p-6 flex justify-center z-50 pointer-events-none'>
				<Button
					onClick={isBrewing ? stopBrew : startBrew}
					disabled={!brewData.isScaleConnected}
					size='lg'
					variant={isBrewing ? 'destructive' : 'default'}
					className='w-9/10 rounded-full h-12 text-lg font-semibold pointer-events-auto transition-all active:scale-95 max-w-2xl'
				>
					{isBrewing ? (
						<>
							<Square className='mr-3 h-6 w-6 fill-current' />
							Stop Brew
						</>
					) : (
						<>
							<Play className='mr-3 h-6 w-6 fill-current' />
							Start Brew
						</>
					)}
				</Button>
			</div>

			<BrewForm
				isOpen={isBrewFormOpen}
				onClose={() => setIsBrewFormOpen(false)}
				barId={activeBarId ?? undefined}
				initialData={brewDraft ?? undefined}
				onSuccess={() => {
					setSelectedSuggestion(null)
					setBrewDraft(null)
				}}
			/>

			<Dialog
				open={showEspPrompt}
				onOpenChange={(open) => {
					if (!open && !espIp) {
						setHasDismissedEspPrompt(true)
					}
					setShowEspPrompt(open)
				}}
			>
				<DialogContent className='max-w-md space-y-6'>
					<DialogHeader>
						<DialogTitle>Connect to your Autobru ESP</DialogTitle>
						<DialogDescription>
							Enter the device IP address or hostname on your home network. You
							can find it on the Autobru display or your router’s client list.
						</DialogDescription>
					</DialogHeader>

					<div className='space-y-3'>
						<Label htmlFor='dashboard-esp-ip' className='text-sm font-medium'>
							Device IP address
						</Label>
						<Input
							id='dashboard-esp-ip'
							value={espIpDraft}
							onChange={(e) => setEspIpDraft(e.target.value)}
							placeholder='192.168.1.42'
							autoComplete='off'
						/>
						<p className='text-xs text-muted-foreground'>
							No need to include the &apos;http://&apos;. We’ll use this for
							both REST calls and live scale data.
						</p>
					</div>

					<DialogFooter className='flex flex-col gap-2 sm:flex-row mb-0'>
						<Button variant='ghost' onClick={handleMaybeLater}>
							Maybe later
						</Button>
						<Button onClick={handleSaveEspIp} disabled={isValidatingEsp}>
							{isValidatingEsp && <Spinner className='mr-2 h-4 w-4' />}
							{isValidatingEsp ? 'Checking…' : 'Save & connect'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Page>
	)
}
