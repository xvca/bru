import Page from '@/components/Page'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'
import { RefreshCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { espPrefsSchema, type ESPPrefsFormData } from '@/lib/validators'
import { ConfirmModal } from '@/components/ConfirmModal'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'

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

interface Shot {
	id: number
	targetWeight: number
	finalWeight: number
	lastFlowRate: number
}

interface ShotDataResponse {
	p0: { factor: number; shots: Shot[] }
	p1: { factor: number; shots: Shot[] }
}

interface MergedShotData {
	shots: Shot[]
	factorP0: number
	factorP1: number
}

export default function ESPSettings() {
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	const { user } = useAuth()

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
		headers: { 'Content-Type': 'multipart/form-data' },
	})

	const form = useForm<ESPPrefsFormData>({
		resolver: zodResolver(espPrefsSchema),
		defaultValues: {
			isEnabled: true,
			regularPreset: 40,
			decafPreset: 40,
			pMode: PreinfusionMode.SIMPLE,
			decafStartHour: -1,
			timezone: 'GMT0',
		},
	})

	const getPrefs = async () => {
		try {
			const { data } = await api.get('/prefs', { timeout: 5000 })
			form.reset({
				isEnabled: data.isEnabled,
				regularPreset: data.regularPreset,
				decafPreset: data.decafPreset,
				pMode: data.pMode,
				decafStartHour: data.decafStartHour,
				timezone: data.timezone,
			})
		} catch (error) {
			console.error('Failed to get preferences:', error)
			toast.error('Failed to fetch esp settings')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		getPrefs()
	}, [])

	const onSubmit = async (data: ESPPrefsFormData) => {
		setIsSaving(true)
		try {
			const formData = new FormData()
			formData.append('isEnabled', data.isEnabled.toString())
			formData.append('regularPreset', data.regularPreset.toString())
			formData.append('decafPreset', data.decafPreset.toString())
			formData.append('pMode', data.pMode.toString())
			formData.append('decafStartHour', data.decafStartHour.toString())
			formData.append('timezone', data.timezone)

			await api.post('/prefs', formData)

			if (user)
				await axios.put(
					'/api/user/preferences',
					{
						decafStartHour: data.decafStartHour,
					},
					{ headers: { Authorization: `Bearer ${user.token}` } },
				)

			form.reset(data)
			toast.success('Settings saved successfully')
		} catch (error) {
			console.error('Failed to update preferences:', error)
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
			const allShots = [...data.p0.shots, ...data.p1.shots]
			allShots.sort((a, b) => b.id - a.id)
			setShotData({
				shots: allShots,
				factorP0: data.p0.factor,
				factorP1: data.p1.factor,
			})
		} catch (error) {
			toast.error('Failed to fetch shot data')
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

	const handleRecalcClick = () => {
		setIsSpinning(true)
		api
			.post('/recalc-comp-factor')
			.then(() => {
				toast.success('Factors recalculated')
				fetchShotData()
			})
			.catch(() => toast.error('Failed to recalculate'))
			.finally(() => setTimeout(() => setIsSpinning(false), 1000))
	}

	const handleViewData = async () => {
		setIsViewDataOpen(true)
		await fetchShotData()
	}

	if (isLoading) {
		return (
			<Page>
				<Section>
					<div className='flex justify-center items-center min-h-[200px]'>
						<Spinner />
					</div>
				</Section>
			</Page>
		)
	}

	return (
		<>
			<Section>
				<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
					<div className='flex items-center justify-between'>
						<Label htmlFor='isEnabled' className='font-medium text-base'>
							Enable Device
						</Label>
						<Controller
							name='isEnabled'
							control={form.control}
							render={({ field }) => (
								<Switch
									id='isEnabled'
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							)}
						/>
					</div>

					<div className='flex items-center justify-between'>
						<Label htmlFor='pMode' className='font-medium text-base'>
							Weight-Triggered Preinfusion
						</Label>
						<Controller
							name='pMode'
							control={form.control}
							render={({ field }) => (
								<Switch
									id='pMode'
									checked={field.value === PreinfusionMode.WEIGHT_TRIGGERED}
									onCheckedChange={(checked) =>
										field.onChange(
											checked
												? PreinfusionMode.WEIGHT_TRIGGERED
												: PreinfusionMode.SIMPLE,
										)
									}
								/>
							)}
						/>
					</div>

					<hr className='border-input-border' />

					<div className='space-y-4'>
						<Controller
							name='regularPreset'
							control={form.control}
							render={({ field, fieldState }) => (
								<div className='flex justify-between items-center'>
									<Label
										htmlFor='regularPreset'
										className='font-medium text-base'
									>
										Regular Preset
									</Label>
									<div className='flex flex-col items-end'>
										<div className='flex items-baseline gap-1'>
											<input
												{...field}
												id='regularPreset'
												inputMode='decimal'
												type='number'
												min='1'
												max='100'
												step='0.1'
												className='w-20 text-right bg-transparent text-2xl font-bold tabular-nums focus:outline-hidden border-b border-transparent focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
												onFocus={(e) => e.target.select()}
											/>
											<span className='text-base font-normal text-text-secondary'>
												g
											</span>
										</div>
										{fieldState.invalid && (
											<span className='text-xs text-error'>
												{fieldState.error?.message}
											</span>
										)}
									</div>
								</div>
							)}
						/>

						<Controller
							name='decafPreset'
							control={form.control}
							render={({ field, fieldState }) => (
								<div className='flex justify-between items-center'>
									<Label
										htmlFor='decafPreset'
										className='font-medium text-base'
									>
										Decaf Preset
									</Label>
									<div className='flex flex-col items-end'>
										<div className='flex items-baseline gap-1'>
											<input
												{...field}
												id='decafPreset'
												inputMode='decimal'
												type='number'
												min='1'
												max='100'
												step='0.1'
												className='w-20 text-right bg-transparent text-2xl font-bold tabular-nums focus:outline-hidden border-b border-transparent focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
												onFocus={(e) => e.target.select()}
											/>
											<span className='text-base font-normal text-text-secondary'>
												g
											</span>
										</div>
										{fieldState.invalid && (
											<span className='text-xs text-error'>
												{fieldState.error?.message}
											</span>
										)}
									</div>
								</div>
							)}
						/>
					</div>

					<hr className='border-input-border' />

					<div className='space-y-4'>
						<Controller
							name='timezone'
							control={form.control}
							render={({ field }) => (
								<Field>
									<FieldLabel>Timezone</FieldLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<SelectTrigger>
											<SelectValue placeholder='Select timezone' />
										</SelectTrigger>
										<SelectContent>
											{TIMEZONES.map((tz) => (
												<SelectItem key={tz.value} value={tz.value}>
													{tz.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						/>

						<Controller
							name='decafStartHour'
							control={form.control}
							render={({ field }) => (
								<Field>
									<FieldLabel>Auto-Decaf Start Time</FieldLabel>
									<Select
										onValueChange={(val) => field.onChange(Number(val))}
										value={field.value.toString()}
									>
										<SelectTrigger>
											<SelectValue placeholder='Select start time' />
										</SelectTrigger>
										<SelectContent className='max-h-60'>
											<SelectItem value='-1'>Disabled</SelectItem>
											{Array.from({ length: 24 }).map((_, i) => (
												<SelectItem key={i} value={i.toString()}>
													{i === 0
														? '12:00 AM'
														: i < 12
															? `${i}:00 AM`
															: i === 12
																? '12:00 PM'
																: `${i - 12}:00 PM`}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className='text-xs text-text-secondary mt-1'>
										Automatically switches to Decaf Preset after this time.
									</p>
								</Field>
							)}
						/>
					</div>

					<div className='md:fixed bottom-8 left-0 right-0 p-4 flex flex-col gap-3 max-w-md mx-auto z-40 pointer-events-none'>
						<div className='pointer-events-auto flex flex-col gap-3'>
							<Button
								type='button'
								onClick={handleViewData}
								variant='outline'
								className='bg-background/80 backdrop-blur-sm shadow-sm'
							>
								View Shot History
							</Button>

							<Button
								type='submit'
								disabled={!form.formState.isDirty || isSaving}
								className='shadow-lg'
							>
								{isSaving && <Spinner className='mr-2' />}
								{isSaving ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</div>
				</form>
			</Section>

			<Dialog
				open={isViewDataOpen}
				onOpenChange={(open) => !open && setIsViewDataOpen(false)}
			>
				<DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0'>
					<DialogHeader className='p-6 pb-2'>
						<DialogTitle>Shot History</DialogTitle>
					</DialogHeader>

					<div className='flex-1 overflow-hidden p-6 pt-2'>
						{isLoadingData ? (
							<div className='flex justify-center py-8'>
								<Spinner />
							</div>
						) : shotData ? (
							<div className='space-y-6 h-full flex flex-col'>
								{/* Factors Header */}
								<div className='grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-sm shrink-0'>
									<div>
										<div className='text-muted-foreground text-xs uppercase tracking-wider'>
											Split/Single Factor
										</div>
										<div className='font-mono font-bold'>
											{shotData.factorP0}
										</div>
									</div>
									<div>
										<div className='text-muted-foreground text-xs uppercase tracking-wider'>
											Full/Double Factor
										</div>
										<div className='font-mono font-bold'>
											{shotData.factorP1}
										</div>
									</div>
									<div className='col-span-2 flex justify-end'>
										<Button
											type='button'
											onClick={handleRecalcClick}
											variant='link'
											size='sm'
											className='h-auto p-0 text-muted-foreground'
										>
											{isRecalcSpinning && <Spinner className='w-3 h-3 mr-1' />}
											<RefreshCw
												size={12}
												className={`mr-1 ${
													isRecalcSpinning ? 'animate-spin' : ''
												}`}
											/>
											Recalculate Factors
										</Button>
									</div>
								</div>

								{shotData.shots.length > 0 ? (
									<div className='space-y-2 flex-1 flex flex-col min-h-0'>
										<div className='grid grid-cols-5 gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider px-2 shrink-0'>
											<div>ID</div>
											<div>Target</div>
											<div>Final</div>
											<div>Flow</div>
											<div></div>
										</div>
										<ScrollArea className='h-72 rounded-md border'>
											<div className='p-2 space-y-1'>
												{shotData.shots.map((shot) => (
													<div
														key={shot.id}
														className='grid grid-cols-5 gap-2 text-sm items-center p-2 hover:bg-muted/50 rounded-md transition-colors'
													>
														<div className='font-mono text-muted-foreground'>
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
															<Button
																type='button'
																onClick={() =>
																	setModalData({
																		isOpen: true,
																		shotId: shot.id,
																		description: `Delete shot #${shot.id}? This will recalculate the learning factor.`,
																		title: 'Delete Shot',
																	})
																}
																variant='ghost'
																size='icon'
																className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full'
															>
																<Trash2 size={16} />
															</Button>
														</div>
													</div>
												))}
											</div>
										</ScrollArea>
									</div>
								) : (
									<div className='text-center py-8 text-muted-foreground italic'>
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

					<div className='p-6 pt-0 shrink-0 mt-4 flex justify-center'>
						<Button
							type='button'
							onClick={() =>
								setModalData({
									isOpen: true,
									shotId: null,
									description: `Are you sure you want to clear ALL shot data? This resets learning factors to defaults.`,
									title: 'Clear All Data?',
								})
							}
							variant='destructive'
							className='w-full sm:w-auto'
						>
							Reset All Data & Factors
						</Button>
					</div>
				</DialogContent>
			</Dialog>

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
		</>
	)
}
