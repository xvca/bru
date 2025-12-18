import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import type { Bean } from 'generated/prisma/client'
import {
	Plus,
	Coffee,
	Calendar,
	Star,
	Edit,
	Trash,
	Package,
	Snowflake,
	Store,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ConfirmModal'
import BeanFormModal from '@/components/BeanFormModal'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function BeansPage() {
	const { user } = useAuth()
	const { activeBarId, availableBars } = useBrewBar()
	const [beans, setBeans] = useState<Bean[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [modalData, setModalData] = useState({
		isOpen: false,
		beanId: -1,
		beanName: '',
	})

	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBeanId, setSelectedBeanId] = useState<number | undefined>(
		undefined,
	)

	useEffect(() => {
		if (user) {
			fetchBeans()
		}
	}, [user, activeBarId])

	const fetchBeans = async () => {
		try {
			setIsLoading(true)
			const { data } = await axios.get<Bean[]>('/api/beans', {
				headers: { Authorization: `Bearer ${user?.token}` },
				params: { barId: activeBarId },
			})

			console.log(data)
			setBeans(data)
		} catch (error) {
			console.error('Error fetching beans:', error)
			toast.error('Failed to load beans')
		} finally {
			setIsLoading(false)
		}
	}

	const handleAddNew = () => {
		setSelectedBeanId(undefined)
		setIsFormOpen(true)
	}

	const handleEdit = (id: number) => {
		setSelectedBeanId(id)
		setIsFormOpen(true)
	}

	const handleDelete = async (id: number) => {
		try {
			await axios.delete(`/api/beans/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBeans(beans.filter((bean) => bean.id !== id))
			toast.success('Bean deleted successfully')
			setModalData({ ...modalData, isOpen: false })
		} catch (error) {
			console.error('Error deleting bean:', error)
			if (axios.isAxiosError(error) && error.response?.status === 409) {
				toast.error('Cannot delete a bean that is used in brews')
			} else {
				toast.error('Failed to delete bean')
			}
		}
	}

	const confirmDelete = (id: number, name: string) => {
		setModalData({
			isOpen: true,
			beanId: id,
			beanName: name,
		})
	}

	console.log(activeBarId)

	const calculateDaysSinceRoast = (
		roastDateStr: Date | string,
		freezeDateStr?: Date | string | null,
	): number => {
		const roast = new Date(roastDateStr)
		const endPoint = freezeDateStr ? new Date(freezeDateStr) : new Date()

		const diffTime = endPoint.getTime() - roast.getTime()
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

		return Math.max(0, diffDays)
	}

	const currentBarName = activeBarId
		? availableBars.find((b) => b.id === activeBarId)?.name
		: 'Personal Stash'

	return (
		<ProtectedPage title='Coffee Beans'>
			<div className='p-6'>
				<div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>Coffee Beans</h1>
						<p className='text-muted-foreground mt-1'>
							Manage inventory for:{' '}
							<span className='font-medium text-foreground'>
								{currentBarName}
							</span>
						</p>
					</div>

					<div className='flex items-center gap-2 w-full md:w-auto'>
						<Button onClick={handleAddNew}>
							<Plus className='mr-2 h-4 w-4' />
							Add Bean
						</Button>
					</div>
				</div>

				{isLoading ? (
					<div className='grid gap-4 md:grid-cols-2'>
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<Card key={i} className='overflow-hidden'>
								<CardHeader className='pb-2'>
									<Skeleton className='h-6 w-3/4' />
									<Skeleton className='h-4 w-1/2' />
								</CardHeader>
								<CardContent>
									<div className='flex gap-2 mb-4'>
										<Skeleton className='h-5 w-16' />
										<Skeleton className='h-5 w-16' />
									</div>
									<Skeleton className='h-2 w-full mt-4' />
								</CardContent>
							</Card>
						))}
					</div>
				) : beans.length === 0 ? (
					<Card className='border-dashed'>
						<CardContent className='flex flex-col items-center justify-center py-16 space-y-4'>
							<div className='p-4 rounded-full bg-secondary/50'>
								<Package className='h-12 w-12 text-muted-foreground/50' />
							</div>
							<div className='text-center'>
								<h3 className='text-lg font-semibold'>No beans found</h3>
								<p className='text-muted-foreground text-sm max-w-sm mt-1'>
									You haven&apos;t added any coffee beans yet. Start by adding
									your first bag to track your inventory.
								</p>
							</div>
							<Button onClick={handleAddNew} variant='outline' className='mt-4'>
								Add your first coffee bean
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className='grid gap-4 md:grid-cols-2'>
						{beans.map((bean) => {
							const percentRemaining = bean.remainingWeight
								? Math.min(
										100,
										(bean.remainingWeight / bean.initialWeight) * 100,
									)
								: 0

							const isFrozen = !!bean.freezeDate
							const daysOld = calculateDaysSinceRoast(
								bean.roastDate,
								bean.freezeDate,
							)

							return (
								<Card
									key={bean.id}
									className='flex flex-col justify-between hover:border-primary/50 transition-colors'
								>
									<CardHeader className='pb-3'>
										<div className='flex justify-between items-start gap-2'>
											<div className='space-y-1'>
												<CardTitle className='text-lg leading-tight'>
													{bean.name}
												</CardTitle>
												<CardDescription>{bean.roaster}</CardDescription>
											</div>
											<div className='flex gap-1 -mr-2 -mt-1'>
												<Button
													onClick={() => handleEdit(bean.id)}
													variant='ghost'
													size='icon'
													className='h-8 w-8 text-muted-foreground hover:text-foreground'
												>
													<Edit size={14} />
												</Button>
												<Button
													onClick={() => confirmDelete(bean.id, bean.name)}
													variant='ghost'
													size='icon'
													className='h-8 w-8 text-muted-foreground hover:text-destructive'
												>
													<Trash size={14} />
												</Button>
											</div>
										</div>
									</CardHeader>

									<CardContent className='space-y-4'>
										{/* Badges Row */}
										<div className='flex flex-wrap gap-2'>
											{bean.origin && (
												<Badge variant='secondary' className='font-normal'>
													<Coffee className='mr-1 h-3 w-3' />
													{bean.origin}
												</Badge>
											)}

											<Badge
												variant={isFrozen ? 'secondary' : 'outline'}
												className={cn(
													'font-normal',
													isFrozen &&
														'bg-blue-50 text-blue-700 hover:bg-blue-50/80 border-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
												)}
											>
												{isFrozen ? (
													<Snowflake className='mr-1 h-3 w-3' />
												) : (
													<Calendar className='mr-1 h-3 w-3' />
												)}
												{daysOld === 0
													? 'Roasted today'
													: `${daysOld} day${daysOld === 1 ? '' : 's'} off roast`}
											</Badge>

											{bean.roastLevel && (
												<Badge variant='outline' className='font-normal'>
													<Star className='mr-1 h-3 w-3' />
													{bean.roastLevel}
												</Badge>
											)}
										</div>

										{bean.remainingWeight !== null && (
											<div className='space-y-2'>
												<div className='flex justify-between text-xs text-muted-foreground'>
													<span>Remaining</span>
													<span className='font-medium text-foreground'>
														{bean.remainingWeight}g{' '}
														<span className='text-muted-foreground/60'>
															/ {bean.initialWeight}g
														</span>
													</span>
												</div>
												<Progress value={percentRemaining} className='h-2' />
											</div>
										)}
									</CardContent>
								</Card>
							)
						})}
					</div>
				)}
			</div>

			<BeanFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				beanId={selectedBeanId}
				barId={activeBarId || undefined}
				onSuccess={fetchBeans}
			/>

			<ConfirmModal
				open={modalData.isOpen}
				onClose={() => setModalData({ ...modalData, isOpen: false })}
				onConfirm={() => handleDelete(modalData.beanId)}
				title='Delete Coffee Bean'
				description={`Are you sure you want to delete "${modalData.beanName}"? This action cannot be undone.`}
			/>
		</ProtectedPage>
	)
}
