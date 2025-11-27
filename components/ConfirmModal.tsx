import {
	Dialog,
	DialogPanel,
	DialogTitle,
	Description,
} from '@headlessui/react'
import { Button } from './ui/button'

interface ConfirmModal {
	open: boolean
	onClose: () => void
	onConfirm: (() => void) | (() => Promise<void>)
	description: string
	title: string
}

export function ConfirmModal({
	open,
	onClose,
	onConfirm,
	description,
	title,
}: ConfirmModal) {
	const handleConfirm = () => {
		onConfirm()
		onClose()
	}
	return (
		<Dialog open={open} onClose={onClose} className='relative z-50'>
			<div className='fixed inset-0 bg-black/30' aria-hidden='true' />

			<div className='fixed inset-0 flex items-center justify-center p-4'>
				<DialogPanel className='mx-auto max-w-sm rounded-lg bg-background p-6 shadow-xl motion-safe:animate-[popIn_0.2s_ease-out]'>
					<DialogTitle className='text-lg font-medium leading-6'>
						{title}
					</DialogTitle>
					<Description className='mt-2 text-sm text-text'>
						{description}
					</Description>

					<div className='mt-6 flex gap-3 justify-end'>
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='button' variant='destructive' onClick={handleConfirm}>
							Clear Data
						</Button>
					</div>
				</DialogPanel>
			</div>
		</Dialog>
	)
}
