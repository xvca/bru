import Page from '@/components/Page'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Switch, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Loader2, RefreshCw, CircleX, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

const TIMEZONES = [
	{ label: 'UTC (GMT)', value: 'GMT0' },
	{ label: 'New York (EST/EDT)', value: 'EST5EDT,M3.2.0,M11.1.0' },
	{ label: 'Chicago (CST/CDT)', value: 'CST6CDT,M3.2.0,M11.1.0' },
	{ label: 'Denver (MST/MDT)', value: 'MST7MDT,M3.2.0,M11.1.0' },
	{ label: 'Los Angeles (PST/PDT)', value: 'PST8PDT,M3.2.0,M11.1.0' },
	{ label: 'London (GMT/BST)', value: 'GMT0BST,M3.5.0/1,M10.5.0' },
	{ label: 'Paris/Berlin (CET)', value: 'CET-1CEST,M3.5.0,M10.5.0/3' },
	{ label: 'Tokyo (JST)', value: 'JST-9' },
	{ label: 'Sydney (AEST)', value: 'AEST-10AEDT,M10.1.0,M4.1.0/3' },
]

enum PreinfusionMode {
	SIMPLE = 0,
	WEIGHT_TRIGGERED = 1,
}

interface BrewPrefs {
	isEnabled: boolean
	regularPreset: number
	decafPreset: number
	pMode: PreinfusionMode
	decafStartHour: number
	timezone: string
}

interface Shot {
	id: number
	targetWeight: number
	finalWeight: number
	lastFlowRate: number
}

interface ProfileData {
	factor: number
	shots: Shot[]
}

interface ShotDataResponse {
	p0: ProfileData
	p1: ProfileData
}

interface MergedShotData {
	shots: Shot[]
	factorP0: number
	factorP1: number
}

export default function ESPSettings() {
	const initialPrefs: BrewPrefs = {
		isEnabled: true,
		regularPreset: 40,
		decafPreset: 40,
		pMode: PreinfusionMode.SIMPLE,
		decafStartHour: -1,
		timezone: 'GMT0',
	}

	const [prefs, setPrefs] = useState<BrewPrefs>(initialPrefs)
	const [pendingPrefs, setPendingPrefs] = useState<BrewPrefs>(initialPrefs)
	const [isSaving, setIsSaving] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	// Data Viewing State
	const [isViewDataOpen, setIsViewDataOpen] = useState(false)
	const [shotData, setShotData] = useState<MergedShotData | null>(null)
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [isRecalcSpinning, setIsSpinning] = useState(false)

	const [modalData, setModalData] = useState<{
		isOpen: boolean
		shotId: number | null
		title: string
		description: string
	}>({
		isOpen: false,
		shotId: null,
		title: '',
		description: '',
	})

	const ESPUrl =
		`http://${process.env.NEXT_PUBLIC_ESP_IP}` || 'http://localhost:8080'

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
			toast.error('Failed to fetch esp settings')
		} finally {
			setIsLoading(false)
		}
	}

	const savePrefs = async () => {
		setIsSaving(true)
		try {
			const formData = new FormData()

			formData.append('isEnabled', pendingPrefs.isEnabled.toString())
			formData.append('regularPreset', pendingPrefs.regularPreset.toString())
			formData.append('decafPreset', pendingPrefs.decafPreset.toString())
			formData.append('pMode', pendingPrefs.pMode.toString())
			formData.append('decafStartHour', pendingPrefs.decafStartHour.toString())
			formData.append('timezone', pendingPrefs.timezone)

			await api.post('/prefs', formData)
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
			const { data } = await api.get<ShotDataResponse>('/data', {
				timeout: 5000,
			})

			console.log(data)

			const allShots = [...data.p0.shots, ...data.p1.shots]
			allShots.sort((a, b) => b.id - a.id)

			setShotData({
				shots: allShots,
				factorP0: data.p0.factor,
				factorP1: data.p1.factor,
			})
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error('Failed to fetch shot data')
				toast.error('Failed to fetch shot data')
			}
		} finally {
			setIsLoadingData(false)
		}
	}

	const clearShotData = async () => {
		const id = modalData.shotId

		try {
			if (id === null) {
				await api.post('/clear-data')
				toast.success('All data cleared')
			} else {
				const formData = new FormData()
				formData.append('id', id.toString())

				await api.post('/clear-shot', formData)
				toast.success(`Shot #${id} deleted`)
			}

			await fetchShotData()
		} catch (error) {
			toast.error('Failed to delete data')
		}
	}

	const recalcFlowComp = async () => {
		try {
			await api.post('/recalc-comp-factor')
			toast.success('Factors recalculated')
			await fetchShotData()
		} catch (error) {
			toast.error('Failed to recalculate')
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
		<>
			<Toaster position='top-center' />
			<Section>
				<div className='space-y-6'>
					<div className='flex items-center justify-between'>
						<label className='font-medium'>Enable Device</label>
						<Switch
							checked={pendingPrefs.isEnabled}
							onChange={(checked) =>
								setPendingPrefs({ ...pendingPrefs, isEnabled: checked })
							}
							className={`group inline-flex h-6 w-11 items-center rounded-full bg-text-secondary transition data-[checked]:bg-primary-light`}
						>
							<span
								className={`${
									pendingPrefs.isEnabled ? 'translate-x-6' : 'translate-x-1'
								} inline-block h-4 w-4 transform rounded-full bg-background transition-transform`}
							/>
						</Switch>
					</div>

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
							className={`group inline-flex h-6 w-11 items-center rounded-full bg-text-secondary transition data-[checked]:bg-primary-light`}
						>
							<span
								className={`${
									pendingPrefs.pMode === PreinfusionMode.WEIGHT_TRIGGERED
										? 'translate-x-6'
										: 'translate-x-1'
								} inline-block h-4 w-4 transform rounded-full bg-background transition-transform`}
							/>
						</Switch>
					</div>

					<hr className='border-input-border' />

					<div className='space-y-4'>
						<div className='flex justify-between items-center'>
							<label className='block font-medium'>Regular Preset</label>
							<div className='text-2xl font-bold tabular-nums flex items-baseline gap-1'>
								<input
									inputMode='decimal'
									type='number'
									min='1'
									max='100'
									step='0.1'
									value={pendingPrefs.regularPreset || ''}
									onChange={(e) => {
										let value =
											e.target.value === '' ? 0 : parseFloat(e.target.value)
										if (value > 100) value = 100
										setPendingPrefs({ ...pendingPrefs, regularPreset: value })
									}}
									onFocus={(e) => e.target.select()}
									className='w-20 text-right bg-transparent focus:outline-none border-b border-transparent focus:border-text-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
								<span className='text-base font-normal text-text-secondary'>
									g
								</span>
							</div>
						</div>

						<div className='flex justify-between items-center'>
							<label className='block font-medium'>Decaf Preset</label>
							<div className='text-2xl font-bold tabular-nums flex items-baseline gap-1'>
								<input
									inputMode='decimal'
									type='number'
									min='1'
									max='100'
									step='0.1'
									value={pendingPrefs.decafPreset || ''}
									onChange={(e) => {
										let value =
											e.target.value === '' ? 0 : parseFloat(e.target.value)
										if (value > 100) value = 100
										setPendingPrefs({ ...pendingPrefs, decafPreset: value })
									}}
									onFocus={(e) => e.target.select()}
									className='w-20 text-right bg-transparent focus:outline-none border-b border-transparent focus:border-text-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
								<span className='text-base font-normal text-text-secondary'>
									g
								</span>
							</div>
						</div>
					</div>

					<hr className='border-input-border' />

					<div className='space-y-4'>
						<div className='flex flex-col gap-2'>
							<label className='font-medium'>Timezone</label>
							<select
								value={pendingPrefs.timezone}
								onChange={(e) =>
									setPendingPrefs({ ...pendingPrefs, timezone: e.target.value })
								}
								className='w-full p-2 rounded-md bg-input-bg border border-input-border text-sm'
							>
								{TIMEZONES.map((tz) => (
									<option key={tz.value} value={tz.value}>
										{tz.label}
									</option>
								))}
							</select>
						</div>

						<div className='flex flex-col gap-2'>
							<label className='font-medium'>Auto-Decaf Start Time</label>
							<select
								value={pendingPrefs.decafStartHour}
								onChange={(e) =>
									setPendingPrefs({
										...pendingPrefs,
										decafStartHour: parseInt(e.target.value),
									})
								}
								className='w-full p-2 rounded-md bg-input-bg border border-input-border text-sm'
							>
								<option value={-1}>Disabled</option>
								{Array.from({ length: 24 }).map((_, i) => (
									<option key={i} value={i}>
										{i === 0
											? '12:00 AM'
											: i < 12
												? `${i}:00 AM`
												: i === 12
													? '12:00 PM'
													: `${i - 12}:00 PM`}
									</option>
								))}
							</select>
							<p className='text-xs text-text-secondary'>
								Automatically switches to Decaf Preset after this time.
							</p>
						</div>
					</div>
				</div>
			</Section>

			<Dialog
				open={isViewDataOpen}
				onClose={() => setIsViewDataOpen(false)}
				className='relative z-50'
			>
				<div className='fixed inset-0 bg-black/30' aria-hidden='true' />

				<div className='fixed inset-0 flex items-center justify-center p-4'>
					<DialogPanel className='mx-auto max-w-2xl w-full rounded-lg bg-background p-6 shadow-xl motion-safe:animate-[popIn_0.2s_ease-out] max-h-[90vh] overflow-y-auto'>
						<DialogTitle className='text-lg font-medium leading-6 flex justify-between items-center mb-4'>
							<span>Shot History</span>
							<button
								onClick={() => setIsViewDataOpen(false)}
								className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
							>
								<span className='sr-only'>Close</span>×
							</button>
						</DialogTitle>

						<div className='mt-2'>
							{isLoadingData ? (
								<div className='flex justify-center py-8'>
									<Loader2 className='w-8 h-8 animate-spin' />
								</div>
							) : shotData ? (
								<div className='space-y-6'>
									{/* Factors Header */}
									<div className='grid grid-cols-2 gap-4 p-3 bg-input-bg rounded-lg text-sm'>
										<div>
											<div className='text-text-secondary text-xs uppercase tracking-wider'>
												Split/Single Factor
											</div>
											<div className='font-mono font-bold'>
												{shotData.factorP0}
											</div>
										</div>
										<div>
											<div className='text-text-secondary text-xs uppercase tracking-wider'>
												Full/Double Factor
											</div>
											<div className='font-mono font-bold'>
												{shotData.factorP1}
											</div>
										</div>
										<div className='col-span-2 flex justify-end'>
											<button
												onClick={handleRecalcClick}
												className='text-xs flex items-center gap-1 text-primary hover:underline'
											>
												<RefreshCw
													size={12}
													className={`${
														isRecalcSpinning ? 'animate-spin' : ''
													}`}
												/>
												Recalculate Factors
											</button>
										</div>
									</div>

									{/* Shot List */}
									{shotData.shots.length > 0 ? (
										<div className='space-y-2'>
											<div className='grid grid-cols-5 gap-2 font-medium text-xs text-text-secondary uppercase tracking-wider px-2'>
												<div>ID</div>
												<div>Target</div>
												<div>Final</div>
												<div>Flow</div>
												<div></div>
											</div>
											<div className='space-y-1 max-h-[40vh] overflow-y-auto'>
												{shotData.shots.map((shot) => (
													<div
														key={shot.id}
														className='grid grid-cols-5 gap-2 text-sm items-center p-2 hover:bg-input-bg rounded-md transition-colors'
													>
														<div className='font-mono text-text-secondary'>
															#{shot.id}
														</div>
														<div>{shot.targetWeight.toFixed(1)}g</div>
														<div
															className={
																Math.abs(shot.finalWeight - shot.targetWeight) >
																0.5
																	? 'text-error'
																	: 'text-success'
															}
														>
															{shot.finalWeight.toFixed(1)}g
														</div>
														<div>{shot.lastFlowRate.toFixed(1)}g/s</div>
														<div className='flex justify-end'>
															<button
																onClick={() =>
																	setModalData({
																		isOpen: true,
																		shotId: shot.id,
																		description: `Delete shot #${shot.id}? This will recalculate the learning factor.`,
																		title: 'Delete Shot',
																	})
																}
																className='text-text-secondary hover:text-error transition-colors'
															>
																<Trash2 size={16} />
															</button>
														</div>
													</div>
												))}
											</div>
										</div>
									) : (
										<div className='text-center py-8 text-text-secondary italic'>
											No shot history found.
										</div>
									)}
								</div>
							) : (
								<div className='text-center py-8 text-error'>
									Failed to load data
								</div>
							)}
						</div>

						<div className='mt-6 pt-4 border-t border-input-border'>
							<button
								onClick={() =>
									setModalData({
										isOpen: true,
										shotId: null,
										description: `Are you sure you want to clear ALL shot data? This resets learning factors to defaults.`,
										title: 'Clear All Data?',
									})
								}
								className='w-full py-2 text-sm font-medium text-error border border-error/30 hover:bg-destructive/10 rounded-md transition-colors'
							>
								Reset All Data & Factors
							</button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>

			{/* Confirmation Modal */}
			<ConfirmModal
				open={modalData.isOpen}
				onClose={() =>
					setModalData((prev) => ({
						...prev,
						isOpen: false,
						shotId: null,
					}))
				}
				onConfirm={clearShotData}
				description={modalData.description}
				title={modalData.title}
			/>

			{/* Bottom Action Bar */}
			<div className='fixed bottom-8 left-0 right-0 p-4 flex flex-col gap-3 max-w-md mx-auto'>
				<button
					onClick={handleViewData}
					className='w-full py-3 px-4 bg-input-bg text-text-primary rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-input-border transition-colors'
				>
					View Shot History
				</button>

				<button
					onClick={savePrefs}
					disabled={!hasChanges || isSaving}
					className='w-full py-3 px-4 bg-primary text-white rounded-xl font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.98] transition-all
              flex items-center justify-center gap-2 shadow-lg shadow-primary/20'
				>
					{isSaving && <Loader2 className='w-4 h-4 animate-spin' />}
					{isSaving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</>
	)
}
