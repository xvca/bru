import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authSchema } from '@/lib/validators'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'
import { toast } from 'sonner'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import {
	Field,
	FieldLabel,
	FieldError,
	FieldGroup,
} from '@/components/ui/field'
import { z } from 'zod'

const signupSchema = authSchema
	.extend({
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	})

type SignupFormData = z.infer<typeof signupSchema>

export default function Signup() {
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()
	const { login: authLogin } = useAuth()

	const form = useForm<SignupFormData>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			username: '',
			password: '',
			confirmPassword: '',
		},
	})

	async function onSignup(data: SignupFormData) {
		try {
			setIsLoading(true)
			const { confirmPassword, ...apiData } = data
			await axios.post('/api/auth/register', apiData)

			const loginResponse = await axios.post('/api/auth/login', apiData)
			authLogin(loginResponse.data)

			toast.success('Account created successfully')
			router.push('/')
		} catch (err: any) {
			console.error(err)
			if (axios.isAxiosError(err)) {
				toast.error(err.response?.data?.error || 'Failed to sign up')
			} else {
				toast.error("Couldn't sign up")
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<form onSubmit={form.handleSubmit(onSignup)} className='space-y-6'>
			<FieldGroup>
				<Controller
					name='username'
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor='signup-username'>Username</FieldLabel>
							<Input
								{...field}
								id='signup-username'
								autoComplete='username'
								placeholder='Choose a username'
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name='password'
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor='signup-password'>Password</FieldLabel>
							<Input
								{...field}
								id='signup-password'
								type='password'
								autoComplete='new-password'
								placeholder='Choose a password'
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name='confirmPassword'
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor='signup-confirm-password'>
								Confirm Password
							</FieldLabel>
							<Input
								{...field}
								id='signup-confirm-password'
								type='password'
								autoComplete='new-password'
								placeholder='Confirm your password'
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>

			<Button type='submit' disabled={isLoading} className='w-full'>
				{isLoading && <Spinner className='mr-2' />}
				{isLoading ? 'Creating account...' : 'Sign up'}
			</Button>
		</form>
	)
}
