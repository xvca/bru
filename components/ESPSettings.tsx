import AutoLoggingModal from '@/components/AutoLoggingModal'
import { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	DEFAULT_MAX_SHOT_WEIGHT,
	MAX_CONFIGURABLE_SHOT_WEIGHT,
	espPrefsSchema,
	type ESPPrefsFormData,
} from '@/lib/validators'
import { useEspConfig } from '@/lib/espConfigContext'
import { verifyEspReachable } from '@/utils/esp'
import { isSameBruServer } from '@/lib/espIntegration'
import { cn } from '@/lib/utils'
import type { Bean } from '@/generated/prisma/client'

import { Switch } from '@/components/ui/switch'
import { Key, NeutralKey, TextButton } from '@/components/kit/buttons'
import {
	FormField,
	Hint,
	SectionLabel,
	StatusDot,
	ValueRow,
} from '@/components/kit/rows'
import { PickerSheet } from '@/components/kit/Picker'
import { RowSkeleton } from '@/components/kit/states'
import { ChevronIcon } from '@/components/kit/icons'

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

const hourLabel = (i: number) =>
	i === -1
		? 'Disabled'
		: i === 0
			? '12:00 AM'
			: i < 12
				? `${i}:00 AM`
				: i === 12
					? '12:00 PM'
					: `${i - 12}:00 PM`

enum PreinfusionMode {
	SIMPLE = 0,
	WEIGHT_TRIGGERED = 1,
}

const sanitizeIp = (value: string | null) => {
	if (!value) return ''
	return value
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')
}

type SwitchName =
	'isEnabled' | 'autoSavePreset' | 'earlyStop' | 'swapButtons' | 'halfForTwoCup'

const BEHAVIOUR: { name: SwitchName | 'pMode'; title: string; desc: string }[] =
	[
		{
			name: 'isEnabled',
			title: 'Enable device',
			desc: 'When off, the machine works normally without auto-stop.',
		},
		{
			name: 'pMode',
			title: 'Weight-triggered preinfusion',
			desc: 'Holds preinfusion until the scale reads 2+ grams.',
		},
		{
			name: 'autoSavePreset',
			title: 'Auto-save preset',
			desc: 'After a successful brew, saves the target weight as the new preset (the decaf preset after your decaf start time).',
		},
		{
			name: 'earlyStop',
			title: 'Early stop',
			desc: 'Ends the drip phase early if weight has not increased by 0.1 g in 2 seconds.',
		},
		{
			name: 'swapButtons',
			title: 'Swap cup buttons',
			desc: 'Swaps the 1-Cup and 2-Cup buttons. By default the 2-cup button wakes the ESP.',
		},
		{
			name: 'halfForTwoCup',
			title: 'Half weight for volumetric brew',
			desc: 'The volumetric button (1-cup by default) uses half the preset weight.',
		},
	]

const unitInput = 'fin font-mono text-[19px] font-medium'

export default function ESPSettings() {
	const [isSaving, setIsSaving] = useState(false)

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
	const isFullMode = process.env.NEXT_PUBLIC_LITE !== 'true'
	const isLinked = integration?.configured === true
	const isLocalIntegration =
		integration !== null &&
		typeof window !== 'undefined' &&
		isSameBruServer(integration.apiUrl, window.location.origin)
	const [isLinking, setIsLinking] = useState(false)
	const [isAutoLoggingOpen, setIsAutoLoggingOpen] = useState(false)

	const [ipInput, setIpInput] = useState('')
	const [isValidatingIp, setIsValidatingIp] = useState(false)

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
	}, [prefs, form])

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

			if (isFullMode) {
				await axios.put('/api/preferences', {
					decafStartHour: data.decafStartHour,
				})
			}

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

	const handleLinkDevice = async () => {
		if (!isFullMode || !api) return

		setIsLinking(true)
		try {
			const { data } = await axios.post('/api/device-token', {
				deviceName: 'Autobru ESP',
			})
			await api.post('/token', {
				apiUrl: window.location.origin,
				apiToken: data.token,
			})
			await refreshPrefs()
			toast.success('Auto-logging enabled')
		} catch (error) {
			console.error('Error enabling auto-logging:', error)
			toast.error('Failed to enable auto-logging')
		} finally {
			setIsLinking(false)
		}
	}

	const handleUnlinkDevice = async () => {
		if (!isFullMode || !api) return

		setIsLinking(true)
		try {
			await api.post('/token', {
				apiUrl: '',
				apiToken: '',
			})

			await axios.delete('/api/device-token')
			await refreshPrefs()
			toast.success('Auto-logging disabled')
		} catch (error) {
			console.error('Error disabling auto-logging:', error)
			toast.error('Failed to disable auto-logging')
		} finally {
			setIsLinking(false)
		}
	}

	const isDeviceConfigured = Boolean(api)
	const [picker, setPicker] = useState<'timezone' | 'decaf' | null>(null)
	const [advancedOpen, setAdvancedOpen] = useState(false)
	const [justSaved, setJustSaved] = useState(false)
	const [autoLogBeans, setAutoLogBeans] = useState<{
		regular: Bean | null
		decaf: Bean | null
	} | null>(null)

	const isDirty = form.formState.isDirty
	useEffect(() => {
		if (isDirty) setJustSaved(false)
	}, [isDirty])

	const loadAutoLogBeans = useCallback(async () => {
		if (!isFullMode) return
		try {
			const [beansRes, settingsRes] = await Promise.all([
				axios.get<Bean[]>('/api/beans'),
				axios.get('/api/auto-logging'),
			])
			const find = (id: number | null) =>
				beansRes.data.find((b) => b.id === id) ?? null
			setAutoLogBeans({
				regular: find(settingsRes.data.defaultRegularBeanId),
				decaf: find(settingsRes.data.defaultDecafBeanId),
			})
		} catch {
			setAutoLogBeans(null)
		}
	}, [isFullMode])

	useEffect(() => {
		void loadAutoLogBeans()
	}, [loadAutoLogBeans])

	const timezone = useWatch({ control: form.control, name: 'timezone' })
	const decafStartHour = useWatch({
		control: form.control,
		name: 'decafStartHour',
	})
	const systemLag = useWatch({ control: form.control, name: 'systemLag' })
	const learningRate = useWatch({ control: form.control, name: 'learningRate' })

	const tzLabel =
		TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone ?? '–'
	const lagText = Number.isFinite(Number(systemLag))
		? Number(systemLag).toFixed(2)
		: '–'
	const rateText = Number.isFinite(Number(learningRate))
		? Math.round(Number(learningRate) * 100)
		: '–'

	const submitWithFeedback = form.handleSubmit(async (data) => {
		await onSubmit(data)
		if (!form.formState.isDirty) setJustSaved(true)
	})

	if (isLoadingPrefs) {
		return (
			<div className='px-5 pt-6'>
				<RowSkeleton rows={5} variant='simple' />
			</div>
		)
	}

	return (
		<>
			<div className='px-5 pb-28'>
				<SectionLabel className='mt-3.5'>Device</SectionLabel>
				<FormField label='Address' htmlFor='esp-address'>
					<div className='flex items-center gap-2'>
						<input
							id='esp-address'
							className={unitInput}
							placeholder='192.168.1.42'
							value={ipInput}
							onChange={(e) => setIpInput(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleSaveIp()}
							autoComplete='off'
							autoCapitalize='off'
							spellCheck={false}
							inputMode='url'
						/>
						<TextButton
							tone='accent'
							onClick={handleSaveIp}
							disabled={isValidatingIp}
							className='shrink-0 px-0.5'
						>
							{isValidatingIp ? 'Checking…' : 'Save IP'}
						</TextButton>
					</div>
				</FormField>
				<Hint>
					Local IP or hostname of your Autobru ESP, without http://. Used for
					the API and the live scale feed.
				</Hint>
				{!isDeviceConfigured && (
					<p className='mt-3 flex items-center gap-2 text-[14px] font-medium'>
						<StatusDot tone='warning' />
						Add your Autobru&apos;s address to load its settings.
					</p>
				)}
				{isDeviceConfigured && prefsError && (
					<p className='mt-3 flex items-center gap-2 text-[14px] font-medium'>
						<StatusDot tone='danger' />
						Couldn&apos;t reach the machine at this address.
					</p>
				)}
				{isDeviceConfigured && !prefsError && prefs && (
					<p className='mt-3 flex items-center gap-2 text-[14px] font-medium'>
						<StatusDot tone='green' />
						Connected
					</p>
				)}

				<form
					id='esp-form'
					onSubmit={submitWithFeedback}
					className={cn(
						!isDeviceConfigured && 'pointer-events-none opacity-50',
					)}
				>
					<fieldset disabled={!isDeviceConfigured} className='contents'>
						<SectionLabel>Presets</SectionLabel>
						<div className='grid grid-cols-2 gap-5'>
							{(['regularPreset', 'decafPreset'] as const).map((name) => (
								<Controller
									key={name}
									name={name}
									control={form.control}
									render={({ field, fieldState }) => (
										<FormField
											label={name === 'regularPreset' ? 'Regular' : 'Decaf'}
											htmlFor={name}
											error={fieldState.error?.message}
										>
											<div className='flex items-baseline gap-1.5'>
												<input
													{...field}
													id={name}
													type='number'
													step='0.1'
													min='1'
													max={maxPresetWeight}
													inputMode='decimal'
													aria-invalid={fieldState.invalid}
													onFocus={(e) => e.target.select()}
													className='fin h-14 font-mono text-[34px] font-medium'
												/>
												<span className='font-mono font-medium text-ink-2'>
													g
												</span>
											</div>
										</FormField>
									)}
								/>
							))}
						</div>

						<Controller
							name='maxShotWeight'
							control={form.control}
							render={({ field, fieldState }) => (
								<FormField
									label='Maximum shot yield'
									htmlFor='maxShotWeight'
									error={fieldState.error?.message}
									className='mt-[18px]'
								>
									<div className='flex max-w-[220px] items-baseline gap-1.5'>
										<input
											{...field}
											id='maxShotWeight'
											value={field.value ?? DEFAULT_MAX_SHOT_WEIGHT}
											type='number'
											step='0.1'
											min={1}
											max={MAX_CONFIGURABLE_SHOT_WEIGHT}
											inputMode='decimal'
											disabled={!supportsMaxShotWeight}
											aria-describedby='max-shot-weight-description'
											aria-invalid={fieldState.invalid}
											onFocus={(e) => e.target.select()}
											className={unitInput}
										/>
										<span className='font-mono font-medium text-ink-2'>g</span>
									</div>
								</FormField>
							)}
						/>
						<Hint id='max-shot-weight-description'>
							Safety cap for targets and presets (up to{' '}
							{MAX_CONFIGURABLE_SHOT_WEIGHT} g), to stop an oversized shot
							starting by accident. The 90 second brew timeout still applies.
							{!supportsMaxShotWeight &&
								' This firmware does not support changing it.'}
						</Hint>

						<SectionLabel>Behaviour</SectionLabel>
						{BEHAVIOUR.map((row, i) => (
							<div
								key={row.name}
								className={cn(
									'flex min-h-11 items-center justify-between gap-4 py-3.5',
									i > 0 && 'border-t border-line',
								)}
							>
								<label htmlFor={row.name} className='min-w-0'>
									<div className='text-[16px] font-medium'>{row.title}</div>
									<Hint className='mt-0.5'>{row.desc}</Hint>
								</label>
								{row.name === 'pMode' ? (
									<Controller
										name='pMode'
										control={form.control}
										render={({ field }) => (
											<Switch
												id='pMode'
												checked={
													field.value === PreinfusionMode.WEIGHT_TRIGGERED
												}
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
								) : (
									<Controller
										name={row.name}
										control={form.control}
										render={({ field }) => (
											<Switch
												id={row.name}
												checked={!!field.value}
												onCheckedChange={field.onChange}
											/>
										)}
									/>
								)}
							</div>
						))}

						<SectionLabel>Time</SectionLabel>
						<ValueRow
							first
							chevron='down'
							title='Timezone'
							hint={tzLabel}
							onClick={() => setPicker('timezone')}
						/>
						<ValueRow
							chevron='down'
							title='Auto-decaf start time'
							hint={
								decafStartHour === -1
									? 'Disabled · always uses the regular preset'
									: `${hourLabel(decafStartHour)} · switches to the decaf preset after this`
							}
							onClick={() => setPicker('decaf')}
						/>
						{form.formState.errors.decafStartHour && (
							<p role='alert' className='text-[12.5px] text-danger'>
								{form.formState.errors.decafStartHour.message}
							</p>
						)}

						<SectionLabel>Flow tuning</SectionLabel>
						<ValueRow
							first
							chevron='none'
							title='Advanced flow tuning'
							hint={`Latency ${lagText} s · adaptation ${rateText}%`}
							aria-expanded={advancedOpen}
							onClick={() => setAdvancedOpen((o) => !o)}
						>
							<ChevronIcon
								className={cn(
									'shrink-0 text-ink-2 transition-transform',
									advancedOpen && 'rotate-180',
								)}
							/>
						</ValueRow>
						{advancedOpen && (
							<div className='flex flex-col gap-[22px] pt-1.5 pb-1 animate-in fade-in duration-200'>
								<Hint className='mt-0'>
									Autobru splits overshoot into system latency (how fast water
									is moving, so a turbo shot stops earlier) and drippage bias
									(what the portafilter holds back and drips after the stop,
									learned automatically).
								</Hint>
								<Controller
									name='systemLag'
									control={form.control}
									render={({ field, fieldState }) => (
										<div>
											<FormField
												label='System latency'
												htmlFor='systemLag'
												error={fieldState.error?.message}
											>
												<div className='flex max-w-[220px] items-baseline gap-1.5'>
													<input
														{...field}
														id='systemLag'
														type='number'
														step='0.01'
														min='0'
														max='2'
														inputMode='decimal'
														aria-invalid={fieldState.invalid}
														onFocus={(e) => e.target.select()}
														className={unitInput}
													/>
													<span className='font-mono font-medium text-ink-2'>
														s
													</span>
												</div>
											</FormField>
											<Hint>
												Time to turn the pump off plus bluetooth lag. Default
												1.0. Range 0 to 2.
											</Hint>
											<Hint className='mt-2'>
												To calibrate, set this and bias adaptation speed to 0.
												Pull a slow shot (1 to 2 g/s) and a fast one (4+ g/s),
												ideally bottomless, and note each overshoot O and final
												flow F. Latency is{' '}
												<span className='font-mono text-ink'>
													(O<sub>fast</sub> − O<sub>slow</sub>) / (F
													<sub>fast</sub> − F<sub>slow</sub>)
												</span>
												.
											</Hint>
										</div>
									)}
								/>
								<Controller
									name='learningRate'
									control={form.control}
									render={({ field, fieldState }) => (
										<div>
											<FormField
												label='Bias adaptation speed'
												htmlFor='learningRate'
												error={fieldState.error?.message}
											>
												<div className='flex max-w-[220px] items-baseline gap-2.5'>
													<input
														{...field}
														id='learningRate'
														type='number'
														step='0.01'
														min='0'
														max='1'
														inputMode='decimal'
														aria-invalid={fieldState.invalid}
														onFocus={(e) => e.target.select()}
														className={unitInput}
													/>
													<span className='font-mono font-medium text-ink-2'>
														{rateText}%
													</span>
												</div>
											</FormField>
											<Hint>
												How strongly the latest shot changes future predictions.
												0.2 is conservative (about 14 shots to calibrate), 0.5
												balanced (about 5), 0.8 reactive (about 2).
											</Hint>
										</div>
									)}
								/>
							</div>
						)}
					</fieldset>
				</form>

				{isFullMode && (
					<>
						<SectionLabel>Auto-logging</SectionLabel>
						<div className='flex items-center justify-between gap-3'>
							<div>
								<div className='text-[16px] font-medium'>Save shots to Bru</div>
								<div className='mt-0.5 flex items-center gap-[7px] text-[13px] leading-[18px] text-ink-2'>
									{prefsError ? (
										'Unable to read the saved link status'
									) : prefs && integration === null ? (
										'Link status is unavailable on this firmware'
									) : isLinked ? (
										<>
											<StatusDot tone='green' />
											{isLocalIntegration
												? 'Enabled'
												: 'Enabled for another Bru server'}
										</>
									) : (
										<>
											<StatusDot tone='ink2' />
											Off
										</>
									)}
								</div>
							</div>
							<NeutralKey
								onClick={isLinked ? handleUnlinkDevice : handleLinkDevice}
								disabled={isLinking || !isDeviceConfigured || !prefs}
								className='h-11 rounded-2xl px-5 text-[15px] tracking-normal normal-case'
							>
								{isLinking ? 'Saving…' : isLinked ? 'Disable' : 'Enable'}
							</NeutralKey>
						</div>
						<Hint>
							Shots pulled while the Brew screen isn&apos;t open are logged
							automatically, using the beans below.
						</Hint>
						<ValueRow
							className='mt-3.5'
							title='Beans for auto-logs'
							hint={
								autoLogBeans
									? `Regular: ${autoLogBeans.regular?.name ?? 'not set'} · Decaf: ${autoLogBeans.decaf?.name ?? 'not set'}`
									: 'Choose the regular and decaf bean'
							}
							onClick={() => setIsAutoLoggingOpen(true)}
						/>
					</>
				)}

				<SectionLabel>Learning</SectionLabel>
				<ValueRow
					first
					href='/settings/history'
					title='Shot history'
					hint='Learned drippage bias and past shots'
				/>
			</div>

			<div className='fixed inset-x-0 bottom-(--tabbar-h) z-20 border-t border-line bg-bg'>
				<div className='mx-auto max-w-xl px-5 pt-2.5 pb-3.5'>
					<Key
						type='submit'
						form='esp-form'
						disabled={!isDeviceConfigured || !isDirty || isSaving}
						className='h-[60px]'
					>
						{isSaving
							? 'Saving…'
							: justSaved && !isDirty
								? 'Saved'
								: 'Save changes'}
					</Key>
				</div>
			</div>

			<PickerSheet
				open={picker === 'timezone'}
				onClose={() => setPicker(null)}
				title='Timezone'
				size='tall'
				options={TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
				value={timezone}
				onChange={(v) => form.setValue('timezone', v, { shouldDirty: true })}
			/>

			<PickerSheet
				open={picker === 'decaf'}
				onClose={() => setPicker(null)}
				title='Auto-decaf start time'
				description='After this hour the machine uses the decaf preset, and decaf beans are suggested first.'
				size='tall'
				options={[-1, ...Array.from({ length: 24 }, (_, i) => i)].map((h) => ({
					value: h,
					label: hourLabel(h),
				}))}
				value={decafStartHour}
				onChange={(v) =>
					form.setValue('decafStartHour', v, {
						shouldDirty: true,
						shouldValidate: true,
					})
				}
			/>

			<AutoLoggingModal
				isOpen={isAutoLoggingOpen}
				onClose={() => setIsAutoLoggingOpen(false)}
				onSaved={loadAutoLogBeans}
			/>
		</>
	)
}
