import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parse } from 'date-fns'
import { beanSchema, type BeanFormData } from '@/lib/validators'
import { useBean } from '@/hooks/useBean'
import { cn } from '@/lib/utils'
import { resizeImage } from '@/utils/img'

import { Sheet } from '@/components/kit/Sheet'
import { Chip, Key, TextButton } from '@/components/kit/buttons'
import { FormField } from '@/components/kit/rows'
import { Switch } from '@/components/ui/switch'
import { SparkIcon } from '@/components/kit/icons'
import { RowSkeleton } from '@/components/kit/states'
import { DateField, DatePickerSheet } from '@/components/kit/DatePickerSheet'

const ROAST_LEVELS = [
	'Light',
	'Medium-Light',
	'Medium',
	'Medium-Dark',
	'Dark',
] as const

interface BeanFormModalProps {
	isOpen: boolean
	onClose: () => void
	beanId?: number
	onSuccess?: () => void
}

export default function BeanFormModal({
	isOpen,
	onClose,
	beanId,
	onSuccess,
}: BeanFormModalProps) {
	const isEditMode = !!beanId

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isRoastDateOpen, setIsRoastDateOpen] = useState(false)
	const [isFreezeDateOpen, setIsFreezeDateOpen] = useState(false)
	const [isAiEnabled, setIsAiEnabled] = useState(false)
	const [isScanning, setIsScanning] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)

	const { bean, isLoading: isFetching } = useBean(
		isOpen && isEditMode ? beanId : undefined,
	)

	const form = useForm<BeanFormData>({
		resolver: zodResolver(beanSchema),
		defaultValues: {
			name: '',
			roaster: '',
			origin: '',
			roastLevel: '',
			isDecaf: false,
			process: '',
			producer: '',
			roastDate: new Date().toISOString().split('T')[0],
			freezeDate: '',
			initialWeight: 250,
			remainingWeight: 250,
			notes: '',
		},
	})

	const roastDateWatcher = form.watch('roastDate')

	useEffect(() => {
		axios
			.get('/api/ai/config')
			.then((res) => setIsAiEnabled(res.data.enabled))
			.catch(() => setIsAiEnabled(false))
	}, [])

	useEffect(() => {
		if (isOpen) {
			if (isEditMode && bean) {
				form.reset({
					name: bean.name,
					roaster: bean.roaster || '',
					origin: bean.origin || '',
					roastLevel: bean.roastLevel || '',
					isDecaf: bean.isDecaf,
					process: bean.process || '',
					producer: bean.producer || '',
					roastDate: new Date(bean.roastDate).toISOString().split('T')[0],
					freezeDate: bean.freezeDate
						? new Date(bean.freezeDate).toISOString().split('T')[0]
						: '',
					initialWeight: bean.initialWeight,
					remainingWeight: bean.remainingWeight ?? bean.initialWeight,
					notes: bean.notes || '',
				})
			} else if (!isEditMode) {
				form.reset({
					name: '',
					roaster: '',
					origin: '',
					roastLevel: '',
					isDecaf: false,
					process: '',
					producer: '',
					roastDate: new Date().toISOString().split('T')[0],
					freezeDate: '',
					initialWeight: 250,
					remainingWeight: 250,
					notes: '',
				})
			}
		}
	}, [isOpen, isEditMode, bean, form])

	const simulateTyping = async (field: keyof BeanFormData, value: string) => {
		if (!value) return
		form.setValue(field, '')
		const delay = value.length > 50 ? 5 : 15
		const step = value.length > 100 ? 5 : 1
		for (let i = 0; i <= value.length; i += step) {
			form.setValue(field, value.slice(0, i))
			await new Promise((resolve) => setTimeout(resolve, delay))
		}
		form.setValue(field, value)
	}

	const handleScanClick = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		setIsScanning(true)
		try {
			const base64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(reader.result as string)
				reader.onerror = reject
				reader.readAsDataURL(file)
			})

			const resizedBase64 = await resizeImage(base64)

			const response = await axios.post('/api/ai/scan-label', {
				image: resizedBase64,
			})
			const data = response.data

			if (data.name) await simulateTyping('name', data.name)
			if (data.roaster) await simulateTyping('roaster', data.roaster)
			if (data.origin) await simulateTyping('origin', data.origin)
			if (data.producer) await simulateTyping('producer', data.producer)
			if (data.process) await simulateTyping('process', data.process)

			if (data.roastLevel) form.setValue('roastLevel', data.roastLevel)
			if (data.roastDate) form.setValue('roastDate', data.roastDate)

			if (data.notes) await simulateTyping('notes', data.notes)

			if (data.weight) {
				form.setValue('initialWeight', data.weight)
				form.setValue('remainingWeight', data.weight)
			}

			toast.success('Label scanned successfully')
		} catch (error) {
			console.error(error)
			toast.error('Failed to scan label')
		} finally {
			setIsScanning(false)
			if (fileInputRef.current) fileInputRef.current.value = ''
		}
	}

	const onSubmit = async (data: BeanFormData) => {
		setIsSubmitting(true)

		try {
			if (isEditMode) {
				await axios.put(`/api/beans/${beanId}`, data)
				toast.success('Coffee bean updated successfully')
			} else {
				await axios.post('/api/beans', data)
				toast.success('Coffee bean added successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving bean:', error)
			toast.error(`Failed to ${isEditMode ? 'update' : 'add'} coffee bean`)
		} finally {
			setIsSubmitting(false)
		}
	}

	const pulse = isScanning ? 'animate-pulse' : ''
	const errors = form.formState.errors
	const toDate = (v: string | null | undefined) =>
		v ? parse(v, 'yyyy-MM-dd', new Date()) : undefined
	const roastDate = toDate(roastDateWatcher)

	const textField = (
		name: 'name' | 'roaster' | 'origin' | 'process' | 'producer',
		label: string,
		placeholder: string,
		className?: string,
	) => (
		<Controller
			name={name}
			control={form.control}
			render={({ field, fieldState }) => (
				<FormField
					label={label}
					htmlFor={`bean-${name}`}
					error={fieldState.error?.message}
				>
					<input
						{...field}
						id={`bean-${name}`}
						value={field.value || ''}
						placeholder={placeholder}
						aria-invalid={fieldState.invalid}
						autoComplete='off'
						className={cn('fin', pulse, className)}
					/>
				</FormField>
			)}
		/>
	)

	return (
		<Sheet
			open={isOpen}
			onClose={onClose}
			title={isEditMode ? 'Edit bean' : 'Add bean'}
			size='tall'
			onEscapeKeyDown={(e) => {
				if (isRoastDateOpen || isFreezeDateOpen) e.preventDefault()
			}}
			action={
				<TextButton underline onClick={onClose} className='-mr-1 text-[13px]'>
					Cancel
				</TextButton>
			}
			footerBorder
			footer={
				<div className='pb-1.5'>
					<Key
						type='submit'
						form='bean-form'
						disabled={isSubmitting || (isFetching && isEditMode)}
						className='h-16 text-[18px]'
					>
						{isSubmitting ? 'Saving…' : isEditMode ? 'Update bean' : 'Add bean'}
					</Key>
				</div>
			}
		>
			<input
				type='file'
				ref={fileInputRef}
				className='hidden'
				accept='image/*'
				capture='environment'
				onChange={handleFileChange}
			/>

			{isFetching && isEditMode ? (
				<RowSkeleton rows={4} variant='simple' />
			) : (
				<form
					id='bean-form'
					onSubmit={form.handleSubmit(onSubmit)}
					className='flex flex-col gap-3.5 pt-1 pb-4'
				>
					{isAiEnabled && !isEditMode && (
						<button
							type='button'
							onClick={handleScanClick}
							disabled={isScanning}
							className='flex h-12 w-full items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold text-accent shadow-[inset_0_0_0_1.5px_var(--line)] outline-offset-2 disabled:opacity-70'
						>
							<SparkIcon className={isScanning ? 'animate-spin' : ''} />
							{isScanning ? 'Reading label…' : 'Scan label'}
						</button>
					)}

					{textField(
						'name',
						'Name',
						'Ethiopia Yirgacheffe',
						'text-[20px] font-semibold',
					)}

					<div className='grid grid-cols-2 gap-4'>
						{textField('roaster', 'Roaster', 'Heart Coffee Roasters')}
						{textField('origin', 'Origin', 'Ethiopia')}
						{textField('process', 'Process', 'Washed')}
						{textField('producer', 'Producer', 'Shale Village')}
					</div>

					<Controller
						name='roastLevel'
						control={form.control}
						render={({ field }) => (
							<div className='flex flex-col gap-0.5'>
								<span className='text-[12.5px] text-ink-2'>Roast level</span>
								<div
									role='group'
									aria-label='Roast level'
									className={cn('flex flex-wrap gap-2 pt-1.5', pulse)}
								>
									{ROAST_LEVELS.map((level) => (
										<Chip
											key={level}
											on={field.value === level}
											onClick={() =>
												field.onChange(field.value === level ? '' : level)
											}
											className='h-[38px] px-3.5'
										>
											{level}
										</Chip>
									))}
								</div>
							</div>
						)}
					/>

					<Controller
						name='isDecaf'
						control={form.control}
						render={({ field }) => (
							<div className='flex items-center justify-between gap-4'>
								<label htmlFor='bean-decaf' className='text-[16px] font-medium'>
									Decaf
								</label>
								<Switch
									id='bean-decaf'
									checked={!!field.value}
									onCheckedChange={field.onChange}
								/>
							</div>
						)}
					/>

					<div className='grid grid-cols-2 gap-4'>
						<Controller
							name='roastDate'
							control={form.control}
							render={({ field, fieldState }) => (
								<FormField
									label='Roasted on'
									htmlFor='bean-roastDate'
									error={fieldState.error?.message}
								>
									<div className={pulse}>
										<DateField
											id='bean-roastDate'
											value={toDate(field.value)}
											placeholder='Pick a date'
											invalid={fieldState.invalid}
											onClick={() => setIsRoastDateOpen(true)}
										/>
									</div>
									<DatePickerSheet
										open={isRoastDateOpen}
										onClose={() => setIsRoastDateOpen(false)}
										title='Roasted on'
										value={toDate(field.value)}
										onChange={(d) =>
											field.onChange(d ? format(d, 'yyyy-MM-dd') : '')
										}
										disabled={(date) =>
											date > new Date() || date < new Date('1900-01-01')
										}
									/>
								</FormField>
							)}
						/>

						<Controller
							name='freezeDate'
							control={form.control}
							render={({ field, fieldState }) => (
								<FormField
									label='Frozen on'
									optional
									htmlFor='bean-freezeDate'
									error={fieldState.error?.message}
								>
									<div className={pulse}>
										<DateField
											id='bean-freezeDate'
											value={toDate(field.value)}
											placeholder='Not frozen'
											invalid={fieldState.invalid}
											onClick={() => setIsFreezeDateOpen(true)}
										/>
									</div>
									<DatePickerSheet
										open={isFreezeDateOpen}
										onClose={() => setIsFreezeDateOpen(false)}
										title='Frozen on'
										clearLabel='Not frozen'
										value={toDate(field.value)}
										onChange={(d) =>
											field.onChange(d ? format(d, 'yyyy-MM-dd') : '')
										}
										disabled={(date) =>
											date > new Date() ||
											date < new Date('1900-01-01') ||
											(roastDate ? date < roastDate : false)
										}
									/>
								</FormField>
							)}
						/>

						<Controller
							name='initialWeight'
							control={form.control}
							render={({ field, fieldState }) => (
								<FormField
									label='Bag size (g)'
									htmlFor='bean-initialWeight'
									error={fieldState.error?.message}
								>
									<input
										{...field}
										id='bean-initialWeight'
										value={field.value ?? ''}
										inputMode='decimal'
										aria-invalid={fieldState.invalid}
										onFocus={(e) => e.target.select()}
										onBlur={(e) => {
											field.onBlur()
											const initialWeight = Number(e.target.value)
											form.setValue('remainingWeight', initialWeight)
										}}
										className={cn(
											'fin font-mono text-[20px] font-medium',
											pulse,
										)}
									/>
								</FormField>
							)}
						/>

						<Controller
							name='remainingWeight'
							control={form.control}
							render={({ field, fieldState }) => (
								<FormField
									label='Remaining (g)'
									htmlFor='bean-remainingWeight'
									error={fieldState.error?.message}
								>
									<input
										{...field}
										id='bean-remainingWeight'
										value={field.value ?? ''}
										inputMode='decimal'
										aria-invalid={fieldState.invalid}
										onFocus={(e) => e.target.select()}
										className={cn(
											'fin font-mono text-[20px] font-medium',
											pulse,
										)}
									/>
								</FormField>
							)}
						/>
					</div>

					<Controller
						name='notes'
						control={form.control}
						render={({ field }) => (
							<FormField label='Notes' htmlFor='bean-notes'>
								<textarea
									{...field}
									id='bean-notes'
									value={field.value || ''}
									placeholder='Tasting notes, brewing recommendations'
									className={cn('notes mt-1 h-[84px]', pulse)}
								/>
							</FormField>
						)}
					/>
					{errors.root?.message && (
						<p role='alert' className='text-[13px] text-danger'>
							{errors.root.message}
						</p>
					)}
				</form>
			)}
		</Sheet>
	)
}
