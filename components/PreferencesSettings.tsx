import { useState } from 'react'
import { z } from 'zod'
import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	userPreferencesSchema,
	type UserPreferencesFormData,
} from '@/lib/validators'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

export default function PreferencesSettings() {
	const [isSaving, setIsSaving] = useState(false)

	const form = useForm<UserPreferencesFormData>({
		resolver: zodResolver(userPreferencesSchema),
		defaultValues: {
			defaultBrewBar: '',
		},
	})

	const onSubmit: SubmitHandler<UserPreferencesFormData> = async (data) => {
		setIsSaving(true)
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000))
			console.log('Saving preferences:', data)

			toast.success('Preferences saved successfully')
			form.reset(data)
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
				name='defaultBrewBar'
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor='defaultBrewBar'>Default Brew Bar</FieldLabel>
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
							value={field.value}
						>
							<SelectTrigger id='defaultBrewBar' className='w-full'>
								<SelectValue placeholder='Select default brew bar' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='personal'>Personal Space</SelectItem>
							</SelectContent>
						</Select>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<div>
				<Button type='submit' disabled={!form.formState.isDirty || isSaving}>
					{isSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
					Save Preferences
				</Button>
			</div>
		</form>
	)
}
