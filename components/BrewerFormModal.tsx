import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	BREW_METHODS,
	brewerSchema,
	type BrewerFormData,
} from '@/lib/validators'
import { toast } from 'sonner'

import { Sheet } from '@/components/kit/Sheet'
import { Chip, Key, TextButton } from '@/components/kit/buttons'
import { FormField } from '@/components/kit/rows'
import { RowSkeleton } from '@/components/kit/states'

interface BrewerFormModalProps {
	isOpen: boolean
	onClose: () => void
	brewerId?: number
	onSuccess?: () => void
}

export default function BrewerFormModal({
	isOpen,
	onClose,
	brewerId,
	onSuccess,
}: BrewerFormModalProps) {
	const isEditMode = !!brewerId

	const [isLoading, setIsLoading] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const form = useForm<BrewerFormData>({
		resolver: zodResolver(brewerSchema),
		defaultValues: {
			name: '',
			type: '',
			notes: '',
		},
	})

	// Parents pass an inline onClose; a ref keeps the fetch from re-running
	const onCloseRef = useRef(onClose)
	useEffect(() => {
		onCloseRef.current = onClose
	})

	const fetchBrewer = useCallback(async () => {
		try {
			setIsFetching(true)
			const { data } = await axios.get(`/api/brewers/${brewerId}`)

			form.reset({
				name: data.name,
				type: data.type || '',
				notes: data.notes || '',
			})
		} catch (error) {
			console.error('Error fetching brewer:', error)
			toast.error('Failed to load brewer data')
			onCloseRef.current()
		} finally {
			setIsFetching(false)
		}
	}, [brewerId, form])

	useEffect(() => {
		if (isOpen) {
			if (!isEditMode) {
				form.reset({
					name: '',
					type: '',
					notes: '',
				})
			} else if (brewerId) {
				fetchBrewer()
			}
		} else {
			form.reset()
		}
	}, [isOpen, isEditMode, brewerId, form, fetchBrewer])

	const onSubmit = async (data: BrewerFormData) => {
		setIsLoading(true)

		try {
			if (isEditMode && brewerId) {
				await axios.put(`/api/brewers/${brewerId}`, data)
				toast.success('Brewer updated successfully')
			} else {
				await axios.post(`/api/brewers`, data)
				toast.success('Brewer added successfully')
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
		<Sheet
			open={isOpen}
			onClose={onClose}
			title={isEditMode ? 'Edit brewer' : 'Add brewer'}
			action={
				<TextButton underline onClick={onClose} className='-mr-1 text-[13px]'>
					Cancel
				</TextButton>
			}
			footer={
				<div className='pb-1.5'>
					<Key
						type='submit'
						form='brewer-form'
						disabled={isLoading || isFetching}
						className='h-16 text-[18px]'
					>
						{isLoading
							? 'Saving…'
							: isEditMode
								? 'Update brewer'
								: 'Add brewer'}
					</Key>
				</div>
			}
		>
			{isFetching ? (
				<RowSkeleton rows={2} variant='simple' />
			) : (
				<form
					id='brewer-form'
					onSubmit={form.handleSubmit(onSubmit)}
					className='flex flex-col gap-4 pt-1 pb-2'
				>
					<Controller
						name='name'
						control={form.control}
						render={({ field, fieldState }) => (
							<FormField
								label='Name'
								htmlFor='brewer-name'
								error={fieldState.error?.message}
							>
								<input
									{...field}
									id='brewer-name'
									placeholder='Breville Dual Boiler'
									aria-invalid={fieldState.invalid}
									autoComplete='off'
									className='fin text-[20px] font-semibold'
								/>
							</FormField>
						)}
					/>

					<Controller
						name='type'
						control={form.control}
						render={({ field, fieldState }) => (
							<div className='flex flex-col gap-0.5'>
								<span className='text-[12.5px] text-ink-2'>Type</span>
								<div
									role='group'
									aria-label='Type'
									className='flex flex-wrap gap-2 pt-1.5'
								>
									{BREW_METHODS.map((m) => (
										<Chip
											key={m}
											size='sm'
											on={field.value === m}
											onClick={() => field.onChange(m)}
										>
											{m}
										</Chip>
									))}
								</div>
								{fieldState.error && (
									<span role='alert' className='mt-1 text-[12.5px] text-danger'>
										Pick a type
									</span>
								)}
							</div>
						)}
					/>

					<Controller
						name='notes'
						control={form.control}
						render={({ field }) => (
							<FormField label='Notes' htmlFor='brewer-notes'>
								<textarea
									{...field}
									id='brewer-notes'
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
