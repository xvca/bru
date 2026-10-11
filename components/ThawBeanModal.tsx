import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

import { Sheet } from '@/components/kit/Sheet'
import { Key, NeutralKey } from '@/components/kit/buttons'
import { Hint } from '@/components/kit/rows'

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
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [thawWeight, setThawWeight] = useState<number>(remainingWeight)

	useEffect(() => {
		if (isOpen) {
			setThawWeight(remainingWeight)
		}
	}, [isOpen, remainingWeight])

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.target.value)
		if (!isNaN(val) && val >= 0 && val <= remainingWeight) {
			setThawWeight(val)
		}
	}

	const onSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault()
		setIsSubmitting(true)

		try {
			await axios.post(`/api/beans/${beanId}/thaw`, {
				weight: thawWeight,
				thawDate: new Date(),
			})

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

	const pct = remainingWeight > 0 ? (thawWeight / remainingWeight) * 100 : 0

	return (
		<Sheet
			open={isOpen}
			onClose={onClose}
			title='Thaw beans'
			description={`How much of ${beanName} do you want to thaw?`}
			footer={
				<div className='flex items-center gap-3 pb-1.5'>
					<NeutralKey
						onClick={onClose}
						className='text-[16px] tracking-normal normal-case'
					>
						Cancel
					</NeutralKey>
					<Key
						onClick={() => onSubmit()}
						disabled={isSubmitting || thawWeight <= 0}
						className='flex-1'
					>
						{isSubmitting ? 'Thawing…' : 'Thaw'}
					</Key>
				</div>
			}
		>
			<form onSubmit={onSubmit} className='pt-2 pb-1'>
				<div className='flex items-baseline justify-between'>
					<label htmlFor='thaw-weight' className='text-[12.5px] text-ink-2'>
						Amount to thaw
					</label>
					<span className='text-[12.5px] text-ink-2'>
						of {remainingWeight} g
					</span>
				</div>
				<div className='flex items-baseline gap-1.5'>
					<input
						id='thaw-weight'
						type='number'
						inputMode='decimal'
						min='0'
						max={remainingWeight}
						value={thawWeight}
						onChange={handleInputChange}
						onFocus={(e) => e.target.select()}
						className='fin h-14 w-36 font-mono text-[34px] font-medium'
					/>
					<span className='font-mono text-[15px] font-medium text-ink-2'>
						g
					</span>
				</div>
				<input
					type='range'
					min='0'
					max={remainingWeight}
					step='1'
					value={thawWeight}
					onChange={(e) => setThawWeight(Number(e.target.value))}
					aria-label='Amount to thaw'
					className='mt-5 h-1 w-full cursor-pointer appearance-none rounded-full accent-accent'
					style={{
						background: `linear-gradient(to right, var(--accent) ${pct}%, var(--line) ${pct}%)`,
					}}
				/>
				<Hint className='mt-4 text-[14px] leading-5'>
					{thawWeight === remainingWeight
						? 'The whole bag is marked as thawed today.'
						: `A new ${thawWeight} g bag is created with today's thaw date. The other ${
								Math.round((remainingWeight - thawWeight) * 10) / 10
							} g stays frozen.`}
				</Hint>
			</form>
		</Sheet>
	)
}
