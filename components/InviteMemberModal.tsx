import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { z } from 'zod'
import { useForm, Controller, SubmitHandler } from 'react-hook-form' // 1. Import SubmitHandler
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteSchema, type InviteFormData } from '@/lib/validators'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
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

	const form = useForm<InviteFormData>({
		resolver: zodResolver(inviteSchema),
		defaultValues: {
			username: '',
			role: 'Member',
		},
	})

	const onSubmit: SubmitHandler<InviteFormData> = async (data) => {
		setIsLoading(true)

		try {
			if (!user?.token) return

			await axios.post(`/api/brew-bars/${brewBarId}/members`, data, {
				headers: { Authorization: `Bearer ${user.token}` },
			})

			toast.success('Member added successfully')
			form.reset()
			onSuccess?.()
			onClose()
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response?.status === 404) {
					toast.error('User not found')
					form.setError('username', { message: 'User not found' })
				} else if (error.response?.status === 409) {
					toast.error('User is already a member')
					form.setError('username', { message: 'User is already a member' })
				} else {
					toast.error('Failed to add member')
				}
			} else {
				console.error('Error adding member:', error)
				toast.error('An unexpected error occurred')
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-sm'>
				<DialogHeader>
					<DialogTitle>Add Member</DialogTitle>
				</DialogHeader>

				<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
					<FieldGroup>
						<Controller
							name='username'
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor='username'>
										Username <span className='text-error'>*</span>
									</FieldLabel>
									<Input
										{...field}
										id='username'
										placeholder='Enter username'
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							name='role'
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor='role'>Role</FieldLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
										value={field.value}
									>
										<SelectTrigger id='role' className='w-full'>
											<SelectValue placeholder='Select Role' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='Member'>Member</SelectItem>
											<SelectItem value='Admin'>Admin</SelectItem>
										</SelectContent>
									</Select>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
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
							Add Member
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
