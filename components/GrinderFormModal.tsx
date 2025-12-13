import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { grinderSchema, type GrinderFormData } from '@/lib/validators'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

interface GrinderFormModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId: number
	grinderId?: number
	onSuccess?: () => void
}

export default function GrinderFormModal({
	isOpen,
	onClose,
	brewBarId,
	grinderId,
	onSuccess,
}: GrinderFormModalProps) {
	const { user } = useAuth()
	const isEditMode = !!grinderId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const form = useForm<GrinderFormData>({
		resolver: zodResolver(grinderSchema),
		defaultValues: {
			name: '',
			burrType: '',
			notes: '',
			barId: brewBarId,
		},
	})

	useEffect(() => {
		if (isOpen) {
			if (!isEditMode) {
				form.reset({
					name: '',
					burrType: '',
					notes: '',
					barId: brewBarId,
				})
			} else if (grinderId) {
				fetchGrinder()
			}
		} else {
			form.reset()
		}
	}, [isOpen, isEditMode, grinderId, brewBarId])

	const fetchGrinder = async () => {
		try {
			setIsFetching(true)
			if (!user?.token) return

			const { data } = await axios.get(
				`/api/brew-bars/${brewBarId}/grinders/${grinderId}`,
				{
					headers: { Authorization: `Bearer ${user.token}` },
				},
			)

			form.reset({
				name: data.name,
				burrType: data.burrType || '',
				notes: data.notes || '',
				barId: brewBarId,
			})
		} catch (error) {
			console.error('Error fetching grinder:', error)
			toast.error('Failed to load grinder data')
			onClose()
		} finally {
			setIsFetching(false)
		}
	}

	const onSubmit = async (data: GrinderFormData) => {
		setIsLoading(true)

		try {
			if (!user?.token) return

			if (isEditMode && grinderId) {
				await axios.put(
					`/api/brew-bars/${brewBarId}/grinders/${grinderId}`,
					data,
					{
						headers: { Authorization: `Bearer ${user.token}` },
					},
				)
				toast.success('Grinder updated successfully')
			} else {
				await axios.post(`/api/brew-bars/${brewBarId}/grinders`, data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Grinder added successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving grinder:', error)
			toast.error(`Failed to ${isEditMode ? 'update' : 'add'} grinder`)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? 'Edit Grinder' : 'Add Grinder'}
					</DialogTitle>
				</DialogHeader>

				{isFetching ? (
					<div className='flex justify-center items-center py-8'>
						<Spinner />
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
											placeholder='e.g., Niche Zero'
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name='burrType'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='burrType'>Burr Type</FieldLabel>
										<Input
											{...field}
											value={field.value || ''}
											id='burrType'
											placeholder='e.g., Conical, Flat, etc.'
										/>
									</Field>
								)}
							/>

							<Controller
								name='notes'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor='notes'>Notes</FieldLabel>
										<Textarea
											{...field}
											value={field.value || ''}
											id='notes'
											rows={3}
											placeholder='Additional notes about this grinder'
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
								{isEditMode ? 'Update' : 'Add'}
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
