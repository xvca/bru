import Page from '@/components/Page'
import Section from '@/components/Section'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/authContext'
import axios, { AxiosInstance } from 'axios'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { espPrefsSchema, type ESPPrefsFormData } from '@/lib/validators'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useEspConfig } from '@/lib/espConfigContext'

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
import { Input } from '@/components/ui/input'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { verifyEspReachable } from '@/utils/esp'

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
	p0: { bias: number; shots: Shot[] }
	p1: { bias: number; shots: Shot[] }
}

interface MergedShotData {
	shots: Shot[]
	biasP0: number
	biasP1: number
}

const sanitizeIp = (value: string) =>
	value
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')

export default function ESPSettings() {
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	const { user } = useAuth()
	const { espIp, setEspIp, isReady: isEspConfigReady } = useEspConfig()

	const [ipInput, setIpInput] = useState('')
	const [isValidatingIp, setIsValidatingIp] = useState(false)

	const [isViewDataOpen, setIsViewDataOpen] = useState(false)
	const [shotData, setShotData] = useState<MergedShotData | null>(null)
	const [isLoadingData, setIsLoadingData] = useState(false)

	const [modalData, setModalData] = useState<{
		isOpen: boolean
		title: string
		description: string
	}>({
		isOpen: false,
		title: '',
		description: '',
	})

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

	const form = useForm<ESPPrefsFormData>({
		resolver: zodResolver(espPrefsSchema),
		defaultValues: {
			isEnabled: true,
			regularPreset: 40,
			decafPreset: 40,
			pMode: PreinfusionMode.SIMPLE,
			decafStartHour: -1,
			timezone: 'GMT0',
			learningRate: 0.5,
			systemLag: 1,
		},
	})

	const getPrefs = useCallback(async () => {
		if (!api) {
			setIsLoading(false)
			return
		}

		try {
			const { data } = await api.get('/prefs', { timeout: 5000 })
			form.reset({
				isEnabled: data.isEnabled,
				regularPreset: data.regularPreset,
				decafPreset: data.decafPreset,
				pMode: data.pMode,
				decafStartHour:
					data.decafStartHour === undefined ? -1 : data.decafStartHour,
				timezone: data.timezone,
				learningRate: data.learningRate === undefined ? 0.5 : data.learningRate,
				systemLag: data.systemLag === undefined ? 1.0 : data.systemLag,
			})
		} catch (error) {
			console.error('Failed to get preferences:', error)
			toast.error('Failed to fetch esp settings')
		} finally {
			setIsLoading(false)
		}
	}, [api, form])

	useEffect(() => {
		if (!isEspConfigReady) return
		setIpInput(espIp ?? '')

		if (!api) {
			setIsLoading(false)
			return
		}

		setIsLoading(true)
		getPrefs()
	}, [api, espIp, getPrefs, isEspConfigReady])

	const onSubmit = async (data: ESPPrefsFormData) => {
		if (!api) {
			toast.error('Configure your ESP IP before saving settings.')
			return
		}

		setIsSaving(true)
		try {
			const formData = new FormData()
			formData.append('isEnabled', data.isEnabled.toString())
			formData.append('regularPreset', data.regularPreset.toString())
			formData.append('decafPreset', data.decafPreset.toString())
			formData.append('pMode', data.pMode.toString())
			formData.append('decafStartHour', data.decafStartHour.toString())
			formData.append('timezone', data.timezone)
			formData.append('learningRate', data.learningRate.toString())
			formData.append('systemLag', data.systemLag.toString())

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
		if (!api) {
			toast.error('Configure your ESP IP first.')
			return
		}

		setIsLoadingData(true)
		try {
			const { data } = await api.get<ShotDataResponse>('/data', {
				timeout: 5000,
			})
			const allShots = [...data.p0.shots, ...data.p1.shots]
			allShots.sort((a, b) => b.id - a.id)
			setShotData({
				shots: allShots,
				biasP0: data.p0.bias,
				biasP1: data.p1.bias,
			})
		} catch (error) {
			toast.error('Failed to fetch shot data')
		} finally {
			setIsLoadingData(false)
		}
	}

	const clearShotData = async () => {
		if (!api) {
			toast.error('Configure your ESP IP first.')
			return
		}

		try {
			await api.post('/clear-data')
			toast.success('All data cleared')
			await fetchShotData()
		} catch (error) {
			toast.error('Failed to clear data')
		}
	}

	const handleViewData = async () => {
		if (!api) {
			toast.error('Configure your ESP IP first.')
			return
		}
		setIsViewDataOpen(true)
		await fetchShotData()
	}

	const handleSaveIp = async () => {
		const normalized = sanitizeIp(ipInput)
		if (!normalized) {
			toast.error('Enter a valid IP address or hostname.')
			return
		}

		setIsValidatingIp(true)
		try {
			await verifyEspReachable(normalized)
			setEspIp(normalized)
			toast.success('ESP IP saved. Fetching device settings…')
		} catch (error) {
			toast.error('Unable to reach the ESP at that address.')
		} finally {
			setIsValidatingIp(false)
		}
	}
	const isDeviceConfigured = Boolean(api)

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
			<div className='space-y-6'>
				<div className='space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4'>
					<Label htmlFor='esp-address' className='text-sm font-medium'>
						Device IP Address
					</Label>
					<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
						<Input
							id='esp-address'
							placeholder='e.g. 192.168.1.42'
							value={ipInput}
							onChange={(e) => setIpInput(e.target.value)}
							autoComplete='off'
						/>
						<Button
							type='button'
							onClick={handleSaveIp}
							disabled={isValidatingIp}
						>
							{isValidatingIp && <Spinner className='mr-2 h-4 w-4' />}
							{isValidatingIp ? 'Checking…' : 'Save IP'}
						</Button>
					</div>
					<p className='text-xs text-muted-foreground'>
						Enter the local IP or hostname of your Autobru ESP (without
						http://). This address is used for both the API and the live scale
						data feed.
					</p>
				</div>

				{!isDeviceConfigured && (
					<div className='flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-warning/20 p-4 text-sm'>
						<div className='font-medium'>
							Device IP required. Add your local Autobru IP.
						</div>
					</div>
				)}

				<form onSubmit={form.handleSubmit(onSubmit)}>
					<fieldset
						disabled={!isDeviceConfigured}
						className={`flex flex-col gap-4
							${isDeviceConfigured ? '' : 'pointer-events-none opacity-50'}`}
					>
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
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Regular Preset</FieldLabel>
										<div className='flex items-center gap-2'>
											<Input
												{...field}
												id='regularPreset'
												type='number'
												inputMode='decimal'
												step='0.1'
												min='1'
												max='100'
												className='w-24 text-right text-2xl font-bold tabular-nums'
												onFocus={(e) => e.target.select()}
											/>
											<span className='text-base text-muted-foreground'>g</span>
										</div>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name='decafPreset'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Decaf Preset</FieldLabel>
										<div className='flex items-center gap-2 '>
											<Input
												{...field}
												id='decafPreset'
												type='number'
												inputMode='decimal'
												step='0.1'
												min='1'
												max='100'
												className='w-24 text-right text-2xl font-bold tabular-nums'
												onFocus={(e) => e.target.select()}
											/>
											<span className='text-base text-muted-foreground'>g</span>
										</div>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
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
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
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
										<p className='text-xs text-muted-foreground mt-1'>
											Automatically switches to Decaf Preset after this time.
										</p>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<Accordion
							type='single'
							collapsible
							className='rounded-xl border border-border/60 bg-muted/20'
						>
							<AccordionItem value='advanced'>
								<AccordionTrigger className='px-4 text-sm font-semibold'>
									Advanced Flow Tuning
								</AccordionTrigger>
								<AccordionContent className='space-y-4 px-4 pb-4 text-sm text-muted-foreground'>
									<p className='text-xs leading-relaxed text-muted-foreground/80'>
										Autobru tries to hit your target weight by splitting the
										&quot;overshoot&quot; into two parts
									</p>

									<p className='text-xs leading-relaxed text-muted-foreground/80'>
										System Latency: accounts for how fast the water is moving.
										If you pull a turbo shot, the pump needs be stopped earlier
										to account for the extra momentum.
									</p>
									<p className='text-xs leading-relaxed text-muted-foreground/80'>
										Drippage Bias: This accounts for the portafilter you&apos;re
										using. Spouted portafilters hold onto a few grams of liquid
										that fall into the cup after the shot stops, while
										bottomless ones don&apos;t. Autobru learns this &quot;static
										offset&quot; automatically over time.
									</p>

									<Controller
										name='systemLag'
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>System Latency</FieldLabel>
												<div className='flex items-center gap-3'>
													<Input
														{...field}
														id='systemLag'
														type='number'
														inputMode='decimal'
														step='0.01'
														min='0'
														max='2'
														className='w-24 text-right tabular-nums'
														onFocus={(e) => e.target.select()}
													/>
													<span className='text-xs font-medium text-muted-foreground'>
														seconds
													</span>
												</div>
												<p className='mt-1 text-xs leading-relaxed text-muted-foreground/80'>
													Compensates for time to turn pump off + bluetooth lag.
													Default is 1.0.
												</p>

												<div className='mt-2 rounded border border-border/40 bg-muted/40 p-2.5 text-[11px] text-muted-foreground'>
													<p className='mb-1.5 leading-relaxed'>
														<span className='font-semibold text-foreground/80'>
															To calibrate:
														</span>{' '}
														Set this and Bias Adaptation Speed to 0. Pull a
														typical slow shot (1-2 g/s) and a fast shot (4+
														g/s). Record the overshoot (O) and ending flow rate
														(F) for each. Ideally use a bottomless portafilter
														to perform this calibration as coffee that sprays
														off the scale detracts from the true flow rate.
													</p>
													<div className='rounded bg-background/50 px-2 py-1.5 text-center font-mono text-[10px] tracking-tight text-foreground/90 border border-border/20'>
														(O<sub>fast</sub> - O<sub>slow</sub>) / (F
														<sub>fast</sub> - F<sub>slow</sub>)
													</div>
												</div>

												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>

									<Controller
										name='learningRate'
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>Bias Adaptation Speed</FieldLabel>
												<div className='flex items-center gap-3'>
													<Input
														{...field}
														id='learningRate'
														type='number'
														inputMode='decimal'
														step='0.01'
														min='0'
														max='1'
														className='w-24 text-right tabular-nums'
														onFocus={(e) => e.target.select()}
													/>
													<span className='text-xs font-medium text-muted-foreground'>
														{Math.round(field.value * 100)}%
													</span>
												</div>

												<div className='mt-2 rounded border border-border/40 bg-muted/40 p-2.5 text-[11px] text-muted-foreground'>
													<p className='mb-2 leading-relaxed'>
														Determines how strongly the most recent shot affects
														future predictions.
													</p>
													<div className='grid gap-1.5'>
														<div className='grid grid-cols-[30px_1fr] gap-2'>
															<span className='font-mono font-bold text-foreground/80'>
																0.2
															</span>
															<div className='flex flex-col gap-0.5'>
																<span className='font-semibold text-foreground/70'>
																	Conservative
																</span>
																<span>
																	Latest shot is 20%. Takes ~14 shots to fully
																	calibrate to new conditions.
																</span>
															</div>
														</div>
														<div className='grid grid-cols-[30px_1fr] gap-2'>
															<span className='font-mono font-bold text-foreground/80'>
																0.5
															</span>
															<div className='flex flex-col gap-0.5'>
																<span className='font-semibold text-foreground/70'>
																	Balanced
																</span>
																<span>
																	Latest shot is 50%. Takes ~5 shots to fully
																	calibrate.
																</span>
															</div>
														</div>
														<div className='grid grid-cols-[30px_1fr] gap-2'>
															<span className='font-mono font-bold text-foreground/80'>
																0.8
															</span>
															<div className='flex flex-col gap-0.5'>
																<span className='font-semibold text-foreground/70'>
																	Reactive
																</span>
																<span>
																	Latest shot is 80%. Takes ~2 shots to fully
																	calibrate.
																</span>
															</div>
														</div>
													</div>
												</div>

												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
								</AccordionContent>
							</AccordionItem>
						</Accordion>

						<div className='p-4 flex flex-col gap-3 max-w-md mx-auto z-40 pointer-events-none w-full'>
							<div className='pointer-events-auto flex flex-col gap-3'>
								<Button
									type='button'
									onClick={handleViewData}
									variant='outline'
									className='bg-background/80 backdrop-blur-sm shadow-sm'
									disabled={!isDeviceConfigured}
								>
									View Shot History
								</Button>

								<Button
									type='submit'
									disabled={
										!isDeviceConfigured || !form.formState.isDirty || isSaving
									}
									className='shadow-lg'
								>
									{isSaving && <Spinner className='mr-2' />}
									{isSaving ? 'Saving...' : 'Save Changes'}
								</Button>
							</div>
						</div>
					</fieldset>
				</form>
			</div>

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
							<div className='spacey-6 h-full flex flex-col'>
								<div className='grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-sm shrink-0'>
									<div>
										<div className='text-muted-foreground text-xs uppercase tracking-wider'>
											Split/Single Bias
										</div>
										<div className='font-mono font-bold'>
											{shotData.biasP0.toFixed(2)}g
										</div>
									</div>
									<div>
										<div className='text-muted-foreground text-xs uppercase tracking-wider'>
											Full/Double Bias
										</div>
										<div className='font-mono font-bold'>
											{shotData.biasP1.toFixed(2)}g
										</div>
									</div>
								</div>

								{shotData.shots.length > 0 ? (
									<div className='space-y-2 flex-1 flex flex-col min-h-0 mt-2'>
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
																0.2
																	? 'text-error'
																	: 'text-success'
															}
														>
															{shot.finalWeight.toFixed(1)}g
														</div>
														<div>{shot.lastFlowRate.toFixed(1)}g/s</div>
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
									description: `Are you sure you want to clear ALL shot data? This resets learned biases to defaults.`,
									title: 'Clear All Data?',
								})
							}
							variant='destructive'
							className='w-full sm:w-auto'
						>
							Reset All Data & Biases
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
					}))
				}
				onConfirm={clearShotData}
				description={modalData.description}
				title={modalData.title}
			/>
		</>
	)
}
