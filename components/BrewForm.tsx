import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Loader2, X } from 'lucide-react'

// Form validation schema
const brewSchema = z.object({
	beanId: z.number({ required_error: 'Bean is required' }),
	methodId: z.number({ required_error: 'Brew method is required' }),
	doseWeight: z.number().min(1, 'Dose weight must be at least 1g'),
	yieldWeight: z
		.number()
		.min(1, 'Yield weight must be at least 1g')
		.optional()
		.nullable(),
	brewTime: z
		.number()
		.int()
		.min(1, 'Brew time must be at least 1 second')
		.optional()
		.nullable(),
	grindSize: z.string().optional().nullable(),
	waterTemperature: z
		.number()
		.min(1, 'Temperature must be at least 1°C')
		.optional()
		.nullable(),
	rating: z
		.number()
		.int()
		.min(0)
		.max(5, 'Rating must be between 0 and 5')
		.optional()
		.nullable(),
	tastingNotes: z.string().optional().nullable(),
})

type BrewFormData = z.infer<typeof brewSchema>

interface BrewFormProps {
	isOpen: boolean
	onClose: () => void
	brewId?: number // If provided, we're in edit mode
	onSuccess?: () => void
}

export default function BrewForm({
	isOpen,
	onClose,
	brewId,
	onSuccess,
}: BrewFormProps) {
	const { user } = useAuth()
	const isEditMode = Boolean(brewId)

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(isEditMode)
	const [errors, setErrors] = useState<Record<string, string>>({})

	// Bean and method options
	const [beans, setBeans] = useState<Array<{ id: number; name: string }>>([])
	const [methods, setMethods] = useState<Array<{ id: number; name: string }>>(
		[],
	)
	const [beansLoading, setBeansLoading] = useState(true)
	const [methodsLoading, setMethodsLoading] = useState(true)

	const [formData, setFormData] = useState<
		BrewFormData & {
			brewDate?: string
		}
	>({
		beanId: 0,
		methodId: 0,
		doseWeight: 18,
		yieldWeight: 36,
		brewTime: 30,
		grindSize: '',
		waterTemperature: 93,
		rating: 0,
		tastingNotes: '',
		brewDate: new Date().toISOString().split('T')[0],
	})

	const [timeInput, setTimeInput] = useState({
		minutes: formData.brewTime
			? Math.floor(formData.brewTime / 60).toString()
			: '',
		seconds: formData.brewTime
			? (formData.brewTime % 60).toString().padStart(2, '0')
			: '',
	})

	// Fetch beans for dropdown
	useEffect(() => {
		const fetchBeans = async () => {
			try {
				const { data } = await axios.get('/api/beans', {
					headers: { Authorization: `Bearer ${user?.token}` },
				})
				setBeans(data)
			} catch (error) {
				console.error('Error fetching beans:', error)
				toast.error('Failed to load beans')
			} finally {
				setBeansLoading(false)
			}
		}

		if (isOpen && user) {
			fetchBeans()
		}
	}, [isOpen, user])

	// Fetch brew methods
	useEffect(() => {
		const fetchMethods = async () => {
			try {
				const { data } = await axios.get('/api/brew-methods', {
					headers: { Authorization: `Bearer ${user?.token}` },
				})
				setMethods(data)
			} catch (error) {
				console.error('Error fetching brew methods:', error)
				toast.error('Failed to load brew methods')
			} finally {
				setMethodsLoading(false)
			}
		}

		if (isOpen && user) {
			fetchMethods()
		}
	}, [isOpen, user])

	// Fetch brew data if in edit mode
	useEffect(() => {
		const fetchBrew = async () => {
			try {
				if (!brewId) return

				const { data } = await axios.get(`/api/brews/${brewId}`, {
					headers: { Authorization: `Bearer ${user?.token}` },
				})

				setFormData({
					...data,
					brewDate: data.brewDate
						? new Date(data.brewDate).toISOString().split('T')[0]
						: undefined,
				})
			} catch (error) {
				console.error('Error fetching brew:', error)
				toast.error('Failed to load brew data')
			} finally {
				setIsFetching(false)
			}
		}

		if (isOpen && isEditMode && user) {
			fetchBrew()
		}
	}, [isOpen, brewId, isEditMode, user])

	useEffect(() => {
		const fetchLastBrew = async () => {
			try {
				// Only proceed if we have both bean and method selected, and we're not in edit mode
				if (!formData.beanId || !formData.methodId || isEditMode) {
					return
				}

				const response = await axios.get(`/api/brews/last-parameters`, {
					params: {
						beanId: formData.beanId,
						methodId: formData.methodId,
					},
					headers: { Authorization: `Bearer ${user?.token}` },
					// Don't let axios throw on 404s
					validateStatus: (status) => status < 500,
				})

				// Only update form if we found previous brew data (status 200)
				if (response.status === 200 && response.data) {
					// Update form with last brew parameters for this bean+method combination
					const lastBrewData = {
						...formData, // Keep the current bean and method IDs
						doseWeight: response.data.doseWeight,
						yieldWeight: response.data.yieldWeight,
						brewTime: response.data.brewTime,
						grindSize: response.data.grindSize,
						waterTemperature: response.data.waterTemperature,
					}

					setFormData(lastBrewData)

					// Update time input fields
					if (response.data.brewTime) {
						setTimeInput({
							minutes: Math.floor(response.data.brewTime / 60).toString(),
							seconds: (response.data.brewTime % 60)
								.toString()
								.padStart(2, '0'),
						})
					}
				}
				// If status is 404, that's fine - it just means no previous brews with this combination
			} catch (error) {
				// Only log server errors or unexpected issues
				if (!axios.isAxiosError(error) || error.response?.status !== 404) {
					console.error('Error fetching last brew parameters:', error)
				}
			}
		}

		if (isOpen && !isEditMode && formData.beanId && formData.methodId && user) {
			fetchLastBrew()
		}
	}, [formData.beanId, formData.methodId, isOpen, isEditMode, user])

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value, type } = e.target as HTMLInputElement

		if (type === 'number' || name === 'beanId' || name === 'methodId') {
			setFormData({
				...formData,
				[name]: value === '' ? '' : Number(value),
			})
		} else {
			setFormData({
				...formData,
				[name]: value,
			})
		}

		// Clear error when field is edited
		if (errors[name]) {
			const newErrors = { ...errors }
			delete newErrors[name]
			setErrors(newErrors)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)

		try {
			// Validate form data
			const validData = brewSchema.parse(formData)

			if (isEditMode) {
				// Update existing brew
				await axios.put(`/api/brews/${brewId}`, validData, {
					headers: { Authorization: `Bearer ${user?.token}` },
				})
				toast.success('Brew updated successfully')
			} else {
				// Create new brew
				await axios.post('/api/brews', validData, {
					headers: { Authorization: `Bearer ${user?.token}` },
				})
				toast.success('Brew added successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			if (error instanceof z.ZodError) {
				// Handle validation errors
				const fieldErrors: Record<string, string> = {}
				error.errors.forEach((err) => {
					if (err.path.length > 0) {
						fieldErrors[err.path[0]] = err.message
					}
				})
				setErrors(fieldErrors)
			} else {
				console.error('Error saving brew:', error)
				toast.error(`Failed to ${isEditMode ? 'update' : 'add'} brew`)
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleTimeInputChange = (
		field: 'minutes' | 'seconds',
		value: string,
	) => {
		// Allow only numbers
		if (value !== '' && !/^\d+$/.test(value)) return

		let newMinutes = field === 'minutes' ? value : timeInput.minutes
		let newSeconds = field === 'seconds' ? value : timeInput.seconds

		// Convert to numbers for calculations
		const mins = newMinutes === '' ? 0 : parseInt(newMinutes, 10)
		const secs = newSeconds === '' ? 0 : parseInt(newSeconds, 10)

		// Validate seconds (0-59)
		if (field === 'seconds' && secs > 59) {
			newSeconds = '59'
		}

		// Update local state
		setTimeInput({
			minutes: newMinutes,
			seconds: newSeconds,
		})

		// Calculate total seconds for the main form data
		const totalSeconds =
			mins * 60 + (newSeconds === '' ? 0 : parseInt(newSeconds, 10))
		setFormData({
			...formData,
			brewTime: totalSeconds > 0 ? totalSeconds : null,
		})
	}

	if (!isOpen) return null

	return (
		<Dialog open={isOpen} onClose={onClose} className='relative z-50'>
			<div className='fixed inset-0 bg-black/30' aria-hidden='true' />

			<div className='fixed inset-0 flex items-center justify-center p-4'>
				<DialogPanel className='mx-auto max-w-xl w-full rounded-lg bg-background p-6 shadow-xl motion-safe:animate-[popIn_0.2s_ease-out] overflow-y-auto max-h-[90vh]'>
					<DialogTitle className='text-xl font-semibold mb-4 flex justify-between items-center'>
						<span>{isEditMode ? 'Edit Brew' : 'Add New Brew'}</span>
						<button
							onClick={onClose}
							className='text-text-secondary hover:text-text'
						>
							<X size={20} />
							<span className='sr-only'>Close</span>
						</button>
					</DialogTitle>

					{isFetching || beansLoading || methodsLoading ? (
						<div className='flex justify-center items-center py-8'>
							<Loader2 className='w-8 h-8 animate-spin' />
						</div>
					) : (
						<form onSubmit={handleSubmit} className='space-y-4'>
							{/* Bean Selection */}
							<div>
								<label
									htmlFor='beanId'
									className='block text-sm font-medium mb-1'
								>
									Coffee Bean <span className='text-error'>*</span>
								</label>
								<select
									id='beanId'
									name='beanId'
									value={formData.beanId || ''}
									onChange={handleInputChange}
									required
									className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
								>
									<option value=''>Select a coffee bean</option>
									{beans.map((bean) => (
										<option key={bean.id} value={bean.id}>
											{bean.name}
										</option>
									))}
								</select>
								{errors.beanId && (
									<p className='mt-1 text-sm text-error'>{errors.beanId}</p>
								)}
							</div>

							{/* Method Selection */}
							<div>
								<label
									htmlFor='methodId'
									className='block text-sm font-medium mb-1'
								>
									Brew Method <span className='text-error'>*</span>
								</label>
								<select
									id='methodId'
									name='methodId'
									value={formData.methodId || ''}
									onChange={handleInputChange}
									required
									className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
								>
									<option value=''>Select a brew method</option>
									{methods.map((method) => (
										<option key={method.id} value={method.id}>
											{method.name}
										</option>
									))}
								</select>
								{errors.methodId && (
									<p className='mt-1 text-sm text-error'>{errors.methodId}</p>
								)}
							</div>

							{/* Dose and Yield */}
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div>
									<label
										htmlFor='doseWeight'
										className='block text-sm font-medium mb-1'
									>
										Dose Weight (g) <span className='text-error'>*</span>
									</label>
									<input
										type='number'
										id='doseWeight'
										name='doseWeight'
										value={formData.doseWeight || ''}
										onChange={handleInputChange}
										min='1'
										step='0.1'
										required
										className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
									/>
									{errors.doseWeight && (
										<p className='mt-1 text-sm text-error'>
											{errors.doseWeight}
										</p>
									)}
								</div>
								<div>
									<label
										htmlFor='yieldWeight'
										className='block text-sm font-medium mb-1'
									>
										Yield Weight (g)
									</label>
									<input
										type='number'
										id='yieldWeight'
										name='yieldWeight'
										value={formData.yieldWeight || ''}
										onChange={handleInputChange}
										min='1'
										step='0.1'
										className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
									/>
									{errors.yieldWeight && (
										<p className='mt-1 text-sm text-error'>
											{errors.yieldWeight}
										</p>
									)}
								</div>
							</div>

							{/* Time and Temperature */}
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium mb-1'>
										Brew Time
									</label>
									<div className='flex items-center space-x-2'>
										<input
											type='text'
											value={timeInput.minutes}
											onChange={(e) =>
												handleTimeInputChange('minutes', e.target.value)
											}
											placeholder='0'
											className='w-16 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border text-center'
											aria-label='Minutes'
										/>
										<span className='text-text-secondary'>:</span>
										<input
											type='text'
											value={timeInput.seconds}
											onChange={(e) =>
												handleTimeInputChange('seconds', e.target.value)
											}
											placeholder='00'
											maxLength={2}
											className='w-16 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border text-center'
											aria-label='Seconds'
										/>
										<span className='ml-2 text-text-secondary'>min:sec</span>
									</div>
									{errors.brewTime && (
										<p className='mt-1 text-sm text-error'>{errors.brewTime}</p>
									)}
								</div>
								<div>
									<label
										htmlFor='waterTemperature'
										className='block text-sm font-medium mb-1'
									>
										Water Temperature (°C)
									</label>
									<input
										type='number'
										id='waterTemperature'
										name='waterTemperature'
										value={formData.waterTemperature || ''}
										onChange={handleInputChange}
										min='1'
										max='100'
										className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
									/>
									{errors.waterTemperature && (
										<p className='mt-1 text-sm text-error'>
											{errors.waterTemperature}
										</p>
									)}
								</div>
							</div>

							{/* Grind Size */}
							<div>
								<label
									htmlFor='grindSize'
									className='block text-sm font-medium mb-1'
								>
									Grind Size
								</label>
								<input
									type='text'
									id='grindSize'
									name='grindSize'
									value={formData.grindSize || ''}
									onChange={handleInputChange}
									placeholder='e.g., Fine, Medium, Coarse, or a number'
									className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
								/>
							</div>

							{/* Rating */}
							<div>
								<label
									htmlFor='rating'
									className='block text-sm font-medium mb-1'
								>
									Rating (0-5)
								</label>
								<div className='flex items-center space-x-1'>
									{[1, 2, 3, 4, 5].map((rating) => (
										<button
											key={rating}
											type='button'
											onClick={() => setFormData({ ...formData, rating })}
											className={`w-8 h-8 rounded-full flex items-center justify-center ${
												(formData.rating ?? 0) >= rating
													? 'text-yellow-500'
													: 'text-text-secondary'
											}`}
										>
											{rating === 0 ? '☆' : '★'}
										</button>
									))}
								</div>
							</div>

							{/* Tasting Notes */}
							<div>
								<label
									htmlFor='tastingNotes'
									className='block text-sm font-medium mb-1'
								>
									Tasting Notes
								</label>
								<textarea
									id='tastingNotes'
									name='tastingNotes'
									value={formData.tastingNotes || ''}
									onChange={handleInputChange}
									rows={3}
									className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
									placeholder='Flavor notes, acidity, body, etc.'
								/>
							</div>

							{/* Buttons */}
							<div className='flex justify-end gap-3 pt-2'>
								<button
									type='button'
									onClick={onClose}
									className='px-4 py-2 border border-border rounded-lg'
								>
									Cancel
								</button>
								<button
									type='submit'
									disabled={isLoading}
									className='px-4 py-2 bg-text text-background rounded-lg flex items-center gap-2 disabled:opacity-70'
								>
									{isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
									{isEditMode ? 'Update Brew' : 'Add Brew'}
								</button>
							</div>
						</form>
					)}
				</DialogPanel>
			</div>
		</Dialog>
	)
}
