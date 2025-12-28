import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authSchema, type AuthFormData } from '@/lib/validators'
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

export default function Login() {
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()
	const { login: authLogin } = useAuth()

	const form = useForm<AuthFormData>({
		resolver: zodResolver(authSchema),
		defaultValues: {
			username: '',
			password: '',
		},
	})

	async function onLogin(data: AuthFormData) {
		try {
			setIsLoading(true)
			const response = await axios.post('/api/auth/login', data)
			authLogin(response.data)
			toast.success('Login successful')
			router.push('/')
		} catch (err: any) {
			console.error(err)
			if (axios.isAxiosError(err)) {
				toast.error(err.response?.data?.error || 'Failed to login')
			} else {
				toast.error("Couldn't log in")
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<form onSubmit={form.handleSubmit(onLogin)} className='space-y-6'>
			<FieldGroup>
				<Controller
					name='username'
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor='login-username'>Username</FieldLabel>
							<Input
								{...field}
								id='login-username'
								autoComplete='username'
								placeholder='Enter your username'
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
							<FieldLabel htmlFor='login-password'>Password</FieldLabel>
							<Input
								{...field}
								id='login-password'
								type='password'
								autoComplete='current-password'
								placeholder='Enter your password'
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>

			<Button type='submit' disabled={isLoading} className='w-full'>
				{isLoading && <Spinner className='mr-2' />}
				{isLoading ? 'Loading...' : 'Log in'}
			</Button>
		</form>
	)
}
