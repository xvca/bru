import Page from '@/components/Page'
import Section from '@/components/Section'
import React, { useState, useEffect, useRef } from 'react'
import CountUp from 'react-countup'
import {
	Play,
	Square,
	ArrowUp,
	ArrowDown,
	PowerIcon,
	LoaderCircle,
} from 'lucide-react'
import { Button } from '@headlessui/react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { Gauge } from '@/components/Gauge'

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
	const [ws, setWs] = useState<WebSocket | null>(null)
	const [isWaking, setIsWaking] = useState(false)
	const [isConnected, setIsConnected] = useState(false)
	const [isBrewing, setIsBrewing] = useState(false)
	const [brewData, setBrewData] = useState({
		weight: 0,
		flowRate: 0,
		time: 0,
		state: 0,
		target: 0,
	})
	const [lastMessageTime, setLastMessageTime] = useState<number>(Date.now())

	const wsRef = useRef(ws)
	const isConnectedRef = useRef(isConnected)
	const lastMessageTimeRef = useRef(lastMessageTime)
	const brewDataRef = useRef(brewData)

	const wsUrl =
		`ws://${process.env.NEXT_PUBLIC_ESP_IP}/ws` || 'ws://localhost:8080'
	const ESPUrl =
		`http://${process.env.NEXT_PUBLIC_ESP_IP}` || 'http://localhost:8080'

	const defaultBrewData = {
		weight: 0,
		flowRate: 0,
		time: 0,
		state: 0,
		target: 0,
	}

	const api = axios.create({
		baseURL: ESPUrl,
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})

	useEffect(() => {
		wsRef.current = ws
	}, [ws])
	useEffect(() => {
		isConnectedRef.current = isConnected
	}, [isConnected])
	useEffect(() => {
		lastMessageTimeRef.current = lastMessageTime
	}, [lastMessageTime])
	useEffect(() => {
		brewDataRef.current = brewData

		if (isBrewing) {
			setTargetWeight(brewData.target)
		}
	}, [brewData])

	useEffect(() => {
		localStorage.setItem('targetWeight', targetWeight.toString())
	}, [, targetWeight])

	useEffect(() => {
		let ws: WebSocket | null = null
		let reconnectTimeout: NodeJS.Timeout
		let messageCheckInterval: NodeJS.Timeout
		let isReconnecting = false

		const connect = () => {
			// Only try to connect if we're not already connecting and don't have an active connection
			if (isReconnecting || (ws && ws.readyState === WebSocket.OPEN)) {
				return
			}

			isReconnecting = true

			if (ws) {
				ws.close()
			}

			ws = new WebSocket(wsUrl)

			ws.onopen = () => {
				console.log('ws opened')
				setWs(ws)
				isReconnecting = false
			}

			ws.onclose = () => {
				console.log('ws closed')
				setBrewData(defaultBrewData)
				setIsConnected(false)
				setWs(null)
				isReconnecting = false

				// Schedule a reconnection
				reconnectTimeout = setTimeout(() => {
					connect()
				}, 1000)
			}

			ws.onerror = () => {
				console.log('ws error')
				setBrewData(defaultBrewData)
				setIsConnected(false)
				ws?.close()
				isReconnecting = false
			}

			ws.onmessage = (event) => {
				try {
					console.log('ws message received')
					const data = JSON.parse(event.data)
					setLastMessageTime(Date.now())
					setBrewData(data)
					setIsConnected(true)
					if (data.state === BrewStates.IDLE) {
						setIsBrewing(false)
					} else {
						setIsBrewing(true)
					}
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error)
				}
			}
		}

		// Check for stale connection
		messageCheckInterval = setInterval(() => {
			const now = Date.now()
			if (
				now - lastMessageTimeRef.current > 60 * 1000 &&
				isConnectedRef.current
			) {
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.close()
				}
			}
		}, 5000)

		connect()

		return () => {
			if (ws) {
				ws.close()
			}
			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout)
			}
			if (messageCheckInterval) {
				clearInterval(messageCheckInterval)
			}
			isReconnecting = false
		}
	}, [])

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
			if (axios.isAxiosError(error)) {
				const message = String(
					`Failed to wake ESP:
						${error.response?.data?.message || error.message}`,
				)
				console.error(message)
				toast.error(message)
			}
		} finally {
			setIsWaking(false)
		}
	}

	console.log()
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

	return (
		<Page title='Autobru'>
			<Toaster position='top-center' />
			<div className='flex flex-col'>
				{/* Main content area */}
				<Section>
					<div className='mx-auto space-y-6 relative'>
						{/* Status Bar */}
						<div className='flex justify-between items-center'>
							<div className='flex items-center space-x-2'>
								<span
									className={`w-3 h-3 rounded-full ${
										isConnected ? 'bg-success' : 'bg-error'
									}`}
								/>
								<span className='text-sm text-text-secondary'>
									{isConnected ? 'Connected' : 'Disconnected'}
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
										className='relative w-full py-1 px-2 border border-border rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary hover:bg-border transition-colors duration-200 flex items-center justify-center'
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
								gaugeSecondaryColor='var(--color-gauge-secondary)'
							/>

							{/* Centered Content */}
							<div className='absolute inset-0 flex flex-col items-center justify-center gap-4'>
								{/* Timer */}
								<div className='text-4xl font-bold tabular-nums'>
									<CountUp
										end={brewData.time / 1000}
										decimals={1}
										duration={2}
										preserveValue={true}
										suffix={'s'}
									/>
								</div>

								{/* Weight Display */}
								<div className='text-6xl font-bold tabular-nums'>
									<CountUp
										end={brewData.weight}
										decimals={1}
										duration={2}
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
											duration={2}
											preserveValue={true}
											suffix={'g/s'}
										/>
									</div>
								)}

								{/* Target Weight Selector (only shown when not brewing) */}
								{!isBrewing && (
									<div className='flex justify-center items-center space-x-4'>
										<div className='flex justify-center items-center space-x-4'>
											<div>
												<button
													onClick={() =>
														setTargetWeight((prev) => Math.max(prev - 1, 1))
													}
													className='p-2 rounded-full z-10'
												>
													<ArrowDown size={24} />
												</button>
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
											</div>
											<button
												onClick={() =>
													setTargetWeight((prev) => Math.min(prev + 1, 100))
												}
												className='p-2 rounded-full'
											>
												<ArrowUp size={24} />
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</Section>

				{/* Fixed bottom button */}
				<div className='fixed bottom-8 left-0 right-0 p-4'>
					<Button
						onClick={isBrewing ? stopBrew : startBrew}
						disabled={!isConnected}
						className='relative w-full py-4 rounded-xl text-background font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center overflow-hidden'
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
