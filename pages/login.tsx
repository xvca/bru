import Page from '@/components/Page'
import Section from '@/components/Section'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useState } from 'react'
import { z } from 'zod'
import { useRouter } from 'next/router'
import toast, { Toaster } from 'react-hot-toast'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'

// Create a schema for form validation
const authSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [errors, setErrors] = useState<{ [key: string]: string }>({})
	const [formData, setFormData] = useState({
		username: '',
		password: '',
	})
	const router = useRouter()
	const { login: authLogin } = useAuth()

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setFormData((prev) => ({ ...prev, [name]: value }))
		// Clear error when user types
		if (errors[name]) {
			setErrors((prev) => {
				const newErrors = { ...prev }
				delete newErrors[name]
				return newErrors
			})
		}
	}

	async function login(e: React.FormEvent) {
		e.preventDefault()

		try {
			authSchema.parse(formData)

			setIsLoading(true)

			const response = await axios.post('/api/auth/login', formData)

			authLogin(response.data)

			toast.success('Login successful')
			router.push('/')
		} catch (err) {
			console.error(err)
			if (err instanceof z.ZodError) {
				const first = err.errors[0]
				toast.error(first.message)
			} else if (err instanceof axios.AxiosError) {
				toast.error(err.response?.data?.error)
			} else {
				toast.error("couldn't log in")
			}
		} finally {
			setIsLoading(false)
		}
	}

	async function signup(e: React.FormEvent) {
		e.preventDefault()

		try {
			// Validate form data
			authSchema.parse(formData)

			setIsLoading(true)

			const response = await axios.post('/api/auth/register', formData)

			// For signup, we also need to login after registration
			// First get login tokens
			const loginResponse = await axios.post('/api/auth/login', formData)

			authLogin(loginResponse.data)

			toast.success('Account created successfully')
			router.push('/')
		} catch (err) {
			console.error(err)
			if (err instanceof z.ZodError) {
				const first = err.errors[0]
				toast.error(first.message)
			} else if (err instanceof axios.AxiosError) {
				toast.error(err.response?.data?.error)
			} else {
				toast.error("couldn't sign up")
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Page title='login'>
			<Toaster position='top-center' />
			<Section>
				<div className='max-w-md mx-auto mt-8'>
					<h1 className='text-2xl font-bold mb-6 text-center'>
						Login or Sign Up
					</h1>

					<form className='space-y-6'>
						<div className='space-y-2'>
							<label htmlFor='username' className='block text-sm font-medium'>
								Username
							</label>
							<input
								id='username'
								name='username'
								type='text'
								value={formData.username}
								onChange={handleInputChange}
								required
								className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-background border-input-border'
							/>
							{errors.username && (
								<p className='text-error text-sm'>{errors.username}</p>
							)}
						</div>

						<div className='space-y-2'>
							<label htmlFor='password' className='block text-sm font-medium'>
								Password
							</label>
							<input
								id='password'
								name='password'
								type='password'
								value={formData.password}
								onChange={handleInputChange}
								required
								className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-background border-input-border'
							/>
							{errors.password && (
								<p className='text-error text-sm'>{errors.password}</p>
							)}
						</div>

						<div className='flex gap-4'>
							<Button onClick={login} disabled={isLoading} className='grow'>
								<Spinner />
								{isLoading ? 'Loading...' : 'Log in'}
							</Button>
							<Button
								onClick={signup}
								disabled={isLoading}
								variant='outline'
								className='grow'
							>
								<Spinner />
								{isLoading ? 'Loading...' : 'Sign up'}
							</Button>
						</div>
					</form>
				</div>
			</Section>
		</Page>
	)
}
