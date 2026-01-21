import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { toast } from 'sonner'
import { BeanSelect } from '@/components/BeanSelect'
import type { Bean } from 'generated/prisma/client'
import { Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog'
import { Spinner } from './ui/spinner'
import { Label } from '@/components/ui/label'

interface BrewBarAutoLoggingModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId: number
	brewBarName: string
}

export default function BrewBarAutoLoggingModal({
	isOpen,
	onClose,
	brewBarId,
	brewBarName,
}: BrewBarAutoLoggingModalProps) {
	const { user } = useAuth()
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [beans, setBeans] = useState<Bean[]>([])
	const [defaultRegularBeanId, setDefaultRegularBeanId] = useState<
		number | null
	>(null)
	const [defaultDecafBeanId, setDefaultDecafBeanId] = useState<number | null>(
		null,
	)
	const [brewBarData, setBrewBarData] = useState<{
		name: string
		location: string | null
	} | null>(null)

	useEffect(() => {
		if (!isOpen || !user?.token) return

		const fetchData = async () => {
			setIsLoading(true)
			try {
				const [beansRes, barRes] = await Promise.all([
					axios.get(`/api/beans?barId=${brewBarId}`, {
						headers: { Authorization: `Bearer ${user.token}` },
					}),
					axios.get(`/api/brew-bars/${brewBarId}`, {
						headers: { Authorization: `Bearer ${user.token}` },
					}),
				])

				setBeans(beansRes.data)
				setDefaultRegularBeanId(barRes.data.defaultRegularBean?.id ?? null)
				setDefaultDecafBeanId(barRes.data.defaultDecafBean?.id ?? null)
				setBrewBarData({
					name: barRes.data.name,
					location: barRes.data.location,
				})
			} catch (error) {
				console.error('Error fetching data:', error)
				toast.error('Failed to load auto-logging settings')
			} finally {
				setIsLoading(false)
			}
		}

		fetchData()
	}, [isOpen, brewBarId, user?.token])

	const handleSave = async () => {
		if (!user?.token || !brewBarData) return

		setIsSaving(true)
		try {
			await axios.put(
				`/api/brew-bars/${brewBarId}`,
				{
					name: brewBarData.name,
					location: brewBarData.location,
					defaultRegularBeanId,
					defaultDecafBeanId,
				},
				{
					headers: { Authorization: `Bearer ${user.token}` },
				},
			)

			toast.success('Auto-logging settings updated')
			onClose()
		} catch (error) {
			console.error('Error saving settings:', error)
			toast.error('Failed to update auto-logging settings')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Zap className='h-5 w-5' />
						Auto-Logging Settings
					</DialogTitle>
					<DialogDescription>
						Configure default beans for {brewBarName}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className='flex justify-center items-center py-8'>
						<Spinner />
					</div>
				) : (
					<div className='space-y-6'>
						<div className='space-y-4'>
							<div className='space-y-2'>
								<Label htmlFor='defaultRegularBeanId'>
									Default Regular Bean
								</Label>
								{beans.length > 0 ? (
									<BeanSelect
										beans={beans}
										value={defaultRegularBeanId?.toString() ?? ''}
										onChange={(value) =>
											setDefaultRegularBeanId(value ? parseInt(value) : null)
										}
									/>
								) : (
									<p className='text-sm text-muted-foreground'>
										No beans in this brew bar yet
									</p>
								)}
							</div>

							<div className='space-y-2'>
								<Label htmlFor='defaultDecafBeanId'>Default Decaf Bean</Label>
								{beans.length > 0 ? (
									<BeanSelect
										beans={beans}
										value={defaultDecafBeanId?.toString() ?? ''}
										onChange={(value) =>
											setDefaultDecafBeanId(value ? parseInt(value) : null)
										}
									/>
								) : (
									<p className='text-sm text-muted-foreground'>
										No beans in this brew bar yet
									</p>
								)}
							</div>
						</div>

						<div className='flex justify-end gap-3 pt-2'>
							<Button onClick={onClose} variant='outline' type='button'>
								Cancel
							</Button>

							<Button onClick={handleSave} disabled={isSaving}>
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
