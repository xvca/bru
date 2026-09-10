import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Label } from '@/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { BeanSelect } from '@/components/BeanSelect'
import type { Bean } from '@/generated/prisma/client'

interface AutoLoggingModalProps {
	isOpen: boolean
	onClose: () => void
}

export default function AutoLoggingModal({
	isOpen,
	onClose,
}: AutoLoggingModalProps) {
	const [beans, setBeans] = useState<Bean[]>([])
	const [defaultRegularBeanId, setDefaultRegularBeanId] = useState<
		number | null
	>(null)
	const [defaultDecafBeanId, setDefaultDecafBeanId] = useState<number | null>(
		null,
	)
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
		if (!isOpen) return

		const load = async () => {
			setIsLoading(true)
			try {
				const [beansResponse, settingsResponse] = await Promise.all([
					axios.get('/api/beans'),
					axios.get('/api/auto-logging'),
				])
				setBeans(beansResponse.data)
				setDefaultRegularBeanId(
					settingsResponse.data.defaultRegularBeanId ?? null,
				)
				setDefaultDecafBeanId(settingsResponse.data.defaultDecafBeanId ?? null)
			} catch (error) {
				console.error('Error loading auto-logging settings:', error)
				toast.error('Failed to load auto-logging settings')
			} finally {
				setIsLoading(false)
			}
		}
		void load()
	}, [isOpen])

	const save = async () => {
		setIsSaving(true)
		try {
			await axios.put('/api/auto-logging', {
				defaultRegularBeanId,
				defaultDecafBeanId,
			})
			toast.success('Auto-logging beans updated')
			onClose()
		} catch (error) {
			console.error('Error saving auto-logging settings:', error)
			toast.error('Failed to save auto-logging settings')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>Auto-Logging Beans</DialogTitle>
					<DialogDescription>
						Choose which beans Autobru uses for automatic brew logs.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className='flex justify-center py-8'>
						<Spinner />
					</div>
				) : (
					<div className='space-y-6'>
						<div className='space-y-2'>
							<Label>Regular Bean</Label>
							{beans.length ? (
								<BeanSelect
									beans={beans}
									value={defaultRegularBeanId?.toString() ?? ''}
									onChange={(value) =>
										setDefaultRegularBeanId(value ? Number(value) : null)
									}
								/>
							) : (
								<p className='text-sm text-muted-foreground'>No beans yet</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label>Decaf Bean</Label>
							{beans.length ? (
								<BeanSelect
									beans={beans}
									value={defaultDecafBeanId?.toString() ?? ''}
									onChange={(value) =>
										setDefaultDecafBeanId(value ? Number(value) : null)
									}
								/>
							) : (
								<p className='text-sm text-muted-foreground'>No beans yet</p>
							)}
						</div>

						<div className='flex justify-end gap-3'>
							<Button onClick={onClose} variant='outline'>
								Cancel
							</Button>
							<Button onClick={save} disabled={isSaving || beans.length === 0}>
								{isSaving && <Spinner className='mr-2' />}
								Save
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
