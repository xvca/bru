import React, { useState, useEffect } from 'react'
import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'
import { toast } from 'sonner'
import {
	Plus,
	Users,
	Settings,
	Edit,
	Trash,
	UserPlus,
	MapPin,
	Store,
	ArrowRight,
} from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import BrewBarFormModal from '@/components/BrewBarFormModal'
import { useRouter } from 'next/router'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

type BrewBar = {
	id: number
	name: string
	location: string | null
	createdAt: string
	isOwner: boolean
	memberCount: number
	role: string
}

export default function BrewBarsPage() {
	const { user } = useAuth()
	const router = useRouter()
	const [brewBars, setBrewBars] = useState<BrewBar[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [selectedBar, setSelectedBar] = useState<number | null>(null)
	const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
	const [barToDelete, setBarToDelete] = useState<{
		id: number
		name: string
	} | null>(null)

	useEffect(() => {
		if (user) {
			fetchBrewBars()
		}
	}, [user])

	const fetchBrewBars = async () => {
		try {
			setIsLoading(true)
			const { data } = await axios.get('/api/brew-bars', {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setBrewBars(data)
		} catch (error) {
			console.error('Error fetching brew bars:', error)
			toast.error('Failed to load brew bars')
		} finally {
			setIsLoading(false)
		}
	}

	const handleCreateNewBar = () => {
		setSelectedBar(null)
		setIsCreateModalOpen(true)
	}

	const handleEditBar = (id: number) => {
		setSelectedBar(id)
		setIsCreateModalOpen(true)
	}

	const confirmDelete = (id: number, name: string) => {
		setBarToDelete({ id, name })
		setIsConfirmDeleteOpen(true)
	}

	const handleDelete = async () => {
		if (!barToDelete) return

		try {
			await axios.delete(`/api/brew-bars/${barToDelete.id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBrewBars(brewBars.filter((bar) => bar.id !== barToDelete.id))
			toast.success('Brew bar deleted successfully')
		} catch (error) {
			console.error('Error deleting brew bar:', error)
			if (axios.isAxiosError(error) && error.response?.status === 403) {
				toast.error('You do not have permission to delete this brew bar')
			} else {
				toast.error('Failed to delete brew bar')
			}
		} finally {
			setIsConfirmDeleteOpen(false)
			setBarToDelete(null)
		}
	}

	const navigateToMembers = (barId: number) => {
		router.push(`/brew-bars/${barId}`)
	}

	return (
		<ProtectedPage title='Brew Bars'>
			<div className='p-6'>
				<div className='flex justify-between items-center mb-8'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>Brew Bars</h1>
					</div>
					<Button onClick={handleCreateNewBar}>
						<Plus className='mr-2 h-4 w-4' />
						New Brew Bar
					</Button>
				</div>

				{isLoading ? (
					<div className='grid gap-4 md:grid-cols-2'>
						{[1, 2, 3].map((i) => (
							<Card key={i} className='overflow-hidden'>
								<CardHeader className='pb-2'>
									<Skeleton className='h-6 w-3/4' />
									<Skeleton className='h-4 w-1/2' />
								</CardHeader>
								<CardContent>
									<Skeleton className='h-10 w-full' />
								</CardContent>
								<CardFooter className='bg-muted/50 p-3'>
									<Skeleton className='h-8 w-full' />
								</CardFooter>
							</Card>
						))}
					</div>
				) : brewBars.length === 0 ? (
					<Card className='border-dashed'>
						<CardContent className='flex flex-col items-center justify-center py-16 space-y-4'>
							<div className='p-4 rounded-full bg-secondary/50'>
								<Store className='h-12 w-12 text-muted-foreground/50' />
							</div>
							<div className='text-center'>
								<h3 className='text-lg font-semibold'>No brew bars found</h3>
								<p className='text-muted-foreground text-sm max-w-sm mt-1'>
									Create a shared space to track equipment and collaborate with
									other coffee enthusiasts.
								</p>
							</div>
							<Button
								onClick={handleCreateNewBar}
								variant='outline'
								className='mt-4'
							>
								Create your first brew bar
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className='grid gap-4 md:grid-cols-2'>
						{brewBars.map((bar) => (
							<Card
								key={bar.id}
								className='flex flex-col justify-between hover:border-primary/50 transition-colors'
							>
								<CardHeader className='pb-3'>
									<div className='flex justify-between items-start gap-2'>
										<div className='space-y-1'>
											<CardTitle className='text-lg leading-tight'>
												{bar.name}
											</CardTitle>
											{bar.location && (
												<CardDescription className='flex items-center gap-1'>
													<MapPin className='h-3 w-3' />
													{bar.location}
												</CardDescription>
											)}
										</div>
										{bar.isOwner && (
											<div className='flex gap-1 -mr-2 -mt-1'>
												<Button
													onClick={() => handleEditBar(bar.id)}
													variant='ghost'
													size='icon'
													className='h-8 w-8 text-muted-foreground hover:text-foreground'
													title='Edit Brew Bar'
												>
													<Edit className='h-4 w-4' />
												</Button>
												<Button
													onClick={() => confirmDelete(bar.id, bar.name)}
													variant='ghost'
													size='icon'
													className='h-8 w-8 text-muted-foreground hover:text-destructive'
													title='Delete Brew Bar'
												>
													<Trash className='h-4 w-4' />
												</Button>
											</div>
										)}
									</div>
								</CardHeader>

								<CardContent className='space-y-4'>
									<div className='flex items-center gap-2'>
										<Badge variant={bar.isOwner ? 'default' : 'secondary'}>
											{bar.isOwner ? 'Owner' : bar.role || 'Member'}
										</Badge>
										<span className='text-sm text-muted-foreground flex items-center gap-1'>
											<Users className='h-4 w-4' />
											{bar.memberCount}{' '}
											{bar.memberCount === 1 ? 'Member' : 'Members'}
										</span>
									</div>
								</CardContent>

								<CardFooter className='flex flex-col gap-2 bg-muted/30 border-t p-3'>
									<div className='flex w-full gap-2'>
										<Button
											variant='outline'
											size='sm'
											className='flex-1 text-xs'
											onClick={() => navigateToMembers(bar.id)}
										>
											<UserPlus className='mr-2 h-3.5 w-3.5' />
											Members
										</Button>
									</div>
								</CardFooter>
							</Card>
						))}
					</div>
				)}
			</div>

			<BrewBarFormModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				brewBarId={selectedBar || undefined}
				onSuccess={fetchBrewBars}
			/>

			<ConfirmModal
				open={isConfirmDeleteOpen}
				onClose={() => setIsConfirmDeleteOpen(false)}
				onConfirm={handleDelete}
				title='Delete Brew Bar'
				description={`Are you sure you want to delete "${barToDelete?.name}"? This action cannot be undone and all members will lose access.`}
			/>
		</ProtectedPage>
	)
}
