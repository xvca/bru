import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	BREW_METHODS,
	brewerSchema,
	type BrewerFormData,
} from '@/lib/validators'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

interface BrewerFormModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId?: number | null
	brewerId?: number
	onSuccess?: () => void
}

export default function BrewerFormModal({
	isOpen,
	onClose,
	brewBarId,
	brewerId,
	onSuccess,
}: BrewerFormModalProps) {
	const { user } = useAuth()
	const isEditMode = !!brewerId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const form = useForm<BrewerFormData>({
		resolver: zodResolver(brewerSchema),
		defaultValues: {
			name: '',
			type: '',
			notes: '',
			barId: brewBarId || undefined,
		},
	})

	useEffect(() => {
		if (isOpen) {
			if (!isEditMode) {
				form.reset({
					name: '',
					type: '',
					notes: '',
					barId: brewBarId || undefined,
				})
			} else if (brewerId) {
				fetchBrewer()
			}
		} else {
			form.reset()
		}
	}, [isOpen, isEditMode, brewerId, brewBarId])

	const fetchBrewer = async () => {
		try {
			setIsFetching(true)
			if (!user?.token) return

			const { data } = await axios.get(`/api/brewers/${brewerId}`, {
				headers: { Authorization: `Bearer ${user.token}` },
			})

			form.reset({
				name: data.name,
				type: data.type || '',
				notes: data.notes || '',
			})
		} catch (error) {
			console.error('Error fetching brewer:', error)
			toast.error('Failed to load brewer data')
			onClose()
		} finally {
			setIsFetching(false)
		}
	}

	const onSubmit = async (data: BrewerFormData) => {
		setIsLoading(true)

		try {
			if (!user?.token) return

			if (isEditMode && brewerId) {
				await axios.put(`/api/brewers/${brewerId}`, data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('brewer updated successfully')
			} else {
				await axios.post(`/api/brewers`, data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('brewer added successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving brewer:', error)
			toast.error(`Failed to ${isEditMode ? 'update' : 'add'} brewer`)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>{isEditMode ? 'Edit brewer' : 'Add brewer'}</DialogTitle>
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
											placeholder='e.g., Breville Dual Boiler'
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name='type'
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Type</FieldLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{BREW_METHODS.map((m) => (
													<SelectItem key={m} value={m}>
														{m}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
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
											placeholder='Additional notes about this brewer'
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
