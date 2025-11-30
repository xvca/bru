import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { brewBarSchema, type BrewBarFormData } from '@/lib/validators'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import {
	Field,
	FieldLabel,
	FieldError,
	FieldGroup,
} from '@/components/ui/field'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

interface BrewBarFormModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId?: number
	onSuccess?: () => void
}

export default function BrewBarFormModal({
	isOpen,
	onClose,
	brewBarId,
	onSuccess,
}: BrewBarFormModalProps) {
	const { user } = useAuth()
	const isEditMode = !!brewBarId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const form = useForm<BrewBarFormData>({
		resolver: zodResolver(brewBarSchema),
		defaultValues: {
			name: '',
			location: '',
		},
	})

	useEffect(() => {
		if (isOpen) {
			if (!isEditMode) {
				form.reset({
					name: '',
					location: '',
				})
			} else if (brewBarId) {
				fetchBrewBar()
			}
		} else {
			form.reset()
		}
	}, [isOpen, isEditMode, brewBarId])

	const fetchBrewBar = async () => {
		try {
			setIsFetching(true)
			if (!user?.token) return

			const { data } = await axios.get(`/api/brew-bars/${brewBarId}`, {
				headers: { Authorization: `Bearer ${user.token}` },
			})

			form.reset({
				name: data.name,
				location: data.location || '',
			})
		} catch (error) {
			console.error('Error fetching brew bar:', error)
			toast.error('Failed to load brew bar data')
			onClose()
		} finally {
			setIsFetching(false)
		}
	}

	const onSubmit = async (data: BrewBarFormData) => {
		setIsLoading(true)

		try {
			if (!user?.token) return

			if (isEditMode) {
				await axios.put(`/api/brew-bars/${brewBarId}`, data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Brew bar updated successfully')
			} else {
				await axios.post('/api/brew-bars', data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Brew bar created successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving brew bar:', error)
			toast.error(`Failed to ${isEditMode ? 'update' : 'create'} brew bar`)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? 'Edit Brew Bar' : 'Create New Brew Bar'}
					</DialogTitle>
				</DialogHeader>

				{isFetching ? (
					<div className='flex justify-center items-center py-8'>
						<Loader2 className='w-8 h-8 animate-spin' />
					</div>
				) : (
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
						<FieldGroup>
							<Controller
								name='name'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='name'>
											Name <span className='text-error'>*</span>
										</FieldLabel>
										<Input
											{...field}
											id='name'
											placeholder='e.g., Home Coffee Lab'
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name='location'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='location'>Location</FieldLabel>
										<Input
											{...field}
											value={field.value || ''}
											id='location'
											placeholder='e.g., Kitchen, Office'
										/>
									</Field>
								)}
							/>
						</FieldGroup>

						<div className='flex justify-end gap-3 pt-2'>
							<Button onClick={onClose} variant='outline' type='button'>
								Cancel
							</Button>

							<Button type='submit' disabled={isLoading}>
								{isLoading && <Spinner className='mr-2' />}
								{isEditMode ? 'Update' : 'Create'}
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
