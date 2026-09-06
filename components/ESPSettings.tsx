import Page from '@/components/Page'
import Section from '@/components/Section'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import axios, { AxiosInstance } from 'axios'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	DEFAULT_MAX_SHOT_WEIGHT,
	MAX_CONFIGURABLE_SHOT_WEIGHT,
	espPrefsSchema,
	type ESPPrefsFormData,
} from '@/lib/validators'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { Info } from 'lucide-react'
import { verifyEspReachable } from '@/utils/esp'
import { isSameBruServer } from '@/lib/espIntegration'
import { Separator } from './ui/separator'
import { ChartContainer, ChartTooltip, type ChartConfig } from './ui/chart'
import {
	ScatterChart,
	CartesianGrid,
	ReferenceLine,
	Scatter,
	XAxis,
	YAxis,
} from 'recharts'

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
	stopWeight: number
	drippage: number
}

interface ProfileShotData {
	bias: number
	shots: Shot[]
}

interface ShotDataResponse {
	p0: ProfileShotData
	p1: ProfileShotData
}

interface ChartShot extends Shot {
	profile: 0 | 1
}

interface ShotHistoryData {
	shots: Shot[]
	chartShots: ChartShot[]
	p0: ProfileShotData
	p1: ProfileShotData
}

interface RegressionSeries {
	points: ChartShot[]
	line: [{ x: number; y: number }, { x: number; y: number }]
	color: string
	xDomain: [number, number]
}

const regressionChartConfig = {
	shots: {
		label: 'Shots',
		color: 'var(--chart-1)',
	},
	fit: {
		label: 'Regression fit',
		color: 'var(--chart-1)',
	},
} satisfies ChartConfig

function RegressionTooltipContent(props: {
	active?: boolean
	payload?: Array<{ payload?: Partial<ChartShot> }>
}) {
	if (!props.active || !props.payload?.length) return null

	const datum = props.payload[0]?.payload
	if (!datum || typeof datum.id !== 'number') return null

	return (
		<div className='min-w-[10rem] rounded-lg border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm'>
			<div className='mb-2 font-medium text-foreground'>Shot #{datum.id}</div>
			<div className='grid gap-1.5'>
				<div className='flex items-center justify-between gap-3'>
					<span className='text-muted-foreground'>Drippage</span>
					<span className='font-mono font-medium text-foreground'>
						{Number(datum.drippage).toFixed(2)} g
					</span>
				</div>
				<div className='flex items-center justify-between gap-3'>
					<span className='text-muted-foreground'>Flow</span>
					<span className='font-mono font-medium text-foreground'>
						{Number(datum.lastFlowRate).toFixed(2)} g/s
					</span>
				</div>
				<div className='flex items-center justify-between gap-3'>
					<span className='text-muted-foreground'>Final</span>
					<span className='font-mono font-medium text-foreground'>
						{Number(datum.finalWeight).toFixed(2)} g
					</span>
				</div>
			</div>
		</div>
	)
}

function RegressionProfileChart({ series }: { series: RegressionSeries }) {
	return (
		<div className='space-y-1'>
			<div className='text-xs text-muted-foreground'>Drippage (g)</div>
			<ChartContainer config={regressionChartConfig} className='h-56 w-full'>
				<ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
					<CartesianGrid strokeDasharray='3 3' vertical={false} />
					<XAxis
						type='number'
						dataKey='lastFlowRate'
						domain={series.xDomain}
						tickCount={5}
						minTickGap={24}
						tickMargin={8}
						padding={{ left: 8, right: 8 }}
						tick={{ fontSize: 12 }}
						stroke='var(--muted-foreground)'
					/>
					<YAxis
						type='number'
						dataKey='drippage'
						width={40}
						tickCount={5}
						tickMargin={8}
						tick={{ fontSize: 12 }}
						stroke='var(--muted-foreground)'
					/>
					<ChartTooltip
						cursor={{ strokeDasharray: '3 3' }}
						content={<RegressionTooltipContent />}
					/>
					<Scatter name='shots' data={series.points} fill={series.color} />
					<ReferenceLine
						segment={series.line}
						stroke={`color-mix(in oklch, ${series.color} 70%, var(--background))`}
						strokeWidth={2}
						ifOverflow='extendDomain'
					/>
				</ScatterChart>
			</ChartContainer>
			<div className='text-center text-xs text-muted-foreground'>
				Flow rate (g/s)
			</div>
		</div>
	)
}

const sanitizeIp = (value: string | null) => {
	if (!value) return ''
	return value
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')
}

const buildRegressionSeries = (
	points: ChartShot[],
	bias: number,
	systemLag: number,
	color: string,
): RegressionSeries | null => {
	if (points.length === 0) return null

	const flowRates = points.map((shot) => shot.lastFlowRate)
	const maxFlow = Math.max(...flowRates)
	const xMin = 0
	const xMax = Math.max(1, Math.ceil(maxFlow))

	return {
		points,
		color,
		xDomain: [xMin, xMax],
		line: [
			{ x: xMin, y: xMin * systemLag + bias },
			{ x: xMax, y: xMax * systemLag + bias },
		],
	}
}

export default function ESPSettings() {
	const [isSaving, setIsSaving] = useState(false)

	const { user } = useAuth()
	const {
		espIp,
		setEspIp,
		isReady: isEspConfigReady,
		prefs,
		integration,
		prefsError,
		isLoadingPrefs,
		refreshPrefs,
	} = useEspConfig()
	const { availableBars } = useBrewBar()

	const isFullMode = process.env.NEXT_PUBLIC_LITE !== 'true'
	const isLinked = integration?.configured === true
	const isLocalIntegration =
		integration !== null &&
		typeof window !== 'undefined' &&
		isSameBruServer(integration.apiUrl, window.location.origin)
	const linkedBarId = isLocalIntegration ? integration?.barId : null
	const linkedBarName = linkedBarId
		? (availableBars.find((bar) => bar.id === linkedBarId)?.name ??
			`Brew bar #${linkedBarId} (not available to this account)`)
		: isLocalIntegration
			? 'Brew bar not recorded'
			: 'Another or unknown Bru server'
	const [isLinking, setIsLinking] = useState(false)

	const [ipInput, setIpInput] = useState('')
	const [isValidatingIp, setIsValidatingIp] = useState(false)

	const [isViewDataOpen, setIsViewDataOpen] = useState(false)
	const [shotData, setShotData] = useState<ShotHistoryData | null>(null)
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

	const sanitizedIp = useMemo(() => sanitizeIp(espIp), [espIp])

	const api = useMemo(() => {
		if (!sanitizedIp) return null

		return axios.create({
			baseURL: `http://${sanitizedIp}`,
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
	}, [sanitizedIp])

	const regressionChart = useMemo(() => {
		if (!shotData || !prefs) return null
		if (shotData.chartShots.length === 0) return null

		return {
			p0: buildRegressionSeries(
				shotData.chartShots.filter((shot) => shot.profile === 0),
				shotData.p0.bias,
				prefs.systemLag,
				'var(--chart-1)',
			),
			p1: buildRegressionSeries(
				shotData.chartShots.filter((shot) => shot.profile === 1),
				shotData.p1.bias,
				prefs.systemLag,
				'var(--chart-2)',
			),
		}
	}, [prefs, shotData])

	const form = useForm<ESPPrefsFormData>({
		resolver: zodResolver(espPrefsSchema),
		defaultValues: {
			isEnabled: true,
			autoSavePreset: false,
			regularPreset: 40,
			decafPreset: 40,
			maxShotWeight: DEFAULT_MAX_SHOT_WEIGHT,
			pMode: PreinfusionMode.SIMPLE,
			decafStartHour: -1,
			timezone: 'GMT0',
			learningRate: 0.5,
			systemLag: 1,
			earlyStop: false,
			swapButtons: false,
			halfForTwoCup: true,
		},
	})

	const supportsMaxShotWeight = prefs?.maxShotWeight !== undefined
	const watchedMax = Number(
		form.watch('maxShotWeight') ?? DEFAULT_MAX_SHOT_WEIGHT,
	)
	const maxPresetWeight =
		Number.isFinite(watchedMax) &&
		watchedMax >= 1 &&
		watchedMax <= MAX_CONFIGURABLE_SHOT_WEIGHT
			? watchedMax
			: DEFAULT_MAX_SHOT_WEIGHT

	useEffect(() => {
		if (prefs) {
			form.reset(prefs)
		}
	}, [prefs])

	useEffect(() => {
		if (!isEspConfigReady || !espIp) return
		void refreshPrefs()
	}, [espIp, isEspConfigReady, refreshPrefs])

	useEffect(() => {
		if (!isEspConfigReady) return
		setIpInput(espIp ?? '')
	}, [isEspConfigReady, espIp])

	const onSubmit = async (data: ESPPrefsFormData) => {
		if (!api) {
			toast.error('Configure your ESP IP before saving settings.')
			return
		}

		setIsSaving(true)
		try {
			const formData = new FormData()
			formData.append('isEnabled', data.isEnabled.toString())
			formData.append('autoSavePreset', data.autoSavePreset.toString())
			formData.append('regularPreset', data.regularPreset.toString())
			formData.append('decafPreset', data.decafPreset.toString())
			if (supportsMaxShotWeight && data.maxShotWeight !== undefined) {
				formData.append('maxShotWeight', data.maxShotWeight.toString())
			}
			formData.append('pMode', data.pMode.toString())
			formData.append('decafStartHour', data.decafStartHour.toString())
			formData.append('timezone', data.timezone)
			formData.append('learningRate', data.learningRate.toString())
			formData.append('systemLag', data.systemLag.toString())
			formData.append('earlyStop', data.earlyStop.toString())
			formData.append('swapButtons', data.swapButtons.toString())
			formData.append('halfForTwoCup', data.halfForTwoCup.toString())

			await api.post('/prefs', formData)

			if (user)
				await axios.put('/api/user/preferences', {
					decafStartHour: data.decafStartHour,
				})

			form.reset(data)
			toast.success('Settings saved successfully')

			await refreshPrefs()
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
				chartShots: [
					...data.p0.shots.map((shot) => ({ ...shot, profile: 0 as const })),
					...data.p1.shots.map((shot) => ({ ...shot, profile: 1 as const })),
				],
				p0: data.p0,
				p1: data.p1,
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

	const handleLinkDevice = async (barId: number) => {
		if (!isFullMode || !api || !user) return

		setIsLinking(true)
		try {
			const tokenResponse = await axios.post(`/api/brew-bars/${barId}/tokens`, {
				deviceName: 'Autobru ESP',
			})

			const { token } = tokenResponse.data

			const apiUrl = window.location.origin
			await api.post('/token', {
				apiUrl,
				apiToken: token,
				barId,
			})

			await refreshPrefs()
			toast.success('Device linked to brew bar successfully')
		} catch (error) {
			console.error('Error linking device:', error)
			toast.error('Failed to link device to brew bar')
		} finally {
			setIsLinking(false)
		}
	}

	const handleUnlinkDevice = async () => {
		if (!isFullMode || !api || !user) return

		setIsLinking(true)
		try {
			await api.post('/token', {
				apiUrl: '',
				apiToken: '',
			})

			await refreshPrefs()
			toast.success('Device unlinked from brew bar')
		} catch (error) {
			console.error('Error unlinking device:', error)
			toast.error('Failed to unlink device')
		} finally {
			setIsLinking(false)
		}
	}

	const isDeviceConfigured = Boolean(api)

	if (isLoadingPrefs) {
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

				<Separator />

				<div className='flex items-start justify-center gap-8 text-center'>
					<Controller
						name='regularPreset'
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel>Regular Preset</FieldLabel>
								<div className='flex items-center justify-left gap-2'>
									<Input
										{...field}
										id='regularPreset'
										type='number'
										inputMode='decimal'
										step='0.1'
										min='1'
										max={maxPresetWeight}
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
								<div className='flex items-center justify-left gap-2'>
									<Input
										{...field}
										id='decafPreset'
										type='number'
										inputMode='decimal'
										step='0.1'
										min='1'
										max={maxPresetWeight}
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

				<Separator />

				<form onSubmit={form.handleSubmit(onSubmit)}>
					<fieldset
						disabled={!isDeviceConfigured}
						className={`flex flex-col gap-4
							${isDeviceConfigured ? '' : 'pointer-events-none opacity-50'}`}
					>
						<Controller
							name='maxShotWeight'
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor='maxShotWeight'>
										Maximum shot yield
									</FieldLabel>
									<div className='flex items-center gap-2'>
										<Input
											{...field}
											id='maxShotWeight'
											value={field.value ?? DEFAULT_MAX_SHOT_WEIGHT}
											type='number'
											inputMode='decimal'
											min={1}
											max={MAX_CONFIGURABLE_SHOT_WEIGHT}
											step='0.1'
											disabled={!supportsMaxShotWeight}
											aria-describedby='max-shot-weight-description'
											className='w-24'
										/>
										<span className='text-sm text-muted-foreground'>g</span>
									</div>
									<p
										id='max-shot-weight-description'
										className='text-xs text-muted-foreground'
									>
										Safety cap for target and preset weights, mainly to prevent
										accidentally starting an oversized shot. Increase only for
										intentionally larger yields. The separate 90-second brew
										timeout still applies.
									</p>
									{!supportsMaxShotWeight && (
										<p className='text-xs text-muted-foreground'>
											Update the ESP firmware to configure this limit. Older
											firmware uses 100g.
										</p>
									)}
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
						<Separator />

						<div className='flex flex-col gap-1'>
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
							<p className='text-xs text-muted-foreground w-[80%]'>
								When off, the machine works normally without auto-stop.
							</p>
						</div>

						<div className='flex flex-col gap-1'>
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
							<p className='text-xs text-muted-foreground w-[80%]'>
								Holds preinfusion until the scale reads 2+ grams.
							</p>
						</div>

						<div className='flex flex-col gap-1'>
							<div className='flex items-center justify-between'>
								<Label
									htmlFor='autoSavePreset'
									className='font-medium text-base'
								>
									Auto save preset
								</Label>
								<Controller
									name='autoSavePreset'
									control={form.control}
									render={({ field }) => (
										<Switch
											id='autoSavePreset'
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									)}
								/>
							</div>
							<p className='text-xs text-muted-foreground w-[80%]'>
								After a successful brew, saves the target weight as the new
								preset. Saves to decaf preset if you have a decaf start time set
								and it&apos;s past that hour.
							</p>
						</div>

						<div className='flex flex-col gap-1'>
							<div className='flex items-center justify-between'>
								<Label htmlFor='earlyStop' className='font-medium text-base'>
									Early Stop
								</Label>
								<Controller
									name='earlyStop'
									control={form.control}
									render={({ field }) => (
										<Switch
											id='earlyStop'
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									)}
								/>
							</div>
							<p className='text-xs text-muted-foreground w-[80%]'>
								Ends the drip phase early if weight hasn&apos;t increased by
								0.1g in 2 seconds.
							</p>
						</div>

						<div className='flex flex-col gap-1'>
							<div className='flex items-center justify-between'>
								<Label htmlFor='swapButtons' className='font-medium text-base'>
									Swap Cup Buttons
								</Label>
								<Controller
									name='swapButtons'
									control={form.control}
									render={({ field }) => (
										<Switch
											id='swapButtons'
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									)}
								/>
							</div>
							<p className='text-xs text-muted-foreground w-[80%]'>
								Swaps the functions of the 1-Cup & 2-Cup buttons. By default
								2-cup button wakes the ESP, when enabled the 1-cup button wakes
								the ESP.
							</p>
						</div>

						<div className='flex flex-col gap-1'>
							<div className='flex items-center justify-between'>
								<Label
									htmlFor='halfForTwoCup'
									className='font-medium text-base'
								>
									Use Half Weight for Volumetric Brew
								</Label>
								<Controller
									name='halfForTwoCup'
									control={form.control}
									render={({ field }) => (
										<Switch
											id='halfForTwoCup'
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									)}
								/>
							</div>
							<p className='text-xs text-muted-foreground w-[80%]'>
								The volumetric brew button (1-cup by default) will use half of
								the preset weight.
							</p>
						</div>

						<hr className='border-input-border' />

						<div className='space-y-4'>
							<Controller
								name='timezone'
								control={form.control}
								render={({ field }) => (
									<Field>
										<FieldLabel>Timezone</FieldLabel>
										<Select
											key={field.value}
											onValueChange={field.onChange}
											value={field.value}
										>
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
											key={field.value}
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

						<Separator />

						<Accordion
							type='single'
							collapsible
							className='rounded-xl border border-border/60 bg-muted/20'
						>
							<AccordionItem value='advanced' className='border-none'>
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

						<Separator />

						{isFullMode && user && (
							<div>
								<div className='flex flex-col gap-2 mb-4'>
									<Label className='font-medium text-base'>
										Brew Bar Integration
									</Label>
									<p className='text-xs text-muted-foreground'>
										Link this device to a brew bar for automatic brew logging
										when the app is closed
									</p>
								</div>

								{prefsError && (
									<p className='text-xs text-muted-foreground mb-3'>
										Unable to read the device’s saved integration. Check its
										connection and refresh settings.
									</p>
								)}
								{prefs && integration === null && (
									<p className='text-xs text-muted-foreground mb-3'>
										This firmware cannot report its saved link status.
										Auto-logging may already be configured; selecting a bar will
										replace that link.
									</p>
								)}

								{isLinked ? (
									<div className='space-y-3'>
										<div className='p-3 bg-muted rounded-md'>
											<p className='text-sm font-medium'>
												Linked to: {linkedBarName}
											</p>
											{!isLocalIntegration && (
												<p className='text-xs text-muted-foreground mt-1 break-all'>
													Server: {integration?.apiUrl || 'Not reported'}. This
													is not the current Bru server.
												</p>
											)}
											{isLocalIntegration && !linkedBarId && (
												<p className='text-xs text-muted-foreground mt-1'>
													This link was saved without a brew bar ID. Unlink and
													link it again once to show the bar here.
												</p>
											)}
										</div>
										<Button
											type='button'
											onClick={handleUnlinkDevice}
											variant='outline'
											disabled={isLinking}
										>
											{isLinking ? 'Unlinking...' : 'Unlink Device'}
										</Button>
									</div>
								) : (
									<div className='space-y-3'>
										<Select
											onValueChange={(value) =>
												handleLinkDevice(parseInt(value))
											}
											disabled={isLinking || !isDeviceConfigured || !prefs}
										>
											<SelectTrigger>
												<SelectValue placeholder='Select brew bar...' />
											</SelectTrigger>
											<SelectContent>
												{availableBars.map((bar) => (
													<SelectItem key={bar.id} value={bar.id.toString()}>
														{bar.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{prefs && integration === null && (
											<Button
												type='button'
												variant='outline'
												onClick={handleUnlinkDevice}
												disabled={isLinking}
											>
												Clear Device Link
											</Button>
										)}
										{!isDeviceConfigured && (
											<p className='text-xs text-muted-foreground'>
												Configure ESP device IP first to enable linking
											</p>
										)}
									</div>
								)}

								{isLinked && (
									<div className='mt-4 p-3 bg-muted/50 rounded-md border border-muted-foreground/20'>
										<div className='flex items-start gap-2'>
											<Info className='h-4 w-4 mt-0.5 text-muted-foreground shrink-0' />
											<div className='space-y-2 text-xs text-muted-foreground'>
												<p className='font-medium text-foreground'>
													How Auto-Logging Works
												</p>
												<ul className='space-y-1 list-disc list-inside'>
													<li>
														Brews are logged automatically only when the app is
														closed (no active connections)
													</li>
													<li>
														Bean selection is based on your decaf hour setting:
														regular before, decaf after
													</li>
													<li>
														Brews are attributed to the brew bar owner and use
														settings from the last brew with that bean
													</li>
													<li>
														The device will beep 4 times (instead of 3) when a
														brew is successfully logged
													</li>
												</ul>
												<p className='text-muted-foreground/80 italic mt-2'>
													Configure default beans in the brew bar&apos;s
													Auto-Logging settings
												</p>
											</div>
										</div>
									</div>
								)}
								<Separator />
							</div>
						)}

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

					<div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-2'>
						{isLoadingData ? (
							<div className='flex justify-center py-8'>
								<Spinner />
							</div>
						) : shotData ? (
							<div className='min-h-0 flex-1 flex flex-col'>
								<div className='grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg text-sm shrink-0'>
									<div>
										<div className='text-muted-foreground text-xs uppercase tracking-wider'>
											Split/Single Bias
										</div>
										<div className='font-mono font-bold'>
											{shotData.p0.bias.toFixed(2)}g
										</div>
									</div>
									<div>
										<div className='text-muted-foreground text-xs uppercase tracking-wider'>
											Full/Double Bias
										</div>
										<div className='font-mono font-bold'>
											{shotData.p1.bias.toFixed(2)}g
										</div>
									</div>
									<div>
										<div className='text-muted-foreground text-xs uppercase tracking-wider'>
											System Lag
										</div>
										<div className='font-mono font-bold'>
											{prefs?.systemLag?.toFixed(2) ?? '--'}s
										</div>
									</div>
								</div>

								{shotData.shots.length > 0 ? (
									<div className='space-y-2 flex-1 flex flex-col min-h-0 mt-2'>
										{regressionChart && (
											<div className='shrink-0 rounded-lg border border-border/60 bg-background/70 p-4'>
												<div className='mb-3'>
													<div>
														<div className='text-sm font-medium'>
															Flow vs drippage
														</div>
													</div>
												</div>
												<Tabs
													defaultValue={regressionChart.p0 ? 'p0' : 'p1'}
													className='w-full'
												>
													<TabsList className='mb-3 grid w-full grid-cols-2'>
														<TabsTrigger value='p0'>Split / Single</TabsTrigger>
														<TabsTrigger value='p1'>Full / Double</TabsTrigger>
													</TabsList>
													<TabsContent value='p0' className='mt-0'>
														{regressionChart.p0 ? (
															<RegressionProfileChart
																series={regressionChart.p0}
															/>
														) : (
															<div className='flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground'>
																No split/single shots yet.
															</div>
														)}
													</TabsContent>
													<TabsContent value='p1' className='mt-0'>
														{regressionChart.p1 ? (
															<RegressionProfileChart
																series={regressionChart.p1}
															/>
														) : (
															<div className='flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground'>
																No full/double shots yet.
															</div>
														)}
													</TabsContent>
												</Tabs>
											</div>
										)}

										<div className='grid grid-cols-5 gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider px-2 shrink-0'>
											<div>ID</div>
											<div>Target</div>
											<div>Final</div>
											<div>Flow</div>
											<div></div>
										</div>
										<div className='h-72 min-h-24 flex-auto overflow-y-auto rounded-md border'>
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
										</div>
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
