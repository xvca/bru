import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Loader2, X } from 'lucide-react'

// Form validation schema
const brewBarSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	location: z.string().optional().nullable(),
})

type BrewBarFormData = z.infer<typeof brewBarSchema>

interface BrewBarFormProps {
	isOpen: boolean
	onClose: () => void
	brewBarId?: number // If provided, we're in edit mode
	onSuccess?: () => void
}

export default function BrewBarFormModal({
	isOpen,
	onClose,
	brewBarId,
	onSuccess,
}: BrewBarFormProps) {
	const { user } = useAuth()
	const isEditMode = Boolean(brewBarId)

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(isEditMode)
	const [errors, setErrors] = useState<Record<string, string>>({})

	const [formData, setFormData] = useState<BrewBarFormData>({
		name: '',
		location: '',
	})

	// Reset form when modal opens
	useEffect(() => {
		if (isOpen && !isEditMode) {
			setFormData({
				name: '',
				location: '',
			})
			setErrors({})
		}
	}, [isOpen, isEditMode])

	// Fetch brew bar data if in edit mode
	useEffect(() => {
		const fetchBrewBar = async () => {
			try {
				setIsFetching(true)
				if (!user?.token) return

				const { data } = await axios.get(`/api/brew-bars/${brewBarId}`, {
					headers: { Authorization: `Bearer ${user.token}` },
				})

				setFormData({
					name: data.name,
					location: data.location,
				})
			} catch (error) {
				console.error('Error fetching brew bar:', error)
				toast.error('Failed to load brew bar data')
			} finally {
				setIsFetching(false)
			}
		}

		if (isOpen && isEditMode && brewBarId && user) {
			fetchBrewBar()
		}
	}, [isOpen, brewBarId, isEditMode, user])

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target

		setFormData({
			...formData,
			[name]: value,
		})

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
			const validData = brewBarSchema.parse(formData)

			if (!user?.token) return

			if (isEditMode) {
				// Update existing brew bar
				await axios.put(`/api/brew-bars/${brewBarId}`, validData, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Brew bar updated successfully')
			} else {
				// Create new brew bar
				await axios.post('/api/brew-bars', validData, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Brew bar created successfully')
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
				console.error('Error saving brew bar:', error)
				toast.error(`Failed to ${isEditMode ? 'update' : 'create'} brew bar`)
			}
		} finally {
			setIsLoading(false)
		}
	}

	if (!isOpen) return null

	return (
		<Dialog open={isOpen} onClose={onClose} className='relative z-50'>
			<div className='fixed inset-0 bg-black/30' aria-hidden='true' />

			<div className='fixed inset-0 flex items-center justify-center p-4'>
				<DialogPanel className='mx-auto max-w-md w-full rounded-lg bg-background p-6 shadow-xl motion-safe:animate-[popIn_0.2s_ease-out]'>
					<DialogTitle className='text-xl font-semibold mb-4 flex justify-between items-center'>
						<span>{isEditMode ? 'Edit Brew Bar' : 'Create New Brew Bar'}</span>
						<button
							onClick={onClose}
							className='text-text-secondary hover:text-text'
						>
							<X size={20} />
							<span className='sr-only'>Close</span>
						</button>
					</DialogTitle>

					{isFetching ? (
						<div className='flex justify-center items-center py-8'>
							<Loader2 className='w-8 h-8 animate-spin' />
						</div>
					) : (
						<form onSubmit={handleSubmit} className='space-y-4'>
							{/* Name */}
							<div>
								<label
									htmlFor='name'
									className='block text-sm font-medium mb-1'
								>
									Name <span className='text-error'>*</span>
								</label>
								<input
									type='text'
									id='name'
									name='name'
									value={formData.name}
									onChange={handleInputChange}
									className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
									placeholder='e.g., Home Coffee Lab'
								/>
								{errors.name && (
									<p className='mt-1 text-sm text-error'>{errors.name}</p>
								)}
							</div>

							{/* Location */}
							<div>
								<label
									htmlFor='location'
									className='block text-sm font-medium mb-1'
								>
									Location
								</label>
								<input
									type='text'
									id='location'
									name='location'
									value={formData.location || ''}
									onChange={handleInputChange}
									className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
									placeholder='e.g., Kitchen, Office'
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
									{isEditMode ? 'Update' : 'Create'}
								</button>
							</div>
						</form>
					)}
				</DialogPanel>
			</div>
		</Dialog>
	)
}
