import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { z } from 'zod'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Star, X } from 'lucide-react'
import type { Bean } from 'generated/prisma/client'

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

const brewSchema = z.object({
	beanId: z.coerce.number().min(1, 'Bean is required'),
	methodId: z.coerce.number().min(1, 'Brew method is required'),
	doseWeight: z.coerce.number().min(1, 'Dose weight must be at least 1g'),
	yieldWeight: z.coerce.number().optional().nullable(),
	brewTime: z.coerce.number().optional().nullable(),
	grindSize: z.string().optional().nullable(),
	waterTemperature: z.coerce.number().optional().nullable(),
	rating: z.coerce.number().min(0).max(5).optional().nullable(),
	tastingNotes: z.string().optional().nullable(),
	brewDate: z.string().optional(),
})

type BrewFormData = z.infer<typeof brewSchema>

interface BrewFormProps {
	isOpen: boolean
	onClose: () => void
	brewId?: number
	onSuccess?: () => void
}

export default function BrewForm({
	isOpen,
	onClose,
	brewId,
	onSuccess,
}: BrewFormProps) {
	const { user } = useAuth()
	const isEditMode = !!brewId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const [beans, setBeans] = useState<Bean[]>([])
	const [methods, setMethods] = useState<Array<{ id: number; name: string }>>(
		[],
	)

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
		},
	})

	const watchedBeanId = useWatch({ control: form.control, name: 'beanId' })
	const watchedMethodId = useWatch({ control: form.control, name: 'methodId' })

	useEffect(() => {
		if (isOpen && user) {
			const fetchData = async () => {
				try {
					const [beansRes, methodsRes] = await Promise.all([
						axios.get('/api/beans', {
							headers: { Authorization: `Bearer ${user.token}` },
						}),
						axios.get('/api/brew-methods', {
							headers: { Authorization: `Bearer ${user.token}` },
						}),
					])
					console.log({ methodsRes })
					setBeans(beansRes.data)
					setMethods(methodsRes.data)
				} catch (error) {
					console.error('Error loading form data:', error)
					toast.error('Failed to load beans or methods')
				}
			}
			fetchData()
		}
	}, [isOpen, user])

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
			})
		}
	}, [isOpen, isEditMode, brewId])

	useEffect(() => {
		const fetchLastBrew = async () => {
			if (!watchedBeanId || !watchedMethodId || isEditMode || !user) return

			try {
				const response = await axios.get(`/api/brews/last-parameters`, {
					params: {
						beanId: watchedBeanId,
						methodId: watchedMethodId,
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
	}, [watchedBeanId, watchedMethodId, isEditMode])

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

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>{isEditMode ? 'Edit Brew' : 'Add New Brew'}</DialogTitle>
				</DialogHeader>

				{isFetching ? (
					<div className='flex justify-center items-center py-8'>
						<Loader2 className='w-8 h-8 animate-spin' />
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
										/>

										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name='methodId'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='methodId'>
											Brew Method <span className='text-error'>*</span>
										</FieldLabel>
										<Select
											onValueChange={(val) => field.onChange(Number(val))}
											value={field.value?.toString() || ''}
										>
											<SelectTrigger id='methodId' className='w-full'>
												<SelectValue placeholder='Select a brew method' />
											</SelectTrigger>
											<SelectContent>
												{methods.map((method) => (
													<SelectItem
														key={method.id}
														value={method.id.toString()}
													>
														{method.name}
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
												const cappedSec = Math.min(num, 59)
												newTotal = minutes * 60 + cappedSec
											}
											field.onChange(newTotal > 0 ? newTotal : null)
										}

										return (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel>Brew Time</FieldLabel>
												<div className='flex items-center space-x-2'>
													<Input
														type='number'
														min='0'
														value={minutes || ''}
														onChange={(e) =>
															handleTimeChange('min', e.target.value)
														}
														placeholder='0'
														className='text-center'
													/>
													<span className='text-muted-foreground'>:</span>
													<Input
														type='number'
														min='0'
														max='59'
														value={seconds || ''}
														onChange={(e) =>
															handleTimeChange('sec', e.target.value)
														}
														placeholder='00'
														className='text-center'
													/>
													<span className='text-sm text-muted-foreground ml-2'>
														min:sec
													</span>
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
