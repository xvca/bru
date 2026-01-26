import ProtectedPage from '@/components/ProtectedPage'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useBrewsPaginated } from '@/hooks/useBrews'
import { useBeans } from '@/hooks/useBeans'
import {
	Plus,
	Coffee,
	Clock,
	Thermometer,
	Star,
	Edit,
	Trash,
	Scale,
	Settings2,
	Store,
	MoreVertical,
	Copy,
	Zap,
	Filter,
	X,
} from 'lucide-react'
import BrewForm from '@/components/BrewFormModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { BeanSelect } from '@/components/BeanSelect'
import { cn } from '@/lib/utils'
import { BREW_METHODS } from '@/lib/validators'
import type { BrewFormData } from '@/lib/validators'
import type { BrewWithRelations } from '@/hooks/useBrews'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

export default function Brews() {
	const router = useRouter()
	const { user } = useAuth()
	const { activeBarId, availableBars } = useBrewBar()
	const { beans } = useBeans()
	const sentinelRef = useRef<HTMLDivElement>(null)

	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBrew, setSelectedBrew] = useState<number | undefined>(
		undefined,
	)
	const [cloneData, setCloneData] = useState<Partial<BrewFormData> | undefined>(
		undefined,
	)
	const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

	const [deleteModal, setDeleteModal] = useState({
		isOpen: false,
		brewId: 0,
		brewName: '',
	})

	const [filterBeanId, setFilterBeanId] = useState<string>('')
	const [filterBatchId, setFilterBatchId] = useState<string>('')
	const [filterMethod, setFilterMethod] = useState<string>('')
	const [showFilters, setShowFilters] = useState(false)

	const { brews, isLoading, isLoadingMore, hasMore, loadMore, refresh } =
		useBrewsPaginated({
			barId: activeBarId,
			beanId: filterBeanId,
			batchId: filterBatchId,
			method: filterMethod,
		})

	useEffect(() => {
		const { beanId, batchId, method } = router.query

		if (batchId && beans) {
			const beanInBatch = beans.find((b) => b.batchId === batchId)
			setFilterBeanId(beanInBatch?.id.toString() || '')
			setFilterBatchId(batchId as string)
		} else {
			setFilterBeanId((beanId as string) || '')
			setFilterBatchId('')
		}

		setFilterMethod((method as string) || '')
	}, [router.query, beans])

	const updateFilters = (beanId: string, method: string) => {
		const query: Record<string, string> = {}
		if (beanId) query.beanId = beanId
		if (method) query.method = method

		router.push(
			{
				pathname: router.pathname,
				query,
			},
			undefined,
			{ shallow: true },
		)

		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const handleBeanFilterChange = (value: string) => {
		setFilterBeanId(value)
		updateFilters(value, filterMethod)
	}

	const handleMethodFilterChange = (value: string) => {
		setFilterMethod(value)
		updateFilters(filterBeanId, value)
	}

	const clearFilters = () => {
		setFilterBeanId('')
		setFilterBatchId('')
		setFilterMethod('')
		router.push({ pathname: router.pathname }, undefined, { shallow: true })
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const hasActiveFilters = filterBeanId || filterBatchId || filterMethod

	useEffect(() => {
		if (!brews || brews.length === 0) return

		const lastVisit = localStorage.getItem('lastBrewsVisit')
		const now = new Date().toISOString()

		if (lastVisit) {
			const newAutoBrews = brews.filter(
				(b) => b.autoCreated && new Date(b.createdAt) > new Date(lastVisit),
			)

			if (newAutoBrews.length > 0) {
				toast.success(
					`${newAutoBrews.length} brew${newAutoBrews.length > 1 ? 's' : ''} logged automatically`,
				)
			}
		}

		localStorage.setItem('lastBrewsVisit', now)
	}, [brews])

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
					loadMore()
				}
			},
			{ threshold: 0.1 },
		)

		if (sentinelRef.current) {
			observer.observe(sentinelRef.current)
		}

		return () => {
			if (sentinelRef.current) {
				observer.unobserve(sentinelRef.current)
			}
		}
	}, [hasMore, isLoadingMore, loadMore])

	const handleAddBrew = () => {
		setSelectedBrew(undefined)
		setCloneData(undefined)
		setIsFormOpen(true)
	}

	const handleEditBrew = (id: number) => {
		setOpenDropdownId(null)
		setSelectedBrew(id)
		setCloneData(undefined)
		setIsFormOpen(true)
	}

	const handleCloneBrew = (brew: BrewWithRelations) => {
		setOpenDropdownId(null)

		const initialData: Partial<BrewFormData> = {
			beanId: brew.beanId,
			method: brew.method,
			doseWeight: brew.doseWeight,
			yieldWeight: brew.yieldWeight ?? undefined,
			brewTime: brew.brewTime ?? 0,
			grindSize: brew.grindSize ?? 0,
			waterTemperature: brew.waterTemperature ?? undefined,
			rating: brew.rating ?? 0,
			notes: brew.notes ?? '',
			barId: brew.barId ?? undefined,
			brewerId: brew.brewerId ?? undefined,
			grinderId: brew.grinderId ?? undefined,
		}

		setSelectedBrew(undefined)
		setCloneData(initialData)
		setIsFormOpen(true)
	}

	const handleDeleteBrew = async (id: number) => {
		try {
			await axios.delete(`/api/brews/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			refresh()
			toast.success('Brew deleted successfully')
		} catch (error) {
			console.error('Error deleting brew:', error)
			toast.error('Failed to delete brew')
		} finally {
			setDeleteModal({ ...deleteModal, isOpen: false })
		}
	}

	const confirmDeleteBrew = (id: number, name: string) => {
		setOpenDropdownId(null)
		setDeleteModal({
			isOpen: true,
			brewId: id,
			brewName: name,
		})
	}

	const formatBrewTime = (seconds: number | null) => {
		if (!seconds) return 'N/A'
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	const calculateRatio = (dose: number, yieldWt: number | null) => {
		if (!yieldWt) return null
		return `1:${(yieldWt / dose).toFixed(1)}`
	}

	const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

	const currentBarName = activeBarId
		? availableBars.find((b) => b.id === activeBarId)?.name
		: 'Personal'

	return (
		<ProtectedPage title='Brew Logs'>
			<div className='p-6'>
				<div className='flex justify-between items-center mb-8'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>Brew Logs</h1>
						<p className='text-muted-foreground mt-1'>
							Viewing logs for:{' '}
							<span className='font-medium text-foreground'>
								{currentBarName}
							</span>
						</p>
					</div>
					<div className='flex gap-2'>
						<Button
							variant={showFilters ? 'secondary' : 'outline'}
							size='icon'
							onClick={() => setShowFilters(!showFilters)}
							title='Toggle filters'
						>
							<Filter className='h-4 w-4' />
						</Button>
						<Button onClick={handleAddBrew}>
							<Plus className='mr-2 h-4 w-4' />
							Log Brew
						</Button>
					</div>
				</div>

				<AnimatePresence>
					{showFilters && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.3 }}
							className='overflow-hidden mb-6'
						>
							<Card>
								<CardContent className='pt-6'>
									<div className='flex flex-col gap-4'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-2'>
												<Filter className='h-4 w-4 text-muted-foreground' />
												<span className='font-semibold'>Filter Brews</span>
											</div>
											{hasActiveFilters && (
												<Button
													variant='ghost'
													size='sm'
													onClick={clearFilters}
													className='h-8'
												>
													<X className='mr-1 h-3 w-3' />
													Clear Filters
												</Button>
											)}
										</div>

										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											<div className='space-y-2'>
												<label className='text-sm font-medium'>Bean</label>
												<BeanSelect
													beans={beans || []}
													value={filterBeanId}
													onChange={handleBeanFilterChange}
													showAllBeans={true}
												/>
											</div>

											<div className='space-y-2'>
												<label className='text-sm font-medium'>Method</label>
												<Select
													value={filterMethod || undefined}
													onValueChange={handleMethodFilterChange}
												>
													<SelectTrigger>
														<SelectValue placeholder='All methods' />
													</SelectTrigger>
													<SelectContent>
														{BREW_METHODS.map((method) => (
															<SelectItem key={method} value={method}>
																{method}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					)}
				</AnimatePresence>

				{isLoading ? (
					<div className='grid gap-4 md:grid-cols-2 '>
						{[1, 2, 3].map((i) => (
							<Card key={i} className='overflow-hidden'>
								<CardHeader className='pb-2'>
									<Skeleton className='h-6 w-3/4' />
									<Skeleton className='h-4 w-1/2' />
								</CardHeader>
								<CardContent>
									<Skeleton className='h-20 w-full' />
								</CardContent>
							</Card>
						))}
					</div>
				) : brews.length === 0 ? (
					<Card className='border-dashed'>
						<CardContent className='flex flex-col items-center justify-center py-16 space-y-4'>
							<div className='p-4 rounded-full bg-secondary/50'>
								<Coffee className='h-12 w-12 text-muted-foreground/50' />
							</div>
							<div className='text-center'>
								<h3 className='text-lg font-semibold'>
									{hasActiveFilters ? 'No matching brews' : 'No brews recorded'}
								</h3>
								<p className='text-muted-foreground text-sm max-w-sm mt-1'>
									{hasActiveFilters
										? 'Try adjusting your filters to see more results.'
										: 'Start logging your brews to track parameters and improve consistency.'}
								</p>
							</div>
							<Button
								onClick={handleAddBrew}
								variant='outline'
								className='mt-4'
							>
								Log your first brew
							</Button>
						</CardContent>
					</Card>
				) : (
					<>
						<AnimatePresence mode='popLayout'>
							<div className='grid gap-4 md:grid-cols-2'>
								{brews.map((brew, index) => {
									const isMyBrew = brew.userId === user?.id

									return (
										<motion.div
											key={brew.id}
											initial={{ opacity: 0, y: 10 }}
											whileInView={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.5 }}
										>
											<Card className='flex flex-col h-full hover:border-primary/50 transition-colors'>
												<CardHeader>
													<div className='flex justify-between items-start gap-2'>
														<div className='space-y-1'>
															<div className='flex items-center gap-2 flex-wrap'>
																<CardTitle className='text-lg leading-tight'>
																	{brew.bean.name}
																</CardTitle>
																<Badge
																	variant='secondary'
																	className='font-normal text-xs'
																>
																	{brew.method}
																</Badge>
																{brew.brewBar && (
																	<Badge
																		variant='outline'
																		className='font-normal text-xs flex items-center gap-1'
																	>
																		<Store size={10} />
																		{brew.brewBar.name}
																	</Badge>
																)}
																{brew.autoCreated && (
																	<Badge
																		variant='secondary'
																		className='font-normal text-xs flex items-center gap-1'
																	>
																		<Zap size={10} />
																		Auto
																	</Badge>
																)}
															</div>
															<CardDescription className='flex items-center gap-1'>
																{brew.bean.roaster || 'Unknown Roaster'}
																<span>•</span>
																{format(
																	new Date(brew.createdAt),
																	'MMM d, h:mm a',
																)}
															</CardDescription>
														</div>

														{isMyBrew && (
															<DropdownMenu
																open={openDropdownId === brew.id}
																onOpenChange={(open) =>
																	setOpenDropdownId(open ? brew.id : null)
																}
															>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant='ghost'
																		size='icon'
																		className='h-8 w-8 text-muted-foreground hover:text-foreground -mr-2 -mt-1'
																	>
																		<MoreVertical size={16} />
																	</Button>
																</DropdownMenuTrigger>
																{openDropdownId === brew.id && (
																	<DropdownMenuContent align='end'>
																		<DropdownMenuItem
																			onClick={() => handleEditBrew(brew.id)}
																			className='cursor-pointer'
																		>
																			<Edit size={14} className='mr-2' />
																			Edit
																		</DropdownMenuItem>
																		<DropdownMenuItem
																			onClick={() => handleCloneBrew(brew)}
																			className='cursor-pointer'
																		>
																			<Copy size={14} className='mr-2' />
																			Clone
																		</DropdownMenuItem>
																		<DropdownMenuItem
																			onClick={() =>
																				confirmDeleteBrew(
																					brew.id,
																					brew.bean.name,
																				)
																			}
																			className='cursor-pointer text-destructive focus:text-destructive'
																		>
																			<Trash size={14} className='mr-2' />
																			Delete
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																)}
															</DropdownMenu>
														)}
													</div>
												</CardHeader>

												<CardContent className='flex-1 pb-6'>
													{!isMyBrew && (
														<div className='flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-md'>
															<Avatar className='h-6 w-6'>
																<AvatarFallback className='text-[10px]'>
																	{getInitials(brew.user.username)}
																</AvatarFallback>
															</Avatar>
															<span className='text-xs text-muted-foreground'>
																Brewed by{' '}
																<span className='font-medium text-foreground'>
																	{brew.user.username}
																</span>
															</span>
														</div>
													)}

													<div className='grid grid-cols-2 gap-4 mb-4'>
														<div className='flex flex-col p-2 bg-secondary/30 rounded-md'>
															<div className='flex items-center gap-1.5 text-xs text-muted-foreground mb-1'>
																<Scale size={12} />
																<span>Ratio</span>
															</div>
															<div className='text-sm font-medium'>
																{brew.doseWeight}g
																{brew.yieldWeight && (
																	<>
																		{' → '}
																		<span className='text-foreground'>
																			{brew.yieldWeight}g
																		</span>
																		<div className='text-xs text-muted-foreground font-normal mt-0.5'>
																			(
																			{calculateRatio(
																				brew.doseWeight,
																				brew.yieldWeight,
																			)}
																			)
																		</div>
																	</>
																)}
															</div>
														</div>

														<div className='flex flex-col gap-1.5'>
															{brew.brewTime && (
																<div className='flex items-center justify-between text-sm'>
																	<div className='flex items-center gap-1.5 text-muted-foreground'>
																		<Clock size={13} />
																		<span className='text-xs'>Time</span>
																	</div>
																	<span className='font-mono font-medium'>
																		{formatBrewTime(brew.brewTime)}
																	</span>
																</div>
															)}
															{brew.waterTemperature && (
																<div className='flex items-center justify-between text-sm'>
																	<div className='flex items-center gap-1.5 text-muted-foreground'>
																		<Thermometer size={13} />
																		<span className='text-xs'>Temp</span>
																	</div>
																	<span className='font-medium'>
																		{brew.waterTemperature}°C
																	</span>
																</div>
															)}
															{brew.grindSize && (
																<div className='flex items-center justify-between text-sm'>
																	<div className='flex items-center gap-1.5 text-muted-foreground'>
																		<Settings2 size={13} />
																		<span className='text-xs'>Grind</span>
																	</div>
																	<span className='font-medium truncate max-w-20 text-right'>
																		{brew.grindSize}
																	</span>
																</div>
															)}
														</div>
													</div>

													{(brew.rating !== null || brew.notes) && (
														<>
															<Separator className='mb-3' />
															<div className='space-y-2'>
																{brew.rating !== null && (
																	<div className='flex gap-0.5'>
																		{[1, 2, 3, 4, 5].map((star) => (
																			<Star
																				key={star}
																				size={14}
																				className={cn(
																					brew.rating! >= star
																						? 'fill-warning text-warning'
																						: 'fill-muted/20 text-muted-foreground/30',
																				)}
																			/>
																		))}
																	</div>
																)}
																{brew.notes && (
																	<div className='p-3 bg-secondary/30 rounded-md'>
																		<p className='text-sm text-muted-foreground italic line-clamp-3 whitespace-pre-line'>
																			{brew.notes}
																		</p>
																	</div>
																)}
															</div>
														</>
													)}
												</CardContent>
											</Card>
										</motion.div>
									)
								})}
							</div>
						</AnimatePresence>

						<div ref={sentinelRef} className='h-4' />

						{isLoadingMore && (
							<div className='flex justify-center py-8'>
								<div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full' />
							</div>
						)}
					</>
				)}
			</div>

			<BrewForm
				isOpen={isFormOpen}
				onClose={() => {
					setIsFormOpen(false)
					setCloneData(undefined)
				}}
				brewId={selectedBrew}
				barId={activeBarId || undefined}
				onSuccess={refresh}
				initialData={cloneData}
			/>

			<ConfirmModal
				open={deleteModal.isOpen}
				onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
				onConfirm={() => handleDeleteBrew(deleteModal.brewId)}
				title='Delete Brew'
				description={`Are you sure you want to delete this brew of ${deleteModal.brewName}? This action cannot be undone.`}
			/>
		</ProtectedPage>
	)
}
