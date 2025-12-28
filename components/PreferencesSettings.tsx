import { useEffect, useState } from 'react'
import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useBrewBar } from '@/lib/brewBarContext'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import {
	userPreferencesSchema,
	type UserPreferencesFormData,
} from '@/lib/validators'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Spinner } from './ui/spinner'

export default function PreferencesSettings() {
	const { user } = useAuth()
	const { availableBars, refreshBars } = useBrewBar()
	const [isSaving, setIsSaving] = useState(false)

	const form = useForm<UserPreferencesFormData>({
		resolver: zodResolver(userPreferencesSchema),
		defaultValues: {
			defaultBarId: 'personal',
		},
	})

	useEffect(() => {
		const load = async () => {
			try {
				const { data } = await axios.get('/api/user/preferences', {
					headers: { Authorization: `Bearer ${user?.token}` },
				})
				form.reset({
					defaultBarId: data.defaultBarId
						? String(data.defaultBarId)
						: 'personal',
					decafStartHour: data.decafStartHour,
				})
			} catch (e) {
				console.error(e)
			}
		}
		if (user) load()
	}, [user, form])

	const onSubmit: SubmitHandler<UserPreferencesFormData> = async (data) => {
		setIsSaving(true)
		try {
			await axios.put('/api/user/preferences', data, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			toast.success('Preferences saved')
			await refreshBars()
		} catch (error) {
			console.error('Failed to save preferences:', error)
			toast.error('Failed to save preferences')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
			<Controller
				name='defaultBarId'
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor='defaultBarId'>Default Brew Bar</FieldLabel>
						<Select onValueChange={field.onChange} value={field.value}>
							<SelectTrigger id='defaultBarId' className='w-full'>
								<SelectValue placeholder='Select default brew bar' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='personal'>Personal Space</SelectItem>
								{availableBars.map((bar) => (
									<SelectItem key={bar.id} value={String(bar.id)}>
										{bar.name} ({bar.role})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<div>
				<Button type='submit' disabled={isSaving}>
					{isSaving && <Spinner />}
					Save Preferences
				</Button>
			</div>
		</form>
	)
}
