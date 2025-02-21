import Page from '@/components/Page'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Switch, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Loader2, RefreshCw, CircleX } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

enum PreinfusionMode {
	SIMPLE = 0,
	WEIGHT_TRIGGERED = 1,
}

interface BrewPrefs {
	isEnabled: boolean
	preset1: number
	preset2: number
	pMode: PreinfusionMode
}

interface Shot {
	targetWeight: number
	finalWeight: number
	lastFlowRate: number
}

interface ShotData {
	shots: Shot[]
	flowCompFactor: number
}

const BrewSettings = () => {
	const [prefs, setPrefs] = useState<BrewPrefs>({
		isEnabled: true,
		preset1: 20,
		preset2: 36,
		pMode: PreinfusionMode.SIMPLE,
	})
	const [pendingPrefs, setPendingPrefs] = useState<BrewPrefs>({
		isEnabled: true,
		preset1: 20,
		preset2: 36,
		pMode: PreinfusionMode.SIMPLE,
	})
	const [isSaving, setIsSaving] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false)
	const [isViewDataOpen, setIsViewDataOpen] = useState(false)
	const [shotData, setShotData] = useState<ShotData | null>(null)
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [isRecalcSpinning, setIsSpinning] = useState(false)

	const [modalData, setModalData] = useState<{
		isOpen: boolean
		shotIndex: number | null
		title: string
		description: string
	}>({
		isOpen: false,
		shotIndex: null,
		title: '',
		description: '',
	})

	const ESPUrl = process.env.NEXT_PUBLIC_ESP_URL || 'http://localhost:8080'

	const api = axios.create({
		baseURL: ESPUrl,
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})

	const getPrefs = async () => {
		try {
			const { data } = await api.get('/prefs', { timeout: 5000 })
			setPrefs(data)
			setPendingPrefs(data)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to get preferences:',
					error.response?.data?.message || error.message,
				)
			}
		} finally {
			setIsLoading(false)
		}
	}

	const savePrefs = async () => {
		setIsSaving(true)
		try {
			const formData = new FormData()

			formData.append('isEnabled', pendingPrefs.isEnabled.toString())
			formData.append('preset1', pendingPrefs.preset1.toString())
			formData.append('preset2', pendingPrefs.preset2.toString())
			formData.append('pMode', pendingPrefs.pMode.toString())

			const { data } = await api.post('/prefs', formData)
			setPrefs(pendingPrefs)
			toast.success('Settings saved successfully')
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to update preferences:',
					error.response?.data?.message || error.message,
				)
			}
			toast.error('Failed to save settings')
		} finally {
			setIsSaving(false)
		}
	}

	const fetchShotData = async () => {
		setIsLoadingData(true)
		try {
			const { data } = await api.get<ShotData>('/data', { timeout: 5000 })
			setShotData(data)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to fetch shot data:',
					error.response?.data?.message || error.message,
				)
				toast.error('Failed to fetch shot data')
			}
		} finally {
			setIsLoadingData(false)
		}
	}

	const clearShotData = async () => {
		const index = modalData.shotIndex

		try {
			if (index === null) {
				const { data } = await api.post('/clear-data')

				console.log('clearing data: ', data)
			} else {
				const formData = new FormData()
				formData.append('index', index.toString())

				const { data } = await api.post('/clear-shot', formData)

				console.log('Deleted shot at index', data)
			}

			await fetchShotData()
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					`Failed to clear shot data at index ${index}:`,
					error.response?.data?.message || error.message,
				)
			}
		}
	}

	const recalcFlowComp = async () => {
		try {
			const { data } = await api.post('/recalc-comp-factor')

			console.log('recalculated flow comp factor', data)

			await fetchShotData()
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					`Failed to recalculate flow comp factor`,
					error.response?.data?.message || error.message,
				)
			}
		}
	}

	const handleRecalcClick = () => {
		setIsSpinning(true)
		recalcFlowComp()
		setTimeout(() => setIsSpinning(false), 1000)
	}

	const handleViewData = async () => {
		setIsViewDataOpen(true)
		await fetchShotData()
	}

	useEffect(() => {
		getPrefs()
	}, [])

	const hasChanges = JSON.stringify(prefs) !== JSON.stringify(pendingPrefs)

	if (isLoading) {
		return (
			<Page>
				<Section>
					<div className='flex justify-center items-center min-h-[200px]'>
						<Loader2 className='w-8 h-8 animate-spin' />
					</div>
				</Section>
			</Page>
		)
	}

	return (
		<Page>
			<Toaster position='top-center' />
			<Section>
				<div className='space-y-6'>
					<h2 className='text-xl font-semibold'>Settings</h2>

					{/* Device Enable Toggle */}
					<div className='flex items-center justify-between'>
						<label className='font-medium'>Enable Device</label>
						<Switch
							checked={pendingPrefs.isEnabled}
							onChange={(checked) =>
								setPendingPrefs({ ...pendingPrefs, isEnabled: checked })
							}
							className={`group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-[checked]:bg-blue-600`}
						>
							<span
								className={`${
									pendingPrefs.isEnabled ? 'translate-x-6' : 'translate-x-1'
								} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
							/>
						</Switch>
					</div>

					{/* Preinfusion Mode Toggle */}
					<div className='flex items-center justify-between'>
						<label className='font-medium'>Weight-Triggered Preinfusion</label>
						<Switch
							checked={pendingPrefs.pMode === PreinfusionMode.WEIGHT_TRIGGERED}
							onChange={(checked) =>
								setPendingPrefs({
									...pendingPrefs,
									pMode: checked
										? PreinfusionMode.WEIGHT_TRIGGERED
										: PreinfusionMode.SIMPLE,
								})
							}
							className={`group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-[checked]:bg-blue-600`}
						>
							<span
								className={`${
									pendingPrefs.pMode === PreinfusionMode.WEIGHT_TRIGGERED
										? 'translate-x-6'
										: 'translate-x-1'
								} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
							/>
						</Switch>
					</div>

					{/* Weight Presets */}
					<div className='space-y-4'>
						<div>
							<label className='block font-medium mb-1'>
								Manual Brew Preset
							</label>
							<div className='text-2xl font-bold tabular-nums'>
								<input
									inputMode='decimal'
									type='number'
									min='1'
									max='100'
									step='0.1'
									value={pendingPrefs.preset1 || ''}
									onChange={(e) => {
										let value =
											e.target.value === '' ? 0 : parseFloat(e.target.value)
										if (value > 100) value = 100
										setPendingPrefs({ ...pendingPrefs, preset1: value })
									}}
									onFocus={(e) => e.target.select()}
									className='w-16 text-right bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
								g
							</div>
						</div>

						<div>
							<label className='block font-medium mb-1'>One Cup Preset</label>
							<div className='text-2xl font-bold tabular-nums'>
								<input
									inputMode='decimal'
									type='number'
									min='1'
									max='100'
									step='0.1'
									value={pendingPrefs.preset2 || ''}
									onChange={(e) => {
										let value =
											e.target.value === '' ? 0 : parseFloat(e.target.value)
										if (value > 100) value = 100
										setPendingPrefs({ ...pendingPrefs, preset2: value })
									}}
									onFocus={(e) => e.target.select()}
									className='w-16 text-right bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
								g
							</div>
						</div>
					</div>
				</div>
			</Section>

			{/* View Data Modal */}
			<Dialog
				open={isViewDataOpen}
				onClose={() => setIsViewDataOpen(false)}
				className='relative z-50'
			>
				<div className='fixed inset-0 bg-black/30' aria-hidden='true' />

				<div className='fixed inset-0 flex items-center justify-center p-4'>
					<DialogPanel className='mx-auto max-w-2xl w-full rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-xl motion-safe:animate-[popIn_0.2s_ease-out]'>
						<DialogTitle className='text-lg font-medium leading-6 flex justify-between items-center'>
							<span>Shot Data</span>
							<button
								onClick={() => setIsViewDataOpen(false)}
								className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
							>
								<span className='sr-only'>Close</span>×
							</button>
						</DialogTitle>

						<div className='mt-4'>
							{isLoadingData ? (
								<div className='flex justify-center py-8'>
									<Loader2 className='w-8 h-8 animate-spin' />
								</div>
							) : shotData ? (
								<div className='space-y-4'>
									<div className='text-sm text-gray-500 dark:text-gray-400 flex align-middle gap-2'>
										<span>
											Flow Compensation Factor:{' '}
											{shotData.flowCompFactor.toFixed(3)}
										</span>
										<button onClick={handleRecalcClick}>
											<RefreshCw
												size={14}
												className={`${isRecalcSpinning ? 'animate-spin' : ''}`}
											/>
										</button>
									</div>

									{shotData.shots.some((shot) => shot.targetWeight > 0) ? (
										<div>
											<div className='space-y-4'>
												<div className='grid grid-cols-4 gap-4 font-medium text-sm text-gray-500 dark:text-gray-400'>
													<div>Target Weight</div>
													<div>Final Weight</div>
													<div>Last Flow Rate</div>
													<div></div>
												</div>
												{shotData.shots
													.filter((shot) => shot.targetWeight > 0)
													.map((shot, index: number) => (
														<div
															key={index}
															className='grid grid-cols-4 gap-4 text-sm'
														>
															<div>{shot.targetWeight.toFixed(1)}g</div>
															<div>{shot.finalWeight.toFixed(1)}g</div>
															<div>{shot.lastFlowRate.toFixed(1)}g/s</div>
															<button
																onClick={() =>
																	setModalData({
																		isOpen: true,
																		shotIndex: index,
																		description: `Are you sure you want to delete shot #${index + 1}? This action cannot be undone.`,
																		title: `Delete Shot #${index + 1}?`,
																	})
																}
															>
																<CircleX size={14} />
															</button>
														</div>
													))}
											</div>
										</div>
									) : (
										<div className='text-center py-8 text-gray-500 dark:text-gray-400'>
											No shot data available
										</div>
									)}
								</div>
							) : (
								<div className='text-center py-8 text-red-500'>
									Failed to load shot data
								</div>
							)}
						</div>

						<div className='mt-6 flex justify-around gap-2'>
							{/* Clear shot data button */}
							<button
								onClick={() =>
									setModalData({
										isOpen: true,
										shotIndex: null,
										description: `Are you sure you want to clear all shot data? This action cannot be undone.`,
										title: `Clear shot data?`,
									})
								}
								className='px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300
                            hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md'
							>
								Clear shot data
							</button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>

			{/* Clear single shot Confirmation Modal */}
			<ConfirmModal
				open={modalData.isOpen}
				onClose={() =>
					setModalData((prev) => ({
						...prev,
						isOpen: false,
						shotIndex: null,
					}))
				}
				onConfirm={() => {
					clearShotData()
				}}
				description={modalData.description}
				title={modalData.title}
			/>

			{/* View Shot Data button */}
			<div className='fixed bottom-8 left-0 right-0 p-4 flex flex-col gap-4'>
				<button
					onClick={handleViewData}
					className='w-full py-2 px-4 bg-transparent text-black dark:text-white rounded-lg font-medium flex items-center justify-center gap-2'
				>
					View Shot Data
				</button>

				{/* Save Button */}
				<button
					onClick={savePrefs}
					disabled={!hasChanges || isSaving}
					className='w-full py-2 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:bg-white-600 active:bg-white-700
              flex items-center justify-center gap-2'
				>
					{isSaving && <Loader2 className='w-4 h-4 animate-spin' />}
					Save
				</button>
			</div>
		</Page>
	)
}

export default BrewSettings
