import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { toast } from 'sonner'
import { Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parse } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
	Field,
	FieldLabel,
	FieldError,
	FieldGroup,
} from '@/components/ui/field'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
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
import { cn } from '@/lib/utils'

const beanSchema = z
	.object({
		name: z.string().min(1, 'Name is required'),
		roaster: z.string().optional().nullable(),
		origin: z.string().optional().nullable(),
		roastLevel: z.string().optional().nullable(),
		roastDate: z.string().min(1, 'Roast date is required'),
		freezeDate: z.string().optional().nullable(),
		initialWeight: z.coerce
			.number()
			.min(1, 'Initial weight must be at least 1g'),
		remainingWeight: z.coerce.number().min(0).optional().nullable(),
		notes: z.string().optional().nullable(),
	})
	.refine(
		(data) => {
			if (!data.freezeDate || !data.roastDate) return true

			const roast = new Date(data.roastDate)
			const freeze = new Date(data.freezeDate)

			return freeze >= roast
		},
		{
			message: 'Freeze date cannot be before roast date',
			path: ['freezeDate'],
		},
	)

type BeanFormData = z.infer<typeof beanSchema>

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
	const { user } = useAuth()
	const isEditMode = !!beanId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const [isRoastDateOpen, setIsRoastDateOpen] = useState(false)
	const [isFreezeDateOpen, setIsFreezeDateOpen] = useState(false)

	const roastDateRef = useRef<HTMLButtonElement>(null)
	const freezeDateRef = useRef<HTMLButtonElement>(null)

	const form = useForm<BeanFormData>({
		resolver: zodResolver(beanSchema),
		defaultValues: {
			name: '',
			roaster: '',
			origin: '',
			roastLevel: '',
			roastDate: new Date().toISOString().split('T')[0],
			freezeDate: '',
			initialWeight: 250,
			remainingWeight: 250,
			notes: '',
		},
	})

	const roastDateWatcher = form.watch('roastDate')

	useEffect(() => {
		if (isOpen) {
			if (!isEditMode) {
				form.reset({
					name: '',
					roaster: '',
					origin: '',
					roastLevel: '',
					roastDate: new Date().toISOString().split('T')[0],
					freezeDate: '',
					initialWeight: 250,
					remainingWeight: 250,
					notes: '',
				})
			} else if (beanId) {
				fetchBean()
			}
		} else {
			form.reset()
		}
	}, [isOpen, isEditMode, beanId])

	const fetchBean = async () => {
		try {
			setIsFetching(true)
			if (!user?.token) return

			const { data } = await axios.get(`/api/beans/${beanId}`, {
				headers: { Authorization: `Bearer ${user.token}` },
			})

			form.reset({
				...data,
				roastDate: new Date(data.roastDate).toISOString().split('T')[0],
				freezeDate: data.freezeDate
					? new Date(data.freezeDate).toISOString().split('T')[0]
					: '',
			})
		} catch (error) {
			console.error('Error fetching bean:', error)
			toast.error('Failed to load coffee bean data')
			onClose()
		} finally {
			setIsFetching(false)
		}
	}

	const onSubmit = async (data: BeanFormData) => {
		setIsLoading(true)

		try {
			if (!user?.token) return

			if (isEditMode) {
				await axios.put(`/api/beans/${beanId}`, data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Coffee bean updated successfully')
			} else {
				await axios.post('/api/beans', data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Coffee bean added successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving bean:', error)
			// Handle potential Zod/Server errors here if needed
			toast.error(`Failed to ${isEditMode ? 'update' : 'add'} coffee bean`)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className='max-w-xl max-h-[90vh] overflow-y-auto'
				onEscapeKeyDown={(e) => {
					if (isRoastDateOpen) {
						e.preventDefault()
						setIsRoastDateOpen(false)
					} else if (isFreezeDateOpen) {
						e.preventDefault()
						setIsFreezeDateOpen(false)
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? 'Edit Coffee Bean' : 'Add New Coffee Bean'}
					</DialogTitle>
				</DialogHeader>

				{isFetching ? (
					<div className='flex justify-center items-center py-8'>
						<Loader2 className='w-8 h-8 animate-spin' />
					</div>
				) : (
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
						<FieldGroup>
							<Controller
								name='name'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='name'>
											Name <span className='text-error'>*</span>
										</FieldLabel>
										<Input
											{...field}
											id='name'
											placeholder='e.g., Ethiopia Yirgacheffe'
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name='roaster'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='roaster'>Roaster</FieldLabel>
										<Input
											{...field}
											value={field.value || ''}
											id='roaster'
											placeholder='e.g., Heart Coffee Roasters'
										/>
									</Field>
								)}
							/>

							<Controller
								name='origin'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='origin'>Origin</FieldLabel>
										<Input
											{...field}
											value={field.value || ''}
											id='origin'
											placeholder='e.g., Ethiopia'
										/>
									</Field>
								)}
							/>

							<Controller
								name='roastLevel'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='roastLevel'>Roast Level</FieldLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value || ''}
											value={field.value || ''}
										>
											<SelectTrigger id='roastLevel' className='w-full'>
												<SelectValue placeholder='Select Roast Level' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='Light'>Light</SelectItem>
												<SelectItem value='Medium-Light'>
													Medium-Light
												</SelectItem>
												<SelectItem value='Medium'>Medium</SelectItem>
												<SelectItem value='Medium-Dark'>Medium-Dark</SelectItem>
												<SelectItem value='Dark'>Dark</SelectItem>
											</SelectContent>
										</Select>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<Controller
									name='roastDate'
									control={form.control}
									render={({ field, fieldState }) => {
										const dateValue = field.value
											? parse(field.value, 'yyyy-MM-dd', new Date())
											: undefined
										return (
											<Field
												data-invalid={fieldState.invalid}
												className='flex flex-col'
											>
												<FieldLabel htmlFor='roastDate'>
													Roast Date <span className='text-error'>*</span>
												</FieldLabel>
												<Popover
													modal={true}
													open={isRoastDateOpen}
													onOpenChange={setIsRoastDateOpen}
												>
													<PopoverTrigger asChild>
														<Button
															variant={'outline'}
															className={cn(
																'w-full pl-3 text-left font-normal border-input-border bg-background hover:bg-background/90',
																!field.value && 'text-muted-foreground',
															)}
															ref={roastDateRef}
														>
															{dateValue ? (
																format(dateValue, 'PPP')
															) : (
																<span>Pick a date</span>
															)}
															<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
														</Button>
													</PopoverTrigger>
													<PopoverContent
														className='min-w-80 p-0'
														onPointerDownOutside={(e) => {
															if (
																roastDateRef.current?.contains(e.target as Node)
															) {
																e.preventDefault()
															}
														}}
													>
														<Calendar
															mode='single'
															selected={dateValue}
															onSelect={(date) => {
																field.onChange(
																	date ? format(date, 'yyyy-MM-dd') : '',
																)
																setIsRoastDateOpen(false)
															}}
															disabled={(date) =>
																date > new Date() ||
																date < new Date('1900-01-01')
															}
															className='w-full'
														/>
													</PopoverContent>
												</Popover>
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)
									}}
								/>

								<Controller
									name='freezeDate'
									control={form.control}
									render={({ field, fieldState }) => {
										const dateValue = field.value
											? parse(field.value, 'yyyy-MM-dd', new Date())
											: undefined

										const minDate = roastDateWatcher
											? parse(roastDateWatcher, 'yyyy-MM-dd', new Date())
											: null
										return (
											<Field
												data-invalid={fieldState.invalid}
												className='flex flex-col'
											>
												<FieldLabel htmlFor='freezeDate'>
													Freeze Date (optional)
												</FieldLabel>
												<Popover
													modal={true}
													open={isFreezeDateOpen}
													onOpenChange={setIsFreezeDateOpen}
												>
													<PopoverTrigger asChild>
														<Button
															variant={'outline'}
															className={cn(
																'w-full pl-3 text-left font-normal border-input-border bg-background hover:bg-background/90',
																!field.value && 'text-muted-foreground',
															)}
															ref={freezeDateRef}
														>
															{dateValue ? (
																format(dateValue, 'PPP')
															) : (
																<span>Pick a date</span>
															)}
															<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
														</Button>
													</PopoverTrigger>
													<PopoverContent
														className='min-w-80 p-0'
														onPointerDownOutside={(e) => {
															if (
																freezeDateRef.current?.contains(
																	e.target as Node,
																)
															) {
																e.preventDefault()
															}
														}}
													>
														<Calendar
															mode='single'
															selected={dateValue}
															onSelect={(date) => {
																field.onChange(
																	date ? format(date, 'yyyy-MM-dd') : '',
																)
																setIsFreezeDateOpen(false)
															}}
															disabled={(date) =>
																date > new Date() ||
																date < new Date('1900-01-01') ||
																(minDate ? date < minDate : false)
															}
															className='w-full'
														/>
													</PopoverContent>
												</Popover>
											</Field>
										)
									}}
								/>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<Controller
									name='initialWeight'
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor='initialWeight'>
												Initial Weight (g) <span className='text-error'>*</span>
											</FieldLabel>
											<Input
												{...field}
												id='initialWeight'
												type='number'
												min='1'
												step='1'
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								<Controller
									name='remainingWeight'
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor='remainingWeight'>
												Remaining Weight (g)
											</FieldLabel>
											<Input
												{...field}
												value={field.value || ''}
												id='remainingWeight'
												type='number'
												min='0'
												step='1'
											/>
										</Field>
									)}
								/>
							</div>

							<Controller
								name='notes'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='notes'>Notes</FieldLabel>
										<Textarea
											{...field}
											value={field.value || ''}
											id='notes'
											rows={4}
											placeholder='Tasting notes, brewing recommendations, etc.'
										/>
									</Field>
								)}
							/>
						</FieldGroup>

						<div className='flex justify-end gap-3'>
							<Button onClick={onClose} variant='outline' type='button'>
								Cancel
							</Button>

							<Button type='submit' disabled={isLoading}>
								{isLoading && <Spinner className='mr-2' />}
								{isEditMode ? 'Update Bean' : 'Add Bean'}
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
