// components/InviteMemberModal.tsx
import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Loader2, X } from 'lucide-react'

// Form validation schema
const inviteSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	role: z.string().optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteMemberModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId: number
	onSuccess?: () => void
}

export default function InviteMemberModal({
	isOpen,
	onClose,
	brewBarId,
	onSuccess,
}: InviteMemberModalProps) {
	const { user } = useAuth()
	const [isLoading, setIsLoading] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})

	const [formData, setFormData] = useState<InviteFormData>({
		username: '',
		role: 'Member',
	})

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
			const validData = inviteSchema.parse(formData)

			if (!user?.token) return

			// Send invitation
			await axios.post(`/api/brew-bars/${brewBarId}/members`, validData, {
				headers: { Authorization: `Bearer ${user.token}` },
			})

			toast.success('Member added successfully')
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
			} else if (axios.isAxiosError(error)) {
				if (error.response?.status === 404) {
					toast.error('User not found')
				} else if (error.response?.status === 409) {
					toast.error('User is already a member')
				} else {
					toast.error('Failed to add member')
				}
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
				<DialogPanel className='mx-auto max-w-sm w-full rounded-lg bg-background p-6 shadow-xl motion-safe:animate-[popIn_0.2s_ease-out]'>
					<DialogTitle className='text-xl font-semibold mb-4 flex justify-between items-center'>
						<span>Add Member</span>
						<button
							onClick={onClose}
							className='text-text-secondary hover:text-text'
						>
							<X size={20} />
							<span className='sr-only'>Close</span>
						</button>
					</DialogTitle>

					<form onSubmit={handleSubmit} className='space-y-4'>
						{/* Username */}
						<div>
							<label
								htmlFor='username'
								className='block text-sm font-medium mb-1'
							>
								Username <span className='text-error'>*</span>
							</label>
							<input
								type='text'
								id='username'
								name='username'
								value={formData.username}
								onChange={handleInputChange}
								className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
								placeholder='Enter username'
							/>
							{errors.username && (
								<p className='mt-1 text-sm text-error'>{errors.username}</p>
							)}
						</div>

						{/* Role */}
						<div>
							<label htmlFor='role' className='block text-sm font-medium mb-1'>
								Role
							</label>
							<select
								id='role'
								name='role'
								value={formData.role || 'Member'}
								onChange={handleInputChange}
								className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
							>
								<option value='Member'>Member</option>
								<option value='Admin'>Admin</option>
							</select>
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
								Add Member
							</button>
						</div>
					</form>
				</DialogPanel>
			</div>
		</Dialog>
	)
}
