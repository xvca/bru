import Page from '@/components/Page'
import Section from '@/components/Section'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useState } from 'react'
import { z } from 'zod'
import { useRouter } from 'next/router'
import { toast } from 'sonner'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authSchema, type AuthFormData } from '@/lib/validators'

import {
	Field,
	FieldLabel,
	FieldError,
	FieldGroup,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
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
		} catch (err) {
			handleError(err)
		} finally {
			setIsLoading(false)
		}
	}

	async function onSignup(data: AuthFormData) {
		try {
			setIsLoading(true)
			await axios.post('/api/auth/register', data)

			const loginResponse = await axios.post('/api/auth/login', data)
			authLogin(loginResponse.data)

			toast.success('Account created successfully')
			router.push('/')
		} catch (err) {
			handleError(err, 'signup')
		} finally {
			setIsLoading(false)
		}
	}

	const handleError = (err: any, context: 'login' | 'signup' = 'login') => {
		console.error(err)
		if (err instanceof axios.AxiosError) {
			toast.error(err.response?.data?.error || `Failed to ${context}`)
		} else {
			toast.error(`Couldn't ${context === 'login' ? 'log in' : 'sign up'}`)
		}
	}

	return (
		<Page title='login'>
			<Section>
				<div className='max-w-md mx-auto mt-8'>
					<h1 className='text-2xl font-bold mb-6 text-center'>
						Login or Sign Up
					</h1>

					<form className='space-y-6'>
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
											placeholder='Enter your username'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name='password'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='password'>Password</FieldLabel>
										<Input
											{...field}
											id='password'
											type='password'
											autoComplete='current-password'
											placeholder='Enter your password'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</FieldGroup>

						<div className='flex gap-4 pt-2'>
							<Button
								type='button'
								onClick={form.handleSubmit(onLogin)}
								disabled={isLoading}
								className='grow'
							>
								{isLoading && <Spinner className='mr-2' />}
								{isLoading ? 'Loading...' : 'Log in'}
							</Button>

							<Button
								type='button'
								onClick={form.handleSubmit(onSignup)}
								disabled={isLoading}
								variant='outline'
								className='grow'
							>
								{isLoading && <Spinner className='mr-2' />}
								{isLoading ? 'Loading...' : 'Sign up'}
							</Button>
						</div>
					</form>
				</div>
			</Section>
		</Page>
	)
}
