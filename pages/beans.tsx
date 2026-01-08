import ProtectedPage from '@/components/ProtectedPage'
import { useState, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import { useBeans } from '@/hooks/useBeans'
import {
	Plus,
	Coffee,
	Calendar,
	Star,
	Edit,
	Trash,
	Package,
	Snowflake,
	ThermometerSun,
	Droplets,
	ChevronDown,
	ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ConfirmModal'
import BeanFormModal from '@/components/BeanFormModal'
import ThawBeanModal from '@/components/ThawBeanModal'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
	const { beans, isLoading, refresh } = useBeans()

	const [modalData, setModalData] = useState({
		isOpen: false,
		beanId: -1,
		beanName: '',
	})

	const [thawModalData, setThawModalData] = useState({
		isOpen: false,
		beanId: -1,
		beanName: '',
		remainingWeight: 0,
	})

	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBeanId, setSelectedBeanId] = useState<number | undefined>(
		undefined,
	)
	const [showFinished, setShowFinished] = useState(false)

	const handleAddNew = () => {
		setSelectedBeanId(undefined)
		setIsFormOpen(true)
	}

	const handleEdit = (id: number) => {
		setSelectedBeanId(id)
		setIsFormOpen(true)
	}

	const handleThaw = (id: number, name: string, weight: number) => {
		setThawModalData({
			isOpen: true,
			beanId: id,
			beanName: name,
			remainingWeight: weight,
		})
	}

	const handleDelete = async (id: number) => {
		try {
			await axios.delete(`/api/beans/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			toast.success('Bean deleted successfully')
			refresh()
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

	const calculateDaysSinceRoast = (
		roastDateStr: Date | string,
		freezeDateStr?: Date | string | null,
		thawDateStr?: Date | string | null,
	): number => {
		const roast = new Date(roastDateStr)
		const now = new Date()

		if (freezeDateStr) {
			const freeze = new Date(freezeDateStr)
			const ageBeforeFreeze = freeze.getTime() - roast.getTime()

			if (thawDateStr) {
				const thaw = new Date(thawDateStr)
				const ageAfterThaw = now.getTime() - thaw.getTime()
				const totalAge = ageBeforeFreeze + ageAfterThaw
				return Math.max(0, Math.floor(totalAge / (1000 * 60 * 60 * 24)))
			} else {
				return Math.max(0, Math.floor(ageBeforeFreeze / (1000 * 60 * 60 * 24)))
			}
		}

		const diffTime = now.getTime() - roast.getTime()
		return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
	}

	const getBatchColor = (str: string) => {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash)
		}
		const hue = Math.abs(hash % 360)
		return `hsl(${hue}, 50%, 65%)`
	}

	const currentBarName = activeBarId
		? availableBars.find((b) => b.id === activeBarId)?.name
		: 'Personal Stash'

	const sortedBeans = useMemo(() => {
		if (!beans) return []

		const batches: Record<string, typeof beans> = {}
		beans.forEach((bean) => {
			const batchKey = `${bean.name}-${bean.roaster}-${new Date(bean.roastDate).toISOString().split('T')[0]}`
			if (!batches[batchKey]) batches[batchKey] = []
			batches[batchKey].push(bean)
		})

		const getBeanScore = (bean: (typeof beans)[0]) => {
			if (bean.remainingWeight === 0) return 1
			const isFrozen = !!bean.freezeDate && !bean.thawDate
			if (isFrozen) return 2
			return 3
		}

		const sortedBatchKeys = Object.keys(batches).sort((a, b) => {
			const batchA = batches[a]
			const batchB = batches[b]

			const scoreA = Math.max(...batchA.map(getBeanScore))
			const scoreB = Math.max(...batchB.map(getBeanScore))

			if (scoreA !== scoreB) return scoreB - scoreA

			const dateA = new Date(batchA[0].roastDate).getTime()
			const dateB = new Date(batchB[0].roastDate).getTime()
			if (dateA !== dateB) return dateA - dateB

			return batchA[0].name.localeCompare(batchB[0].name)
		})

		return sortedBatchKeys.flatMap((key) => {
			const batchBeans = batches[key]
			return batchBeans.sort((a, b) => {
				const scoreA = getBeanScore(a)
				const scoreB = getBeanScore(b)
				if (scoreA !== scoreB) return scoreB - scoreA
				return b.id - a.id
			})
		})
	}, [beans])

	const activeBeans = sortedBeans.filter((b) => b.remainingWeight !== 0)
	const finishedBeans = sortedBeans.filter((b) => b.remainingWeight === 0)

	const renderBeanCard = (bean: (typeof beans)[0], index: number) => {
		const percentRemaining = bean.remainingWeight
			? Math.min(100, (bean.remainingWeight / bean.initialWeight) * 100)
			: 0

		const isThawed = !!bean.freezeDate && !!bean.thawDate
		const isFrozen = !!bean.freezeDate && !bean.thawDate
		const isFinished = bean.remainingWeight === 0

		const daysOld = calculateDaysSinceRoast(
			bean.roastDate,
			bean.freezeDate,
			bean.thawDate,
		)

		const batchKey = `${bean.name}-${bean.roaster}-${new Date(bean.roastDate).toISOString().split('T')[0]}`
		const batchColor = getBatchColor(batchKey)

		return (
			<motion.div
				key={bean.id}
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: '-50px' }}
				transition={{ duration: 0.4, delay: index * 0.05 }}
			>
				<Card
					className={cn(
						'flex flex-col justify-between hover:border-primary/50 transition-colors h-full',
						isFinished && 'opacity-60',
					)}
				>
					<CardHeader className='pb-3'>
						<div className='flex justify-between items-start gap-2'>
							<div className='space-y-1'>
								<CardTitle className='text-lg leading-tight flex items-center gap-2'>
									<div
										className='w-3 h-3 rounded-full shrink-0'
										style={{ backgroundColor: batchColor }}
										title='Batch Indicator'
									/>
									{bean.name}
								</CardTitle>
								<CardDescription>{bean.roaster}</CardDescription>
							</div>
							<div className='flex gap-1 -mr-2 -mt-1'>
								{isFrozen && (
									<Button
										onClick={() =>
											handleThaw(bean.id, bean.name, bean.remainingWeight || 0)
										}
										variant='ghost'
										size='icon'
										className='h-8 w-8 text-frozen-foreground hover:text-frozen-foreground hover:bg-frozen/20'
										title='Thaw Beans'
									>
										<ThermometerSun size={16} />
									</Button>
								)}
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
										'bg-frozen text-frozen-foreground hover:bg-frozen/80 border-transparent',
									isThawed && 'border-frozen text-frozen-foreground',
								)}
							>
								{isFrozen ? (
									<Snowflake className='mr-1 h-3 w-3' />
								) : isThawed ? (
									<Droplets className='mr-1 h-3 w-3' />
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
			</motion.div>
		)
	}

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
					<div className='space-y-8'>
						<div className='grid gap-4 md:grid-cols-2'>
							{activeBeans.map((bean, index) => renderBeanCard(bean, index))}
						</div>

						{finishedBeans.length > 0 && (
							<div className='pt-4'>
								<div className='relative'>
									<div className='absolute inset-0 flex items-center'>
										<span className='w-full border-t' />
									</div>
									<div className='relative flex justify-center text-xs uppercase'>
										<Button
											variant='outline'
											size='sm'
											className='bg-background px-4 text-muted-foreground hover:text-foreground'
											onClick={() => setShowFinished(!showFinished)}
										>
											{showFinished ? (
												<>
													Hide Finished ({finishedBeans.length})
													<ChevronUp className='ml-2 h-3 w-3' />
												</>
											) : (
												<>
													Show Finished ({finishedBeans.length})
													<ChevronDown className='ml-2 h-3 w-3' />
												</>
											)}
										</Button>
									</div>
								</div>

								<div
									className={cn(
										'grid gap-4 md:grid-cols-2 transition-all duration-500 ease-in-out overflow-hidden',
										showFinished
											? 'mt-6 opacity-100 max-h-[2000px]'
											: 'mt-0 opacity-0 max-h-0',
									)}
								>
									{finishedBeans.map((bean, index) =>
										renderBeanCard(bean, index),
									)}
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			<BeanFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				beanId={selectedBeanId}
				barId={activeBarId || undefined}
				onSuccess={refresh}
			/>

			<ThawBeanModal
				isOpen={thawModalData.isOpen}
				onClose={() => setThawModalData({ ...thawModalData, isOpen: false })}
				beanId={thawModalData.beanId}
				beanName={thawModalData.beanName}
				remainingWeight={thawModalData.remainingWeight}
				onSuccess={refresh}
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
