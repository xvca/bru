import Page from '@/components/Page'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import CountUp from 'react-countup'
import {
	Play,
	Square,
	ArrowUp,
	ArrowDown,
	PowerIcon,
	LoaderCircle,
	Ghost,
} from 'lucide-react'
// import { Button } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { Gauge } from '@/components/Gauge'
import { useWebSocket } from '@/lib/websocketContext'

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

	// Use the WebSocket context instead of creating our own
	const { brewData, isConnected, isWsConnected } = useWebSocket()

	const ESPUrl =
		`http://${process.env.NEXT_PUBLIC_ESP_IP}` || 'http://localhost:8080'

	const api = axios.create({
		baseURL: ESPUrl,
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})

	useEffect(() => {
		// Store target weight in localStorage when it changes
		localStorage.setItem('targetWeight', targetWeight.toString())
	}, [targetWeight])

	useEffect(() => {
		// Update brewing state based on data from context
		if (brewData.state === BrewStates.IDLE) {
			setIsBrewing(false)
		} else {
			setIsBrewing(true)
		}

		if (isBrewing) {
			setTargetWeight(brewData.target)
		}
	}, [brewData])

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
				if (error.response?.status === 409) {
					console.error('A brew is already running')
				} else if (error.response?.status === 403) {
					console.error('Brewing is currently disabled')
				}
			}
		}
	}

	const stopBrew = async () => {
		try {
			const { data } = await api.post('/stop')
			console.log('Brew stopped:', data)
			setIsBrewing(false)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to stop brew:',
					error.response?.data?.message || error.message,
				)
			}
		}
	}

	const wakeESP = async () => {
		if (isConnected) return
		setIsWaking(true)
		try {
			const { data } = await api.post('/wake')
			console.log('ESP now active: ', data)
		} catch (error) {
			console.log(error)
			if (axios.isAxiosError(error)) {
				const message = String(
					`Failed to wake ESP:
            ${error.response?.data?.error || error.message}`,
				)
				console.error(message)
				toast.error(message, { duration: 1000 })
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

	const getConnectionStateText = () => {
		if (!isWsConnected && !isConnected) return 'Disconnected'
		if (isWsConnected && !isConnected) return 'ESP Connected'
		else return 'Connected'
	}

	return (
		<Page title='Autobru'>
			<Toaster position='top-center' toastOptions={{ duration: 2000 }} />
			<div className='flex flex-col'>
				{/* Main content area */}
				<Section>
					<div className='mx-auto space-y-6 relative'>
						{/* Status Bar */}
						<div className='flex justify-between items-center'>
							<div className='flex items-center space-x-2'>
								<span
									className={`w-3 h-3 rounded-full ${
										isConnected ? 'bg-success' : 'bg-destructive'
									}`}
								/>
								<span className='text-sm text-text-secondary'>
									{getConnectionStateText()}
								</span>
							</div>
							{isConnected ? (
								<span className='text-sm font-medium'>
									{isConnected && getBrewStateText(brewData.state)}
								</span>
							) : (
								<span className='text-sm'>
									<Button
										onClick={wakeESP}
										disabled={isConnected || isWaking}
										className='rounded-full'
										variant='ghost'
										size='sm'
									>
										{/* Button content */}
										<div className='relative z-10 flex items-center justify-center space-x-2'>
											{isWaking ? (
												<span className='animate-spin'>
													<LoaderCircle size={16} />{' '}
												</span>
											) : (
												<PowerIcon size={16} />
											)}
											<span>Wake</span>
										</div>
									</Button>
								</span>
							)}
						</div>

						{/* Circular Progress Container */}
						<div className='relative'>
							{/* Circular Progress Background */}
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
									isBrewing ? '#a64b45' : 'var(--color-input-border)'
								}
								gaugePrimaryEndColor={isBrewing ? '#43694b' : ''}
								gaugeSecondaryColor='var(--muted)'
							/>

							{/* Centered Content */}
							<div className='absolute inset-0 flex flex-col items-center justify-center gap-4'>
								{/* Timer */}
								<div className='text-4xl font-bold tabular-nums'>
									<CountUp
										end={brewData.time / 1000}
										decimals={1}
										duration={0.5}
										preserveValue={true}
										suffix={'s'}
										delay={100}
									/>
								</div>

								{/* Weight Display */}
								<div className='text-6xl font-bold tabular-nums'>
									<CountUp
										end={brewData.weight}
										decimals={1}
										duration={0.5}
										preserveValue={true}
										suffix={'g'}
									/>
								</div>

								{/* Flow Rate (only shown while brewing) */}
								{isBrewing && (
									<div className='text-2xl font-bold tabular-nums'>
										<CountUp
											end={brewData.flowRate}
											decimals={1}
											duration={0.5}
											preserveValue={true}
											suffix={'g/s'}
											delay={100}
										/>
									</div>
								)}

								{/* Target Weight Selector (only shown when not brewing) */}
								{!isBrewing && (
									<div className='flex justify-center items-center space-x-4'>
										<div className='flex justify-center items-center space-x-4'>
											<div>
												<Button
													onClick={() =>
														setTargetWeight((prev) => Math.max(prev - 1, 1))
													}
													variant='ghost'
													size='icon'
													className='rounded-full [&_svg]:size-6'
												>
													<ArrowDown />
												</Button>
											</div>
											<div className='w-24 text-center'>
												<div className='text-2xl font-bold tabular-nums'>
													<div className='flex justify-center items-center gap-1'>
														<div className='w-16 flex justify-end'>
															<input
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
																className='w-full bg-transparent focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
															/>
														</div>
													</div>
												</div>
												<div className='text-xs text-gray-500'>
													target weight (g)
												</div>
												<div className='flex justify-center gap-2 mt-2'>
													<Button
														size='sm'
														onClick={() =>
															setTargetWeight((prev) => Math.max(prev / 2, 1))
														}
														variant='outline'
													>
														½×
													</Button>
													<Button
														size='sm'
														onClick={() =>
															setTargetWeight((prev) => Math.min(prev * 2, 100))
														}
														variant='outline'
													>
														2×
													</Button>
												</div>
											</div>
											<Button
												onClick={() =>
													setTargetWeight((prev) => Math.min(prev + 1, 100))
												}
												size='icon'
												variant='ghost'
												className='rounded-full [&_svg]:size-6'
											>
												<ArrowUp />
											</Button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</Section>

				{/* Fixed bottom button */}
				<div className='fixed bottom-8 left-0 right-0 p-4 text-center'>
					<Button
						onClick={isBrewing ? stopBrew : startBrew}
						disabled={!isConnected}
						size='lg'
						className='w-[80%] rounded-full mx-auto'
					>
						{/* Button content */}
						<div className='relative z-10 flex items-center justify-center space-x-2'>
							{isBrewing ? (
								<>
									<Square size={24} />
									<span>Stop Brew</span>
								</>
							) : (
								<>
									<Play size={24} />
									<span>Start Brew</span>
								</>
							)}
						</div>

						{/* Base color */}
						<div className={`absolute inset-0 bg-text`} style={{ zIndex: 1 }} />
					</Button>
				</div>
			</div>
		</Page>
	)
}
