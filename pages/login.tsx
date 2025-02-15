import Page from '@/components/page'
import Section from '@/components/section'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'

// Create a schema for form validation
const authSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginPage() {
	async function login(formData: FormData) {
		const supabase = createClient()

		try {
			const data = authSchema.parse({
				email: formData.get('email'),
				password: formData.get('password'),
			})

			const { error } = await supabase.auth.signInWithPassword(data)

			if (error) {
				redirect('/error')
			}

			revalidatePath('/', 'layout')
			redirect('/account')
		} catch (error) {
			console.error('Validation error:', error)
			redirect('/error')
		}
	}

	async function signup(formData: FormData) {
		const supabase = createClient()

		try {
			const data = authSchema.parse({
				email: formData.get('email'),
				password: formData.get('password'),
			})

			const { error } = await supabase.auth.signUp(data)

			if (error) {
				redirect('/error')
			}

			revalidatePath('/', 'layout')
			redirect('/account')
		} catch (error) {
			console.error('Validation error:', error)
			redirect('/error')
		}
	}

	return (
		<Page>
			<Section>
				<div className='max-w-md mx-auto mt-8'>
					<h1 className='text-2xl font-bold mb-6 text-center'>
						Login or Sign Up
					</h1>

					<form className='space-y-6'>
						<div className='space-y-2'>
							<label htmlFor='email' className='block text-sm font-medium'>
								Email
							</label>
							<input
								id='email'
								name='email'
								type='email'
								required
								className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent'
							/>
						</div>

						<div className='space-y-2'>
							<label htmlFor='password' className='block text-sm font-medium'>
								Password
							</label>
							<input
								id='password'
								name='password'
								type='password'
								required
								className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent'
							/>
						</div>

						<div className='flex gap-4'>
							<button
								formAction={login}
								className='flex-1 px-4 py-2 text-white bg-black dark:bg-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity'
							>
								Log in
							</button>
							<button
								formAction={signup}
								className='flex-1 px-4 py-2 border border-black dark:border-white rounded-lg font-medium hover:opacity-70 transition-opacity'
							>
								Sign up
							</button>
						</div>
					</form>
				</div>
			</Section>
		</Page>
	)
}
