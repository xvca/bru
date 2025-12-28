import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Star, X } from 'lucide-react'
import type { Bean, Brewer, Grinder } from 'generated/prisma/client'
import { BREW_METHODS, brewSchema, type BrewFormData } from '@/lib/validators'
import { useBrew } from '@/hooks/useBrew'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BeanSelect } from '@/components/BeanSelect'
import {
	Field,
	FieldLabel,
	FieldError,
	FieldGroup,
} from '@/components/ui/field'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface BrewFormProps {
	isOpen: boolean
	onClose: () => void
	brewId?: number
	barId?: number
	onSuccess?: () => void
	initialData?: Partial<BrewFormData>
}

export default function BrewForm({
	isOpen,
	onClose,
	brewId,
	barId,
	onSuccess,
	initialData,
}: BrewFormProps) {
	const { user } = useAuth()
	const isEditMode = !!brewId

	const [isLoading, setIsLoading] = useState(false)
	const [isFormDataLoading, setIsFormDataLoading] = useState(false)
	const [activeSelect, setActiveSelect] = useState<string | null>(null)

	const [beans, setBeans] = useState<Bean[]>([])
	const [brewers, setBrewers] = useState<Brewer[]>([])
	const [grinders, setGrinders] = useState<Grinder[]>([])

	const { brew, isLoading: isFetching } = useBrew(
		isOpen && isEditMode ? brewId : undefined,
	)

	const defaultValues: BrewFormData = {
		beanId: 0,
		method: 'Espresso',
		doseWeight: 18,
		yieldWeight: 36,
		brewTime: 0,
		grindSize: 0,
		waterTemperature: 93,
		rating: 0,
		tastingNotes: '',
		barId: barId || undefined,
		brewerId: undefined,
		grinderId: undefined,
	}

	const form = useForm<BrewFormData>({
		resolver: zodResolver(brewSchema),
		defaultValues: {
			...defaultValues,
			...(initialData ?? {}),
		},
	})

	const watchedBeanId = useWatch({ control: form.control, name: 'beanId' })
	const watchedBrewerId = useWatch({ control: form.control, name: 'brewerId' })

	useEffect(() => {
		if (isOpen && user) {
			setIsFormDataLoading(true)
			const fetchData = async () => {
				try {
					const params = { barId: barId || undefined }
					const headers = { Authorization: `Bearer ${user.token}` }

					const [beansRes, brewersRes, grindersRes] = await Promise.all([
						axios.get('/api/beans', { headers, params }),
						axios.get('/api/brewers', { headers, params }),
						axios.get('/api/grinders', { headers, params }),
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
	}, [isOpen, user, barId])

	useEffect(() => {
		if (isOpen) {
			if (isEditMode && brew) {
				form.reset({
					...brew,
					beanId: brew.beanId,
					method: brew.method,
					barId: brew.barId || undefined,
					brewerId: brew.brewerId || undefined,
					grinderId: brew.grinderId || undefined,
				})
			} else if (!isEditMode) {
				form.reset({
					...defaultValues,
					...(initialData ?? {}),
					barId: barId || initialData?.barId || undefined,
				})
			}
		}
	}, [isOpen, isEditMode, brew, barId, initialData, form])

	useEffect(() => {
		const fetchLastBrew = async () => {
			if (
				!watchedBeanId ||
				!watchedBrewerId ||
				isEditMode ||
				!user ||
				initialData
			)
				return

			try {
				const response = await axios.get(`/api/brews/last-parameters`, {
					params: {
						beanId: watchedBeanId,
						brewerId: watchedBrewerId,
					},
					headers: { Authorization: `Bearer ${user.token}` },
					validateStatus: (status) => status < 500,
				})

				if (response.status === 200 && response.data) {
					const currentValues = form.getValues()
					form.reset({
						...currentValues,
						doseWeight: response.data.doseWeight,
						yieldWeight: response.data.yieldWeight,
						brewTime: response.data.brewTime,
						grindSize: response.data.grindSize,
						waterTemperature: response.data.waterTemperature,
						brewerId: response.data.brewerId,
						grinderId: response.data.grinderId,
					})
					toast.success('Loaded settings from last brew')
				}
			} catch (error) {
				console.error('Error fetching last params:', error)
			}
		}

		const timer = setTimeout(() => {
			fetchLastBrew()
		}, 100)
		return () => clearTimeout(timer)
	}, [watchedBeanId, watchedBrewerId, isEditMode])

	const onSubmit = async (data: BrewFormData) => {
		setIsLoading(true)
		try {
			if (!user?.token) return

			if (isEditMode) {
				await axios.put(`/api/brews/${brewId}`, data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Brew updated successfully')
			} else {
				await axios.post('/api/brews', data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Brew added successfully')
			}
			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving brew:', error)
			toast.error(`Failed to ${isEditMode ? 'update' : 'add'} brew`)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		if (watchedBrewerId) {
			const selectedBrewer = brewers.find((b) => b.id === watchedBrewerId)
			if (selectedBrewer && selectedBrewer.type) {
				form.setValue('method', selectedBrewer.type)
			}
		}
	}, [watchedBrewerId, brewers, form])

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className='max-w-xl max-h-[90vh] overflow-y-auto'
				onEscapeKeyDown={(e) => {
					if (activeSelect) {
						e.preventDefault()
						setActiveSelect(null)
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>{isEditMode ? 'Edit Brew' : 'Add New Brew'}</DialogTitle>
				</DialogHeader>

				{isFetching || isFormDataLoading ? (
					<div className='flex justify-center items-center py-8'>
						<Spinner />
					</div>
				) : (
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
						<FieldGroup>
							<Controller
								name='beanId'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='beanId'>
											Coffee Bean <span className='text-error'>*</span>
										</FieldLabel>
										<BeanSelect
											beans={beans}
											value={field.value?.toString() || ''}
											onChange={(val) => field.onChange(Number(val))}
											onOpenChange={(isOpen) =>
												setActiveSelect(isOpen ? 'bean' : null)
											}
											open={activeSelect === 'bean'}
										/>

										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<Controller
									name='brewerId'
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor='brewerId'>Brewer</FieldLabel>
											<Select
												onValueChange={(val) =>
													field.onChange(val ? Number(val) : null)
												}
												value={field.value ? field.value.toString() : ''}
												onOpenChange={(isOpen) =>
													setActiveSelect(isOpen ? 'brewer' : null)
												}
												open={activeSelect === 'brewer'}
											>
												<SelectTrigger id='brewerId' className='w-full'>
													<SelectValue placeholder='Select brewer' />
												</SelectTrigger>
												<SelectContent>
													{brewers.map((brewer) => (
														<SelectItem
															key={brewer.id}
															value={brewer.id.toString()}
														>
															{brewer.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
									)}
								/>

								<Controller
									name='method'
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor='method'>
												Method <span className='text-error'>*</span>
											</FieldLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
												onOpenChange={(isOpen) =>
													setActiveSelect(isOpen ? 'method' : null)
												}
												open={activeSelect === 'method'}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{BREW_METHODS.map((m) => (
														<SelectItem key={m} value={m}>
															{m}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
							</div>

							<Controller
								name='grinderId'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='grinderId'>
											Grinder (Optional)
										</FieldLabel>
										<Select
											onValueChange={(val) =>
												field.onChange(val ? Number(val) : null)
											}
											value={field.value ? field.value.toString() : ''}
											onOpenChange={(isOpen) =>
												setActiveSelect(isOpen ? 'grinder' : null)
											}
											open={activeSelect === 'grinder'}
										>
											<SelectTrigger id='grinderId' className='w-full'>
												<SelectValue placeholder='Select grinder' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem
													value='0'
													className='text-muted-foreground italic'
												>
													None
												</SelectItem>
												{grinders.map((grinder) => (
													<SelectItem
														key={grinder.id}
														value={grinder.id.toString()}
													>
														{grinder.name}&nbsp;
														<span className='text-muted-foreground italic'>
															{grinder.burrType}
														</span>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								)}
							/>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<Controller
									name='doseWeight'
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor='doseWeight'>
												Dose Weight (g) <span className='text-error'>*</span>
											</FieldLabel>
											<Input
												{...field}
												id='doseWeight'
												type='number'
												min='0.1'
												step='0.1'
												onFocus={(e) => e.target.select()}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								<Controller
									name='yieldWeight'
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor='yieldWeight'>
												Yield Weight (g)
											</FieldLabel>
											<Input
												{...field}
												value={field.value || ''}
												id='yieldWeight'
												type='number'
												min='0.1'
												step='0.1'
												onFocus={(e) => e.target.select()}
											/>
										</Field>
									)}
								/>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<Controller
									name='brewTime'
									control={form.control}
									render={({ field, fieldState }) => {
										const totalSeconds = field.value || 0
										const minutes = Math.floor(totalSeconds / 60)
										const seconds = totalSeconds % 60

										const handleTimeChange = (
											type: 'min' | 'sec',
											val: string,
										) => {
											const num = parseInt(val) || 0
											let newTotal = 0
											if (type === 'min') {
												newTotal = num * 60 + seconds
											} else {
												newTotal = minutes * 60 + num
											}
											field.onChange(newTotal > 0 ? newTotal : null)
										}

										return (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>Brew Time</FieldLabel>
												<div className='flex items-center gap-2'>
													<div className='relative flex-1'>
														<Input
															type='number'
															min='0'
															value={minutes.toString()}
															onChange={(e) =>
																handleTimeChange('min', e.target.value)
															}
															onFocus={(e) => e.target.select()}
															className='pr-8'
														/>
														<span className='absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none'>
															min
														</span>
													</div>
													<span className='text-muted-foreground font-bold'>
														:
													</span>
													<div className='relative flex-1'>
														<Input
															type='number'
															min='0'
															max='59'
															value={seconds.toString().padStart(2, '0')}
															onChange={(e) =>
																handleTimeChange('sec', e.target.value)
															}
															onFocus={(e) => e.target.select()}
															className='pr-8'
														/>
														<span className='absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none'>
															sec
														</span>
													</div>
												</div>
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)
									}}
								/>

								<Controller
									name='waterTemperature'
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor='waterTemperature'>
												Temperature (°C)
											</FieldLabel>
											<Input
												{...field}
												value={field.value || ''}
												id='waterTemperature'
												type='number'
												step='1'
												onFocus={(e) => e.target.select()}
											/>
										</Field>
									)}
								/>
							</div>

							<Controller
								name='grindSize'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='grindSize'>Grind Size</FieldLabel>
										<Input
											{...field}
											value={field.value || ''}
											id='grindSize'
											type='number'
											step='0.1'
											onFocus={(e) => e.target.select()}
										/>
									</Field>
								)}
							/>

							<Controller
								name='rating'
								control={form.control}
								render={({ field }) => (
									<Field>
										<FieldLabel>Rating</FieldLabel>
										<div className='flex gap-1'>
											{[1, 2, 3, 4, 5].map((star) => (
												<button
													key={star}
													type='button'
													onClick={() => field.onChange(star)}
													className='focus:outline-none'
												>
													<Star
														className={cn(
															'h-8 w-8 transition-colors',
															(field.value || 0) >= star
																? 'fill-warning text-warning'
																: 'fill-muted/20 text-muted-foreground/30 hover:text-warning/50',
														)}
													/>
												</button>
											))}
											{(field.value || 0) > 0 && (
												<button
													type='button'
													onClick={() => field.onChange(0)}
													className='ml-2 text-muted-foreground hover:text-destructive'
												>
													<X className='h-5 w-5' />
												</button>
											)}
										</div>
									</Field>
								)}
							/>

							<Controller
								name='tastingNotes'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='tastingNotes'>
											Tasting Notes
										</FieldLabel>
										<Textarea
											{...field}
											value={field.value || ''}
											id='tastingNotes'
											placeholder='Describe the flavor profile...'
											rows={3}
										/>
									</Field>
								)}
							/>
						</FieldGroup>

						<div className='flex justify-end gap-3 pt-2'>
							<Button onClick={onClose} variant='outline' type='button'>
								Cancel
							</Button>

							<Button type='submit' disabled={isLoading}>
								{isLoading && <Spinner className='mr-2' />}
								{isEditMode ? 'Update Brew' : 'Add Brew'}
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
