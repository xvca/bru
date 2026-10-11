import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { grinderSchema, type GrinderFormData } from '@/lib/validators'
import { toast } from 'sonner'

import { Sheet } from '@/components/kit/Sheet'
import { Key, TextButton } from '@/components/kit/buttons'
import { FormField } from '@/components/kit/rows'
import { RowSkeleton } from '@/components/kit/states'

interface GrinderFormModalProps {
	isOpen: boolean
	onClose: () => void
	grinderId?: number
	onSuccess?: () => void
}

export default function GrinderFormModal({
	isOpen,
	onClose,
	grinderId,
	onSuccess,
}: GrinderFormModalProps) {
	const isEditMode = !!grinderId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const form = useForm<GrinderFormData>({
		resolver: zodResolver(grinderSchema),
		defaultValues: {
			name: '',
			burrType: '',
			notes: '',
		},
	})

	// Parents pass an inline onClose; a ref keeps the fetch from re-running
	const onCloseRef = useRef(onClose)
	useEffect(() => {
		onCloseRef.current = onClose
	})

	const fetchGrinder = useCallback(async () => {
		try {
			setIsFetching(true)
			const { data } = await axios.get(`/api/grinders/${grinderId}`)

			form.reset({
				name: data.name,
				burrType: data.burrType || '',
				notes: data.notes || '',
			})
		} catch (error) {
			console.error('Error fetching grinder:', error)
			toast.error('Failed to load grinder data')
			onCloseRef.current()
		} finally {
			setIsFetching(false)
		}
	}, [grinderId, form])

	useEffect(() => {
		if (isOpen) {
			if (!isEditMode) {
				form.reset({
					name: '',
					burrType: '',
					notes: '',
				})
			} else if (grinderId) {
				fetchGrinder()
			}
		} else {
			form.reset()
		}
	}, [isOpen, isEditMode, grinderId, form, fetchGrinder])

	const onSubmit = async (data: GrinderFormData) => {
		setIsLoading(true)

		try {
			if (isEditMode && grinderId) {
				await axios.put(`/api/grinders/${grinderId}`, data)
				toast.success('Grinder updated successfully')
			} else {
				await axios.post(`/api/grinders`, data)
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
		<Sheet
			open={isOpen}
			onClose={onClose}
			title={isEditMode ? 'Edit grinder' : 'Add grinder'}
			action={
				<TextButton underline onClick={onClose} className='-mr-1 text-[13px]'>
					Cancel
				</TextButton>
			}
			footer={
				<div className='pb-1.5'>
					<Key
						type='submit'
						form='grinder-form'
						disabled={isLoading || isFetching}
						className='h-16 text-[18px]'
					>
						{isLoading
							? 'Saving…'
							: isEditMode
								? 'Update grinder'
								: 'Add grinder'}
					</Key>
				</div>
			}
		>
			{isFetching ? (
				<RowSkeleton rows={2} variant='simple' />
			) : (
				<form
					id='grinder-form'
					onSubmit={form.handleSubmit(onSubmit)}
					className='flex flex-col gap-4 pt-1 pb-2'
				>
					<Controller
						name='name'
						control={form.control}
						render={({ field, fieldState }) => (
							<FormField
								label='Name'
								htmlFor='grinder-name'
								error={fieldState.error?.message}
							>
								<input
									{...field}
									id='grinder-name'
									placeholder='Eureka Mignon Specialita'
									aria-invalid={fieldState.invalid}
									autoComplete='off'
									className='fin text-[20px] font-semibold'
								/>
							</FormField>
						)}
					/>

					<Controller
						name='burrType'
						control={form.control}
						render={({ field }) => (
							<FormField label='Burr type' htmlFor='grinder-burrType'>
								<input
									{...field}
									id='grinder-burrType'
									value={field.value || ''}
									placeholder='Conical burrs, flat burrs…'
									autoComplete='off'
									className='fin'
								/>
							</FormField>
						)}
					/>

					<Controller
						name='notes'
						control={form.control}
						render={({ field }) => (
							<FormField label='Notes' htmlFor='grinder-notes'>
								<textarea
									{...field}
									id='grinder-notes'
									value={field.value || ''}
									placeholder='Anything worth remembering'
									className='notes mt-1 h-[84px]'
								/>
							</FormField>
						)}
					/>
				</form>
			)}
		</Sheet>
	)
}
