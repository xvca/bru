import { useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { Button } from './ui/button'

export default function AccountSettings() {
	const { user } = useAuth()

	const [accountForm, setAccountForm] = useState({
		username: user?.username || '',
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})

	const handleAccountSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		// TODO: Implement account update logic
	}

	return (
		<div className='space-y-4'>
			<form onSubmit={handleAccountSubmit} className='space-y-4'>
				<div>
					<label htmlFor='username' className='block text-sm font-medium mb-1'>
						Username
					</label>
					<input
						type='text'
						id='username'
						value={accountForm.username}
						onChange={(e) =>
							setAccountForm({ ...accountForm, username: e.target.value })
						}
						className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
				</div>
				<div>
					<label
						htmlFor='currentPassword'
						className='block text-sm font-medium mb-1'
					>
						Current Password
					</label>
					<input
						type='password'
						id='currentPassword'
						value={accountForm.currentPassword}
						onChange={(e) =>
							setAccountForm({
								...accountForm,
								currentPassword: e.target.value,
							})
						}
						className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
				</div>
				<div>
					<label
						htmlFor='newPassword'
						className='block text-sm font-medium mb-1'
					>
						New Password
					</label>
					<input
						type='password'
						id='newPassword'
						value={accountForm.newPassword}
						onChange={(e) =>
							setAccountForm({
								...accountForm,
								newPassword: e.target.value,
							})
						}
						className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
				</div>
				<div>
					<label
						htmlFor='confirmPassword'
						className='block text-sm font-medium mb-1'
					>
						Confirm New Password
					</label>
					<input
						type='password'
						id='confirmPassword'
						value={accountForm.confirmPassword}
						onChange={(e) =>
							setAccountForm({
								...accountForm,
								confirmPassword: e.target.value,
							})
						}
						className='w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary bg-background border-input-border'
					/>
				</div>
				<Button type='submit'>Update Account</Button>
			</form>
		</div>
	)
}
