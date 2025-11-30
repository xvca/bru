import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Input } from './ui/input'
import { Field, FieldLabel, FieldError, FieldGroup } from './ui/field'

const accountSchema = z
	.object({
		username: z.string().min(3, 'Username must be at least 3 characters'),
		currentPassword: z
			.string()
			.min(1, 'Current password is required to save changes'),
		newPassword: z.string().optional(),
		confirmPassword: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.newPassword && data.newPassword.length > 0) {
			if (data.newPassword.length < 6) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'New password must be at least 6 characters',
					path: ['newPassword'],
				})
			}
			if (data.newPassword !== data.confirmPassword) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Passwords do not match',
					path: ['confirmPassword'],
				})
			}
		}
	})

type AccountFormValues = z.infer<typeof accountSchema>

export default function AccountSettings() {
	const { user } = useAuth()
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<AccountFormValues>({
		resolver: zodResolver(accountSchema),
		defaultValues: {
			username: user?.username || '',
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	})

	useEffect(() => {
		if (user?.username) {
			form.reset({
				username: user.username,
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			})
		}
	}, [user, form])

	const onSubmit = async (data: AccountFormValues) => {
		setIsLoading(true)
		try {
			// TODO password change logic
			console.log('Submitting account update:', data)

			await new Promise((resolve) => setTimeout(resolve, 1000))

			toast.success('Account updated successfully')

			form.reset({
				username: data.username,
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			})
		} catch (error) {
			console.error(error)
			toast.error('Failed to update account')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='space-y-4'>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
				<FieldGroup>
					<Controller
						name='username'
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor='username'>Username</FieldLabel>
								<Input
									{...field}
									id='username'
									autoComplete='username'
									placeholder='your_username'
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name='currentPassword'
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor='currentPassword'>
									Current Password
								</FieldLabel>
								<Input
									{...field}
									id='currentPassword'
									type='password'
									autoComplete='current-password'
									placeholder='Required to save changes'
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name='newPassword'
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor='newPassword'>New Password</FieldLabel>
								<Input
									{...field}
									id='newPassword'
									type='password'
									autoComplete='new-password'
									placeholder='Leave blank to keep current'
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name='confirmPassword'
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor='confirmPassword'>
									Confirm New Password
								</FieldLabel>
								<Input
									{...field}
									id='confirmPassword'
									type='password'
									autoComplete='new-password'
									placeholder='Confirm new password'
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
				</FieldGroup>

				<Button type='submit' disabled={isLoading}>
					{isLoading && <Spinner className='mr-2' />}
					{isLoading ? 'Updating...' : 'Update Account'}
				</Button>
			</form>
		</div>
	)
}
