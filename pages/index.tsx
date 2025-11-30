import Page from '@/components/Page'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import CountUp from 'react-countup'
import { Play, Square, ArrowUp, ArrowDown, Power } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { Gauge } from '@/components/Gauge'
import { useWebSocket } from '@/lib/websocketContext'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

enum BrewStates {
	IDLE,
	PREINFUSION,
	BREWING,
	DRIPPING,
}

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

	const { brewData, isWsConnected } = useWebSocket()

	const ESPUrl =
		`http://${process.env.NEXT_PUBLIC_ESP_IP}` || 'http://localhost:8080'

	const api = axios.create({
		baseURL: ESPUrl,
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})

	useEffect(() => {
		localStorage.setItem('targetWeight', targetWeight.toString())
	}, [targetWeight])

	useEffect(() => {
		if (brewData.state === BrewStates.IDLE) {
			setIsBrewing(false)
		} else {
			setIsBrewing(true)
		}

		if (isBrewing) {
			setTargetWeight(brewData.target)
		}
	}, [brewData, isBrewing])

	const startBrew = async () => {
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
	}

	const stopBrew = async () => {
		try {
			const { data } = await api.post('/stop')
			console.log('Brew stopped:', data)
			setIsBrewing(false)
		} catch (error) {
			console.error('Failed to stop brew')
		}
	}

	const wakeESP = async () => {
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
	}

	const getBrewStateText = (state: number) => {
		switch (state) {
			case 0:
				return 'Ready'
			case 1:
				return 'Pre-infusion'
			case 2:
				return 'Brewing'
			case 3:
				return 'Dripping'
			default:
				return ''
		}
	}

	const getConnectionState = () => {
		// 1. ESP Offline (WebSocket down)
		if (!isWsConnected) return { label: 'Offline', color: 'destructive' }

		// 2. Scale Connected (We are good to go)
		// Note: We check this first. If we are connected, we don't care if 'isActive' is true/false.
		if (brewData.isScaleConnected) return { label: 'Ready', color: 'success' }

		// 3. ESP Online, Scale Missing, Scanning active
		if (brewData.isActive) return { label: 'Scanning...', color: 'warning' }

		// 4. ESP Online, Scale Missing, Not Scanning
		return { label: 'Sleeping', color: 'secondary' }
	}

	const connectionState = getConnectionState()

	return (
		<Page title='Autobru'>
			<div className='flex flex-col'>
				<Section>
					<div className='mx-auto space-y-8 relative'>
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

						<div className='relative'>
							<Gauge
								value={
									brewData.weight < 0
										? 0
										: (brewData.weight / targetWeight) * 100
								}
								min={0}
								max={100}
								arcSize={250}
								gaugePrimaryColor={
									isBrewing ? '#b54a35' : 'var(--muted-foreground)'
								} // var(--destructive) in hex
								gaugePrimaryEndColor={isBrewing ? '#43694b' : ''} // var(--success) in hex
								gaugeSecondaryColor='var(--secondary)'
								className='mx-auto max-w-[90vw] sm:max-w-[80vw] md:max-w-lg'
							/>

							<div className='absolute inset-0 flex flex-col items-center justify-center pt-4'>
								<div className='flex flex-col items-center gap-1 mb-4'>
									<div className='text-3xl sm:text-4xl font-mono font-bold tabular-nums tracking-tighter text-muted-foreground'>
										<CountUp
											end={brewData.time / 1000}
											decimals={1}
											duration={0.5}
											preserveValue={true}
											suffix='s'
										/>
									</div>

									<div className='text-5xl sm:text-7xl font-bold tabular-nums tracking-tighter leading-none'>
										<CountUp
											end={brewData.weight}
											decimals={1}
											duration={0.5}
											preserveValue={true}
											suffix='g'
										/>
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
														<div className='w-16 flex justify-end'>
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
																className='h-auto w-16 border-none bg-transparent p-0 text-center text-3xl md:text-3xl font-bold shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
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
													setTargetWeight((prev) =>
														Math.max(Math.floor(prev / 2), 1),
													)
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
						</div>
					</div>
				</Section>

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
			</div>
		</Page>
	)
}
