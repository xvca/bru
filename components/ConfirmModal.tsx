import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
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
}: ConfirmModalProps) {
	const handleConfirm = () => {
		onConfirm()
		onClose()
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter className='flex-row gap-2 justify-end'>
					<Button variant='outline' onClick={onClose}>
						Cancel
					</Button>
					<Button variant='destructive' onClick={handleConfirm}>
						Clear Data
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
