import {
	Dialog,
	DialogPanel,
	DialogTitle,
	Description,
} from '@headlessui/react'

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
				<DialogPanel className='mx-auto max-w-sm rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-xl motion-safe:animate-[popIn_0.2s_ease-out]'>
					<DialogTitle className='text-lg font-medium leading-6'>
						{title}
					</DialogTitle>
					<Description className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
						{description}
					</Description>

					<div className='mt-6 flex gap-3 justify-end'>
						<button
							type='button'
							className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                          hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md'
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type='button'
							className='px-4 py-2 text-sm font-medium text-white bg-red-600
                          hover:bg-red-700 rounded-md'
							onClick={handleConfirm}
						>
							Clear Data
						</button>
					</div>
				</DialogPanel>
			</div>
		</Dialog>
	)
}
