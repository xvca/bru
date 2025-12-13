import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Star, X } from 'lucide-react'
import type { Bean, Brewer, Grinder } from 'generated/prisma/client'
import { brewSchema, type BrewFormData } from '@/lib/validators'

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
}

export default function BrewForm({
	isOpen,
	onClose,
	brewId,
	barId,
	onSuccess,
}: BrewFormProps) {
	const { user } = useAuth()
	const isEditMode = !!brewId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const [isBeanSelectOpen, setIsBeanSelectOpen] = useState(false)
	const [isMethodSelectOpen, setIsMethodSelectOpen] = useState(false)
	const [isBrewerSelectOpen, setIsBrewerSelectOpen] = useState(false)
	const [isGrinderSelectOpen, setIsGrinderSelectOpen] = useState(false)
	const [isMinSelectOpen, setIsMinSelectOpen] = useState(false)
	const [isSecSelectOpen, setIsSecSelectOpen] = useState(false)

	const [activeSelect, setActiveSelect] = useState<string | null>(null)

	const [beans, setBeans] = useState<Bean[]>([])
	const [methods, setMethods] = useState<Array<{ id: number; name: string }>>(
		[],
	)
	const [brewers, setBrewers] = useState<Brewer[]>([])
	const [grinders, setGrinders] = useState<Grinder[]>([])

	const form = useForm<BrewFormData>({
		resolver: zodResolver(brewSchema),
		defaultValues: {
			beanId: 0,
			methodId: 0,
			doseWeight: 18,
			yieldWeight: 36,
			brewTime: 0,
			grindSize: '',
			waterTemperature: 93,
			rating: 0,
			tastingNotes: '',
			brewDate: new Date().toISOString().split('T')[0],
			barId: barId || undefined,
			brewerId: undefined,
			grinderId: undefined,
		},
	})

	console.log(form)

	const watchedBeanId = useWatch({ control: form.control, name: 'beanId' })
	const watchedBrewerId = useWatch({ control: form.control, name: 'brewerId' })

	useEffect(() => {
		if (isOpen && user) {
			const fetchData = async () => {
				try {
					const params = { barId: barId || undefined }
					const headers = { Authorization: `Bearer ${user.token}` }

					const [beansRes, methodsRes, brewersRes, grindersRes] =
						await Promise.all([
							axios.get('/api/beans', { headers, params }),
							axios.get('/api/brew-methods', { headers }),
							axios.get('/api/brewers', { headers, params }),
							axios.get('/api/grinders', { headers, params }),
						])

					setBeans(beansRes.data)
					setMethods(methodsRes.data)
					setBrewers(brewersRes.data)
					setGrinders(grindersRes.data)
				} catch (error) {
					console.error('Error loading form data:', error)
					toast.error('Failed to load beans or methods')
				}
			}
			fetchData()
		}
	}, [isOpen, user, barId])

	useEffect(() => {
		if (isOpen && isEditMode && brewId && user) {
			const fetchBrew = async () => {
				setIsFetching(true)
				try {
					const { data } = await axios.get(`/api/brews/${brewId}`, {
						headers: { Authorization: `Bearer ${user.token}` },
					})
					form.reset({
						...data,
						beanId: data.beanId,
						methodId: data.methodId,
						brewDate: data.brewDate
							? new Date(data.brewDate).toISOString().split('T')[0]
							: new Date().toISOString().split('T')[0],
						barId: data.barId || undefined,
						brewerId: data.brewerId || undefined,
						grinderId: data.grinderId || undefined,
					})
				} catch (error) {
					console.error('Error fetching brew:', error)
					toast.error('Failed to load brew data')
					onClose()
				} finally {
					setIsFetching(false)
				}
			}
			fetchBrew()
		} else if (isOpen && !isEditMode) {
			form.reset({
				beanId: 0,
				methodId: 0,
				doseWeight: 18,
				yieldWeight: 36,
				brewTime: 0,
				grindSize: '',
				waterTemperature: 93,
				rating: 0,
				tastingNotes: '',
				brewDate: new Date().toISOString().split('T')[0],
				barId: barId || undefined,
				brewerId: undefined,
				grinderId: undefined,
			})
		}
	}, [isOpen, isEditMode, brewId, barId])

	useEffect(() => {
		const fetchLastBrew = async () => {
			if (!watchedBeanId || !watchedBrewerId || isEditMode || !user) return

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

	useEffect

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

				{isFetching ? (
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
											<FieldLabel htmlFor='brewerId'>
												Brewer (Optional)
											</FieldLabel>
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
													<SelectItem
														value='0'
														className='text-muted-foreground italic'
													>
														None
													</SelectItem>
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
							</div>

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
													<div className='flex-1'>
														<Select
															value={minutes.toString()}
															onValueChange={(val) =>
																handleTimeChange('min', val)
															}
															onOpenChange={(isOpen) =>
																setActiveSelect(isOpen ? 'mins' : null)
															}
															open={activeSelect === 'mins'}
														>
															<SelectTrigger className='text-center'>
																<div className='flex items-center gap-1'>
																	<SelectValue placeholder='0' />
																	<span className='text-muted-foreground text-xs'>
																		Minutes
																	</span>
																</div>
															</SelectTrigger>
															<SelectContent className='max-h-48'>
																{Array.from({ length: 21 }).map((_, i) => (
																	<SelectItem key={i} value={i.toString()}>
																		{i}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
													<span className='text-muted-foreground font-bold'>
														:
													</span>
													<div className='flex-1'>
														<Select
															value={seconds.toString()}
															onValueChange={(val) =>
																handleTimeChange('sec', val)
															}
															onOpenChange={(isOpen) =>
																setActiveSelect(isOpen ? 'secs' : null)
															}
															open={activeSelect === 'secs'}
														>
															<SelectTrigger className='text-center'>
																<div className='flex items-center gap-1'>
																	<SelectValue placeholder='00' />
																	<span className='text-muted-foreground text-xs'>
																		Seconds
																	</span>
																</div>
															</SelectTrigger>
															<SelectContent className='max-h-48'>
																{Array.from({ length: 60 }).map((_, i) => (
																	<SelectItem key={i} value={i.toString()}>
																		{i.toString().padStart(2, '0')}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
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
												min='1'
												max='100'
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
											placeholder='e.g., Fine, Medium, or a number'
										/>
									</Field>
								)}
							/>

							<Controller
								name='rating'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Rating</FieldLabel>
										<div className='flex items-center space-x-1'>
											{[1, 2, 3, 4, 5].map((star) => (
												<Button
													key={star}
													type='button'
													variant='ghost'
													size='icon'
													className={cn(
														'rounded-full hover:bg-secondary',
														(field.value || 0) >= star
															? 'text-yellow-500 hover:text-yellow-600'
															: 'text-muted-foreground',
													)}
													onClick={() => field.onChange(star)}
												>
													<Star
														className={cn(
															'w-6 h-6',
															(field.value || 0) >= star ? 'fill-current' : '',
														)}
													/>
												</Button>
											))}
											{/* Clear rating button if needed */}
											{(field.value || 0) > 0 && (
												<Button
													type='button'
													variant='ghost'
													size='icon'
													className='rounded-full ml-2 text-muted-foreground hover:text-destructive'
													onClick={() => field.onChange(0)}
													title='Clear rating'
												>
													<X className='w-4 h-4' />
												</Button>
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
											rows={3}
											placeholder='Flavor notes, acidity, body, etc.'
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
