import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { toast } from 'sonner'
import { Snowflake } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from './ui/spinner'

interface ThawBeanModalProps {
	isOpen: boolean
	onClose: () => void
	beanId: number
	beanName: string
	remainingWeight: number
	onSuccess?: () => void
}

export default function ThawBeanModal({
	isOpen,
	onClose,
	beanId,
	beanName,
	remainingWeight,
	onSuccess,
}: ThawBeanModalProps) {
	const { user } = useAuth()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [thawWeight, setThawWeight] = useState<number>(remainingWeight)

	useEffect(() => {
		if (isOpen) {
			setThawWeight(remainingWeight)
		}
	}, [isOpen, remainingWeight])

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setThawWeight(Number(e.target.value))
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.target.value)
		if (!isNaN(val) && val >= 0 && val <= remainingWeight) {
			setThawWeight(val)
		}
	}

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)

		try {
			await axios.post(
				`/api/beans/${beanId}/thaw`,
				{
					weight: thawWeight,
					thawDate: new Date(),
				},
				{
					headers: { Authorization: `Bearer ${user?.token}` },
				},
			)

			toast.success(
				thawWeight === remainingWeight
					? 'Bean thawed successfully'
					: `Thawed ${thawWeight}g into a new bag`,
			)
			onSuccess?.()
			onClose()
		} catch (error) {
			console.error('Error thawing bean:', error)
			toast.error('Failed to thaw bean')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Snowflake className='h-5 w-5 text-blue-500' />
						Thaw Coffee Beans
					</DialogTitle>
					<DialogDescription>
						How much of <strong>{beanName}</strong> would you like to thaw?
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className='space-y-6 py-4'>
					<div className='space-y-4'>
						<div className='flex justify-between items-center'>
							<FieldLabel>Amount to Thaw</FieldLabel>
							<span className='text-sm font-medium text-muted-foreground'>
								{thawWeight}g / {remainingWeight}g
							</span>
						</div>

						<div className='flex gap-4 items-center'>
							<input
								type='range'
								min='0'
								max={remainingWeight}
								step='1'
								value={thawWeight}
								onChange={handleSliderChange}
								className='flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary'
							/>
							<div className='w-20'>
								<Input
									type='number'
									min='0'
									max={remainingWeight}
									value={thawWeight}
									onChange={handleInputChange}
									className='text-right'
								/>
							</div>
						</div>

						<p className='text-sm text-muted-foreground'>
							{thawWeight === remainingWeight
								? 'The entire bag will be marked as thawed today.'
								: `A new bag with ${thawWeight}g will be created with today's thaw date. The remaining ${
										Math.round((remainingWeight - thawWeight) * 10) / 10
									}g will stay frozen.`}
						</p>
					</div>

					<div className='flex justify-end gap-3'>
						<Button onClick={onClose} variant='outline' type='button'>
							Cancel
						</Button>
						<Button type='submit' disabled={isSubmitting || thawWeight <= 0}>
							{isSubmitting && <Spinner />}
							Thaw Beans
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
