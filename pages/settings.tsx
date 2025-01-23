import Page from '@/components/page'
import Section from '@/components/section'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Switch } from '@headlessui/react'
import { Loader2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

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

	const ESPUrl = process.env.NEXT_PUBLIC_ESP_URL || 'http://localhost:8080'

	const api = axios.create({
		baseURL: ESPUrl,
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})

	const getPrefs = useCallback(async () => {
		try {
			const { data } = await api.get('/prefs')
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
	}, [])

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

	const clearShotData = useCallback(async () => {
		try {
			const { data } = await api.post('/clear-data')
			toast.success('Successfully cleared shot data')
		} catch (error) {
			if (axios.isAxiosError(error)) {
				console.error(
					'Failed to get preferences:',
					error.response?.data?.message || error.message,
				)
			}
			toast.error('Failed to clear shot data')
		}
	}, [])

	useEffect(() => {
		getPrefs()
	}, [getPrefs])

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
									className='w-16 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
								g
							</div>
						</div>

						<div>
							<label className='block font-medium mb-1'>One Cup Preset</label>
							<div className='text-2xl font-bold tabular-nums'>
								<input
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
									className='w-16 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
								/>
								g
							</div>
						</div>
					</div>

					{/* Save Button */}
					<div className='pt-4'>
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

					{/* Clear shot data button */}
					<div className='pt-4'>
						<button
							onClick={clearShotData}
							className='w-full py-2 px-4 bg-transparent text-red-500 rounded-lg font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:bg-white-600 active:bg-white-700
              flex items-center justify-center gap-2'
						>
							Clear shot data
						</button>
					</div>
				</div>
			</Section>
		</Page>
	)
}

export default BrewSettings
