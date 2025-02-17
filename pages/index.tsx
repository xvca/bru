import Page from '@/components/page'
import Section from '@/components/section'
import React, { useState, useEffect, useRef } from 'react'
import CountUp from 'react-countup'
import { Play, Square, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@headlessui/react'
import axios from 'axios'

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
	const [isConnected, setIsConnected] = useState(false)
	const [isBrewing, setIsBrewing] = useState(false)
	const [brewData, setBrewData] = useState({
		weight: 0,
		flowRate: 0,
		time: 0,
		state: 0,
	})
	const [lastMessageTime, setLastMessageTime] = useState<number>(Date.now())

	const wsRef = useRef(ws)
	const isConnectedRef = useRef(isConnected)
	const lastMessageTimeRef = useRef(lastMessageTime)
	const brewDataRef = useRef(brewData)

	const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
	const ESPUrl = process.env.NEXT_PUBLIC_ESP_URL || 'http://localhost:8080'

	const defaultBrewData = {
		weight: 0,
		flowRate: 0,
		time: 0,
		state: 0,
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
	}, [brewData])

	// wake the ESP on page load
	useEffect(() => {
		wakeESP()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		localStorage.setItem('targetWeight', targetWeight.toString())
	}, [, targetWeight])

	useEffect(() => {
		let reconnectInterval: NodeJS.Timeout
		let messageCheckInterval: NodeJS.Timeout

		const connectWebSocket = () => {
			const websocket = new WebSocket(wsUrl)

			websocket.onopen = () => {
				setWs(websocket)
			}

			websocket.onclose = () => {
				setBrewData(defaultBrewData)
				setIsConnected(false)
				setWs(null)
			}

			websocket.onerror = () => {
				setBrewData(defaultBrewData)
				setIsConnected(false)
				websocket.close()
			}

			websocket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data)
					setLastMessageTime(Date.now())
					setBrewData(data)
					setIsConnected(true)
					if (brewDataRef.current.state == BrewStates.IDLE) {
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
			console.log('last message was at: ', lastMessageTimeRef.current)
			const now = Date.now()
			if (now - lastMessageTimeRef.current > 5000 && isConnectedRef.current) {
				setIsConnected(false)
				if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close()
			}
		}, 1000)

		// Setup reconnection interval
		reconnectInterval = setInterval(() => {
			if (wsRef.current === null) {
				connectWebSocket()
			}
		}, 1000) // Retry every second

		return () => {
			if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close()
			clearInterval(reconnectInterval)
			clearInterval(messageCheckInterval)
		}
	})

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
				// Handle specific error cases
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
		try {
			const { data } = await api.post('/wake')
			console.log('ESP now active: ', data)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to stop brew:',
					error.response?.data?.message || error.message,
				)
			}
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

	const WeightGauge = () => {
		const CIRCLE_RADIUS = 45
		const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS
		// If you want to show 75% of the circle, use 0.75
		const DESIRED_ARC_FRACTION = 0.6
		const VISIBLE_ARC = CIRCUMFERENCE * DESIRED_ARC_FRACTION
		const START_OFFSET = 162

		return (
			<svg className='w-full aspect-square' viewBox='0 0 100 100'>
				<circle
					className='stroke-gray-400'
					cx='52'
					cy='45'
					r={CIRCLE_RADIUS}
					strokeLinecap='round'
					fill='none'
					strokeWidth='2'
					strokeDasharray={`${VISIBLE_ARC} ${CIRCUMFERENCE}`}
					transform={`rotate(${START_OFFSET} 50 50)`} // Rotate to start at 12 o'clock
				/>
				<circle
					className={`${
						isBrewing ? 'stroke-blue-500' : 'stroke-gray-500'
					} transition-all duration-300 ease-in-out`}
					cx='52'
					cy='45'
					r={CIRCLE_RADIUS}
					strokeLinecap='round'
					fill='none'
					strokeWidth='2'
					strokeDasharray={`${VISIBLE_ARC} ${CIRCUMFERENCE}`}
					strokeDashoffset={Math.min(
						VISIBLE_ARC, // VISIBLE_ARC (maximum value)
						Math.max(
							0, // minimum value
							CIRCUMFERENCE *
								(DESIRED_ARC_FRACTION -
									(brewData.weight / targetWeight) * DESIRED_ARC_FRACTION),
						),
					)}
					transform={`rotate(${START_OFFSET} 50 50)`} // Rotate to start at 12 o'clock
				/>
			</svg>
		)
	}

	return (
		<Page>
			<div className='flex flex-col'>
				{/* Main content area */}
				<Section>
					<div className='mx-auto space-y-6 relative'>
						{/* Status Bar */}
						<div className='flex justify-between items-center'>
							<div className='flex items-center space-x-2'>
								<span
									className={`w-3 h-3 rounded-full ${
										isConnected ? 'bg-green-500' : 'bg-red-500'
									}`}
								/>
								<span className='text-sm text-gray-500'>
									{isConnected ? 'Connected' : 'Disconnected'}
								</span>
							</div>
							<span className='text-sm font-medium'>
								{isConnected && getBrewStateText(brewData.state)}
							</span>
						</div>

						{/* Circular Progress Container */}
						<div className='relative'>
							{/* Circular Progress Background */}
							<WeightGauge />

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
						className='relative w-full py-4 rounded-xl text-white dark:text-black font-medium
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
						<div
							className={`absolute inset-0 bg-black dark:bg-white`}
							style={{ zIndex: 1 }}
						/>
					</Button>
				</div>
			</div>
		</Page>
	)
}
