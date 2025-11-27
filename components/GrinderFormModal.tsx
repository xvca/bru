import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { Spinner } from './ui/spinner'
import { Button } from './ui/button'

const grinderSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	burrType: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

type GrinderFormData = z.infer<typeof grinderSchema>

interface GrinderFormModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId: number
	grinderId?: number
	onSuccess?: () => void
}

export default function GrinderFormModal({
	isOpen,
	onClose,
	brewBarId,
	grinderId,
	onSuccess,
}: GrinderFormModalProps) {
	const { user } = useAuth()
	const isEditMode = Boolean(grinderId)

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(isEditMode)
	const [errors, setErrors] = useState<Record<string, string>>({})

	const [formData, setFormData] = useState<GrinderFormData>({
		name: '',
		burrType: '',
		notes: '',
	})

	useEffect(() => {
		if (isOpen && !isEditMode) {
			setFormData({
				name: '',
				burrType: '',
				notes: '',
			})
			setErrors({})
		}
	}, [isOpen, isEditMode])

	// Fetch grinder data if in edit mode
	useEffect(() => {
		const fetchGrinder = async () => {
			try {
				setIsFetching(true)
				if (!user?.token || !grinderId) return

				const { data } = await axios.get(
					`/api/brew-bars/${brewBarId}/grinders/${grinderId}`,
					{
						headers: { Authorization: `Bearer ${user.token}` },
					},
				)

				setFormData({
					name: data.name,
					burrType: data.burrType || '',
					notes: data.notes || '',
				})
			} catch (error) {
				console.error('Error fetching grinder:', error)
				toast.error('Failed to load grinder data')
			} finally {
				setIsFetching(false)
			}
		}

		if (isOpen && isEditMode && grinderId) {
			fetchGrinder()
		}
	}, [isOpen, grinderId, isEditMode, brewBarId, user])

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
			const validData = grinderSchema.parse(formData)

			if (!user?.token) return

			if (isEditMode && grinderId) {
				// Update existing grinder
				await axios.put(
					`/api/brew-bars/${brewBarId}/grinders/${grinderId}`,
					validData,
					{
						headers: { Authorization: `Bearer ${user.token}` },
					},
				)
				toast.success('Grinder updated successfully')
			} else {
				// Create new grinder
				await axios.post(`/api/brew-bars/${brewBarId}/grinders`, validData, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Grinder added successfully')
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
				console.error('Error saving grinder:', error)
				toast.error(`Failed to ${isEditMode ? 'update' : 'add'} grinder`)
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
						<span>{isEditMode ? 'Edit Grinder' : 'Add Grinder'}</span>
						<Button
							onClick={onClose}
							variant='ghost'
							size='icon'
							className='rounded-full'
						>
							<X />
						</Button>
					</DialogTitle>

					{isFetching ? (
						<div className='flex justify-center items-center py-8'>
							<Spinner />
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
									placeholder='e.g., Niche Zero'
								/>
								{errors.name && (
									<p className='mt-1 text-sm text-error'>{errors.name}</p>
								)}
							</div>

							{/* Burr Type */}
							<div>
								<label
									htmlFor='burrType'
									className='block text-sm font-medium mb-1'
								>
									Burr Type
								</label>
								<input
									type='text'
									id='burrType'
									name='burrType'
									value={formData.burrType || ''}
									onChange={handleInputChange}
									className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
									placeholder='e.g., Conical, Flat, etc.'
								/>
							</div>

							{/* Notes */}
							<div>
								<label
									htmlFor='notes'
									className='block text-sm font-medium mb-1'
								>
									Notes
								</label>
								<textarea
									id='notes'
									name='notes'
									value={formData.notes || ''}
									onChange={handleInputChange}
									rows={3}
									className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
									placeholder='Additional notes about this grinder'
								/>
							</div>

							{/* Buttons */}
							<div className='flex justify-end gap-3 pt-2'>
								<Button type='button' onClick={onClose} variant='outline'>
									Cancel
								</Button>
								<Button type='submit' disabled={isLoading}>
									{isLoading && <Spinner />}
									{isEditMode ? 'Update' : 'Add'}
								</Button>
							</div>
						</form>
					)}
				</DialogPanel>
			</div>
		</Dialog>
	)
}
