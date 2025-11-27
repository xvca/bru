import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { Spinner } from './ui/spinner'
import { Button } from './ui/button'

// Form validation schema
const equipmentSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	type: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

type EquipmentFormData = z.infer<typeof equipmentSchema>

interface EquipmentFormModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId: number
	equipmentId?: number // If provided, we're in edit mode
	onSuccess?: () => void
}

export default function EquipmentFormModal({
	isOpen,
	onClose,
	brewBarId,
	equipmentId,
	onSuccess,
}: EquipmentFormModalProps) {
	const { user } = useAuth()
	const isEditMode = Boolean(equipmentId)

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(isEditMode)
	const [errors, setErrors] = useState<Record<string, string>>({})

	const [formData, setFormData] = useState<EquipmentFormData>({
		name: '',
		type: '',
		notes: '',
	})

	// Reset form when modal opens
	useEffect(() => {
		if (isOpen && !isEditMode) {
			setFormData({
				name: '',
				type: '',
				notes: '',
			})
			setErrors({})
		}
	}, [isOpen, isEditMode])

	// Fetch equipment data if in edit mode
	useEffect(() => {
		const fetchEquipment = async () => {
			try {
				setIsFetching(true)
				if (!user?.token || !equipmentId) return

				const { data } = await axios.get(
					`/api/brew-bars/${brewBarId}/equipment/${equipmentId}`,
					{
						headers: { Authorization: `Bearer ${user.token}` },
					},
				)

				setFormData({
					name: data.name,
					type: data.type || '',
					notes: data.notes || '',
				})
			} catch (error) {
				console.error('Error fetching equipment:', error)
				toast.error('Failed to load equipment data')
			} finally {
				setIsFetching(false)
			}
		}

		if (isOpen && isEditMode && equipmentId) {
			fetchEquipment()
		}
	}, [isOpen, equipmentId, isEditMode, brewBarId, user])

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
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
			const validData = equipmentSchema.parse(formData)

			if (!user?.token) return

			if (isEditMode && equipmentId) {
				// Update existing equipment
				await axios.put(
					`/api/brew-bars/${brewBarId}/equipment/${equipmentId}`,
					validData,
					{
						headers: { Authorization: `Bearer ${user.token}` },
					},
				)
				toast.success('Equipment updated successfully')
			} else {
				// Create new equipment
				await axios.post(`/api/brew-bars/${brewBarId}/equipment`, validData, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Equipment added successfully')
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
				console.error('Error saving equipment:', error)
				toast.error(`Failed to ${isEditMode ? 'update' : 'add'} equipment`)
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
						<span>{isEditMode ? 'Edit Equipment' : 'Add Equipment'}</span>
						<Button
							onClick={onClose}
							variant='ghost'
							size='icon'
							className='rounded-full'
						>
							<X size={20} />
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
									placeholder='e.g., Breville Dual Boiler'
								/>
								{errors.name && (
									<p className='mt-1 text-sm text-error'>{errors.name}</p>
								)}
							</div>

							{/* Type */}
							<div>
								<label
									htmlFor='type'
									className='block text-sm font-medium mb-1'
								>
									Type
								</label>
								<select
									id='type'
									name='type'
									value={formData.type || ''}
									onChange={handleInputChange}
									className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
								>
									<option value=''>Select Equipment Type</option>
									<option value='Espresso Machine'>Espresso Machine</option>
									<option value='Pour Over'>Pour Over</option>
									<option value='French Press'>French Press</option>
									<option value='AeroPress'>AeroPress</option>
									<option value='Moka Pot'>Moka Pot</option>
									<option value='Cold Brew'>Cold Brew</option>
									<option value='Scale'>Scale</option>
									<option value='Kettle'>Kettle</option>
									<option value='Other'>Other</option>
								</select>
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
									placeholder='Additional notes about this equipment'
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
