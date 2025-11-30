import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import { useAuth } from '@/lib/authContext'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
	Plus,
	Coffee,
	Clock,
	Thermometer,
	Star,
	Edit,
	Trash,
	Droplets,
	Scale,
	Settings2,
} from 'lucide-react'
import BrewForm from '@/components/BrewForm'
import { ConfirmModal } from '@/components/ConfirmModal'
import { cn } from '@/lib/utils'

import { Prisma } from '@/generated/prisma/client'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

type BrewWithRelations = Prisma.BrewGetPayload<{
	include: {
		bean: true
		method: true
	}
}>

export default function Brews() {
	const { user } = useAuth()
	const [brews, setBrews] = useState<BrewWithRelations[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBrew, setSelectedBrew] = useState<number | undefined>(
		undefined,
	)

	const [deleteModal, setDeleteModal] = useState({
		isOpen: false,
		brewId: 0,
		brewName: '',
	})

	useEffect(() => {
		if (user) {
			fetchBrews()
		}
	}, [user])

	const fetchBrews = async () => {
		setIsLoading(true)
		try {
			const { data } = await axios.get<BrewWithRelations[]>('/api/brews', {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setBrews(data)
		} catch (error) {
			console.error('Error fetching brews:', error)
			toast.error('Failed to load brews')
		} finally {
			setIsLoading(false)
		}
	}

	const handleAddBrew = () => {
		setSelectedBrew(undefined)
		setIsFormOpen(true)
	}

	const handleEditBrew = (id: number) => {
		setSelectedBrew(id)
		setIsFormOpen(true)
	}

	const handleDeleteBrew = async (id: number) => {
		try {
			await axios.delete(`/api/brews/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBrews(brews.filter((brew) => brew.id !== id))
			toast.success('Brew deleted successfully')
		} catch (error) {
			console.error('Error deleting brew:', error)
			toast.error('Failed to delete brew')
		} finally {
			setDeleteModal({ ...deleteModal, isOpen: false })
		}
	}

	const confirmDeleteBrew = (id: number, name: string) => {
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

	return (
		<ProtectedPage title='Brew Logs'>
			<Section>
				<div className='flex justify-between items-center mb-8'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>Brew Logs</h1>
						<p className='text-muted-foreground mt-1'>
							Track your daily extractions and tasting notes.
						</p>
					</div>
					<Button onClick={handleAddBrew}>
						<Plus className='mr-2 h-4 w-4' />
						Log Brew
					</Button>
				</div>

				{isLoading ? (
					<div className='grid gap-4 md:grid-cols-2'>
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<Card key={i} className='overflow-hidden'>
								<CardHeader className='pb-2'>
									<div className='flex justify-between'>
										<Skeleton className='h-5 w-1/2' />
										<Skeleton className='h-5 w-16' />
									</div>
									<Skeleton className='h-4 w-1/3 mt-2' />
								</CardHeader>
								<CardContent>
									<div className='flex gap-4 mb-4'>
										<Skeleton className='h-8 w-16' />
										<Skeleton className='h-8 w-16' />
										<Skeleton className='h-8 w-16' />
									</div>
									<Skeleton className='h-12 w-full' />
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
								<h3 className='text-lg font-semibold'>No brews recorded</h3>
								<p className='text-muted-foreground text-sm max-w-sm mt-1'>
									Start logging your coffee journey to track parameters and
									improve consistency.
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
					<div className='grid gap-4 md:grid-cols-2'>
						{brews.map((brew) => (
							<Card
								key={brew.id}
								className='flex flex-col h-full hover:border-primary/50 transition-colors'
							>
								<CardHeader className='pb-3'>
									<div className='flex justify-between items-start gap-2'>
										<div className='space-y-1'>
											<div className='flex items-center gap-2'>
												<CardTitle className='text-lg leading-tight'>
													{brew.bean.name}
												</CardTitle>
												<Badge
													variant='secondary'
													className='font-normal text-xs'
												>
													{brew.method.name}
												</Badge>
											</div>
											<CardDescription className='flex items-center gap-1'>
												{brew.bean.roaster || 'Unknown Roaster'}
												<span>•</span>
												{format(new Date(brew.brewDate), 'MMM d, h:mm a')}
											</CardDescription>
										</div>
										<div className='flex gap-1 -mr-2 -mt-1'>
											<Button
												onClick={() => handleEditBrew(brew.id)}
												variant='ghost'
												size='icon'
												className='h-8 w-8 text-muted-foreground hover:text-foreground'
											>
												<Edit size={14} />
											</Button>
											<Button
												onClick={() =>
													confirmDeleteBrew(brew.id, brew.bean.name)
												}
												variant='ghost'
												size='icon'
												className='h-8 w-8 text-muted-foreground hover:text-destructive'
											>
												<Trash size={14} />
											</Button>
										</div>
									</div>
								</CardHeader>

								<CardContent className='flex-1 pb-3'>
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
													<span className='font-medium font-mono'>
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
													<span
														className='font-medium truncate max-w-20 text-right'
														title={brew.grindSize}
													>
														{brew.grindSize}
													</span>
												</div>
											)}
										</div>
									</div>

									{(brew.rating !== null || brew.tastingNotes) && (
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
																		? 'fill-amber-400 text-amber-400'
																		: 'fill-muted/20 text-muted-foreground/30',
																)}
															/>
														))}
													</div>
												)}
												{brew.tastingNotes && (
													<p className='text-sm text-muted-foreground italic line-clamp-2'>
														&quot;{brew.tastingNotes}&quot;
													</p>
												)}
											</div>
										</>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</Section>

			<BrewForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				brewId={selectedBrew}
				onSuccess={fetchBrews}
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
