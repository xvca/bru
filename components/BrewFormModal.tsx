import { useState, useEffect } from 'react'
import axios from 'axios'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Bean, Brewer, Grinder } from 'generated/prisma/client'
import { BREW_METHODS, brewSchema, type BrewFormData } from '@/lib/validators'
import { useBrew } from '@/hooks/useBrew'
import { cn } from '@/lib/utils'

import { Sheet } from '@/components/kit/Sheet'
import { Chip, Key, TextButton } from '@/components/kit/buttons'
import { ChevronIcon, StarIcon } from '@/components/kit/icons'
import { OptionRow } from '@/components/kit/Picker'
import { RowSkeleton } from '@/components/kit/states'
import { BeanPicker } from '@/components/BeanPicker'
import { TimeInput } from '@/components/TimeInput'
import { ConfirmModal } from '@/components/ConfirmModal'

interface BrewFormProps {
	isOpen: boolean
	onClose: () => void
	brewId?: number
	onSuccess?: () => void
	initialData?: Partial<BrewFormData>
	/** Opened from the dial after a shot: title reads "Log this shot" */
	afterShot?: boolean
}

// Empty number fields are null, not 0, so optional values stay optional
const toNumberish = (v: string) => (v.trim() === '' ? null : v)
// Stored numbers read as 18.0 / 14.5; what the user types is left alone
const asText = (v: unknown, digits = 1) => {
	if (v === null || v === undefined || v === 0 || v === '') return ''
	if (typeof v !== 'number') return String(v)
	return digits === 0 || !Number.isInteger(v * 10)
		? String(v)
		: v.toFixed(digits)
}

const labelClass = 'text-[12.5px] text-ink-2'
const resultInput =
	'h-9 w-full rounded-none border-0 border-b-[1.5px] border-transparent bg-transparent p-0 font-mono text-[22px] font-medium text-ink outline-none placeholder:text-ink-2/60 focus:border-accent'

const defaultValues: Partial<BrewFormData> = {
	beanId: 0,
	method: 'Espresso',
	doseWeight: 18,
	yieldWeight: 36,
	brewTime: 0,
	grindSize: 0,
	waterTemperature: 93,
	rating: 0,
	notes: '',
	brewerId: undefined,
	grinderId: undefined,
}

export default function BrewForm({
	isOpen,
	onClose,
	brewId,
	onSuccess,
	initialData,
	afterShot,
}: BrewFormProps) {
	const isEditMode = !!brewId

	const [isLoading, setIsLoading] = useState(false)
	const [isFormDataLoading, setIsFormDataLoading] = useState(false)
	const [picker, setPicker] = useState<'bean' | 'equipment' | null>(null)
	const [confirmDelete, setConfirmDelete] = useState(false)

	const [beans, setBeans] = useState<Bean[]>([])
	const [brewers, setBrewers] = useState<Brewer[]>([])
	const [grinders, setGrinders] = useState<Grinder[]>([])

	const { brew, isLoading: isFetching } = useBrew(
		isOpen && isEditMode ? brewId : undefined,
	)

	const form = useForm<BrewFormData>({
		resolver: zodResolver(brewSchema),
		defaultValues: {
			...defaultValues,
			...(initialData ?? {}),
		},
	})

	const watchedBeanId = useWatch({ control: form.control, name: 'beanId' })
	const watchedBrewerId = useWatch({ control: form.control, name: 'brewerId' })
	const watchedGrinderId = useWatch({
		control: form.control,
		name: 'grinderId',
	})
	const watchedMethod = useWatch({ control: form.control, name: 'method' })
	const watchedDose = useWatch({ control: form.control, name: 'doseWeight' })
	const watchedYield = useWatch({ control: form.control, name: 'yieldWeight' })

	useEffect(() => {
		if (isOpen) {
			setIsFormDataLoading(true)
			const fetchData = async () => {
				try {
					const [beansRes, brewersRes, grindersRes] = await Promise.all([
						axios.get('/api/beans'),
						axios.get('/api/brewers'),
						axios.get('/api/grinders'),
					])

					setBeans(beansRes.data)
					setBrewers(brewersRes.data)
					setGrinders(grindersRes.data)
				} catch (error) {
					console.error('Error loading form data:', error)
					toast.error('Failed to load beans or methods')
				} finally {
					setIsFormDataLoading(false)
				}
			}
			fetchData()
		}
	}, [isOpen])

	useEffect(() => {
		if (isOpen) {
			if (isEditMode && brew) {
				form.reset({
					...brew,
					beanId: brew.beanId,
					method: brew.method,
					brewerId: brew.brewerId || undefined,
					grinderId: brew.grinderId || undefined,
				})
			} else if (!isEditMode) {
				form.reset({
					...defaultValues,
					...(initialData ?? {}),
				})
			}
		}
	}, [isOpen, isEditMode, brew, initialData, form])

	useEffect(() => {
		const controller = new AbortController()
		const fetchLastBrew = async () => {
			if (!watchedBeanId || isEditMode || initialData || !isOpen) {
				return
			}

			try {
				const response = await axios.get('/api/brews/last-parameters', {
					signal: controller.signal,
					params: {
						beanId: watchedBeanId,
						brewerId: watchedBrewerId ?? undefined,
						method: watchedMethod,
					},
					validateStatus: (status) => status === 200 || status === 404,
				})

				if (response.status === 200 && response.data) {
					for (const field of [
						'doseWeight',
						'yieldWeight',
						'brewTime',
						'grindSize',
						'waterTemperature',
						'brewerId',
						'grinderId',
					] as const) {
						if (!form.getFieldState(field).isDirty)
							form.setValue(field, response.data[field] ?? undefined)
					}
				}
			} catch (error) {
				if (!axios.isCancel(error))
					console.error('Error fetching last brew:', error)
			}
		}

		const timer = setTimeout(fetchLastBrew, 300)
		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [
		watchedBeanId,
		watchedBrewerId,
		watchedMethod,
		isOpen,
		isEditMode,
		initialData,
		form,
	])

	const onSubmit = async (data: BrewFormData) => {
		try {
			setIsLoading(true)

			if (isEditMode) {
				await axios.put(`/api/brews/${brewId}`, data)
				toast.success('Brew updated successfully')
			} else {
				await axios.post('/api/brews', data)
				toast.success('Brew added successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving brew:', error)
			toast.error('Failed to save brew')
		} finally {
			setIsLoading(false)
		}
	}

	const onDelete = async () => {
		if (!brewId) return
		try {
			await axios.delete(`/api/brews/${brewId}`)
			toast.success('Brew deleted successfully')
			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error deleting brew:', error)
			toast.error('Failed to delete brew')
		}
	}

	useEffect(() => {
		if (!isOpen) {
			form.reset()
			setPicker(null)
		}
	}, [isOpen, form])

	useEffect(() => {
		if (watchedBrewerId) {
			const selectedBrewer = brewers.find((b) => b.id === watchedBrewerId)
			if (selectedBrewer && selectedBrewer.type) {
				form.setValue('method', selectedBrewer.type)
			}
		}
	}, [watchedBrewerId, brewers, form])

	const isDataLoading = isFetching || isFormDataLoading

	const bean = beans.find((b) => b.id === watchedBeanId)
	const brewer = brewers.find((b) => b.id === watchedBrewerId)
	const grinder = grinders.find((g) => g.id === watchedGrinderId)
	const dose = Number(watchedDose)
	const yieldN = Number(watchedYield)
	const ratio =
		dose > 0 && yieldN > 0 ? `1 : ${(yieldN / dose).toFixed(1)}` : '–'

	const title = isEditMode
		? 'Edit shot'
		: afterShot
			? 'Log this shot'
			: 'Log a shot'

	const errors = form.formState.errors

	const beanRow = (
		<Controller
			name='beanId'
			control={form.control}
			render={({ fieldState }) => (
				<div>
					<button
						type='button'
						onClick={() => setPicker('bean')}
						aria-label='Change bean'
						className='flex min-h-14 w-full items-center justify-between gap-2.5 border-t border-line py-1.5 text-left outline-offset-[-2px]'
					>
						<span className='flex min-w-0 flex-col gap-[3px]'>
							<span className={labelClass}>Bean</span>
							<span
								role={fieldState.error ? 'alert' : undefined}
								className={cn(
									'truncate text-[17px] font-semibold',
									!bean && 'font-normal text-ink-2',
									!bean && fieldState.error && 'text-danger',
								)}
							>
								{bean?.name ?? 'Choose a bean'}
							</span>
						</span>
						<ChevronIcon className='shrink-0 text-ink-2' />
					</button>
				</div>
			)}
		/>
	)

	const ratingRow = (
		<Controller
			name='rating'
			control={form.control}
			render={({ field }) => {
				const rating = field.value || 0
				return (
					<div className='flex h-14 items-center justify-between border-t border-line'>
						<span className={labelClass}>Rating</span>
						<div role='group' aria-label='Rating' className='-mr-2 flex'>
							{[1, 2, 3, 4, 5].map((n) => (
								<button
									key={n}
									type='button'
									aria-label={`${n} star${n === 1 ? '' : 's'}`}
									aria-pressed={rating >= n}
									onClick={() => field.onChange(rating === n ? 0 : n)}
									className={cn(
										'flex size-11 items-center justify-center rounded-[10px] outline-offset-[-2px] transition-colors',
										rating >= n ? 'text-star' : 'text-line',
									)}
								>
									<StarIcon filled={rating >= n} />
								</button>
							))}
						</div>
					</div>
				)
			}}
		/>
	)

	const notesField = (grow: boolean) => (
		<Controller
			name='notes'
			control={form.control}
			render={({ field }) => (
				<div
					className={cn(
						'flex flex-col',
						grow
							? 'min-h-24 flex-1 justify-end pt-3'
							: 'border-t border-line pt-3 pb-1',
					)}
				>
					<label htmlFor='notes' className={cn(labelClass, 'mb-2')}>
						Notes
					</label>
					<textarea
						{...field}
						id='notes'
						value={field.value || ''}
						placeholder='Taste, what to change next time'
						className={cn('notes', grow ? 'min-h-24 flex-1' : 'h-[92px]')}
					/>
				</div>
			)}
		/>
	)

	const results = (
		<div className='flex h-16 border-t border-line'>
			<Controller
				name='yieldWeight'
				control={form.control}
				render={({ field }) => (
					<label className='flex flex-1 flex-col justify-center gap-0.5'>
						<span className={labelClass}>Yield g</span>
						<input
							{...field}
							value={asText(field.value)}
							onChange={(e) => field.onChange(toNumberish(e.target.value))}
							onFocus={(e) => e.target.select()}
							inputMode='decimal'
							placeholder='36.0'
							aria-invalid={!!errors.yieldWeight}
							className={resultInput}
						/>
					</label>
				)}
			/>
			<Controller
				name='brewTime'
				control={form.control}
				render={({ field }) => (
					<label className='flex flex-1 flex-col justify-center gap-0.5 border-l border-line pl-3.5'>
						<span className={labelClass}>Time</span>
						<TimeInput
							value={field.value || null}
							onChange={field.onChange}
							onBlur={field.onBlur}
							aria-label='Brew time, minutes and seconds'
							className={resultInput}
						/>
					</label>
				)}
			/>
			<div className='flex flex-1 flex-col justify-center gap-0.5 border-l border-line pl-3.5'>
				<span className={labelClass}>Ratio</span>
				<span className='flex h-9 items-center font-mono text-[22px] font-medium'>
					{ratio}
				</span>
			</div>
		</div>
	)

	const numberField = (
		name: 'doseWeight' | 'waterTemperature' | 'grindSize',
		label: string,
		placeholder: string,
	) => (
		<Controller
			name={name}
			control={form.control}
			render={({ field, fieldState }) => (
				<label className='flex min-w-0 flex-1 flex-col gap-0.5'>
					<span className={labelClass}>{label}</span>
					<input
						{...field}
						value={asText(field.value, name === 'waterTemperature' ? 0 : 1)}
						onChange={(e) => field.onChange(toNumberish(e.target.value))}
						onFocus={(e) => e.target.select()}
						inputMode='decimal'
						placeholder={placeholder}
						aria-invalid={fieldState.invalid}
						className='fin font-mono text-[24px] font-medium'
					/>
					{fieldState.error && (
						<span role='alert' className='mt-1 text-[12px] text-danger'>
							{name === 'doseWeight' ? 'Enter a dose' : 'Check this value'}
						</span>
					)}
				</label>
			)}
		/>
	)

	const inputs = (
		<div className='flex gap-3.5 border-t border-line pt-3 pb-3.5'>
			{numberField('doseWeight', 'Dose g', '18.0')}
			{numberField('waterTemperature', 'Temp °C', '93')}
			{numberField('grindSize', 'Grind', '14.5')}
		</div>
	)

	const equipmentRow = (
		<button
			type='button'
			onClick={() => setPicker('equipment')}
			className='flex min-h-[60px] w-full items-center justify-between gap-2.5 border-t border-line py-2 text-left outline-offset-[-2px]'
		>
			<span className='flex min-w-0 flex-col gap-[3px]'>
				<span className={labelClass}>Equipment</span>
				<span className='truncate text-[15px] font-medium'>
					{brewer?.name ?? 'No brewer'}
					<span className='text-ink-2'> · {watchedMethod}</span>
				</span>
				<span className='truncate text-[15px] font-medium'>
					{grinder ? (
						<>
							{grinder.name}
							{grinder.burrType && (
								<span className='text-ink-2'> · {grinder.burrType}</span>
							)}
						</>
					) : (
						<span className='text-ink-2'>No grinder</span>
					)}
				</span>
			</span>
			<ChevronIcon className='shrink-0 text-ink-2' />
		</button>
	)

	return (
		<>
			<Sheet
				open={isOpen}
				onClose={onClose}
				title={title}
				size='tall'
				action={
					<TextButton underline onClick={onClose} className='-mr-1 text-[13px]'>
						{isEditMode ? 'Cancel' : afterShot ? 'Skip' : 'Cancel'}
					</TextButton>
				}
				bodyClassName='flex flex-col'
				footer={
					<div className='flex items-center gap-2.5 pb-1.5'>
						{isEditMode && (
							<TextButton
								tone='danger'
								onClick={() => setConfirmDelete(true)}
								className='px-2.5 text-[15px]'
							>
								Delete
							</TextButton>
						)}
						<Key
							type='submit'
							form='brew-form'
							disabled={isLoading || isDataLoading}
							className='h-16 flex-1 text-[18px]'
						>
							{isLoading ? 'Saving…' : isEditMode ? 'Update shot' : 'Save shot'}
						</Key>
					</div>
				}
			>
				{isDataLoading ? (
					<RowSkeleton rows={4} variant='simple' />
				) : (
					<form
						id='brew-form'
						onSubmit={form.handleSubmit(onSubmit)}
						className='flex min-h-full flex-1 flex-col pb-3.5'
					>
						{beanRow}
						{isEditMode ? (
							<>
								{notesField(false)}
								{ratingRow}
								{results}
								{inputs}
								{equipmentRow}
							</>
						) : (
							<>
								{results}
								{inputs}
								{equipmentRow}
								{ratingRow}
								{notesField(true)}
							</>
						)}
					</form>
				)}
			</Sheet>

			<BeanPicker
				open={picker === 'bean'}
				onClose={() => setPicker(null)}
				beans={beans}
				value={watchedBeanId || null}
				onChange={(id) =>
					form.setValue('beanId', id, {
						shouldDirty: true,
						shouldValidate: form.formState.isSubmitted,
					})
				}
			/>

			<Sheet
				open={picker === 'equipment'}
				onClose={() => setPicker(null)}
				title='Equipment'
				size='tall'
				action={
					<TextButton
						underline
						onClick={() => setPicker(null)}
						className='-mr-1 text-[13px]'
					>
						Done
					</TextButton>
				}
				bodyClassName='pb-6'
			>
				<div className='mb-1 text-[13px] font-semibold text-ink-2'>Method</div>
				<div className='flex flex-wrap gap-2 pt-1.5'>
					{BREW_METHODS.map((m) => (
						<Chip
							key={m}
							size='sm'
							on={watchedMethod === m}
							onClick={() => form.setValue('method', m, { shouldDirty: true })}
						>
							{m}
						</Chip>
					))}
				</div>

				<div className='mt-6 mb-1 text-[13px] font-semibold text-ink-2'>
					Brewer
				</div>
				<div role='listbox' aria-label='Brewer'>
					<OptionRow
						first
						label='No brewer'
						selected={!watchedBrewerId}
						onClick={() =>
							form.setValue('brewerId', null, { shouldDirty: true })
						}
					/>
					{brewers.map((b) => (
						<OptionRow
							key={b.id}
							label={b.name}
							sub={b.type}
							selected={watchedBrewerId === b.id}
							onClick={() =>
								form.setValue('brewerId', b.id, { shouldDirty: true })
							}
						/>
					))}
				</div>

				<div className='mt-6 mb-1 text-[13px] font-semibold text-ink-2'>
					Grinder
				</div>
				<div role='listbox' aria-label='Grinder'>
					<OptionRow
						first
						label='No grinder'
						selected={!watchedGrinderId}
						onClick={() =>
							form.setValue('grinderId', null, { shouldDirty: true })
						}
					/>
					{grinders.map((g) => (
						<OptionRow
							key={g.id}
							label={g.name}
							sub={g.burrType}
							selected={watchedGrinderId === g.id}
							onClick={() =>
								form.setValue('grinderId', g.id, { shouldDirty: true })
							}
						/>
					))}
				</div>
			</Sheet>

			<ConfirmModal
				open={confirmDelete}
				onClose={() => setConfirmDelete(false)}
				onConfirm={onDelete}
				title='Delete shot?'
				description="This shot will be removed. This can't be undone."
				confirmLabel='Delete'
			/>
		</>
	)
}
