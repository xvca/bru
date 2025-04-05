import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '@/lib/authContext'

// Form validation schema
const beanSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	roaster: z.string().optional().nullable(),
	origin: z.string().optional().nullable(),
	roastLevel: z.string().optional().nullable(),
	roastDate: z.string().min(1, 'Roast date is required'),
	freezeDate: z.string().optional().nullable(),
	initialWeight: z.number().min(1, 'Initial weight must be at least 1g'),
	remainingWeight: z.number().min(0).optional().nullable(),
	notes: z.string().optional().nullable(),
})

type BeanFormData = z.infer<typeof beanSchema>

interface BeanFormProps {
	beanId?: number // If provided, we're in edit mode
}

const BeanForm = ({ beanId }: BeanFormProps) => {
	const router = useRouter()
	const isEditMode = !!beanId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(isEditMode)
	const [errors, setErrors] = useState<Record<string, string>>({})

	const { user } = useAuth()

	const [formData, setFormData] = useState<BeanFormData>({
		name: '',
		roaster: '',
		origin: '',
		roastLevel: '',
		roastDate: new Date().toISOString().split('T')[0], // Today as default
		freezeDate: '',
		initialWeight: 250, // Default weight
		remainingWeight: 250, // Default weight
		notes: '',
	})

	// Fetch bean data if in edit mode
	useEffect(() => {
		if (isEditMode) {
			fetchBean()
		}
	}, [beanId])

	const fetchBean = async () => {
		try {
			const token = getToken()
			if (!token) {
				router.push('/login')
				return
			}

			const { data } = await axios.get(`/api/beans/${beanId}`, {
				headers: { Authorization: `Bearer ${token}` },
			})

			// Format dates for form inputs
			setFormData({
				...data,
				roastDate: new Date(data.roastDate).toISOString().split('T')[0],
				freezeDate: data.freezeDate
					? new Date(data.freezeDate).toISOString().split('T')[0]
					: '',
			})
		} catch (error) {
			console.error('Error fetching bean:', error)
			toast.error('Failed to load coffee bean data')
			if (axios.isAxiosError(error) && error.response?.status === 401) {
				router.push('/login')
			}
		} finally {
			setIsFetching(false)
		}
	}

	const getToken = () => {
		return user?.token || null
	}

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value, type } = e.target as HTMLInputElement

		// Handle different input types
		if (type === 'number') {
			setFormData({
				...formData,
				[name]: value === '' ? '' : parseFloat(value),
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
			const validData = beanSchema.parse(formData)

			const token = getToken()
			if (!token) {
				router.push('/login')
				return
			}

			if (isEditMode) {
				// Update existing bean
				await axios.put(`/api/beans/${beanId}`, validData, {
					headers: { Authorization: `Bearer ${token}` },
				})
				toast.success('Coffee bean updated successfully')
			} else {
				// Create new bean
				await axios.post('/api/beans', validData, {
					headers: { Authorization: `Bearer ${token}` },
				})
				toast.success('Coffee bean added successfully')
			}

			router.push('/beans')
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
				console.error('Error saving bean:', error)
				toast.error(`Failed to ${isEditMode ? 'update' : 'add'} coffee bean`)
			}
		} finally {
			setIsLoading(false)
		}
	}

	if (isFetching) {
		return (
			<div className='flex justify-center items-center h-40'>
				<Loader2 className='w-8 h-8 animate-spin' />
			</div>
		)
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-6'>
			{/* Name */}
			<div>
				<label htmlFor='name' className='block text-sm font-medium mb-1'>
					Name <span className='text-error'>*</span>
				</label>
				<input
					type='text'
					id='name'
					name='name'
					value={formData.name}
					onChange={handleInputChange}
					className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					placeholder='e.g., Ethiopia Yirgacheffe'
				/>
				{errors.name && (
					<p className='mt-1 text-sm text-error'>{errors.name}</p>
				)}
			</div>

			{/* Roaster */}
			<div>
				<label htmlFor='roaster' className='block text-sm font-medium mb-1'>
					Roaster
				</label>
				<input
					type='text'
					id='roaster'
					name='roaster'
					value={formData.roaster || ''}
					onChange={handleInputChange}
					className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					placeholder='e.g., Heart Coffee Roasters'
				/>
			</div>

			{/* Origin */}
			<div>
				<label htmlFor='origin' className='block text-sm font-medium mb-1'>
					Origin
				</label>
				<input
					type='text'
					id='origin'
					name='origin'
					value={formData.origin || ''}
					onChange={handleInputChange}
					className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					placeholder='e.g., Ethiopia'
				/>
			</div>

			{/* Roast Level */}
			<div>
				<label htmlFor='roastLevel' className='block text-sm font-medium mb-1'>
					Roast Level
				</label>
				<select
					id='roastLevel'
					name='roastLevel'
					value={formData.roastLevel || ''}
					onChange={handleInputChange}
					className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
				>
					<option value=''>Select Roast Level</option>
					<option value='Light'>Light</option>
					<option value='Medium-Light'>Medium-Light</option>
					<option value='Medium'>Medium</option>
					<option value='Medium-Dark'>Medium-Dark</option>
					<option value='Dark'>Dark</option>
				</select>
			</div>

			{/* Dates */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<div>
					<label htmlFor='roastDate' className='block text-sm font-medium mb-1'>
						Roast Date <span className='text-error'>*</span>
					</label>
					<input
						type='date'
						id='roastDate'
						name='roastDate'
						value={formData.roastDate}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
					{errors.roastDate && (
						<p className='mt-1 text-sm text-error'>{errors.roastDate}</p>
					)}
				</div>

				<div>
					<label
						htmlFor='freezeDate'
						className='block text-sm font-medium mb-1'
					>
						Freeze Date (optional)
					</label>
					<input
						type='date'
						id='freezeDate'
						name='freezeDate'
						value={formData.freezeDate || ''}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
				</div>
			</div>

			{/* Weights */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<div>
					<label
						htmlFor='initialWeight'
						className='block text-sm font-medium mb-1'
					>
						Initial Weight (g) <span className='text-error'>*</span>
					</label>
					<input
						type='number'
						id='initialWeight'
						name='initialWeight'
						value={formData.initialWeight || ''}
						onChange={handleInputChange}
						min='1'
						step='1'
						className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
					{errors.initialWeight && (
						<p className='mt-1 text-sm text-error'>{errors.initialWeight}</p>
					)}
				</div>

				<div>
					<label
						htmlFor='remainingWeight'
						className='block text-sm font-medium mb-1'
					>
						Remaining Weight (g)
					</label>
					<input
						type='number'
						id='remainingWeight'
						name='remainingWeight'
						value={formData.remainingWeight || ''}
						onChange={handleInputChange}
						min='0'
						step='1'
						className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
				</div>
			</div>

			{/* Notes */}
			<div>
				<label htmlFor='notes' className='block text-sm font-medium mb-1'>
					Notes
				</label>
				<textarea
					id='notes'
					name='notes'
					value={formData.notes || ''}
					onChange={handleInputChange}
					rows={4}
					className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
					placeholder='Tasting notes, brewing recommendations, etc.'
				/>
			</div>

			{/* Form Actions */}
			<div className='flex justify-end gap-3'>
				<button
					type='button'
					onClick={() => router.push('/beans')}
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
					{isEditMode ? 'Update Bean' : 'Add Bean'}
				</button>
			</div>
		</form>
	)
}

export default BeanForm
