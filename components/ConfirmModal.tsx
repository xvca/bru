import { Sheet } from '@/components/kit/Sheet'
import { Key, NeutralKey } from '@/components/kit/buttons'

interface ConfirmModalProps {
	open: boolean
	onClose: () => void
	onConfirm: (() => void) | (() => Promise<void>)
	description: string
	title: string
	confirmLabel?: string
}

/** Confirmation as a bottom sheet: Cancel (neutral) and a danger key */
export function ConfirmModal({
	open,
	onClose,
	onConfirm,
	description,
	title,
	confirmLabel = 'Clear Data',
}: ConfirmModalProps) {
	const handleConfirm = () => {
		onConfirm()
		onClose()
	}

	return (
		<Sheet
			open={open}
			onClose={onClose}
			title={title}
			role='alertdialog'
			footer={
				<div className='flex items-center gap-3 pb-1.5'>
					<NeutralKey
						onClick={onClose}
						className='normal-case tracking-normal text-[16px]'
					>
						Cancel
					</NeutralKey>
					<Key tone='danger' onClick={handleConfirm} className='flex-1'>
						{confirmLabel}
					</Key>
				</div>
			}
		>
			<p className='pt-0.5 text-[15px] leading-[21px] text-ink-2'>
				{description}
			</p>
		</Sheet>
	)
}
