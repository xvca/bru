import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { equipmentSchema, type EquipmentFormData } from '@/lib/validators'
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

interface EquipmentFormModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId: number
	equipmentId?: number
	onSuccess?: () => void
}

export default function EquipmentFormModal({
	isOpen,
	onClose,
	brewBarId,
	equipmentId,
	onSuccess,
}: EquipmentFormModalProps) {
	const { user } = useAuth()
	const isEditMode = !!equipmentId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const form = useForm<EquipmentFormData>({
		resolver: zodResolver(equipmentSchema),
		defaultValues: {
			name: '',
			type: '',
			notes: '',
		},
	})

	useEffect(() => {
		if (isOpen) {
			if (!isEditMode) {
				form.reset({
					name: '',
					type: '',
					notes: '',
				})
			} else if (equipmentId) {
				fetchEquipment()
			}
		} else {
			form.reset()
		}
	}, [isOpen, isEditMode, equipmentId])

	const fetchEquipment = async () => {
		try {
			setIsFetching(true)
			if (!user?.token) return

			const { data } = await axios.get(
				`/api/brew-bars/${brewBarId}/equipment/${equipmentId}`,
				{
					headers: { Authorization: `Bearer ${user.token}` },
				},
			)

			form.reset({
				name: data.name,
				type: data.type || '',
				notes: data.notes || '',
			})
		} catch (error) {
			console.error('Error fetching equipment:', error)
			toast.error('Failed to load equipment data')
			onClose()
		} finally {
			setIsFetching(false)
		}
	}

	const onSubmit = async (data: EquipmentFormData) => {
		setIsLoading(true)

		try {
			if (!user?.token) return

			if (isEditMode && equipmentId) {
				await axios.put(
					`/api/brew-bars/${brewBarId}/equipment/${equipmentId}`,
					data,
					{
						headers: { Authorization: `Bearer ${user.token}` },
					},
				)
				toast.success('Equipment updated successfully')
			} else {
				await axios.post(`/api/brew-bars/${brewBarId}/equipment`, data, {
					headers: { Authorization: `Bearer ${user.token}` },
				})
				toast.success('Equipment added successfully')
			}

			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error saving equipment:', error)
			toast.error(`Failed to ${isEditMode ? 'update' : 'add'} equipment`)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? 'Edit Equipment' : 'Add Equipment'}
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
										<FieldLabel htmlFor='type'>Type</FieldLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value || ''}
											defaultValue={field.value || ''}
										>
											<SelectTrigger id='type' className='w-full'>
												<SelectValue placeholder='Select Equipment Type' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='Espresso Machine'>
													Espresso Machine
												</SelectItem>
												<SelectItem value='Pour Over'>Pour Over</SelectItem>
												<SelectItem value='French Press'>
													French Press
												</SelectItem>
												<SelectItem value='AeroPress'>AeroPress</SelectItem>
												<SelectItem value='Moka Pot'>Moka Pot</SelectItem>
												<SelectItem value='Cold Brew'>Cold Brew</SelectItem>
												<SelectItem value='Scale'>Scale</SelectItem>
												<SelectItem value='Kettle'>Kettle</SelectItem>
												<SelectItem value='Other'>Other</SelectItem>
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
											placeholder='Additional notes about this equipment'
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
