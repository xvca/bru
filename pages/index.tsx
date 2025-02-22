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
	const [wsConnected, setWsConnected] = useState(false) // tracks only ws connection
	const [isConnected, setIsConnected] = useState(false) // tracks full system (WS + BLE)
	const [isBrewing, setIsBrewing] = useState(false)
	const [brewData, setBrewData] = useState({
		weight: 0,
		flowRate: 0,
		time: 0,
		state: 0,
		target: 0,
	})
	const [lastScaleMessageTime, setLastScaleMessageTime] = useState<number>(
		Date.now(),
	)

	const wsRef = useRef(ws)
	const isConnectedRef = useRef(isConnected)
	const lastScaleMessageTimeRef = useRef(lastScaleMessageTime)
	const brewDataRef = useRef(brewData)
	const isReconnecting = useRef(false)

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
		lastScaleMessageTimeRef.current = lastScaleMessageTime
	}, [lastScaleMessageTime])
	useEffect(() => {
		brewDataRef.current = brewData

		if (isBrewing) {
			setTargetWeight(brewData.target)
		}
	}, [brewData])

	useEffect(() => {
		localStorage.setItem('targetWeight', targetWeight.toString())
	}, [, targetWeight])

	const parseWsMessage = (buffer: ArrayBuffer) => {
		const view = new DataView(buffer)
		let offset = 0

		try {
			const weight = view.getFloat32(offset, true)
			offset += 4

			const flowRate = view.getFloat32(offset, true)
			offset += 4

			const target = view.getFloat32(offset, true)
			offset += 4

			const time = view.getUint32(offset, true)
			offset += 4

			const state = view.getUint8(offset)
			offset += 1

			setBrewData({ weight, flowRate, target, time, state })
		} catch (e) {
			console.error('Error parsing binary metrics:', e)
			throw e
		}
	}

	useEffect(() => {
		let ws: WebSocket | null = null
		let reconnectTimeout: NodeJS.Timeout
		let pingTimeout: NodeJS.Timeout
		let pingInterval: NodeJS.Timeout

		const connect = () => {
			if (
				isReconnecting.current ||
				(ws && ws.readyState === WebSocket.CONNECTING)
			) {
				console.log('Connection attempt already in progress')
				return
			}

			if (ws && ws.readyState === WebSocket.OPEN) {
				console.log('Already connected')
				return
			}

			isReconnecting.current = true
			console.log('Starting connection attempt')

			if (ws) {
				ws.close()
				clearInterval(pingInterval)
				clearInterval(pingTimeout)
			}

			try {
				ws = new WebSocket(wsUrl)
				ws.binaryType = 'arraybuffer'

				const heartbeat = () => {
					clearTimeout(pingTimeout)

					pingTimeout = setTimeout(() => {
						console.log('Ping timeout - closing connection')
						if (ws?.readyState === WebSocket.OPEN) {
							ws?.close()
						}
						isReconnecting.current = false
					}, 5000)
				}

				ws.onopen = () => {
					console.log('ws connected')
					setWs(ws)
					setWsConnected(true)
					isReconnecting.current = false

					// Start ping interval
					pingInterval = setInterval(() => {
						if (ws?.readyState === WebSocket.OPEN) {
							console.log('sending ping')
							ws.send('ping')
							heartbeat()
						}
						if (lastScaleMessageTimeRef.current + 5000 < Date.now()) {
							setIsConnected(false)
						}
					}, 10000)
				}

				ws.onclose = (event) => {
					console.log('ws disconnected:', event.code, event.reason)
					clearInterval(pingTimeout)

					setWsConnected(false)
					setIsConnected(false)

					setBrewData(defaultBrewData)
					setWs(null)

					if (!isReconnecting.current) {
						isReconnecting.current = false
						reconnectTimeout = setTimeout(() => {
							connect()
						}, 1000)
					}
				}

				ws.onerror = (error) => {
					console.log('ws error: ', error)
					setWsConnected(false)
					setIsConnected(false)
					setBrewData(defaultBrewData)

					if (ws?.readyState === WebSocket.OPEN) {
						ws?.close()
					}
					isReconnecting.current = false
				}

				ws.onmessage = (event) => {
					try {
						if (typeof event.data === 'string' && event.data === 'pong') {
							console.log('Pong received')
							clearTimeout(pingTimeout)
							return
						}

						if (event.data instanceof ArrayBuffer) {
							parseWsMessage(event.data)
							if (!isConnected) setIsConnected(true)
						}

						setLastScaleMessageTime(Date.now())

						if (brewData.state === BrewStates.IDLE) {
							setIsBrewing(false)
						} else {
							setIsBrewing(true)
						}
					} catch (error) {
						console.error('Failed to parse WebSocket message:', error)
					}
				}
			} catch (error) {
				console.error('Error creating ws:', error)
				isReconnecting.current = false
			}
		}

		connect()

		return () => {
			isReconnecting.current = false
			clearInterval(pingInterval)
			clearTimeout(pingTimeout)
			clearTimeout(reconnectTimeout)
			if (ws) {
				ws.close()
			}
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
		if (!wsConnected && !isConnected) return 'Disconnected'
		if (wsConnected && !isConnected) return 'ESP Connected'
		else return 'Connected'
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
