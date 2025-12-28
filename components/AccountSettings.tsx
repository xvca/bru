import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { Button } from '@/components/ui/button'
import { z } from 'zod'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import axios from 'axios'
import { Check, X } from 'lucide-react'

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
	const { user, login } = useAuth()
	const [isLoading, setIsLoading] = useState(false)
	const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
		null,
	)
	const [isCheckingUsername, setIsCheckingUsername] = useState(false)

	const form = useForm<AccountFormValues>({
		resolver: zodResolver(accountSchema),
		defaultValues: {
			username: user?.username || '',
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	})

	const watchedUsername = useWatch({ control: form.control, name: 'username' })

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

	// Debounced username check
	useEffect(() => {
		if (!watchedUsername || watchedUsername === user?.username) {
			setUsernameAvailable(null)
			return
		}

		if (watchedUsername.length < 3) {
			setUsernameAvailable(null)
			return
		}

		const timer = setTimeout(async () => {
			setIsCheckingUsername(true)
			try {
				const { data } = await axios.get(
					`/api/user/check-username?username=${watchedUsername}`,
				)
				setUsernameAvailable(data.available)
			} catch (error) {
				console.error('Failed to check username', error)
			} finally {
				setIsCheckingUsername(false)
			}
		}, 500)

		return () => clearTimeout(timer)
	}, [watchedUsername, user?.username])

	const onSubmit = async (data: AccountFormValues) => {
		if (usernameAvailable === false) {
			form.setError('username', {
				type: 'manual',
				message: 'Username is already taken',
			})
			return
		}

		setIsLoading(true)
		try {
			const response = await axios.put(
				'/api/user/account',
				{
					username: data.username,
					currentPassword: data.currentPassword,
					newPassword: data.newPassword,
				},
				{
					headers: { Authorization: `Bearer ${user?.token}` },
				},
			)

			toast.success('Account updated successfully')

			// Update local user context if username changed
			if (data.username !== user?.username) {
				login({
					...user!,
					username: data.username,
				})
			}

			form.reset({
				username: data.username,
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			})
		} catch (error) {
			console.error(error)
			if (axios.isAxiosError(error) && error.response) {
				if (error.response.status === 401) {
					form.setError('currentPassword', {
						type: 'manual',
						message: 'Incorrect password',
					})
					toast.error('Incorrect current password')
				} else if (error.response.status === 409) {
					form.setError('username', {
						type: 'manual',
						message: 'Username already taken',
					})
					toast.error('Username already taken')
				} else {
					toast.error('Failed to update account')
				}
			} else {
				toast.error('Failed to update account')
			}
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
								<div className='relative'>
									<Input
										{...field}
										id='username'
										autoComplete='username'
										placeholder='your_username'
										aria-invalid={fieldState.invalid}
										className={
											usernameAvailable === true
												? 'border-green-500 focus-visible:ring-green-500'
												: usernameAvailable === false
													? 'border-destructive focus-visible:ring-destructive'
													: ''
										}
									/>
									<div className='absolute right-3 top-2.5 text-muted-foreground'>
										{isCheckingUsername ? (
											<Spinner />
										) : usernameAvailable === true ? (
											<Check className='h-4 w-4 text-green-500' />
										) : usernameAvailable === false ? (
											<X className='h-4 w-4 text-destructive' />
										) : null}
									</div>
								</div>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
								{usernameAvailable === false && !fieldState.invalid && (
									<p className='text-xs text-destructive mt-1'>
										Username is already taken
									</p>
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

				<Button
					type='submit'
					disabled={isLoading || usernameAvailable === false}
				>
					{isLoading && <Spinner className='mr-2' />}
					{isLoading ? 'Updating...' : 'Update Account'}
				</Button>
			</form>
		</div>
	)
}
